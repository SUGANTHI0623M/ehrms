const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
    checkIn,
    checkOut,
    getTodayAttendance,
    getAttendanceHistory,
    getMonthAttendance
} = require('../controllers/attendanceController');

// High-throughput rate limiting for attendance APIs
const attendanceLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 2000, // allow up to 2000 requests per IP per minute
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many attendance requests, please wait a moment and try again.'
});

// Apply rate limiting after authentication for all attendance routes
router.post('/checkin', protect, attendanceLimiter, checkIn);
router.put('/checkout', protect, attendanceLimiter, checkOut);
router.get('/today', protect, attendanceLimiter, getTodayAttendance);
router.get('/month', protect, attendanceLimiter, getMonthAttendance);
router.get('/history', protect, attendanceLimiter, getAttendanceHistory);

module.exports = router;