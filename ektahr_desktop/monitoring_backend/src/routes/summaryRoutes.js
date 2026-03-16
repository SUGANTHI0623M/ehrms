const express = require('express');
const router = express.Router();
const summaryController = require('../controllers/summaryController');
const { protectDevice } = require('../middleware/deviceAuth');

router.get('/today', protectDevice, summaryController.getToday);
router.get('/today/updated', protectDevice, summaryController.getTodayUpdated);

module.exports = router;
