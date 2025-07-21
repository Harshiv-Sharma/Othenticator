const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { generateTOTPSecret, generateQRCode, verifyTOTP } = require('../utils/totp');
const logger = require('../utils/logger');
const crypto = require('crypto');
const { sendPasswordResetEmail } = require('../utils/email');

// Helper function to mask sensitive data
const maskSensitiveData = (data) => {
  if (!data) return data;
  const masked = { ...data };
  if (masked.password) masked.password = '******';
  if (masked.token) masked.token = '******';
  if (masked.totpSecret) masked.totpSecret = '******';
  return masked;
};

// Register user
exports.register = async (req, res) => {
  const requestId = req.id || 'unknown-request';
  const requestData = maskSensitiveData(req.body);
  
  logger.info('Registration attempt', {
    requestId,
    email: requestData.email,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    timestamp: new Date().toISOString()
  });
  
  // Log raw request body (without sensitive data)
  logger.debug('Registration request body', {
    requestId,
    body: requestData
  });

  try {
    const { email, password } = req.body;
    if (!email || !password) {
      logger.warn('Missing required fields', { requestId, email: !!email, passwordProvided: !!password });
      return res.status(400).json({ 
        success: false,
        message: 'Email and password are required',
        code: 'MISSING_FIELDS'
      });
    }
    
    const userExists = await User.findOne({ email });
    if (userExists) {
      logger.warn('Registration failed - email already in use', { requestId, email });
      return res.status(409).json({ 
        success: false,
        message: 'Email already in use',
        code: 'EMAIL_IN_USE'
      });
    }
    
    const hashedPassword = await bcrypt.hash(password, 12);
    
    try {
      const user = await User.create({ 
        email, 
        password: hashedPassword,
        is2FAEnabled: false
      });
      
      // Generate JWT token for immediate login after registration
      const token = jwt.sign(
        { id: user._id, email: user.email }, 
        process.env.JWT_SECRET, 
        { expiresIn: '1h' }
      );
      
      logger.info('User registered successfully', { 
        requestId, 
        userId: user._id,
        email: user.email 
      });
      
      res.status(201).json({ 
        success: true,
        message: 'Registration successful',
        token,
        user: {
          id: user._id,
          email: user.email,
          is2FAEnabled: user.is2FAEnabled
        }
      });
    } catch (dbError) {
      logger.error('Database error during registration', { 
        requestId, 
        error: dbError.message,
        stack: process.env.NODE_ENV === 'development' ? dbError.stack : undefined
      });
      
      throw dbError; // Let the error handler middleware handle it
    }
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
};

// Login user
exports.login = async (req, res) => {
  const requestId = req.id || 'unknown-request';
  const requestData = maskSensitiveData(req.body);
  
  logger.info('Login attempt', {
    requestId,
    email: requestData.email,
    hasToken: !!requestData.token,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });

  try {
    const { email, password, token } = req.body;
    
    // Input validation
    if (!email || !password) {
      logger.warn('Login failed - missing credentials', { 
        requestId, 
        email: !!email, 
        passwordProvided: !!password 
      });
      
      return res.status(400).json({ 
        success: false,
        message: 'Email and password are required',
        code: 'MISSING_CREDENTIALS'
      });
    }
    
    // Find user by email
    let user;
    try {
      user = await User.findOne({ email }).select('+password');
      if (!user) {
        logger.warn('Login failed - user not found', { requestId, email });
        return res.status(401).json({ 
          success: false,
          message: 'Invalid email or password',
          code: 'INVALID_CREDENTIALS'
        });
      }
    } catch (dbError) {
      logger.error('Database error during login', { 
        requestId, 
        error: dbError.message,
        stack: process.env.NODE_ENV === 'development' ? dbError.stack : undefined
      });
      
      throw dbError; // Let the error handler middleware handle it
    }
    
    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      logger.warn('Login failed - invalid password', { 
        requestId, 
        userId: user._id,
        email: user.email 
      });
      
      return res.status(401).json({ 
        success: false,
        message: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      });
    }
    
    // Handle 2FA if enabled
    if (user.is2FAEnabled) {
      if (!token) {
        // First step of 2FA login - return that 2FA is required
        const tempToken = jwt.sign(
          { id: user._id, email: user.email, twoFactorPending: true },
          process.env.JWT_SECRET,
          { expiresIn: '5m' } // Short-lived token for 2FA verification
        );
        
        logger.info('2FA required for login', { 
          requestId, 
          userId: user._id,
          email: user.email 
        });
        
        return res.status(202).json({ 
          success: true,
          message: '2FA verification required',
          twoFactorRequired: true,
          tempToken
        });
      } else {
        // Verify 2FA token
        const verified = verifyTOTP(token, user.totpSecret);
        if (!verified) {
          logger.warn('2FA verification failed', { 
            requestId, 
            userId: user._id,
            email: user.email 
          });
          
          return res.status(401).json({ 
            success: false,
            message: 'Invalid verification code',
            code: 'INVALID_2FA_CODE'
          });
        }
        
        logger.info('2FA verification successful', { 
          requestId, 
          userId: user._id,
          email: user.email 
        });
      }
    }
    
    // Generate final JWT token
    const jwtToken = jwt.sign(
      { 
        id: user._id, 
        email: user.email,
        is2FAEnabled: user.is2FAEnabled || false
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    // Log successful login
    logger.info('User logged in successfully', { 
      requestId, 
      userId: user._id,
      email: user.email,
      has2FA: !!user.is2FAEnabled
    });
    
    // Return success response with user data
    res.json({
      success: true,
      message: 'Login successful',
      token: jwtToken,
      user: {
        id: user._id,
        email: user.email,
        is2FAEnabled: user.is2FAEnabled || false
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
};

// Enable 2FA
exports.enable2FA = async (req, res) => {
  const requestId = req.id || 'unknown-request';
  const userId = req.user?.id;
  
  logger.info('Enabling 2FA', {
    requestId,
    userId,
    ip: req.ip
  });
  
  try {
    if (!userId) {
      logger.warn('2FA enable failed - missing user ID', { requestId });
      return res.status(401).json({ 
        success: false,
        message: 'Authentication required',
        code: 'UNAUTHORIZED'
      });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      logger.warn('2FA enable failed - user not found', { requestId, userId });
      return res.status(404).json({ 
        success: false,
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }
    
    // If user already has a TOTP secret and has not completed verification yet,
    // reuse it so the QR code remains the same when the page refreshes.
    let secretStr = user.totpSecret;
    let otpauthUrl;
    let qrCode;

    if (!secretStr || user.is2FAEnabled) {
      // Generate a NEW secret only if none exists OR 2FA is already enabled and user wants to reset.
      const secretObj = generateTOTPSecret(user.email);
      secretStr = secretObj.base32;
      otpauthUrl = secretObj.otpauth_url;
      qrCode = await generateQRCode(otpauthUrl);

      user.totpSecret = secretStr;
      user.is2FAEnabled = false;
      await user.save();
    } else {
      // Recreate otpauth URL & QR from the existing secret
      otpauthUrl = `otpauth://totp/AuthenticatorApp%20(${encodeURIComponent(user.email)})?secret=${secretStr}&issuer=AuthenticatorApp`;
      qrCode = await generateQRCode(otpauthUrl);
    }
    
    logger.info('2FA enabled successfully', { 
      requestId, 
      userId: user._id,
      email: user.email 
    });
    
    res.json({ 
      success: true,
      message: '2FA enabled successfully',
      otpauthUrl, 
      qrCode 
    });
    
  } catch (err) {
    logger.error('Failed to enable 2FA', {
      requestId,
      userId,
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
    
    res.status(500).json({ 
      success: false,
      message: 'Failed to enable 2FA. Please try again.',
      code: '2FA_ENABLE_FAILED'
    });
  }
};

// Verify 2FA code
exports.verify2FA = async (req, res) => {
  const requestId = req.id || 'unknown-request';
  const userId = req.user?.id;
  const { token } = req.body;
  
  logger.info('Verifying 2FA code', {
    requestId,
    userId,
    hasToken: !!token,
    ip: req.ip
  });
  
  try {
    if (!userId) {
      logger.warn('2FA verification failed - missing user ID', { requestId });
      return res.status(401).json({ 
        success: false,
        message: 'Authentication required',
        code: 'UNAUTHORIZED'
      });
    }
    
    if (!token) {
      logger.warn('2FA verification failed - missing token', { requestId, userId });
      return res.status(400).json({ 
        success: false,
        message: 'Verification code is required',
        code: 'MISSING_VERIFICATION_CODE'
      });
    }
    
    const user = await User.findById(userId);
    if (!user || !user.totpSecret) {
      logger.warn('2FA verification failed - 2FA not enabled', { requestId, userId });
      return res.status(400).json({ 
        success: false,
        message: '2FA is not enabled for this account',
        code: '2FA_NOT_ENABLED'
      });
    }
    
    const verified = verifyTOTP(token, user.totpSecret);
    if (!verified) {
      logger.warn('2FA verification failed - invalid code', { 
        requestId, 
        userId: user._id,
        email: user.email 
      });
      
      return res.status(401).json({ 
        success: false,
        message: 'Invalid verification code',
        code: 'INVALID_2FA_CODE'
      });
    }
    
    logger.info('2FA verification successful', { 
      requestId, 
      userId: user._id,
      email: user.email 
    });
    
    res.json({ 
      success: true,
      message: '2FA verification successful' 
    });
    
  } catch (err) {
    logger.error('2FA verification failed', {
      requestId,
      userId,
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
    
    res.status(500).json({ 
      success: false,
      message: '2FA verification failed. Please try again.',
      code: '2FA_VERIFICATION_FAILED'
    });
  }
};

// Protected route example
exports.protected = (req, res) => {
  const requestId = req.id || 'unknown-request';
  const userId = req.user?.id;
  
  logger.info('Protected route accessed', {
    requestId,
    userId,
    path: req.path,
    method: req.method
  });
  
  res.json({ 
    success: true,
    message: 'You have accessed a protected route!', 
    user: {
      id: req.user?.id,
      email: req.user?.email,
      is2FAEnabled: req.user?.is2FAEnabled || false
    }
  });
};

// Disable 2FA
exports.disable2FA = async (req, res) => {
  const requestId = req.id || 'unknown-request';
  const userId = req.user?.id;

  logger.info('Disabling 2FA', { requestId, userId });

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.is2FAEnabled = false;
    user.totpSecret = '';
    await user.save();

    res.json({ success: true, message: 'Two-factor authentication disabled' });
  } catch (err) {
    logger.error('Disable 2FA failed', { requestId, error: err.message });
    res.status(500).json({ success: false, message: 'Failed to disable 2FA' });
  }
};

// Generate a random 6-digit code
const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Forgot Password – generate and send verification code
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  const requestId = req.id || 'unknown-request';
  logger.info('Forgot password request', { requestId, email });

  try {
    const user = await User.findOne({ email });
    if (!user) {
      logger.info('No user found for email', { requestId, email });
      return res.status(200).json({ 
        success: true, // Still return success to prevent email enumeration
        message: 'If an account exists with this email, a verification code has been sent.'
      });
    }

    // Generate a 6-digit verification code
    const verificationCode = generateVerificationCode();
    const hashedCode = crypto.createHash('sha256').update(verificationCode).digest('hex');
    
    // Set code and expiry (10 minutes)
    user.passwordResetToken = hashedCode;
    user.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save({ validateBeforeSave: false });

    try {
      // In development, log the code to console
      console.log('\n--- PASSWORD RESET CODE ---');
      console.log(`Verification code for ${email}: ${verificationCode}`);
      await sendPasswordResetEmail(email, verificationCode);
      console.log('----------------------------\n');
      
      // In production, you would uncomment this:
      // await sendPasswordResetEmail(email, verificationCode);
      
      return res.json({ 
        success: true, 
        message: 'A verification code has been sent to your email.',
        email: email // Return email for the frontend to use in the next step
      });
      
    } catch (error) {
      console.error('Error sending verification code:', error);
      return res.status(500).json({
        success: false,
        message: 'An error occurred while sending the verification code.'
      });
    }
    
  } catch (err) {
    logger.error('Forgot password error', { requestId, error: err.message, stack: err.stack });
    return res.status(500).json({ 
      success: false, 
      message: 'An error occurred while processing your request.' 
    });
  }
};

// Verify reset code
exports.verifyResetCode = async (req, res) => {
  const { email, code } = req.body;
  const requestId = req.id || 'unknown-request';
  
  try {
    const user = await User.findOne({ 
      email,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code.'
      });
    }

    const hashedCode = crypto.createHash('sha256').update(code).digest('hex');
    const isValid = user.passwordResetToken === hashedCode;

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification code.'
      });
    }

    // Generate a one-time reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save({ validateBeforeSave: false });

    return res.json({
      success: true,
      message: 'Verification successful',
      resetToken
    });

  } catch (err) {
    logger.error('Verify reset code error', { requestId, error: err.message });
    return res.status(500).json({
      success: false,
      message: 'An error occurred while verifying the code.'
    });
  }
};

// Reset password using token
exports.resetPassword = async (req, res) => {
  const { token, password, email } = req.body;
  const requestId = req.id || 'unknown-request';

  logger.info('Reset password attempt', { requestId });

  if (!token || !email) {
    return res.status(400).json({ 
      success: false, 
      message: 'Reset token and email are required' 
    });
  }

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  try {
    const user = await User.findOne({
      email,
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid or expired reset token' 
      });
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.passwordChangedAt = Date.now();
    
    await user.save();

    logger.info('Password reset successful', { userId: user._id });
    
    res.json({ 
      success: true, 
      message: 'Password has been reset successfully. You can now log in with your new password.'
    });
  } catch (err) {
    logger.error('Reset password error', { 
      requestId, 
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
    res.status(500).json({ 
      success: false, 
      message: 'An error occurred while resetting your password.' 
    });
  }
};
