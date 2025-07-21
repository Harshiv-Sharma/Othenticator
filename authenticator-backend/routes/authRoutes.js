const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');
const rateLimit = require('express-rate-limit');

// Rate limiter for 2FA endpoints
const twoFALimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: 'Too many 2FA attempts, please try again later.'
});

// Registration and login
router.post('/register', authController.register);
router.post('/login', authController.login);

// Enable 2FA (protected)
router.post('/enable-2fa', authMiddleware, authController.enable2FA);

// Verify 2FA code (protected, rate-limited)
router.post('/verify-2fa', authMiddleware, twoFALimiter, authController.verify2FA);

// Disable 2FA
router.post('/disable-2fa', authMiddleware, authController.disable2FA);

// Forgot password & reset
router.post('/forgot-password', authController.forgotPassword);
router.post('/verify-reset-code', authController.verifyResetCode);
router.post('/reset-password', authController.resetPassword);

// Protected route example
router.get('/protected', authMiddleware, authController.protected);

module.exports = router;
