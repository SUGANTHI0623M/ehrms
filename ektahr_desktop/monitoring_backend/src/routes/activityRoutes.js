const express = require('express');
const router = express.Router();
const activityController = require('../controllers/activityController');
const { protectDevice } = require('../middleware/deviceAuth');
const rateLimit = require('express-rate-limit');

// Per-IP: 120/min allows 100+ devices with staggered uploads (each ~1/min activity + screenshots)
const uploadLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: parseInt(process.env.UPLOAD_RATE_LIMIT_PER_MIN, 10) || 120,
    message: { success: false, message: 'Rate limit exceeded' }
});

router.post('/upload', uploadLimiter, protectDevice, activityController.uploadActivity);

module.exports = router;
