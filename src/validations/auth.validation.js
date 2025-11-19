const Joi = require('joi');
const { password } = require('./custom.validation');

// Add custom phone validation
const phoneValidation = (value, helpers) => {
  // Remove any spaces or special characters except +
  const cleanNumber = value.replace(/[^\d+]/g, '');
  // Check if number starts with +
  if (!cleanNumber.startsWith('+')) {
    return helpers.error('string.pattern.base', { message: 'Phone number must start with + followed by country code' });
  }

  // Check if there's a country code after +
  if (cleanNumber.length < 3) {
    return helpers.error('string.pattern.base', { message: 'Phone number must include country code after +' });
  }

  // Check total length (including + and country code)
  if (cleanNumber.length < 8 || cleanNumber.length > 16) {
    return helpers.error('string.pattern.base', {
      message: 'Phone number must be between 8 and 16 digits including country code',
    });
  }

  // Check if there are only digits after +
  if (!/^\+\d+$/.test(cleanNumber)) {
    return helpers.error('string.pattern.base', { message: 'Phone number can only contain digits after +' });
  }

  return cleanNumber;
};

const register = {
  body: Joi.object().keys({
    email: Joi.string().trim().email().required(),
    phoneNumber: Joi.string().custom(phoneValidation).required().messages({
      'string.empty': 'Phone number is required',
      'any.required': 'Phone number is required',
      'string.pattern.base': '{{#message}}',
    }),
    password: Joi.string().required().min(6).custom(password).messages({
      'string.min': 'Password must be at least 6 characters long',
      'any.custom': 'Password must contain at least one letter and one number',
    }),
    user_details: Joi.object({
      name: Joi.string().trim().required(),
      country: Joi.string().trim().required(),
      gender: Joi.string().valid('Male', 'Female', 'Other').optional(),
    }).required(),
    acceptedTerms: Joi.boolean().default(false),
    role: Joi.string().valid('user', 'admin').default('user'),
  }),
};

const requestOtp = {
  body: Joi.object().keys({
    phoneNumber: Joi.string().custom(phoneValidation).required().messages({
      'string.empty': 'Phone number is required',
      'any.required': 'Phone number is required',
      'string.pattern.base': '{{#message}}',
    }),
    development: Joi.boolean().optional(),
  }),
};
const verifyOtp = {
  body: Joi.object().keys({
    phoneNumber: Joi.string().custom(phoneValidation).required().messages({
      'string.empty': 'Phone number is required',
      'any.required': 'Phone number is required',
      'string.pattern.base': '{{#message}}',
    }),
    otp: Joi.number().required(),
    userDeviceToken: Joi.string().optional(),
  }),
};

const checkUserValidation = {
  body: Joi.object().keys({
    email: Joi.string().email().required(),
    phoneNumber: Joi.string().min(7).max(15).required(),
    password: Joi.string().required().custom(password),
  }),
};

const login = {
  body: Joi.object().keys({
    emailOrUsername: Joi.string().required().messages({
      'string.empty': 'Please provide your email, username, or name',
      'any.required': 'Please provide your email, username, or name',
    }),
    password: Joi.string().required(),
  }),
};

const logout = {
  body: Joi.object().keys({
    refreshToken: Joi.string().required(),
  }),
};

const refreshTokens = {
  body: Joi.object().keys({
    refreshToken: Joi.string().required(),
  }),
};

const forgotPassword = {
  body: Joi.object().keys({
    email: Joi.string().email().required().messages({
      'string.empty': 'Email is required',
      'any.required': 'Email is required',
      'string.email': 'Please provide a valid email address',
    }),
  }),
};

const senEmailForRecover = {
  body: Joi.object().keys({
    email: Joi.string().email().required(),
    type: Joi.string().valid('forgot-password', 'get-passkey').required(),
  }),
};

const resetPassword = {
  query: Joi.object().keys({
    token: Joi.string().required().messages({
      'string.empty': 'Reset token is required',
      'any.required': 'Reset token is required',
    }),
  }),
  body: Joi.object().keys({
    password: Joi.string().required().min(6).custom(password).messages({
      'string.empty': 'New password is required',
      'any.required': 'New password is required',
      'string.min': 'Password must be at least 6 characters long',
      'any.custom': 'Password must contain at least one letter and one number',
    }),
  }),
};

const changePassword = {
  body: Joi.object().keys({
    oldPassword: Joi.string().required(),
    newPassword: Joi.string().required().custom(password).messages({
      'string.empty': 'New password is required',
      'any.required': 'New password is required',
      'string.min': 'Password must be at least 8 characters long',
      'any.custom': 'Password must contain at least one letter and one number',
    }),
  }),
};

const verifyEmail = {
  query: Joi.object().keys({
    token: Joi.string().required(),
  }),
};

const verifyLogin2FA = {
  body: Joi.object().keys({
    code: Joi.string().required().messages({
      'any.required': '2FA code is required',
      'string.empty': '2FA code is required',
    }),
    emailOrUsername: Joi.string().required().messages({
      'string.empty': 'Please provide your email, username, or name',
      'any.required': 'Please provide your email, username, or name',
    }),
    password: Joi.string().required(),
  }),
};

module.exports = {
  register,
  login,
  logout,
  refreshTokens,
  forgotPassword,
  senEmailForRecover,
  resetPassword,
  verifyEmail,
  requestOtp,
  verifyOtp,
  changePassword,
  checkUserValidation,
  verifyLogin2FA,
};
