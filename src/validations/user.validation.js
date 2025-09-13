const Joi = require('joi');
const { objectId, password } = require('./custom.validation');

const createUser = {
  body: Joi.object().keys({
    email: Joi.string().required().email(),
    // businessName: Joi.string().required().trim(),
    phoneNumber: Joi.string()
      .pattern(/^\+[1-9]\d{1,14}$/)
      .required()
      .messages({
        'string.pattern.base': 'Phone number must be in international format (e.g., +1234567890)',
      }),
    password: Joi.string().required().min(6).custom(password).messages({
      'string.min': 'Password must be at least 6 characters long',
      'any.custom': 'Password must contain at least one letter and one number',
    }),
    user_details: Joi.object({
      name: Joi.string().required().trim(),
      country: Joi.string().required().trim(),
    }).required(),
    role: Joi.string().valid('user', 'admin').default('user'),
    acceptedTerms: Joi.boolean().default(false),
  }),
};

const createAdmin = {
  body: Joi.object().keys({
    businessName: Joi.string().required().trim(),
    user_details: Joi.object({
      name: Joi.string().required().trim(),
    }).required(),
    role: Joi.string().valid('admin').default('admin'),
    userType: Joi.string().valid('super_admin', 'finance_admin', 'support_admin', 'view_only_admin'),
    email: Joi.string().required().email(),
    password: Joi.string().required().min(6).custom(password).messages({
      'string.min': 'Password must be at least 6 characters long',
      'any.custom': 'Password must contain at least one letter and one number',
    }),
    permissions: Joi.array().items(Joi.string()).optional(),
    isActive: Joi.boolean().default(true),
  }),
};

const getUsers = {
  query: Joi.object().keys({
    searchTerm: Joi.string(),
    role: Joi.string(),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
    searchQuery: Joi.string().optional().allow(''),
    status: Joi.string().optional().allow(''),
    isExport: Joi.boolean().optional().allow(''),
  }),
};

const searchUser = {
  params: Joi.object().keys({
    userId: Joi.string().custom(objectId),
    searchTerm: Joi.string().required().messages({
      'string.pattern.base': 'searchTerm is required to search user!',
    }),
  }),
};

const getUser = {
  params: Joi.object().keys({
    userId: Joi.string().custom(objectId),
  }),
};

const updateUser = {
  params: Joi.object().keys({
    userId: Joi.required().custom(objectId),
  }),
  body: Joi.object({
    // city: Joi.string().trim().allow('').optional(),
    // zip: Joi.string().trim().allow('').optional(),
    // address: Joi.string().trim().allow('').optional(),
    // gender: Joi.string().valid('Male', 'Female', 'Other', '').allow('').optional(),
    // phone: Joi.string().trim().allow('').optional(),
    // joiningDate: Joi.date().allow(null).optional(),
    // twoFAEnabled: Joi.boolean().optional(),
    // twoFASecret: Joi.string().allow('').optional(),

    // businessName: Joi.string().trim().optional(),
    // email: Joi.string().trim().lowercase().email().optional(),
    phoneNumber: Joi.string()
      .trim()
      .pattern(/^\+[1-9]\d{1,14}$/)
      .message('Invalid international phone number')
      .optional(),

    user_details: Joi.object({
      name: Joi.string().trim().allow('').optional(),
      country: Joi.string().trim().allow('').optional(),
    }),

    // isActive: Joi.boolean().optional(),
    // availableBalance: Joi.number().optional(),
    // role: Joi.string().valid('user', 'admin').optional(),
    // userType: Joi.string().valid('super_admin', 'finance_admin', 'support_admin', 'view_only_admin').optional(),
    // permissions: Joi.array().items(Joi.string()).optional(),
    // commissionConfig: Joi.object({
    //   commissionType: Joi.string().valid('payin', 'payout').optional(),
    //   startRange: Joi.number().min(0).optional(),
    //   endRange: Joi.number().min(0).optional(),
    //   chargeType: Joi.string().valid('percentage', 'fixed').optional(),
    //   value: Joi.number().min(0).optional(),
    // })
    //   .optional(),
  })
    .min(1)
    .messages({
      'object.min': 'At least one field must be provided',
    }),
};

const clearToken = {
  body: Joi.object().keys({
    userDeviceToken: Joi.string().optional(),
  }),
};

const deleteUser = {
  params: Joi.object().keys({
    userId: Joi.string().custom(objectId),
  }),
};

const uploadProfileImage = {
  params: Joi.object().keys({
    userId: Joi.string().required().description('User ID'),
  }),
};

const searchCities = {
  params: Joi.object().keys({
    searchTerms: Joi.string().required().messages({
      'any.required': 'Please enter search field',
      'string.empty': 'Please enter search field',
    }),
  }),
};

const searchStates = {
  params: Joi.object().keys({
    searchTerms: Joi.string().optional().messages({
      'any.required': 'Please enter search field',
      'string.empty': 'Please enter search field',
    }),
  }),
};

const updateUserStatus = {
  params: Joi.object().keys({
    id: Joi.string().custom(objectId),
  }),
};

const getUserCommissionConfig = {
  params: Joi.object().keys({
    userId: Joi.string().custom(objectId),
  }),
};

const updateUserCommissionConfig = {
  params: Joi.object().keys({
    userId: Joi.string().custom(objectId),
  }),
  body: Joi.object().keys({
    commissionConfig: Joi.object({
      payin: Joi.object({
        commissionType: Joi.string().valid('payin').optional(),
        startRange: Joi.number().min(0).optional(),
        endRange: Joi.number().min(0).optional(),
        chargeType: Joi.string().valid('percentage', 'fixed').optional(),
        value: Joi.number().min(0).optional(),
      }),
      payout: Joi.object({
        commissionType: Joi.string().valid('payout').optional(),
        startRange: Joi.number().min(0).optional(),
        endRange: Joi.number().min(0).optional(),
        chargeType: Joi.string().valid('percentage', 'fixed').optional(),
        value: Joi.number().min(0).optional(),
      }),
    }),
  }),
};

const deleteUserCommissionConfig = {
  params: Joi.object().keys({
    userId: Joi.string().custom(objectId),
  }),
};

const getAllCommissionConfigs = {
  query: Joi.object().keys({
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const calculateCommission = {
  params: Joi.object().keys({
    userId: Joi.string().custom(objectId),
  }),
  body: Joi.object().keys({
    amount: Joi.number().required().messages({
      'any.required': 'Amount is required',
    }),
  }),
};

const generateFinflexKeys = {
  body: Joi.object().keys({
    isRegenerate: Joi.boolean().default(false).description('true for regenerating keys, false for initial generation'),
    isLive: Joi.boolean().default(false).description('true for live keys, false for test keys'),
  }),
};

const transferPgBalance = {
  params: Joi.object().keys({
    userId: Joi.string().custom(objectId),
  }),
  body: Joi.object().keys({
    amount: Joi.number().positive().required().messages({
      'any.required': 'Amount is required',
      'number.positive': 'Amount must be a positive number',
    }),
  }),
};

module.exports = {
  createUser,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  uploadProfileImage,
  searchUser,
  searchCities,
  searchStates,
  clearToken,
  updateUserStatus,
  getUserCommissionConfig,
  updateUserCommissionConfig,
  deleteUserCommissionConfig,
  getAllCommissionConfigs,
  calculateCommission,
  generateFinflexKeys,
  createAdmin,
  transferPgBalance,
};
