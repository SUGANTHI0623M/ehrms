// Cron: long-running process. Every 5 seconds: FCM for approved/rejected (leave, expense, payslip, loan, attendance).
// Every run: performance deadline reminders, deactivated staff FCM cleanup.
// Attendance auto-mark is handled by the web; attendance approval/rejection notifications are sent here.
// Run: npm run cron. Only sends to staff with fcmToken. EXCLUDES LMS.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const connectDB = require('../config/db');
const fcmService = require('../services/fcmService');
const Leave = require('../models/Leave');
const Staff = require('../models/Staff');
const Expense = require('../models/Expense');
const Reimbursement = require('../models/Reimbursement');
const PayslipRequest = require('../models/PayslipRequest');
const Loan = require('../models/Loan');
const Attendance = require('../models/Attendance');
const PerformanceReview = require('../models/PerformanceReview');
const ReviewCycle = require('../models/ReviewCycle');
const User = require('../models/User');

const INTERVAL_MS = 5 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

async function runPerformanceDeadlineReminders() {
    let sent = 0;
    try {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const cycles = await ReviewCycle.find({
            status: { $nin: ['completed', 'cancelled'] },
            endDate: { $gte: now },
        }).lean();

        for (const cycle of cycles) {
            const selfD = new Date(cycle.selfReviewDeadline);
            const mgrD = new Date(cycle.managerReviewDeadline);
            const hrD = new Date(cycle.hrReviewDeadline);
            selfD.setHours(0, 0, 0, 0);
            mgrD.setHours(0, 0, 0, 0);
            hrD.setHours(0, 0, 0, 0);

            const daysSelf = Math.ceil((selfD.getTime() - now.getTime()) / ONE_DAY_MS);
            const daysMgr = Math.ceil((mgrD.getTime() - now.getTime()) / ONE_DAY_MS);
            const daysHr = Math.ceil((hrD.getTime() - now.getTime()) / ONE_DAY_MS);

            const remDays = [0, 1, 3, 7];

            if (remDays.includes(daysSelf) && daysSelf >= 0) {
                const q = { reviewCycle: cycle.name, status: { $in: ['self-review-pending', 'draft'] } };
                if (cycle.businessId) q.businessId = cycle.businessId;
                const reviews = await PerformanceReview.find(q).select('employeeId fcmSelfReviewReminderDaysSent').lean();
                for (const r of reviews) {
                    const sentList = r.fcmSelfReviewReminderDaysSent || [];
                    if (sentList.includes(daysSelf)) continue;
                    const empId = r.employeeId && r.employeeId._id ? r.employeeId._id : r.employeeId;
                    const staff = await Staff.findById(empId).select('fcmToken').lean();
                    if (!staff?.fcmToken || typeof staff.fcmToken !== 'string' || !staff.fcmToken.trim()) continue;
                    let title = '', body = '';
                    if (daysSelf === 0) { title = 'Self Review Deadline Today'; body = `Your self-review for "${cycle.name}" is due today. Please submit as soon as possible.`; }
                    else if (daysSelf === 1) { title = 'Self Review Deadline Tomorrow'; body = `Your self-review for "${cycle.name}" is due tomorrow (${selfD.toLocaleDateString()}).`; }
                    else if (daysSelf === 3) { title = 'Self Review Deadline in 3 Days'; body = `Your self-review for "${cycle.name}" is due in 3 days (${selfD.toLocaleDateString()}).`; }
                    else if (daysSelf === 7) { title = 'Self Review Deadline in 7 Days'; body = `Your self-review for "${cycle.name}" is due in 7 days (${selfD.toLocaleDateString()}).`; }
                    if (!body) continue;
                    const res = await fcmService.sendPerformanceDeadlineNotification(empId, title, body, { type: 'self_review', reviewCycle: cycle.name, daysRemaining: String(daysSelf) });
                    if (res.success) {
                        await PerformanceReview.findByIdAndUpdate(r._id, { $addToSet: { fcmSelfReviewReminderDaysSent: daysSelf } });
                        sent++;
                    }
                }
            }

            if (remDays.includes(daysMgr) && daysMgr >= 0) {
                const q = { reviewCycle: cycle.name, status: { $in: ['self-review-submitted', 'manager-review-pending'] } };
                if (cycle.businessId) q.businessId = cycle.businessId;
                const reviews = await PerformanceReview.find(q).populate('managerId', 'fcmToken').lean();
                const byManager = new Map();
                for (const r of reviews) {
                    const mgr = r.managerId;
                    const mgrId = mgr && (mgr._id || mgr) ? String(mgr._id || mgr) : null;
                    if (!mgrId) continue;
                    if (!byManager.has(mgrId)) byManager.set(mgrId, []);
                    byManager.get(mgrId).push(r);
                }
                for (const [mgrId, revs] of byManager) {
                    const r0 = revs[0];
                    const sentList = r0.fcmManagerReviewReminderDaysSent || [];
                    if (sentList.includes(daysMgr)) continue;
                    const staff = await Staff.findById(mgrId).select('fcmToken').lean();
                    if (!staff?.fcmToken || typeof staff.fcmToken !== 'string' || !staff.fcmToken.trim()) continue;
                    let title = '', body = '';
                    if (daysMgr === 0) { title = 'Manager Review Deadline Today'; body = `You have ${revs.length} manager review(s) for "${cycle.name}" due today.`; }
                    else if (daysMgr === 1) { title = 'Manager Review Deadline Tomorrow'; body = `You have ${revs.length} manager review(s) for "${cycle.name}" due tomorrow.`; }
                    else if (daysMgr === 3) { title = 'Manager Review Deadline in 3 Days'; body = `You have ${revs.length} manager review(s) for "${cycle.name}" due in 3 days.`; }
                    else if (daysMgr === 7) { title = 'Manager Review Deadline in 7 Days'; body = `You have ${revs.length} manager review(s) for "${cycle.name}" due in 7 days.`; }
                    if (!body) continue;
                    const res = await fcmService.sendPerformanceDeadlineNotification(mgrId, title, body, { type: 'manager_review', reviewCycle: cycle.name, daysRemaining: String(daysMgr) });
                    if (res.success) {
                        for (const r of revs) {
                            await PerformanceReview.findByIdAndUpdate(r._id, { $addToSet: { fcmManagerReviewReminderDaysSent: daysMgr } });
                        }
                        sent++;
                    }
                }
            }

            if (remDays.includes(daysHr) && daysHr >= 0) {
                const q = { reviewCycle: cycle.name, status: { $in: ['manager-review-submitted', 'hr-review-pending'] } };
                if (cycle.businessId) q.businessId = cycle.businessId;
                const pending = await PerformanceReview.find(q).lean();
                const count = pending.length;
                if (count === 0) continue;
                const hrSent = cycle.fcmHrReviewReminderDaysSent || [];
                if (hrSent.includes(daysHr)) continue;
                const hrQuery = { role: { $regex: /^(HR|Admin)$/i } };
                if (cycle.businessId) hrQuery.companyId = cycle.businessId;
                const hrUsers = await User.find(hrQuery).select('_id').lean();
                let hrCycleSent = 0;
                for (const u of hrUsers) {
                    const staff = await Staff.findOne({ userId: u._id }).select('fcmToken _id').lean();
                    if (!staff?.fcmToken || typeof staff.fcmToken !== 'string' || !staff.fcmToken.trim()) continue;
                    let title = '', body = '';
                    if (daysHr === 0) { title = 'HR Review Deadline Today'; body = `You have ${count} HR review(s) for "${cycle.name}" due today.`; }
                    else if (daysHr === 1) { title = 'HR Review Deadline Tomorrow'; body = `You have ${count} HR review(s) for "${cycle.name}" due tomorrow.`; }
                    else if (daysHr === 3) { title = 'HR Review Deadline in 3 Days'; body = `You have ${count} HR review(s) for "${cycle.name}" due in 3 days.`; }
                    else if (daysHr === 7) { title = 'HR Review Deadline in 7 Days'; body = `You have ${count} HR review(s) for "${cycle.name}" due in 7 days.`; }
                    if (!body) continue;
                    const res = await fcmService.sendPerformanceDeadlineNotification(staff._id, title, body, { type: 'hr_review', reviewCycle: cycle.name, daysRemaining: String(daysHr) });
                    if (res.success) { sent++; hrCycleSent++; }
                }
                if (hrCycleSent > 0) {
                    await ReviewCycle.findByIdAndUpdate(cycle._id, { $addToSet: { fcmHrReviewReminderDaysSent: daysHr } });
                }
            }
        }
        return sent;
    } catch (e) {
        // Performance deadline error (silent in dev)
        return 0;
    }
}

