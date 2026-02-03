const express = require('express');
const rateLimit = require('express-rate-limit');
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
    verifyFace
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const multer = require('multer');

// Stricter rate limiting for authentication-related routes
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // limit each IP to 20 requests per window
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: 'Too many authentication attempts, please try again later.'
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
router.post('/verify-otp', authLimiter, verifyOTP);
router.post('/reset-password', authLimiter, resetPassword);

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