const httpStatus = require('http-status');
const jwt = require('jsonwebtoken');
const ApiError = require('../utils/ApiError');
const { roleRights } = require('../config/roles');
const { userService } = require('../services');
const config = require('../config/config');
const logger = require('../config/logger');

const verifyToken = (token) => {
  return new Promise((resolve, reject) => {
    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      resolve(decoded);
    } catch (err) {
      logger.error('Token verification failed:', err);
      reject(new ApiError(httpStatus.UNAUTHORIZED, 'Invalid token'));
    }
  });
};

const verifyCallback = (req, resolve, reject, requiredRights) => async (decoded) => {
  try {
    if (!decoded || !decoded.sub) {
      return reject(new ApiError(httpStatus.UNAUTHORIZED, 'Invalid token payload'));
    }

    // Convert string ID to ObjectId if needed
    const userId = decoded.sub;
    const user = await userService.getUserById(userId);
    if (!user) {
      logger.error(`User not found for ID: ${userId}`);
      return reject(new ApiError(httpStatus.UNAUTHORIZED, 'User not found'));
    }

    // Attach user to request
    req.user = user;

    // Check permissions if required
    if (requiredRights && requiredRights.length > 0) {
      const userRights = roleRights.get(user.role) || [];
      const hasRequiredRights = requiredRights.every((right) => userRights.includes(right));
      const isSameUser = req.params?.userId === user.id.toString();

      // Allow if user has rights and is accessing their own resource, or if user is admin
      if (!hasRequiredRights || (user.role !== 'admin' && !isSameUser)) {
        logger.error(`User ${user.id} lacks required rights: ${requiredRights.join(', ')}`);
        return reject(new ApiError(httpStatus.FORBIDDEN, 'Insufficient permissions'));
      }
    }

    resolve();
  } catch (err) {
    logger.error('Auth verification failed:', err);
    reject(new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Authorization failed'));
  }
};

const auth =
  (...requiredRights) =>
    async (req, res, next) => {
      try {
        const authHeader = req.header('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          if (config.env === 'local') {
            return next(new ApiError(httpStatus.UNAUTHORIZED, 'Please provide a valid JWT token'));
          }
          else {
            return res.status(httpStatus.UNAUTHORIZED).json({
              success: false,
              message: 'Please provide a valid JWT token',
            });
          }
        }

        const token = authHeader.replace('Bearer ', '');

        return new Promise((resolve, reject) => {
          verifyToken(token)
            .then(verifyCallback(req, resolve, reject, requiredRights))
            .catch((err) => reject(err));
        })
          .then(() => next())
          .catch((err) => next(err));
      } catch (error) {
        logger.error('Auth middleware error:', error);
        next(new ApiError(httpStatus.UNAUTHORIZED, 'Authentication failed'));
      }
    };

module.exports = auth;
