/**
 * Real-time updater for monitoringdailysummaries.
 * Called when activity logs or screenshots are inserted.
 * Time format: "minutes:seconds" (e.g. "130:20" = 130 min 20 sec).
 */
const MonitoringDailySummary = require('../models/MonitoringDailySummary');
const MonitoringSettings = require('../models/MonitoringSettings');

const DEFAULT_SETTINGS = {
    expectedActivityPerMinute: { keystrokes: 40, mouseClicks: 20, scrolls: 10 },
    weights: { activityWeight: 0.7, idleWeight: 0.3 },
    scoreRange: { min: 0, max: 100 }
};

function computeProductivityScore(settings, perMinute) {
    const ps = settings?.productivitySettings ?? {};
    const exp = ps.expectedActivityPerMinute ?? DEFAULT_SETTINGS.expectedActivityPerMinute;
    const idleMax = 60;
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

/**
 * Format total seconds as "minutes:seconds" (e.g. 7820 -> "130:20").
 */
function formatMinutesSeconds(totalSeconds) {
    const s = Math.round(Math.max(0, totalSeconds));
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, '0')}`;
}

/**
 * Parse "minutes:seconds" to total seconds (e.g. "130:20" -> 7820).
 */
function parseMinutesSeconds(str) {
    if (!str || typeof str !== 'string') return 0;
    const parts = str.trim().split(':');
    if (parts.length < 2) return 0;
    const m = parseInt(parts[0], 10) || 0;
    const s = parseInt(parts[1], 10) || 0;
    return m * 60 + s;
}

/**
 * Add duration (seconds) to a time string, return new "minutes:seconds" string.
 */
function addSecondsToTimeString(timeStr, secondsToAdd) {
    const total = parseMinutesSeconds(timeStr) + Math.round(secondsToAdd);
    return formatMinutesSeconds(total);
}

/**
 * Update monitoringdailysummaries when an activity log is inserted.
 * Each activity log = 1 minute: productive = (60 - idleSeconds), unproductive = idleSeconds (capped at 60).
 * Break, Pause, Meeting are excluded (activity is never stored when device is in those statuses).
 * Also increments activityTotals (keystrokes, mouseClicks, scrollCount) from the log.
 * @param {ObjectId} tenantId
 * @param {ObjectId} employeeId
 * @param {Date} timestamp - log timestamp
 * @param {number} idleSeconds - from activity log
 * @param {number} durationSeconds - typically 60 (1 log = 1 min); may vary for first/last
 * @param {{ keystrokes?: number, mouseClicks?: number, scrollCount?: number }} [activityTotals] - activity counts from the log
 */
async function updateFromActivityLog(tenantId, employeeId, timestamp, idleSeconds, durationSeconds = 60, activityTotals = {}) {
    const date = new Date(timestamp);
    date.setUTCHours(0, 0, 0, 0);

    const idle = Math.min(durationSeconds, Math.max(0, idleSeconds || 0));
    const productive = Math.max(0, durationSeconds - idle);

    const doc = await MonitoringDailySummary.findOne({ businessId: tenantId, employeeId, date }).lean();
    const currentProd = doc?.productiveTime ? parseMinutesSeconds(doc.productiveTime) : 0;
    const currentUnprod = doc?.unproductiveTime ? parseMinutesSeconds(doc.unproductiveTime) : 0;

    const newProdSec = currentProd + productive;
    const newUnprodSec = currentUnprod + idle;
    const newTotalSec = newProdSec + newUnprodSec;

    const newProdStr = formatMinutesSeconds(newProdSec);
    const newUnprodStr = formatMinutesSeconds(newUnprodSec);
    const newTotalStr = formatMinutesSeconds(newTotalSec);

    const k = activityTotals.keystrokes ?? 0;
    const m = activityTotals.mouseClicks ?? 0;
    const s = activityTotals.scrollCount ?? 0;

    const totalKeystrokes = (doc?.activityTotals?.keystrokes ?? 0) + k;
    const totalMouseClicks = (doc?.activityTotals?.mouseClicks ?? 0) + m;
    const totalScrollCount = (doc?.activityTotals?.scrollCount ?? 0) + s;
    const totalIdleSeconds = newUnprodSec;
    const totalMinutes = newTotalSec > 0 ? newTotalSec / 60 : 1;

    const perMinute = {
        keystrokes: totalKeystrokes / totalMinutes,
        mouseClicks: totalMouseClicks / totalMinutes,
        scrollCount: totalScrollCount / totalMinutes,
        idleSeconds: totalIdleSeconds / totalMinutes
    };

    const settings = await MonitoringSettings.findOne({ businessId: tenantId }).lean();
    const productivityScore = computeProductivityScore(settings, perMinute);

    const activeMinutes = Math.round(newProdSec / 60);
    const idleMinutes = Math.round(newUnprodSec / 60);

    const update = {
        $set: {
            productiveTime: newProdStr,
            unproductiveTime: newUnprodStr,
            totalTrackedTime: newTotalStr,
            totalTrackedSeconds: newTotalSec,
            totalTrackedMinutes: Math.round(totalMinutes),
            activeMinutes,
            idleMinutes,
            productivityScore,
            activityTotals: {
                keystrokes: totalKeystrokes,
                mouseClicks: totalMouseClicks,
                scrollCount: totalScrollCount
            }
        }
    };
    if (!doc) {
        update.$setOnInsert = { businessId: tenantId, employeeId, date };
    }
    await MonitoringDailySummary.findOneAndUpdate(
        { businessId: tenantId, employeeId, date },
        update,
        { upsert: true, setDefaultsOnInsert: true, new: true }
    );
}

/**
 * Increment screenshotCount in monitoringdailysummaries when a screenshot is captured.
 */
async function incrementScreenshotCount(tenantId, employeeId, timestamp) {
    const date = new Date(timestamp);
    date.setUTCHours(0, 0, 0, 0);

    await MonitoringDailySummary.findOneAndUpdate(
        { businessId: tenantId, employeeId, date },
        { $inc: { screenshotCount: 1, screenshotsCaptured: 1 }, $setOnInsert: { businessId: tenantId, employeeId, date } },
        { upsert: true }
    );
}

/**
 * Set checkInTime when user checks in (called from attendance flow).
 */
async function setCheckInTime(tenantId, employeeId, date, checkInTime) {
    const d = new Date(date);
    d.setUTCHours(0, 0, 0, 0);
    await MonitoringDailySummary.findOneAndUpdate(
        { businessId: tenantId, employeeId, date: d },
        { $set: { checkInTime: new Date(checkInTime) } },
        { upsert: true, setDefaultsOnInsert: true }
    );
}

/**
 * Set checkOutTime and final values when user checks out.
 */
async function setCheckOutTime(tenantId, employeeId, date, checkOutTime) {
    const d = new Date(date);
    d.setUTCHours(0, 0, 0, 0);
    await MonitoringDailySummary.findOneAndUpdate(
        { businessId: tenantId, employeeId, date: d },
        { $set: { checkOutTime: new Date(checkOutTime) } },
        { upsert: true }
    );
}

module.exports = {
    formatMinutesSeconds,
    parseMinutesSeconds,
    addSecondsToTimeString,
    updateFromActivityLog,
    incrementScreenshotCount,
    setCheckInTime,
    setCheckOutTime
};
