/**
 * Daily summary: aggregates monitoringlogs, monitoringscores, monitoringscreenshots
 * per employee per day and upserts monitoringDailySummary.
 * NOTE: Normal flow uses on-checkout insert in attendanceCheckCron (when staff checks out).
 * This script is for manual backfill (e.g. historical dates) or catch-up.
 * Run: node src/cron/dailySummary.js [YYYY-MM-DD]
 */
require('dotenv').config();
const path = require('path');
const mongoose = require('../config/mongoose');
const connectDB = require('../config/db');
const appBackendRoot = path.join(__dirname, '../../../../', 'app_backend');
const ActivityLog = require('../models/ActivityLog');
const ProductivityScore = require('../models/ProductivityScore');
const Screenshot = require('../models/Screenshot');
const MonitoringSettings = require('../models/MonitoringSettings');
const MonitoringStaff = require('../models/MonitoringStaff');
const MonitoringDailySummary = require('../models/MonitoringDailySummary');
const dailySummaryUpdater = require('../services/dailySummaryUpdater');

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
        const totalTrackedSeconds = Math.round(totalMinutes * 60);
        const productiveSeconds = Math.max(0, totalTrackedSeconds - totalIdleSeconds);
        const unproductiveSeconds = totalIdleSeconds;
        const idleMinutes = Math.round(totalIdleSeconds / 60);
        const activeMinutes = Math.round(productiveSeconds / 60);
        const productiveTime = dailySummaryUpdater.formatMinutesSeconds(productiveSeconds);
        const unproductiveTime = dailySummaryUpdater.formatMinutesSeconds(unproductiveSeconds);
        const totalTrackedTime = dailySummaryUpdater.formatMinutesSeconds(totalTrackedSeconds);

        await MonitoringDailySummary.findOneAndUpdate(
            { businessId, employeeId, date },
            {
                $set: {
                    businessId,
                    employeeId,
                    date,
                    productiveTime,
                    unproductiveTime,
                    totalTrackedTime,
                    totalTrackedMinutes: Math.round(totalMinutes),
                    totalTrackedSeconds,
                    activeMinutes: Math.round(activeMinutes),
                    idleMinutes,
                    activityTotals: {
                        keystrokes: ag.totalKeystrokes,
                        mouseClicks: ag.totalMouseClicks,
                        scrollCount: ag.totalScrollCount
                    },
                    productivityScore,
                    screenshotCount: ssGroup?.count ?? 0,
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

    const AttendanceModel = require(path.join(appBackendRoot, 'src', 'models', 'Attendance'));
    const [aggResult, att] = await Promise.all([
        ActivityLog.aggregate([
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
        ]),
        AttendanceModel.findOne({
            $or: [{ employeeId }, { user: employeeId }],
            date: { $gte: start, $lt: end }
        })
            .select('punchIn punchOut')
            .lean()
    ]);
    const ag = aggResult?.[0];
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
    const totalTrackedSeconds = Math.round(totalMinutes * 60);
    const productiveSeconds = Math.max(0, totalTrackedSeconds - totalIdleSeconds);
    const unproductiveSeconds = totalIdleSeconds;
    const idleMinutes = Math.round(totalIdleSeconds / 60);
    const activeMinutes = Math.round(productiveSeconds / 60);

    const productiveTime = dailySummaryUpdater.formatMinutesSeconds(productiveSeconds);
    const unproductiveTime = dailySummaryUpdater.formatMinutesSeconds(unproductiveSeconds);
    const totalTrackedTime = dailySummaryUpdater.formatMinutesSeconds(totalTrackedSeconds);

    const setFields = {
        businessId,
        employeeId,
        date,
        productiveTime,
        unproductiveTime,
        totalTrackedTime,
        totalTrackedMinutes: Math.round(totalMinutes),
        totalTrackedSeconds,
        activeMinutes,
        idleMinutes,
        activityTotals: { keystrokes: ag.totalKeystrokes, mouseClicks: ag.totalMouseClicks, scrollCount: ag.totalScrollCount },
        productivityScore,
        screenshotCount: ssGroup?.count ?? 0,
        screenshotsCaptured: ssGroup?.count ?? 0
    };
    if (att?.punchIn) setFields.checkInTime = att.punchIn;
    if (att?.punchOut) setFields.checkOutTime = att.punchOut;

    await MonitoringDailySummary.findOneAndUpdate(
        { businessId, employeeId, date },
        { $set: setFields },
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
