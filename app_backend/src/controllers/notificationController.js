const Staff = require('../models/Staff');
const fcmService = require('../services/fcmService');

/**
 * POST /api/notifications/send-push (internal: called by web backend to send FCM to mobile app)
 * Body: { fcmToken?: string, staffId?: string, title: string, body: string, data?: object }
 * If fcmToken provided, send to that token. If staffId provided (and no fcmToken), look up Staff.fcmToken and send.
 */
const sendPush = async (req, res) => {
    try {
        let fcmToken = req.body?.fcmToken;
        const staffId = req.body?.staffId;
        const title = req.body?.title;
        const body = req.body?.body;
        const data = req.body?.data || {};
        console.log('[notificationController] send-push received: title=', title, 'body=', (body || '').substring(0, 60), 'data.type=', data?.type, 'staffId=', staffId || 'n/a', 'hasFcmToken=', !!fcmToken);
        if (!title || typeof title !== 'string') {
            console.log('[notificationController] send-push rejected: title required');
            return res.status(400).json({
                success: false,
                error: { message: 'title is required' },
            });
        }
        if (!fcmToken && staffId) {
            const staff = await Staff.findById(staffId).select('fcmToken').lean();
            fcmToken = staff?.fcmToken;
            console.log('[notificationController] send-push looked up token by staffId:', staffId, 'found=', !!fcmToken);
        }
        if (!fcmToken || typeof fcmToken !== 'string' || !fcmToken.trim()) {
            console.log('[notificationController] send-push skip: no FCM token');
            return res.json({ success: true, message: 'No FCM token, skip' });
        }
        const tokenPreview = fcmToken.length > 20 ? fcmToken.substring(0, 10) + '...' + fcmToken.slice(-8) : fcmToken;
        console.log('[notificationController] send-push calling FCM token=', tokenPreview);
        const result = await fcmService.sendToToken(fcmToken.trim(), {
            title,
            body: body || '',
            data: typeof data === 'object' ? data : {},
        });
        if (!result.success) {
            console.error('[notificationController] send-push FCM failed:', result.error);
            return res.status(500).json({ success: false, error: { message: result.error || 'FCM send failed' } });
        }
        console.log('[notificationController] send-push success: title=', title);
        return res.json({ success: true, message: 'Push sent' });
    } catch (error) {
        console.error('[notificationController] sendPush:', error);
        return res.status(500).json({
            success: false,
            error: { message: error.message },
        });
    }
};

/**
 * POST /api/notifications/fcm-token (protected: requires Bearer token)
 * Body: { fcmToken: string } to register, or { fcmToken: "" } / {} to clear on logout
 * Uses the logged-in staff id from auth (req.staff._id). Register: store token for push. Clear: remove token so we stop sending to that device until they log in again.
 */
const registerFcmToken = async (req, res) => {
    try {
        const staffId = req.staff?._id;
        if (!staffId) {
            return res.status(401).json({ success: false, error: { message: 'Not authorized' } });
        }
        const fcmToken = req.body?.fcmToken;
        const staffIdStr = staffId.toString();

        if (fcmToken === undefined || fcmToken === null || (typeof fcmToken === 'string' && fcmToken.trim() === '')) {
            const before = await Staff.findById(staffId).select('fcmToken').lean();
            const hadToken = before && before.fcmToken && String(before.fcmToken).trim().length > 0;
            await Staff.findByIdAndUpdate(staffId, { $unset: { fcmToken: 1 } });
            console.log('[FCM] Logout: cleared fcmToken for staffId=', staffIdStr, 'hadToken=', hadToken, '– device will not receive push until they log in again');
            return res.json({ success: true, message: 'FCM token cleared' });
        }

        if (typeof fcmToken !== 'string') {
            return res.status(400).json({
                success: false,
                error: { message: 'fcmToken must be a string' },
            });
        }

        const tokenTrimmed = fcmToken.trim();
        if (!tokenTrimmed) {
            await Staff.findByIdAndUpdate(staffId, { $unset: { fcmToken: 1 } });
            console.log('[FCM] Logout: cleared fcmToken for staffId=', staffIdStr, '(empty string)');
            return res.json({ success: true, message: 'FCM token cleared' });
        }

        // Ensure this token is only stored for THIS staff: remove it from any other staff document
        await Staff.updateMany(
            { fcmToken: tokenTrimmed, _id: { $ne: staffId } },
            { $unset: { fcmToken: 1 } }
        );
        await Staff.findByIdAndUpdate(staffId, { $set: { fcmToken: tokenTrimmed } });
        const tokenPreview = tokenTrimmed.length > 20 ? tokenTrimmed.substring(0, 10) + '...' + tokenTrimmed.slice(-6) : tokenTrimmed;
        console.log('[FCM] Registered token for staffId=', staffIdStr, 'tokenLength=', tokenTrimmed.length, 'tokenPreview=', tokenPreview);
        return res.json({ success: true, message: 'FCM token registered' });
    } catch (error) {
        console.error('[notificationController] registerFcmToken:', error);
        return res.status(500).json({
            success: false,
            error: { message: error.message },
        });
    }
};

module.exports = {
    registerFcmToken,
    sendPush,
};
