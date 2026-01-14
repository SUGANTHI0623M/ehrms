const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { checkIn, checkOut, getTodayAttendance, getAttendanceHistory } = require('../controllers/attendanceController');

router.post('/checkin', protect, checkIn);
router.put('/checkout', protect, checkOut);
router.get('/today', protect, getTodayAttendance);
router.get('/history', protect, getAttendanceHistory);

module.exports = router;