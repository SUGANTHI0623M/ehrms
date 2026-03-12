const path = require('path');
const ActivityLog = require('../models/ActivityLog');
const MonitoringAttendanceCache = require('../models/MonitoringAttendanceCache');
const Screenshot = require('../models/Screenshot');
const appBackendRoot = path.join(__dirname, '../../../../', 'app_backend');
const Attendance = require(path.join(appBackendRoot, 'src', 'models', 'Attendance'));

/** GET /summary/today - Aggregate today's activity from activity logs for the device's employee. Includes check-in/check-out and last screenshot. */
exports.getToday = async (req, res) => {
    try {
        const device = req.device;
        const employeeId = device?.employeeID;
        const tenantId = device?.tenantId;
        if (!employeeId || !tenantId) {
            return res.status(401).json({ message: 'Device context missing' });
        }
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(end.getDate() + 1);

        const result = await ActivityLog.aggregate([
            { $match: { tenantId, employeeID: employeeId, timestamp: { $gte: start, $lt: end } } },
            {
                $group: {
                    _id: null,
                    totalMinutes: { $sum: 1 },
                    totalIdleSeconds: { $sum: '$idleSeconds' }
                }
            }
        ]);

        const totalMinutes = result[0]?.totalMinutes ?? 0;
        const totalIdleSeconds = result[0]?.totalIdleSeconds ?? 0;
        const totalWorkMinutes = totalMinutes;
        const idleMinutes = Math.round(totalIdleSeconds / 60);
        const totalTrackedSeconds = totalMinutes * 60;
        const activeSeconds = Math.max(0, totalTrackedSeconds - totalIdleSeconds);
        const activeMinutes = Math.round(activeSeconds / 60);

        const deviceId = device?.deviceId;
        let lastCheckIn = null;
        let lastCheckOut = null;
        let lastScreenshotAt = null;
        if (deviceId) {
            const [cache, lastScreenshot, attRecord] = await Promise.all([
                MonitoringAttendanceCache.findOne({ deviceId }).select('lastCheckIn lastCheckOut').lean(),
                Screenshot.findOne({ deviceId, tenantId, timestamp: { $gte: start, $lt: end } }).sort({ timestamp: -1 }).select('timestamp').lean(),
                Attendance.findOne({
                    $or: [{ employeeId }, { user: employeeId }],
                    date: { $gte: start, $lt: end }
                }).select('punchIn punchOut').lean()
            ]);
            lastCheckIn = cache?.lastCheckIn ?? attRecord?.punchIn ?? null;
            lastCheckOut = cache?.lastCheckOut ?? attRecord?.punchOut ?? null;
            lastScreenshotAt = lastScreenshot?.timestamp ?? null;
            if ((lastCheckIn != null || lastCheckOut != null) && (!cache?.lastCheckIn && !cache?.lastCheckOut)) {
                try {
                    const setFields = { lastUpdated: new Date() };
                    if (lastCheckIn != null) setFields.lastCheckIn = lastCheckIn;
                    if (lastCheckOut != null) setFields.lastCheckOut = lastCheckOut;
                    await MonitoringAttendanceCache.findOneAndUpdate(
                        { deviceId },
                        { $set: setFields, $setOnInsert: { deviceId, employeeID: employeeId, tenantId } },
                        { upsert: true }
                    );
                } catch { /* ignore cache update errors */ }
            }
        }

        res.status(200).json({
            totalWorkMinutes: totalWorkMinutes,
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
