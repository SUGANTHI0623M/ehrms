const path = require('path');
const MonitoringAttendanceCache = require('../models/MonitoringAttendanceCache');
const MonitoringDailySummary = require('../models/MonitoringDailySummary');
const Screenshot = require('../models/Screenshot');
const dailySummaryUpdater = require('../services/dailySummaryUpdater');
const appBackendRoot = path.join(__dirname, '../../../../', 'app_backend');
const Attendance = require(path.join(appBackendRoot, 'src', 'models', 'Attendance'));

/** GET /summary/today - Fetch from monitoringdailysummaries (totalTrackedTime, productiveTime, unproductiveTime) only. */
exports.getToday = async (req, res) => {
    try {
        const device = req.device;
        const employeeId = device?.employeeID;
        const tenantId = device?.tenantId;
        if (!employeeId || !tenantId) {
            return res.status(401).json({ message: 'Device context missing' });
        }
        const now = new Date();
        const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
        const end = new Date(start);
        end.setUTCDate(end.getUTCDate() + 1);

        let totalTrackedSeconds = 0;
        let activeMinutes = 0;
        let idleMinutes = 0;

        const [dailySummary, cache, lastScreenshot, attRecord] = await Promise.all([
            MonitoringDailySummary.findOne({ businessId: tenantId, employeeId, date: start }).lean(),
            device?.deviceId
                ? MonitoringAttendanceCache.findOne({ deviceId: device.deviceId }).select('lastCheckIn lastCheckOut totalTrackedSecondsAtExit totalTrackedSecondsAtExitUpdatedAt').lean()
                : null,
            device?.deviceId
                ? Screenshot.findOne({ deviceId: device.deviceId, tenantId, timestamp: { $gte: start, $lt: end } }).sort({ timestamp: -1 }).select('timestamp').lean()
                : null,
            Attendance.findOne({
                $or: [{ employeeId }, { user: employeeId }],
                date: { $gte: start, $lt: end }
            })
                .select('punchIn punchOut')
                .lean()
        ]);

        if (dailySummary) {
            totalTrackedSeconds = dailySummary.totalTrackedSeconds ?? dailySummaryUpdater.parseMinutesSeconds(dailySummary.totalTrackedTime || '0:00');
            const productiveSeconds = dailySummaryUpdater.parseMinutesSeconds(dailySummary.productiveTime || '0:00');
            const unproductiveSeconds = dailySummaryUpdater.parseMinutesSeconds(dailySummary.unproductiveTime || '0:00');
            activeMinutes = Math.round(productiveSeconds / 60);
            idleMinutes = Math.round(unproductiveSeconds / 60);
        }

        const deviceId = device?.deviceId;
        let lastCheckIn = cache?.lastCheckIn ?? attRecord?.punchIn ?? null;
        let lastCheckOut = cache?.lastCheckOut ?? attRecord?.punchOut ?? null;
        const lastScreenshotAt = lastScreenshot?.timestamp ?? null;

        if (deviceId && (lastCheckIn != null || lastCheckOut != null) && (!cache?.lastCheckIn && !cache?.lastCheckOut)) {
            try {
                const setFields = { lastUpdated: new Date() };
                if (lastCheckIn != null) setFields.lastCheckIn = lastCheckIn;
                if (lastCheckOut != null) setFields.lastCheckOut = lastCheckOut;
                await MonitoringAttendanceCache.findOneAndUpdate(
                    { deviceId },
                    { $set: setFields, $setOnInsert: { deviceId, employeeID: employeeId, tenantId } },
                    { upsert: true }
                );
            } catch { /* ignore */ }
        }

        if (deviceId && cache) {
            const exitSec = cache.totalTrackedSecondsAtExit;
            const exitAt = cache.totalTrackedSecondsAtExitUpdatedAt ? new Date(cache.totalTrackedSecondsAtExitUpdatedAt) : null;
            const todayEnd = new Date(start);
            todayEnd.setUTCDate(todayEnd.getUTCDate() + 1);
            if (typeof exitSec === 'number' && exitSec > totalTrackedSeconds && exitAt && exitAt >= start && exitAt < todayEnd) {
                totalTrackedSeconds = exitSec;
            }
        }

        const totalWorkMinutes = Math.round(totalTrackedSeconds / 60);

        res.status(200).json({
            totalWorkMinutes,
            totalTrackedSeconds,
            activeMinutes,
            idleMinutes,
            status: device.status ?? 'active',
            lastCheckIn: lastCheckIn ? lastCheckIn.toISOString() : null,
            lastCheckOut: lastCheckOut ? lastCheckOut.toISOString() : null,
            lastScreenshotAt: lastScreenshotAt ? lastScreenshotAt.toISOString() : null
        });
    } catch (error) {
        console.error('[Summary getToday] Error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};
