const Staff = require('../models/Staff');

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
            await Staff.findByIdAndUpdate(staffId, { $unset: { fcmToken: 1 } });
            console.log('[FCM] Cleared token on logout for staffId=', staffIdStr);
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
            console.log('[FCM] Cleared token for staffId=', staffIdStr);
            return res.json({ success: true, message: 'FCM token cleared' });
        }

        // Ensure this token is only stored for THIS staff: remove it from any other staff document
        await Staff.updateMany(
            { fcmToken: tokenTrimmed, _id: { $ne: staffId } },
            { $unset: { fcmToken: 1 } }
        );
        await Staff.findByIdAndUpdate(staffId, { $set: { fcmToken: tokenTrimmed } });
        console.log('[FCM] Registered token for this logged-in staff only: staffId=', staffIdStr);
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
};
