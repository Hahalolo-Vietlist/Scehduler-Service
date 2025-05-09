// middleware/auth/checkRole.js
const { AppError } = require('../../utils/errorHandler');

/**
 * Middleware to check if user has required roles/permissions to access a route
 * @param {Array|String} allowedRoles - Array of roles that can access this route
 * @param {Boolean} requireActiveSubscription - Whether an active subscription is required
 * @returns {Function} Express middleware function
 */
const checkRole = (options = {}) => {
  const {
    allowedRoles = [],
    requireActiveSubscription = false,
    requiredPermissions = []
  } = options;

  // Convert single values to arrays for consistent handling
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];

  return (req, res, next) => {
    try {
      // 1. Check if user object exists (set by auth middleware)
      if (!req.user) {
        return next(new AppError('Authentication required', 401, 'AUTH_REQUIRED'));
      }

      // 2. Check user role if roles are specified
      if (roles.length > 0 && !roles.includes(req.user.role)) {
        return next(new AppError('You do not have permission to access this resource', 403, 'INSUFFICIENT_ROLE'));
      }

      // 3. Check specific permissions if required
      if (permissions.length > 0) {
        const hasAllPermissions = permissions.every(permission => 
          req.user.permissions && req.user.permissions.includes(permission)
        );
        
        if (!hasAllPermissions) {
          return next(new AppError('You do not have the required permissions', 403, 'INSUFFICIENT_PERMISSIONS'));
        }
      }

      // 4. Check if active subscription is required
      if (requireActiveSubscription) {
        const hasActiveSubscription = req.user.subscription && 
                                    req.user.subscription.status === 'Active';
        
        if (!hasActiveSubscription) {
          return next(new AppError('This action requires an active subscription', 402, 'SUBSCRIPTION_REQUIRED'));
        }
      }

      // All checks passed, continue to the next middleware
      next();
    } catch (error) {
      next(new AppError('Authorization check failed', 500, 'AUTH_CHECK_ERROR'));
    }
  };
};

module.exports = checkRole;