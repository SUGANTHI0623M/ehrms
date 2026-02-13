const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { registerFcmToken } = require('../controllers/notificationController');

router.post('/fcm-token', protect, registerFcmToken);

module.exports = router;
