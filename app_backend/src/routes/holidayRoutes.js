
const express = require('express');
const router = express.Router();
const { getEmployeeHolidays } = require('../controllers/holidayController');
// Assuming authMiddleware has a 'protect' or similar function. 
// Checking requestRoutes.js (Step 16) shows: const { protect } = require('../middleware/authMiddleware');
const { protect } = require('../middleware/authMiddleware');

router.get('/employee', protect, getEmployeeHolidays);

module.exports = router;
