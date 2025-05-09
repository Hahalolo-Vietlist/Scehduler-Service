// middleware/auth/tokenHelper.js
const jwt = require('jsonwebtoken');
const { AppError } = require('../../utils/errorHandler');

/**
 * Verify and decode JWT token
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded token payload
 */
const verifyToken = (token) => {
  try {
    // Verify token structure and signature
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    console.log("decoded", decoded);

    // Check token expiration
    if (decoded.exp && Date.now() >= decoded.exp * 1000) {
      throw new AppError('Token expired', 401, 'TOKEN_EXPIRED');
    }
    
    return decoded;
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      throw new AppError('Invalid token', 401, 'INVALID_TOKEN');
    }
    if (error.name === 'TokenExpiredError') {
      throw new AppError('Token expired', 401, 'TOKEN_EXPIRED');
    }
    throw error; // Rethrow other errors
  }
};

/**
 * Extract user ID from token without full validation
 * @param {string} token - JWT token
 * @returns {string|null} User ID or null if invalid token
 */
const extractUserId = (token) => {
  try {
    const decoded = jwt.decode(token);
    return decoded?.userId || null;
  } catch (error) {
    return null;
  }
};

/**
 * Check if token is within refresh window (e.g., 80% of its lifetime)
 * @param {Object} decodedToken - Decoded JWT token
 * @returns {boolean} True if token should be refreshed
 */
const isTokenNearExpiry = (decodedToken) => {
  if (!decodedToken.exp) return false;
  
  const expiryTime = decodedToken.exp * 1000; // Convert to milliseconds
  const currentTime = Date.now();
  const totalLifetime = expiryTime - (decodedToken.iat * 1000);
  const remainingTime = expiryTime - currentTime;
  
  // Return true if less than 20% of lifetime remains
  return remainingTime / totalLifetime < 0.2;
};

module.exports = {
  verifyToken,
  extractUserId,
  isTokenNearExpiry
};