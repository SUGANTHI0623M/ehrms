const express = require('express');
const { startTracking, getTrackingData, storeTracking } = require('../controllers/trackingController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Mobile app: store tracking point (Start Ride + every 15 sec)
router.post('/store', protect, storeTracking);

// Admin fetches tracking records (staffId, taskId, from, to, limit)
router.get('/', protect, getTrackingData);

// Admin starts tracking a staff by staffId
router.post('/start', protect, startTracking);

module.exports = router;
