/**
 * Attendance check cron: runs separately for best server performance.
 * Uses Attendance collection punchIn / punchOut (today's record) to decide tracking:
 * - If no check-in for today (no punchIn) → do not track.
 * - If checked in (punchIn set, punchOut null) → track; show alert "You have checked in. Start tracking."
 * - If checked out (punchOut set) → insert productivity for that date if not there, then stop tracking; show alert "You have checked out. Stop tracking."
 * Updates MonitoringAttendanceCache. The agent polls /api/device/attendance-status which reads from cache.
 */
require('dotenv').config();
const path = require('path');
const mongoose = require('../config/mongoose');
const connectDB = require('../config/db');

const Device = require('../models/Device');
const MonitoringAttendanceCache = require('../models/MonitoringAttendanceCache');
const appBackendRoot = path.join(__dirname, '../../../../', 'app_backend');
const Attendance = require(path.join(appBackendRoot, 'src', 'models', 'Attendance'));
const { upsertDailySummaryForStaff } = require('./dailySummary');

function startOfDayUTC(d) {
    const x = new Date(d);
    x.setUTCHours(0, 0, 0, 0);
    return x;
}

async function runAttendanceCheck() {
    await connectDB();

    const today = startOfDayUTC(new Date());

    // Only devices that are logged in and active (not exited/logout) – tracking is allowed only for these
    const devices = await Device.find({
        isActive: true,
        status: 'active'
    })
        .select('deviceId employeeID tenantId')
        .lean();

    let updated = 0;
    for (const dev of devices) {
        try {
            const endOfToday = new Date(today);
            endOfToday.setUTCDate(endOfToday.getUTCDate() + 1);
            // Attendance model: punchIn / punchOut define start and end of tracking for the day
            const att = await Attendance.findOne({
                $or: [{ employeeId: dev.employeeID }, { user: dev.employeeID }],
                date: { $gte: today, $lt: endOfToday }
            })
                .select('punchIn punchOut')
                .lean();

            const punchIn = att?.punchIn ? new Date(att.punchIn) : null;
            const punchOut = att?.punchOut ? new Date(att.punchOut) : null;
            // Track only when checked in and not yet checked out (no punchIn → don't track)
            const shouldTrack = !!(punchIn && !punchOut);

            const existing = await MonitoringAttendanceCache.findOne({ deviceId: dev.deviceId }).lean();
            const previousShouldTrack = existing?.shouldTrack ?? null;

            let alertToShow = null;
            if (previousShouldTrack === false && shouldTrack) {
                alertToShow = 'start_tracking';
            } else if (previousShouldTrack === true && !shouldTrack) {
                alertToShow = 'stop_tracking';
                // On checkout: insert productivity for that date if record not there, then stop tracking
                try {
                    await upsertDailySummaryForStaff(dev.tenantId, dev.employeeID, today);
                    console.log('[AttendanceCheckCron] Daily summary upserted on checkout', { deviceId: dev.deviceId, employeeID: dev.employeeID });
                } catch (summaryErr) {
                    console.error('[AttendanceCheckCron] Daily summary error on checkout:', dev.deviceId, summaryErr.message);
                }
            }

            await MonitoringAttendanceCache.findOneAndUpdate(
                { deviceId: dev.deviceId },
                {
                    $set: {
                        deviceId: dev.deviceId,
                        employeeID: dev.employeeID,
                        tenantId: dev.tenantId,
                        shouldTrack,
                        lastCheckIn: punchIn,
                        lastCheckOut: punchOut,
                        alertToShow,
                        previousShouldTrack: existing?.shouldTrack ?? shouldTrack,
                        lastUpdated: new Date()
                    }
                },
                { upsert: true, new: true }
            );
            updated++;
        } catch (err) {
            console.error('[AttendanceCheckCron] Device error:', dev.deviceId, err.message);
        }
    }

    return updated;
}

const INTERVAL_MS = 60 * 1000; // 1 min

if (require.main === module) {
    const runOnce = () => runAttendanceCheck().catch((e) => console.error('[AttendanceCheckCron]', e?.message || e));
    runOnce(); // run immediately
    setInterval(runOnce, INTERVAL_MS); // then every 1 min (no exit – stop with Ctrl+C)
}

module.exports = { runAttendanceCheck };
