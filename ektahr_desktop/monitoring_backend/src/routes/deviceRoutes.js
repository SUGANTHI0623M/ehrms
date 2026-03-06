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

const heartbeatLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: { success: false, message: 'Too many heartbeat requests' }
});

router.post('/register', registerLimiter, deviceController.registerDevice);
router.post('/heartbeat', heartbeatLimiter, protectDevice, deviceController.heartbeat);
router.post('/set-inactive', protectDeviceForLogout, deviceController.setInactive);
router.post('/set-logout', protectDeviceForLogout, deviceController.setLogout);
router.post('/set-exit', protectDeviceForLogout, deviceController.setExit);
router.post('/start', protectDeviceForLogout, deviceController.startDevice);

module.exports = router;
