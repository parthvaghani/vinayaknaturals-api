const Joi = require('joi');
const { objectId } = require('./custom.validation');

const makePayment = {
  body: Joi.object().keys({
    amount: Joi.number().required().min(1).messages({
      'number.base': 'Amount must be a number',
      'number.min': 'Amount must be greater than 0',
      'any.required': 'Amount is required',
    }),
    payment_mode: Joi.string().required().valid('IMPS', 'NEFT', 'RTGS').messages({
      'any.only': 'Payment mode must be one of: IMPS, NEFT, RTGS',
      'any.required': 'Payment mode is required',
    }),
    beneficiary_name: Joi.string().required().trim().min(3).messages({
      'string.empty': 'Beneficiary name is required',
      'string.min': 'Beneficiary name must be at least 3 characters long',
      'any.required': 'Beneficiary name is required',
    }),
    beneficiary_account_numb: Joi.string()
      .required()
      .pattern(/^\d{9,18}$/)
      .messages({
        'string.pattern.base': 'Account number must be between 9 and 18 digits',
        'any.required': 'Account number is required',
      }),
    beneficiary_ifsc_code: Joi.string()
      .required()
      .pattern(/^[A-Z]{4}0[A-Z0-9]{6}$/)
      .messages({
        'string.pattern.base': 'IFSC code must be in valid format (e.g., SBIN0001234)',
        'any.required': 'IFSC code is required',
      }),
    bearer_token: Joi.string().required().messages({
      'string.empty': 'Bearer token is required',
      'any.required': 'Bearer token is required',
    }),
    x_reference_no: Joi.string(),
    request_id: Joi.string(),
  }),
};
const makeBulkPayment = {
  body: Joi.object().keys({
    payment_mode: Joi.string().required().valid('IMPS', 'NEFT', 'RTGS').messages({
      'any.only': 'Payment mode must be one of: IMPS, NEFT, RTGS',
      'any.required': 'Payment mode is required for processing Excel file',
    }),
    bearer_token: Joi.string().required().messages({
      'string.empty': 'Bearer token is required for processing Excel file',
      'any.required': 'Bearer token is required for processing Excel file',
    }),
  }),
};

const getBulkPaymentStatus = {
  params: Joi.object().keys({
    bulkProcessingId: Joi.string().custom(objectId).required(),
  }),
};

module.exports = {
  makePayment,
  makeBulkPayment,
  getBulkPaymentStatus,
};
