/**
 * Daily summary: aggregates monitoringlogs, monitoringscores, monitoringscreenshots
 * per employee per day and upserts monitoringDailySummary.
 * NOTE: Normal flow uses on-checkout insert in attendanceCheckCron (when staff checks out).
 * This script is for manual backfill (e.g. historical dates) or catch-up.
 * Run: node src/cron/dailySummary.js [YYYY-MM-DD]
 */
require('dotenv').config();
const mongoose = require('../config/mongoose');
const connectDB = require('../config/db');
const ActivityLog = require('../models/ActivityLog');
const ProductivityScore = require('../models/ProductivityScore');
const Screenshot = require('../models/Screenshot');
const MonitoringSettings = require('../models/MonitoringSettings');
const MonitoringStaff = require('../models/MonitoringStaff');
const MonitoringDailySummary = require('../models/MonitoringDailySummary');

const DEFAULT_SETTINGS = {
    expectedActivityPerMinute: { keystrokes: 40, mouseClicks: 20, scrolls: 10 },
    weights: { activityWeight: 0.7, idleWeight: 0.3 },
    scoreRange: { min: 0, max: 100 }
};

function normalizeToDate(d) {
    const x = new Date(d);
    x.setUTCHours(0, 0, 0, 0);
    return x;
}

function computeProductivityScore(settings, perMinute) {
    const ps = settings?.productivitySettings ?? {};
    const exp = ps.expectedActivityPerMinute ?? DEFAULT_SETTINGS.expectedActivityPerMinute;
    const idleMax = 60; // fixed for productivity score
    const weights = ps.weights ?? DEFAULT_SETTINGS.weights;
    const range = ps.scoreRange ?? DEFAULT_SETTINGS.scoreRange;

    const expKey = exp.keystrokes || 1;
    const expMouse = exp.mouseClicks || 1;
    const expScroll = exp.scrolls || 1;

    const keyScore = Math.min(1, (perMinute.keystrokes || 0) / expKey);
    const mouseScore = Math.min(1, (perMinute.mouseClicks || 0) / expMouse);
    const scrollScore = Math.min(1, (perMinute.scrollCount || 0) / expScroll);

    const activityScore = (keyScore + mouseScore + scrollScore) / 3;
    const idleSeconds = Math.min(idleMax, perMinute.idleSeconds || 0);
    const idleFactor = (idleMax - idleSeconds) / idleMax;

    let prod = (activityScore * weights.activityWeight + idleFactor * weights.idleWeight) * 100;
    prod = Math.max(range.min ?? 0, Math.min(range.max ?? 100, prod));
    return Math.round(prod * 10) / 10;
}

function categorizeMinutes(score) {
    if (score >= 70) return { productive: 1, neutral: 0, unproductive: 0 };
    if (score >= 40) return { productive: 0, neutral: 1, unproductive: 0 };
    return { productive: 0, neutral: 0, unproductive: 1 };
}

