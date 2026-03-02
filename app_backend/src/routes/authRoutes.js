const express = require('express');
const rateLimit = require('express-rate-limit');
const { createRateLimitHandler } = require('../utils/rateLimitHandler');
const router = express.Router();
const {
    login,
    googleLogin,
    register,
    getProfile,
    updateProfile,
    updateEducation,
    updateExperience,
    forgotPassword,
    verifyOTP,
    resetPassword,
    changePassword,
    updateProfilePhoto,
    verifyFace,
    checkActive
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const multer = require('multer');

// Rate limiting for auth: 40 req/15min per IP (login, profile, photo, verify-face, etc.)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 40,
    standardHeaders: true,
    legacyHeaders: false,
    handler: createRateLimitHandler('Too many authentication attempts. Please try again later.')
});

// Use memory storage for simple pass-through to Cloudinary
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } // 5 MB
});

// Public auth routes with stricter limits
router.post('/login', authLimiter, login);
router.post('/google-login', authLimiter, googleLogin);
router.post('/register', authLimiter, register);

// Password reset with OTP flow (also behind stricter limits)
router.post('/forgot-password', authLimiter, forgotPassword);
console.log('[AuthRoutes] Registered POST /forgot-password');
router.post('/verify-otp', authLimiter, verifyOTP);
router.post('/reset-password', authLimiter, resetPassword);

// Check if current staff is still active (app polls every 5s; deactivated -> silent logout)
router.get('/check-active', protect, checkActive);

// Authenticated profile routes (auth check first, then rate limit)
router.get('/profile', protect, authLimiter, getProfile);
router.put('/profile', protect, authLimiter, updateProfile);
router.patch('/profile/education', protect, authLimiter, updateEducation);
router.patch('/profile/experience', protect, authLimiter, updateExperience);

// Change password (old + new)
router.post('/change-password', protect, authLimiter, changePassword);

// Update profile photo (uploaded file -> Cloudinary)
router.post(
    '/profile-photo',
    protect,
    authLimiter,
    upload.single('file'),
    updateProfilePhoto
);

// Verify face (selfie vs profile photo) – expect JSON { selfie: "data:image/...;base64,..." }
router.post('/verify-face', protect, authLimiter, verifyFace);

module.exports = router;