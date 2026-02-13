/**
 * FCM (Firebase Cloud Messaging) – single module for all push notifications.
 * Uses Firebase Admin SDK. Set GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT_PATH to service account JSON.
 */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

let _initialized = false;

function init() {
    if (_initialized) return admin.app();
    const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS ||
        process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
        path.join(process.cwd(), 'firebase-service-account.json');
    if (!fs.existsSync(credPath)) {
        console.warn('[FCM] Service account file not found:', credPath, '- push notifications disabled');
        return null;
    }
    try {
        const key = JSON.parse(fs.readFileSync(credPath, 'utf8'));
        admin.initializeApp({ credential: admin.credential.cert(key) });
        _initialized = true;
        console.log('[FCM] Initialized');
    } catch (e) {
        console.error('[FCM] Init failed:', e.message);
        return null;
    }
    return admin.app();
}

/**
 * Send a notification to a single device token.
 * @param {string} token - FCM device token
 * @param {object} options - { title, body, data }
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
async function sendToToken(token, { title, body, data = {} }) {
    const app = init();
    if (!app) return { success: false, error: 'FCM not initialized' };
    if (!token || typeof token !== 'string') return { success: false, error: 'Missing token' };
    if (Array.isArray(token)) return { success: false, error: 'Must send to one token only, not multiple' };
    try {
        const payload = {
            token,
            notification: { title: title || 'HRMS', body: body || '' },
            data: Object.fromEntries(
                Object.entries(data).map(([k, v]) => [String(k), String(v == null ? '' : v)])
            ),
            android: { priority: 'high' },
        };
        await admin.messaging().send(payload);
        return { success: true };
    } catch (e) {
        console.error('[FCM] sendToToken failed:', e.message);
        return { success: false, error: e.message };
    }
}

/**
 * Send "Leave approved" notification to the employee who requested the leave.
 * Uses leave.employeeId (staff id from leaves collection) to find that staff's FCM token.
 * Only call this from an authenticated route (e.g. updateLeaveStatus with protect middleware).
 * @param {object} leaveDoc - Leave document from leaves collection (status = Approved)
 * @param {object} [staff] - Staff document with fcmToken (optional; if not passed, loaded by leave.employeeId)
 */
async function sendLeaveApprovedNotification(leaveDoc, staff = null) {
    const Staff = require('../models/Staff');
    const employeeId = leaveDoc.employeeId && leaveDoc.employeeId._id ? leaveDoc.employeeId._id : leaveDoc.employeeId;
    if (!employeeId) {
        console.warn('[FCM] sendLeaveApproved: leave has no employeeId');
        return { success: false, error: 'No employeeId' };
    }
    const staffDoc = staff || await Staff.findById(employeeId).select('fcmToken _id').lean();
    if (!staffDoc) {
        console.warn('[FCM] sendLeaveApproved: staff not found', employeeId);
        return { success: false, error: 'Staff not found' };
    }
    const staffIdMatch = String(staffDoc._id) === String(employeeId);
    if (!staffIdMatch) {
        console.warn('[FCM] sendLeaveApproved: staff id mismatch – only sending to leave owner');
        return { success: false, error: 'Staff id must be leave owner' };
    }
    const fcmToken = staffDoc.fcmToken;
    if (!fcmToken || typeof fcmToken !== 'string') {
        console.warn('[FCM] sendLeaveApproved: no fcmToken for staff', employeeId);
        return { success: false, error: 'No FCM token for employee' };
    }
    const leaveType = leaveDoc.leaveType || 'Leave';
    const startDate = leaveDoc.startDate ? new Date(leaveDoc.startDate) : null;
    const dateStr = startDate
        ? startDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
        : 'the requested date';
    const body = `Your leave request approved for ${leaveType} on ${dateStr}`;
    const staffIdStr = employeeId.toString && employeeId.toString() || String(employeeId);
    const leaveIdStr = (leaveDoc._id && leaveDoc._id.toString) ? leaveDoc._id.toString() : '';
    console.log('[FCM] Sending leave approved to this employee only: staffId=', staffIdStr, 'leaveId=', leaveIdStr, '(1 token, not broadcast)');
    return sendToToken(fcmToken, {
        title: 'Leave Approved',
        body,
        data: {
            module: 'leave',
            type: 'leave_approved',
            staffId: staffIdStr,
            leaveType,
            date: dateStr,
            leaveId: leaveIdStr,
        },
    });
}

/**
 * Send "Leave rejected" notification to the employee. Call when status changes from Pending to Rejected.
 */
async function sendLeaveRejectedNotification(leaveDoc, staff = null) {
    const Staff = require('../models/Staff');
    const employeeId = leaveDoc.employeeId && leaveDoc.employeeId._id ? leaveDoc.employeeId._id : leaveDoc.employeeId;
    if (!employeeId) return { success: false, error: 'No employeeId' };
    const staffDoc = staff || await Staff.findById(employeeId).select('fcmToken _id').lean();
    if (!staffDoc) {
        console.warn('[FCM] sendLeaveRejected: staff not found', employeeId);
        return { success: false, error: 'Staff not found' };
    }
    const staffIdMatch = String(staffDoc._id) === String(employeeId);
    if (!staffIdMatch) {
        console.warn('[FCM] sendLeaveRejected: staff id mismatch – only sending to leave owner');
        return { success: false, error: 'Staff id must be leave owner' };
    }
    const fcmToken = staffDoc.fcmToken;
    if (!fcmToken || typeof fcmToken !== 'string') {
        console.warn('[FCM] sendLeaveRejected: no fcmToken for staff', employeeId);
        return { success: false, error: 'No FCM token for employee' };
    }
    const leaveType = leaveDoc.leaveType || 'Leave';
    const startDate = leaveDoc.startDate ? new Date(leaveDoc.startDate) : null;
    const dateStr = startDate
        ? startDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
        : '';
    const body = dateStr
        ? `Your leave request for ${leaveType} on ${dateStr} was rejected.`
        : `Your leave request for ${leaveType} was rejected.`;
    const staffIdStr = employeeId.toString && employeeId.toString() || String(employeeId);
    const leaveIdStr = (leaveDoc._id && leaveDoc._id.toString) ? leaveDoc._id.toString() : '';
    console.log('[FCM] Sending leave rejected to this employee only: staffId=', staffIdStr, 'leaveId=', leaveIdStr, '(1 token, not broadcast)');
    return sendToToken(fcmToken, {
        title: 'Leave Rejected',
        body,
        data: {
            module: 'leave',
            type: 'leave_rejected',
            staffId: staffIdStr,
            leaveType,
            date: dateStr,
            leaveId: leaveIdStr,
        },
    });
}

/**
 * Send a generic notification (for future use: loan approved, expense, etc.).
 * @param {string} token - FCM token
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} data - Optional key-value data for app (strings only)
 */
async function sendNotification(token, title, body, data = {}) {
    return sendToToken(token, { title, body, data });
}

module.exports = {
    init,
    sendToToken,
    sendLeaveApprovedNotification,
    sendLeaveRejectedNotification,
    sendNotification,
};
