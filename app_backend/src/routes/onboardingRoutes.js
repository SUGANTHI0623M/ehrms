const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getMyOnboarding, getAllOnboardings } = require('../controllers/onboardingController');

// Get current user's onboarding
router.get('/my-onboarding', protect, getMyOnboarding);

// Get all onboardings (admin only)
router.get('/', protect, getAllOnboardings);

module.exports = router;
