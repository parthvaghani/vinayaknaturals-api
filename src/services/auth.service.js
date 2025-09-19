/* eslint-disable no-unused-vars */
const httpStatus = require('http-status');
const tokenService = require('./token.service');
const userService = require('./user.service');
const emailService = require('./email.service');
const Token = require('../models/token.model');
const ApiError = require('../utils/ApiError');
const { tokenTypes } = require('../config/tokens');
const { User, OTP } = require('../models');
const { default: axios } = require('axios');
const validator = require('validator');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

/**
 * Login with email, username (businessName) or name
 * @param {string} emailOrUsername
 * @param {string} password
 * @returns {Promise<User>}
 */
const loginUserWithEmailAndPassword = async (emailOrUsername, password) => {
  if (!emailOrUsername) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email or username is required');
  }

  try {
    let user;

    // Check if input is an email
    const isEmail = validator.isEmail(emailOrUsername);

    if (isEmail) {
      // Try to find user by email
      user = await userService.getUserByEmail(emailOrUsername);
    } else {
      // Try to find user by businessName (username) or name
      user = await User.findOne({
        $or: [{ businessName: emailOrUsername }, { 'user_details.name': emailOrUsername }],
      });
    }

    if (!user) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'Incorrect email/username/name or password');
    }

    if (!user.isActive) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'Your account has been deactivated. Please contact support.');
    }

    if (!(await user.isPasswordMatch(password))) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'Incorrect email/username/name or password');
    }

    if (user.twoFAEnabled) {
      return {
        user: {
          id: user.id,
          email: user.email,
          emailOrUsername: user.emailOrUsername,
          password: password,
          twoFAEnabled: true,
        },
        twoFAEnabled: true,
      };
    }

    const tokens = await tokenService.generateAuthTokens(user);
    return { user, tokens };
  } catch (error) {
    throw new ApiError(httpStatus.UNAUTHORIZED, error.message || 'Authentication failed');
  }
};
/**
 * Login with username and password
 * @param {string} email
 * @param {string} password
 * @param {string} phoneNumber
 * @param {string} method
 * @returns {Promise<User>}
 */

const checkUser = async (userBody) => {
  if (userBody.email && (await User.isEmailTaken(userBody.email))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  }
  if (userBody.phoneNumber && (await User.isPhoneNumberTaken(userBody.phoneNumber))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'PhoneNumber already taken!');
  }

  return { phoneNumberTaken: false, emailTaken: false };
};

const loginAdmin = async (email, password, phoneNumber, method) => {
  if (!method) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Method is required!');
  } else if (method === 'otp' && !phoneNumber) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Phone number is required!');
  } else if (method === 'email' && !email) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email is required!');
  } else if (method === 'email' && !password) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Password is required!');
  }
  if (method === 'email') {
    const user = await userService.getUserByEmail(email);
    if (user && user.role !== 'admin') {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'Unauthorized access!');
    }
    if (!user || !(await user.isPasswordMatch(password))) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'Incorrect email or password');
    }
    const tokens = await tokenService.generateAuthTokens(user);
    let userObj = user;
    if (user.role === 'admin') {
      userObj = {
        ...(user._doc ? user._doc : user),
        userType: user.userType || null,
        permissions: user.permissions || [],
      };
    }
    return { success: true, user: userObj, tokens, message: 'Logged in successfully!' };
  } else {
    const otp = await generateOTP();
    const isAdmin = await userService.getUserByPhone(phoneNumber);
    if (!isAdmin) throw new ApiError(httpStatus.UNAUTHORIZED, 'Unauthorized access!');
    const result = await userService.sendOTP(phoneNumber, otp);
    return { success: true, otp: result.otp, message: 'OTP sent successfully' };
  }
};

/**
 * Logout
 * @param {string} refreshToken
 * @returns {Promise}
 */
const logout = async (refreshToken) => {
  const refreshTokenDoc = await Token.findOne({ token: refreshToken, type: tokenTypes.REFRESH, blacklisted: false });
  if (!refreshTokenDoc) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Not found');
  }
  await refreshTokenDoc.remove();
};

/**
 * Refresh auth tokens
 * @param {string} refreshToken
 * @returns {Promise<Object>}
 */
const refreshAuth = async (refreshToken) => {
  try {
    const refreshTokenDoc = await tokenService.verifyToken(refreshToken, tokenTypes.REFRESH);
    const user = await userService.getUserById(refreshTokenDoc.user);
    if (!user) {
      throw new Error();
    }
    // await refreshTokenDoc.remove();
    await Token.deleteOne({ _id: refreshTokenDoc.id });
    return tokenService.generateAuthTokens(user);
  } catch (error) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Please authenticate');
  }
};

/**
 * Forgot password - send reset password email
 * @param {string} email
 * @returns {Promise}
 */
const forgotPassword = async (email) => {
  const user = await userService.getUserByEmail(email);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'The email you entered is incorrect or not registered.');
  }
  const resetPasswordToken = await tokenService.generateResetPasswordToken(user.email);
  await emailService.sendResetPasswordEmail(user.email, resetPasswordToken, user.role);
};

/**
 * Reset password
 * @param {string} resetPasswordToken
 * @param {string} newPassword
 * @returns {Promise}
 */
