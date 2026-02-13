// Cron: long-running process. Every 5 seconds, check leaves and send FCM for approved/rejected not yet notified.
// Run: npm run cron  (keeps running until you stop it; use PM2 or systemd to run in production).
require('dotenv').config();
const connectDB = require('../config/db');
const fcmService = require('../services/fcmService');
const Leave = require('../models/Leave');
const Staff = require('../models/Staff');

const INTERVAL_MS = 5 * 1000; // 5 seconds

async function runOnce() {
    try {
        // Clear FCM tokens for deactivated staff so they stop receiving push and backend state is clean
        const deactivatedResult = await Staff.updateMany(
            { status: { $regex: /^deactivated$/i }, fcmToken: { $exists: true, $ne: null } },
            { $unset: { fcmToken: 1 } }
        );
        if (deactivatedResult.modifiedCount > 0) {
            console.log('[Cron] Cleared FCM token for', deactivatedResult.modifiedCount, 'deactivated staff');
        }

        const pendingApproved = await Leave.find({
            status: 'Approved',
            approvedAt: { $exists: true, $ne: null },
            $or: [
                { fcmNotificationSentAt: null },
                { fcmNotificationSentAt: { $exists: false } }
            ]
        }).lean();

        const pendingRejected = await Leave.find({
            status: 'Rejected',
            approvedAt: { $exists: true, $ne: null },
            $or: [
                { fcmRejectionSentAt: null },
                { fcmRejectionSentAt: { $exists: false } }
            ]
        }).lean();

        let sentApproved = 0;
        for (const leave of pendingApproved) {
            const employeeId = leave.employeeId && leave.employeeId._id ? leave.employeeId._id : leave.employeeId;
            const staff = await Staff.findById(employeeId).select('fcmToken _id').lean();
            if (staff && String(staff._id) === String(employeeId)) {
                const result = await fcmService.sendLeaveApprovedNotification(leave, staff);
                if (result.success) {
                    await Leave.findByIdAndUpdate(leave._id, { fcmNotificationSentAt: new Date() });
                    sentApproved++;
                }
            }
        }

        let sentRejected = 0;
        for (const leave of pendingRejected) {
            const employeeId = leave.employeeId && leave.employeeId._id ? leave.employeeId._id : leave.employeeId;
            const staff = await Staff.findById(employeeId).select('fcmToken _id').lean();
            if (staff && String(staff._id) === String(employeeId)) {
                const result = await fcmService.sendLeaveRejectedNotification(leave, staff);
                if (result.success) {
                    await Leave.findByIdAndUpdate(leave._id, { fcmRejectionSentAt: new Date() });
                    sentRejected++;
                }
            }
        }

        const total = sentApproved + sentRejected;
        if (total > 0 || pendingApproved.length > 0 || pendingRejected.length > 0) {
            console.log('[Cron]', new Date().toISOString(), '| approved: pending=', pendingApproved.length, 'sent=', sentApproved, '| rejected: pending=', pendingRejected.length, 'sent=', sentRejected);
        }
    } catch (e) {
        console.error('[Cron] Error:', e.message);
    }
}

async function start() {
    console.log('[Cron] Starting (interval=', INTERVAL_MS / 1000, 'sec). Will run until stopped.');
    await connectDB();
    fcmService.init();
    await runOnce();
    setInterval(runOnce, INTERVAL_MS);
}

start().catch((e) => {
    console.error('[Cron] Startup failed:', e.message);
    process.exit(1);
});
