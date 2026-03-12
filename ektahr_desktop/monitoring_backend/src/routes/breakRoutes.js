const express = require('express');
const router = express.Router();
const breakController = require('../controllers/breakController');
const { protectDevice } = require('../middleware/deviceAuth');

router.get('/limit-check', protectDevice, breakController.checkLimit);
router.post('/start', protectDevice, breakController.startBreak);
router.patch('/:id', protectDevice, breakController.endBreak);

module.exports = router;
