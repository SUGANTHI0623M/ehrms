const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/deviceController');
const { protectDevice, protectDeviceForLogout } = require('../middleware/deviceAuth');
const rateLimit = require('express-rate-limit');

const registerLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    message: { success: false, message: 'Too many registration attempts' }
});

// Per-IP: 30/min allows frequent heartbeats for 100+ devices (each ~1/min)
const heartbeatLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: parseInt(process.env.HEARTBEAT_RATE_LIMIT_PER_MIN, 10) || 30,
    message: { success: false, message: 'Too many heartbeat requests' }
});

router.post('/register', registerLimiter, deviceController.registerDevice);
router.get('/settings', protectDevice, deviceController.getSettings);
router.get('/profile', protectDevice, deviceController.getProfile);
router.patch('/autoupdate', protectDevice, deviceController.updateAutoupdate);
router.get('/version-check', protectDevice, deviceController.versionCheck);
router.get('/attendance-status', protectDevice, deviceController.getAttendanceStatus);
router.post('/ack-attendance-alert', protectDevice, deviceController.ackAttendanceAlert);
router.post('/heartbeat', heartbeatLimiter, protectDevice, deviceController.heartbeat);
router.post('/set-inactive', protectDeviceForLogout, deviceController.setInactive);
router.post('/set-logout', protectDeviceForLogout, deviceController.setLogout);
router.post('/set-exit', protectDeviceForLogout, deviceController.setExit);
router.post('/start', protectDeviceForLogout, deviceController.startDevice);

module.exports = router;
