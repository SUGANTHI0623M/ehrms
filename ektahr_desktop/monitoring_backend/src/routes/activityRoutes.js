const express = require('express');
const router = express.Router();
const activityController = require('../controllers/activityController');
const { protectDevice } = require('../middleware/deviceAuth');
const rateLimit = require('express-rate-limit');

const uploadLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    message: { success: false, message: 'Rate limit exceeded' }
});

router.post('/upload', uploadLimiter, protectDevice, activityController.uploadActivity);

module.exports = router;