async function runDailySummary(targetDate) {
    await connectDB();

    const date = targetDate ? normalizeToDate(targetDate) : normalizeToDate(new Date());
    const start = new Date(date);
    const end = new Date(date);
    end.setUTCDate(end.getUTCDate() + 1);

    const pipeline = [
        { $match: { timestamp: { $gte: start, $lt: end } } },
        {
            $group: {
                _id: { tenantId: '$tenantId', employeeID: '$employeeID' },
                totalKeystrokes: { $sum: '$keystrokes' },
                totalMouseClicks: { $sum: '$mouseClicks' },
                totalScrollCount: { $sum: '$scrollCount' },
                totalIdleSeconds: { $sum: '$idleSeconds' },
                count: { $sum: 1 }
            }
        }
    ];

    const activityGroups = await ActivityLog.aggregate(pipeline);

    const scorePipeline = [
        { $match: { timestamp: { $gte: start, $lt: end } } },
        {
            $group: {
                _id: { tenantId: '$tenantId', employeeID: '$employeeID' },
                scores: { $push: '$score' },
                keystrokes: { $push: '$keystrokes' },
                mouseClicks: { $push: '$mouseClicks' },
                scrollCount: { $push: '$scrollCount' },
                idleSeconds: { $push: '$idleSeconds' }
            }
        }
    ];

    const scoreGroups = await ProductivityScore.aggregate(scorePipeline);

    const screenshotPipeline = [
        { $match: { timestamp: { $gte: start, $lt: end } } },
        { $group: { _id: { tenantId: '$tenantId', employeeID: '$employeeID' }, count: { $sum: 1 } } }
    ];

    const screenshotGroups = await Screenshot.aggregate(screenshotPipeline);

    const businessIds = [...new Set(activityGroups.map((g) => g._id.tenantId.toString()))];
    const settingsMap = new Map();
    const staffSetMap = new Map();
    for (const bid of businessIds) {
        const s = await MonitoringSettings.findOne({ businessId: bid }).lean();
        settingsMap.set(bid, s);
        if (s?.monitoringEnabled === false) continue;
        const staffs = await MonitoringStaff.find({ businessId: bid, enabled: true }).select('employeeId').lean();
        const ids = new Set(staffs.map((st) => st.employeeId.toString()));
        staffSetMap.set(bid, ids);
    }

    let upserted = 0;

    for (const ag of activityGroups) {
        const businessId = ag._id.tenantId;
        const employeeId = ag._id.employeeID;
        const bidStr = businessId.toString();
        const settings = settingsMap.get(bidStr);
        if (settings?.monitoringEnabled === false) continue;
        const staffSet = staffSetMap.get(bidStr);
        if (staffSet && staffSet.size > 0 && !staffSet.has(employeeId.toString())) continue; // only track staff in MonitoringStaff when list exists

        const scoreGroup = scoreGroups.find(
            (s) => s._id.tenantId.toString() === bidStr && s._id.employeeID.toString() === employeeId.toString()
        );
        const ssGroup = screenshotGroups.find(
            (s) => s._id.tenantId.toString() === bidStr && s._id.employeeID.toString() === employeeId.toString()
        );

        const totalMinutes = scoreGroup ? (scoreGroup.scores?.length || 0) : ag.count || 1;
        const perMinuteK = totalMinutes > 0 ? ag.totalKeystrokes / totalMinutes : 0;
        const perMinuteM = totalMinutes > 0 ? ag.totalMouseClicks / totalMinutes : 0;
        const perMinuteS = totalMinutes > 0 ? ag.totalScrollCount / totalMinutes : 0;
        const perMinuteIdle = totalMinutes > 0 ? ag.totalIdleSeconds / totalMinutes : 0;

        const productivityScore = computeProductivityScore(settings, {
            keystrokes: perMinuteK,
            mouseClicks: perMinuteM,
            scrollCount: perMinuteS,
            idleSeconds: perMinuteIdle
        });

        const totalIdleSeconds = ag.totalIdleSeconds || 0;
        const idleMinutes = Math.round(totalIdleSeconds / 60);
        const activeMinutes = Math.max(0, totalMinutes - idleMinutes);

        let productiveMinutes = 0;
        let neutralMinutes = 0;
        let unproductiveMinutes = 0;

        if (scoreGroup?.scores?.length && scoreGroup.keystrokes?.length) {
            for (let i = 0; i < scoreGroup.scores.length; i++) {
                const perMin = {
                    keystrokes: scoreGroup.keystrokes[i] ?? 0,
                    mouseClicks: scoreGroup.mouseClicks[i] ?? 0,
                    scrollCount: scoreGroup.scrollCount[i] ?? 0,
                    idleSeconds: scoreGroup.idleSeconds[i] ?? 0
                };
                const minScore = computeProductivityScore(settings, perMin);
                const cat = categorizeMinutes(minScore);
                productiveMinutes += cat.productive;
                neutralMinutes += cat.neutral;
                unproductiveMinutes += cat.unproductive;
            }
        } else {
            const cat = categorizeMinutes(productivityScore);
            productiveMinutes = totalMinutes * cat.productive;
            neutralMinutes = totalMinutes * cat.neutral;
            unproductiveMinutes = totalMinutes * cat.unproductive;
        }

        await MonitoringDailySummary.findOneAndUpdate(
            { businessId, employeeId, date },
            {
                $set: {
                    businessId,
                    employeeId,
                    date,
                    totalTrackedMinutes: Math.round(totalMinutes),
                    activeMinutes: Math.round(activeMinutes),
                    idleMinutes,
                    activityTotals: {
                        keystrokes: ag.totalKeystrokes,
                        mouseClicks: ag.totalMouseClicks,
                        scrollCount: ag.totalScrollCount
                    },
                    productivityScore,
                    timeBreakdown: {
                        productiveMinutes: Math.round(productiveMinutes),
                        neutralMinutes: Math.round(neutralMinutes),
                        unproductiveMinutes: Math.round(unproductiveMinutes)
                    },
                    screenshotsCaptured: ssGroup?.count ?? 0
                }
            },
            { upsert: true, new: true }
        );
        upserted++;
    }

    console.log(`[DailySummary] Processed date ${date.toISOString().slice(0, 10)}: ${upserted} summaries upserted`);
    return upserted;
}

/**
 * Upsert daily summary for a single staff (called on checkout).
 * @param {ObjectId} businessId - tenantId
 * @param {ObjectId} employeeId - staff _id
 * @param {Date} targetDate - date (start of day)
 * @returns {Promise<boolean>} - true if upserted
 */
