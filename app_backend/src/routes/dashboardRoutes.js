const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { protect } = require('../middleware/authMiddleware');

// High-throughput rate limiting for dashboard APIs
const dashboardLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 2000, // allow up to 2000 requests per IP per minute
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many dashboard requests, please wait a moment and try again.'
});

// Apply rate limiting after authentication for dashboard routes
router.get('/stats', protect, dashboardLimiter, dashboardController.getDashboardStats);
router.get('/employee', protect, dashboardLimiter, dashboardController.getEmployeeDashboardStats);

module.exports = router;
