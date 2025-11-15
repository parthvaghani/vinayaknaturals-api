const Joi = require('joi');

const couponValidationSchema = Joi.object({
  couponCode: Joi.string().trim().optional().allow('').messages({
    'string.base': 'Coupon code must be a string',
  }),
  description: Joi.string().allow('').messages({
    'string.base': 'Description must be text',
  }),
  termsAndConditions: Joi.string().allow('').messages({
    'string.base': 'Terms and Conditions must be text',
  }),
  startDate: Joi.date().required().messages({
    'date.base': 'Start date must be a valid date',
    'any.required': 'Start date is required',
  }),
  expiryDate: Joi.date().required().messages({
    'date.base': 'Expiry date must be a valid date',
    'any.required': 'Expiry date is required',
  }),
  level: Joi.string().valid('order', 'product').required().messages({
    'any.only': 'Level must be either \'order\' or \'product\'',
    'any.required': 'Coupon level is required',
  }),
  minOrderQuantity: Joi.number().min(0).default(0).messages({
    'number.base': 'Minimum order quantity must be a number',
  }),
  minCartValue: Joi.number().min(0).default(0).messages({
    'number.base': 'Minimum cart value must be a number',
  }),
  maxDiscountValue: Joi.number().min(0).default(0).messages({
    'number.base': 'Maximum discount value must be a number',
  }),
  type: Joi.string().valid('unique', 'generic').required().messages({
    'any.only': 'Type must be either \'unique\' or \'generic\'',
    'any.required': 'Coupon type is required',
  }),
  userType: Joi.alternatives().conditional('type', {
    is: 'unique',
    then: Joi.string().required().messages({
      'any.required': 'User ID is required for unique coupons',
      'string.empty': 'User ID is required for unique coupons',
    }),
    otherwise: Joi.forbidden().messages({
      'any.unknown': 'User ID must not be provided for generic coupons',
    }),
  }),
  maxUsage: Joi.number().min(1).default(1).messages({
    'number.base': 'Maximum usage must be a number',
  }),
  usageCount: Joi.number().min(0).default(0).messages({
    'number.base': 'Usage count must be a number',
  }),
  // 🆕 NEW VALIDATION: maxUsagePerUser
  maxUsagePerUser: Joi.number().min(1).default(1).messages({
    'number.base': 'Max usage per user must be a number',
    'number.min': 'Max usage per user must be at least 1',
  }),
  // 🆕 NEW VALIDATION: firstOrderOnly
  firstOrderOnly: Joi.boolean().default(false).messages({
    'boolean.base': 'First order only must be a boolean value',
  }),
  isActive: Joi.boolean().default(true).messages({
    'boolean.base': 'isActive must be a boolean value',
  }),
  couponType: Joi.string().valid('pos', 'normal').default('normal').messages({
    'any.only': 'Coupon type must be either \'pos\' or \'normal\'',
    'any.required': 'Coupon type is required',
  }),
});

module.exports = { couponValidationSchema };