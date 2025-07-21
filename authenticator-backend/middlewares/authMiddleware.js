const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Authentication middleware to verify JWT token and attach user to request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const authMiddleware = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    
    // Check if token exists
    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: 'Authentication required. Please log in.'
      });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Session expired. Please log in again.',
          code: 'TOKEN_EXPIRED'
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Invalid token. Please log in again.',
        code: 'INVALID_TOKEN'
      });
    }

    // Check if user still exists
    const currentUser = await User.findById(decoded.id).select('-password');
    if (!currentUser) {
      return res.status(401).json({
        success: false,
        message: 'The user belonging to this token no longer exists.',
        code: 'USER_NOT_FOUND'
      });
    }

    // Check if user changed password after the token was issued
    if (currentUser.passwordChangedAt) {
      const changedTimestamp = parseInt(
        currentUser.passwordChangedAt.getTime() / 1000,
        10
      );

      if (decoded.iat < changedTimestamp) {
        return res.status(401).json({
          success: false,
          message: 'User recently changed password. Please log in again.',
          code: 'PASSWORD_CHANGED'
        });
      }
    }

    // Grant access to protected route
    req.user = currentUser;
    req.token = token;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred during authentication',
      code: 'AUTH_ERROR'
    });
  }
};

module.exports = authMiddleware;