const resetPassword = async (resetPasswordToken, newPassword) => {
  try {
    const resetPasswordTokenDoc = await tokenService.verifyToken(resetPasswordToken, tokenTypes.RESET_PASSWORD);
    const user = await userService.getUserById(resetPasswordTokenDoc.user);
    if (!user) {
      throw new Error();
    }
    await userService.updateUserById(user.id, { password: newPassword });
    await Token.deleteMany({ user: user.id, type: tokenTypes.RESET_PASSWORD });
  } catch (error) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Password reset failed');
  }
};

/**
 * Change password for authenticated user
 * @param {ObjectId} userId
 * @param {string} oldPassword
 * @param {string} newPassword
 * @returns {Promise}
 */
const changePassword = async (userId, oldPassword, newPassword) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  const isMatch = await user.isPasswordMatch(oldPassword);
  if (!isMatch) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Current password is incorrect');
  }
  try {
    await userService.updateUserById(user.id, { password: newPassword });
    return { success: true, message: 'Password changed successfully' };
  } catch (error) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Password change failed');
  }
};

/**
 * Generate OTP
 * @returns {Promise<number>}
 */
const generateOTP = async (phoneNumber, development) => {
  if (!phoneNumber || !phoneNumber.startsWith('+')) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Invalid Phone number! Phone number must start with + followed by country code',
    );
  }

  // Whitelisted numbers for testing (update these as needed)
  const whitelistedNumbers = ['+919537262686', '+916353528830', '+1234567890'];

  if (whitelistedNumbers.includes(phoneNumber)) {
    return 123456;
  }

  const min = 100000;
  const max = 999999;
  const randomNumber = Math.floor(Math.random() * (max - min + 1)) + min;
  if (development) {
    return randomNumber;
  } else {
    try {
      // Update SMS API to handle international numbers
      const Response = await axios.post(
        `https://sms.mobileadz.in/api/push?apikey=66b30dfd2498d&sender=FREYTO&mobileno=${encodeURIComponent(phoneNumber)}&text=Dear%20Customer,%20Your%20one%20time%20password%20is%20${randomNumber}%20Please%20enter%20OTP%20to%20login%20proceed.%20Team%20Freyto`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
      if (Response.status === 200) {
        return randomNumber;
      }
    } catch (error) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'OTP generation error! Please check if the phone number is valid.');
    }
  }
};

/**
 * Verify OTP
 * @param {string} phoneNumber
 * @param {number} otp
 * @returns {Promise<{ isNewUser: boolean; user?: User }>}
 */
const verifyOTPByPhone = async (phoneNumber, otp, userDeviceToken) => {
  if (!phoneNumber || !phoneNumber.startsWith('+')) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Invalid Phone number! Phone number must start with + followed by country code',
    );
  } else if (!otp) throw new ApiError(httpStatus.BAD_REQUEST, 'OTP is required!');

  const user = await userService.getUserByPhone(phoneNumber);
  let result;
  const otpRecord = await OTP.findOne({ phoneNumber });
  if (!otpRecord) throw new ApiError(httpStatus.BAD_REQUEST, 'OTP is not generated for given number!');

  const isExistsOTP = await OTP.findOne({
    phoneNumber,
    otp,
  });

  if (new Date(isExistsOTP?.expireAt) < new Date()) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'OTP has expired. Request again!');
  }

  if (!isExistsOTP) throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid OTP!');
  if (!user) {
    result = { isNewUser: true };
  } else {
    const tokens = await tokenService.generateAuthTokens(user);
    user.userDeviceToken = userDeviceToken;
    user.save();
    result = { user: user, tokens, isNewUser: false };
  }
  return result;
};

/**
 * Verify email
 * @param {string} phoneNumber
 * @returns {Promise}
 */

/**
 * Verify email
 * @param {string} verifyEmailToken
 * @returns {Promise}
 */
const verifyEmail = async (verifyEmailToken) => {
  try {
    const verifyEmailTokenDoc = await tokenService.verifyToken(verifyEmailToken, tokenTypes.VERIFY_EMAIL);
    const user = await userService.getUserById(verifyEmailTokenDoc.user);
    if (!user) {
      throw new Error();
    }
    await Token.deleteMany({ user: user.id, type: tokenTypes.VERIFY_EMAIL });
    await userService.updateUserById(user.id, { isEmailVerified: true });
  } catch (error) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Email verification failed');
  }
};

/**
 * Generate new Finflex keys for a user
 * @param {string} keyType - Type of keys to generate ('test' or 'live')
 * @returns {Object} Generated keys
 */
const generateFinFlexKeys = (keyType) => {
  if (!['test', 'live'].includes(keyType)) {
    throw new Error('Invalid key type. Must be either "test" or "live"');
  }

  // Generate a secure random string for non-access keys
  const generateSecureKey = (prefix) => {
    const randomBytes = crypto.randomBytes(16);
    const randomString = randomBytes.toString('hex');
    return `${prefix}_${keyType}_${randomString}`;
  };

  // Generate access key using UUID v4
  const generateAccessKey = (prefix) => {
    const uuid = uuidv4();
    return `${prefix}_${keyType}_${uuid}`;
  };

  return {
    accessKey: generateAccessKey('finflex'),
    merchantKey: generateSecureKey('finflex'),
    apiPassword: generateSecureKey('finflex'),
  };
};

module.exports = {
  loginUserWithEmailAndPassword,
  checkUser,
  loginAdmin,
  logout,
  refreshAuth,
  forgotPassword,
  resetPassword,
  verifyEmail,
  generateOTP,
  verifyOTPByPhone,
  changePassword,
  generateFinFlexKeys,
};