async function sendToStaff(employeeId, fn, doc, updateField) {
    const empId = doc.employeeId && doc.employeeId._id ? doc.employeeId._id : doc.employeeId;
    if (!empId) return false;
    const staff = await Staff.findById(empId).select('fcmToken _id').lean();
    if (!staff || String(staff._id) !== String(empId)) return false;
    if (!staff.fcmToken || typeof staff.fcmToken !== 'string' || !staff.fcmToken.trim()) return false;
    const res = await fn(doc, staff);
    if (res.success) {
        await updateField(doc._id);
        return true;
    }
    return false;
}

async function runOnce() {
    try {
        const deactivatedResult = await Staff.updateMany(
            { status: { $regex: /^deactivated$/i }, fcmToken: { $exists: true, $ne: null } },
            { $unset: { fcmToken: 1 } }
        );
        if (deactivatedResult.modifiedCount > 0) { /* cleared FCM token for deactivated staff */ }

        let totalSent = 0;

        const pendingApproved = await Leave.find({
            status: 'Approved',
            approvedAt: { $exists: true, $ne: null },
            $or: [{ fcmNotificationSentAt: null }, { fcmNotificationSentAt: { $exists: false } }],
        }).lean();
        const pendingRejected = await Leave.find({
            status: 'Rejected',
            approvedAt: { $exists: true, $ne: null },
            $or: [{ fcmRejectionSentAt: null }, { fcmRejectionSentAt: { $exists: false } }],
        }).lean();
        const expenseApproved = await Expense.find({
            status: 'Approved',
            $or: [{ fcmNotificationSentAt: null }, { fcmNotificationSentAt: { $exists: false } }],
        }).lean();
        const expenseRejected = await Expense.find({
            status: 'Rejected',
            $or: [{ fcmRejectionSentAt: null }, { fcmRejectionSentAt: { $exists: false } }],
        }).lean();
        const reimbursementApproved = await Reimbursement.find({
            status: 'Approved',
            $or: [{ fcmNotificationSentAt: null }, { fcmNotificationSentAt: { $exists: false } }],
        }).lean();
        const reimbursementRejected = await Reimbursement.find({
            status: 'Rejected',
            $or: [{ fcmRejectionSentAt: null }, { fcmRejectionSentAt: { $exists: false } }],
        }).lean();
        const payslipApproved = await PayslipRequest.find({
            status: { $in: ['Approved', 'Generated'] },
            $or: [{ fcmNotificationSentAt: null }, { fcmNotificationSentAt: { $exists: false } }],
        }).lean();
        const payslipRejected = await PayslipRequest.find({
            status: 'Rejected',
            $or: [{ fcmRejectionSentAt: null }, { fcmRejectionSentAt: { $exists: false } }],
        }).lean();
        const loanApproved = await Loan.find({
            status: 'Approved',
            approvedAt: { $exists: true, $ne: null },
            $or: [{ fcmNotificationSentAt: null }, { fcmNotificationSentAt: { $exists: false } }],
        }).lean();
        const loanRejected = await Loan.find({
            status: 'Rejected',
            $or: [{ fcmRejectionSentAt: null }, { fcmRejectionSentAt: { $exists: false } }],
        }).lean();
        const attApproved = await Attendance.find({
            status: 'Approved',
            $or: [{ fcmNotificationSentAt: null }, { fcmNotificationSentAt: { $exists: false } }],
        }).lean();
        const attRejected = await Attendance.find({
            status: 'Rejected',
            $or: [{ fcmRejectionSentAt: null }, { fcmRejectionSentAt: { $exists: false } }],
        }).lean();
        const attStatusChangeRaw = await Attendance.find({
            status: { $in: ['Present', 'Absent', 'Half Day', 'On Leave'] },
            $or: [{ fcmStatusChangeSentAt: null }, { fcmStatusChangeSentAt: { $exists: false } }],
        }).lean();
        // Deduplicate by (employeeId, date) so we send only ONE notification per employee per date (avoids 3x same notification)
        const attStatusByKey = new Map();
        for (const doc of attStatusChangeRaw) {
            const empId = doc.employeeId && doc.employeeId._id ? doc.employeeId._id : doc.employeeId || doc.user && doc.user._id ? doc.user._id : doc.user;
            if (!empId) continue;
            const dateStr = doc.date ? new Date(doc.date).toISOString().slice(0, 10) : '';
            const key = `${String(empId)}_${dateStr}`;
            if (!attStatusByKey.has(key)) attStatusByKey.set(key, []);
            attStatusByKey.get(key).push(doc);
        }
        const attStatusChange = Array.from(attStatusByKey.values()).map(group => group[0]);

        const pendingCount = pendingApproved.length + pendingRejected.length + expenseApproved.length + expenseRejected.length +
            reimbursementApproved.length + reimbursementRejected.length +
            payslipApproved.length + payslipRejected.length + loanApproved.length + loanRejected.length +
            attApproved.length + attRejected.length + attStatusChange.length;
        if (pendingCount > 0) { /* pending FCM */ }

        for (const leave of pendingApproved) {
            if (await sendToStaff(leave.employeeId, fcmService.sendLeaveApprovedNotification, leave, (id) =>
                Leave.findByIdAndUpdate(id, { fcmNotificationSentAt: new Date() })
            )) totalSent++;
        }

        for (const leave of pendingRejected) {
            if (await sendToStaff(leave.employeeId, fcmService.sendLeaveRejectedNotification, leave, (id) =>
                Leave.findByIdAndUpdate(id, { fcmRejectionSentAt: new Date() })
            )) totalSent++;
        }

        for (const doc of expenseApproved) {
            if (await sendToStaff(doc.employeeId, fcmService.sendExpenseApprovedNotification, doc, (id) =>
                Expense.findByIdAndUpdate(id, { fcmNotificationSentAt: new Date() })
            )) totalSent++;
        }

        for (const doc of expenseRejected) {
            if (await sendToStaff(doc.employeeId, fcmService.sendExpenseRejectedNotification, doc, (id) =>
                Expense.findByIdAndUpdate(id, { fcmRejectionSentAt: new Date() })
            )) totalSent++;
        }

        for (const doc of reimbursementApproved) {
            if (await sendToStaff(doc.employeeId, fcmService.sendExpenseApprovedNotification, doc, (id) =>
                Reimbursement.findByIdAndUpdate(id, { fcmNotificationSentAt: new Date() })
            )) totalSent++;
        }

        for (const doc of reimbursementRejected) {
            if (await sendToStaff(doc.employeeId, fcmService.sendExpenseRejectedNotification, doc, (id) =>
                Reimbursement.findByIdAndUpdate(id, { fcmRejectionSentAt: new Date() })
            )) totalSent++;
        }

        for (const doc of payslipApproved) {
            if (await sendToStaff(doc.employeeId, fcmService.sendPayslipApprovedNotification, doc, (id) =>
                PayslipRequest.findByIdAndUpdate(id, { fcmNotificationSentAt: new Date() })
            )) totalSent++;
        }

        for (const doc of payslipRejected) {
            if (await sendToStaff(doc.employeeId, fcmService.sendPayslipRejectedNotification, doc, (id) =>
                PayslipRequest.findByIdAndUpdate(id, { fcmRejectionSentAt: new Date() })
            )) totalSent++;
        }

        for (const doc of loanApproved) {
            if (await sendToStaff(doc.employeeId, fcmService.sendLoanApprovedNotification, doc, (id) =>
                Loan.findByIdAndUpdate(id, { fcmNotificationSentAt: new Date() })
            )) totalSent++;
        }

        for (const doc of loanRejected) {
            if (await sendToStaff(doc.employeeId, fcmService.sendLoanRejectedNotification, doc, (id) =>
                Loan.findByIdAndUpdate(id, { fcmRejectionSentAt: new Date() })
            )) totalSent++;
        }

        for (const doc of attApproved) {
            if (await sendToStaff(doc.employeeId, fcmService.sendAttendanceApprovedNotification, doc, (id) =>
                Attendance.findByIdAndUpdate(id, { fcmNotificationSentAt: new Date() })
            )) totalSent++;
        }

        for (const doc of attRejected) {
            if (await sendToStaff(doc.employeeId, fcmService.sendAttendanceRejectedNotification, doc, (id) =>
                Attendance.findByIdAndUpdate(id, { fcmRejectionSentAt: new Date() })
            )) totalSent++;
        }

        const attEmpId = (doc) => doc.employeeId && doc.employeeId._id ? doc.employeeId._id : doc.employeeId || doc.user && doc.user._id ? doc.user._id : doc.user;
        for (const doc of attStatusChange) {
            const empId = attEmpId(doc);
            const dateStr = doc.date ? new Date(doc.date).toISOString().slice(0, 10) : '';
            const groupKey = `${String(empId)}_${dateStr}`;
            const group = attStatusByKey.get(groupKey) || [doc];
            const updateAllInGroup = async () => {
                const ids = group.map(d => d._id).filter(Boolean);
                if (ids.length) await Attendance.updateMany({ _id: { $in: ids } }, { fcmStatusChangeSentAt: new Date() });
            };
            if (empId && await sendToStaff(empId, fcmService.sendAttendanceStatusChangeNotification, doc, () => updateAllInGroup())) totalSent++;
        }

        const perfReviewStatusChange = await PerformanceReview.find({
            status: { $nin: ['draft'] },
            $or: [
                { fcmStatusChangeSentForStatus: null },
                { fcmStatusChangeSentForStatus: { $exists: false } },
                { $expr: { $ne: ['$fcmStatusChangeSentForStatus', '$status'] } },
            ],
        }).populate('employeeId', '_id').lean();
        for (const doc of perfReviewStatusChange) {
            const empId = doc.employeeId && doc.employeeId._id ? doc.employeeId._id : doc.employeeId;
            const updateStatusSent = (id) => PerformanceReview.findByIdAndUpdate(id, { fcmStatusChangeSentForStatus: doc.status });
            if (empId && await sendToStaff(empId, fcmService.sendPerformanceReviewStatusChangeNotification, doc, updateStatusSent)) totalSent++;
        }

        const perfSent = await runPerformanceDeadlineReminders();
        totalSent += perfSent;

        if (totalSent > 0) { /* FCM sent */ }
    } catch (e) {
        console.error('[Cron] Error:', e.message);
    }
}

async function start() {
    console.log('[Cron] Started.');
    await connectDB();
    fcmService.init();
    await runOnce();
    setInterval(runOnce, INTERVAL_MS);
}

start().catch((e) => {
    console.error('[Cron] Startup failed:', e.message);
    process.exit(1);
});
