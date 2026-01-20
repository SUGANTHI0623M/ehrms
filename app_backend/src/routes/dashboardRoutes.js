const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { protect } = require('../middleware/authMiddleware'); // Assuming auth middleware exists

router.get('/stats', protect, dashboardController.getDashboardStats);
router.get('/employee', protect, dashboardController.getEmployeeDashboardStats);

module.exports = router;
