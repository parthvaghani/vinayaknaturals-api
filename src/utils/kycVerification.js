const httpStatus = require('http-status');
const { User } = require('../models');
const ApiError = require('./ApiError');
const logger = require('../config/logger');
const { VERIFICATION_STATUS } = require('./constants');

/**
 * Verify a user's KYC status
 *
 * This utility function checks if a user has completed KYC verification.
 * It can accept either a user object or a user ID.
 * If a user object is provided with the kycVerificationStatus field, it uses that directly.
 * If a user ID is provided, it fetches the user from the database.
 *
 * Usage examples:
 * 1. With user ID: await checkKycVerification(userId, 'Custom error message');
 * 2. With user object: await checkKycVerification(user, 'Custom error message');
 *
 * @param {string|object} userOrUserId - User object or user ID
 * @param {string} [errorMessage] - Custom error message if KYC is not verified
 * @returns {Promise<object>} - Returns the user object if KYC is verified
 * @throws {ApiError} - Throws an error if user is not found or KYC is not verified
 */
const checkKycVerification = async (userOrUserId, errorMessage) => {
  try {
    let user;

    if (userOrUserId && typeof userOrUserId === 'object' && 'kycVerificationStatus' in userOrUserId) {
      user = userOrUserId;
    } else {
      const userId = typeof userOrUserId === 'object' ? userOrUserId?._id : userOrUserId;
      user = await User.findById(userId);

      if (!user) {
        throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
      }
    }

    if (user.kycVerificationStatus !== VERIFICATION_STATUS.APPROVED) {
      throw new ApiError(
        httpStatus.FORBIDDEN,
        errorMessage || 'KYC verification required. Please complete your KYC verification before proceeding.',
      );
    }

    return user;
  } catch (error) {
    if (error.statusCode === httpStatus.FORBIDDEN) {
      const userId = typeof userOrUserId === 'object' ? userOrUserId?._id || 'unknown' : userOrUserId;
      logger.warn(`KYC verification failed for user ${userId}: ${error.message}`);
    }
    throw error;
  }
};

module.exports = {
  checkKycVerification,
};