async function upsertDailySummaryForStaff(businessId, employeeId, targetDate) {
    const date = normalizeToDate(targetDate);
    const start = new Date(date);
    const end = new Date(date);
    end.setUTCDate(end.getUTCDate() + 1);

    const [ag] = await ActivityLog.aggregate([
        { $match: { tenantId: businessId, employeeID: employeeId, timestamp: { $gte: start, $lt: end } } },
        {
            $group: {
                _id: null,
                totalKeystrokes: { $sum: '$keystrokes' },
                totalMouseClicks: { $sum: '$mouseClicks' },
                totalScrollCount: { $sum: '$scrollCount' },
                totalIdleSeconds: { $sum: '$idleSeconds' },
                count: { $sum: 1 }
            }
        }
    ]);
    if (!ag) return false;

    const [scoreGroup] = await ProductivityScore.aggregate([
        { $match: { tenantId: businessId, employeeID: employeeId, timestamp: { $gte: start, $lt: end } } },
        {
            $group: {
                _id: null,
                scores: { $push: '$score' },
                keystrokes: { $push: '$keystrokes' },
                mouseClicks: { $push: '$mouseClicks' },
                scrollCount: { $push: '$scrollCount' },
                idleSeconds: { $push: '$idleSeconds' }
            }
        }
    ]);

    const [ssGroup] = await Screenshot.aggregate([
        { $match: { tenantId: businessId, employeeID: employeeId, timestamp: { $gte: start, $lt: end } } },
        { $group: { _id: null, count: { $sum: 1 } } }
    ]);

    const bidStr = businessId.toString();
    const settings = await MonitoringSettings.findOne({ businessId: bidStr }).lean();
    if (settings?.monitoringEnabled === false) return false;

    const totalMinutes = scoreGroup ? (scoreGroup.scores?.length || 0) : ag.count || 1;
    const perMinuteK = totalMinutes > 0 ? ag.totalKeystrokes / totalMinutes : 0;
    const perMinuteM = totalMinutes > 0 ? ag.totalMouseClicks / totalMinutes : 0;
    const perMinuteS = totalMinutes > 0 ? ag.totalScrollCount / totalMinutes : 0;
    const perMinuteIdle = totalMinutes > 0 ? ag.totalIdleSeconds / totalMinutes : 0;

    const productivityScore = computeProductivityScore(settings, {
        keystrokes: perMinuteK,
        mouseClicks: perMinuteM,
        scrollCount: perMinuteS,
        idleSeconds: perMinuteIdle
    });

    const totalIdleSeconds = ag.totalIdleSeconds || 0;
    const idleMinutes = Math.round(totalIdleSeconds / 60);
    const activeMinutes = Math.max(0, totalMinutes - idleMinutes);

    let productiveMinutes = 0, neutralMinutes = 0, unproductiveMinutes = 0;
    if (scoreGroup?.scores?.length && scoreGroup.keystrokes?.length) {
        for (let i = 0; i < scoreGroup.scores.length; i++) {
            const perMin = {
                keystrokes: scoreGroup.keystrokes[i] ?? 0,
                mouseClicks: scoreGroup.mouseClicks[i] ?? 0,
                scrollCount: scoreGroup.scrollCount[i] ?? 0,
                idleSeconds: scoreGroup.idleSeconds[i] ?? 0
            };
            const cat = categorizeMinutes(computeProductivityScore(settings, perMin));
            productiveMinutes += cat.productive;
            neutralMinutes += cat.neutral;
            unproductiveMinutes += cat.unproductive;
        }
    } else {
        const cat = categorizeMinutes(productivityScore);
        productiveMinutes = totalMinutes * cat.productive;
        neutralMinutes = totalMinutes * cat.neutral;
        unproductiveMinutes = totalMinutes * cat.unproductive;
    }

    await MonitoringDailySummary.findOneAndUpdate(
        { businessId, employeeId, date },
        {
            $set: {
                businessId,
                employeeId,
                date,
                totalTrackedMinutes: Math.round(totalMinutes),
                activeMinutes: Math.round(activeMinutes),
                idleMinutes,
                activityTotals: { keystrokes: ag.totalKeystrokes, mouseClicks: ag.totalMouseClicks, scrollCount: ag.totalScrollCount },
                productivityScore,
                timeBreakdown: {
                    productiveMinutes: Math.round(productiveMinutes),
                    neutralMinutes: Math.round(neutralMinutes),
                    unproductiveMinutes: Math.round(unproductiveMinutes)
                },
                screenshotsCaptured: ssGroup?.count ?? 0
            }
        },
        { upsert: true, new: true }
    );
    return true;
}

async function run(targetDate) {
    const n = await runDailySummary(targetDate);
    process.exit(0);
}

if (require.main === module) {
    const arg = process.argv[2];
    const targetDate = arg ? new Date(arg) : undefined;
    run(targetDate).catch((err) => {
        console.error('[DailySummary] Error:', err);
        process.exit(1);
    });
}

module.exports = { runDailySummary, upsertDailySummaryForStaff };
