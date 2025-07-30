const Joi = require('joi');
const { objectId, aadhaarNumber } = require('./custom.validation');
const { VERIFICATION_STATUS } = require('../utils/constants');

const submitKycRequest = {
  body: Joi.object().keys({
    documentNumber: Joi.string().required().trim().custom(aadhaarNumber).messages({
      'string.empty': 'Aadhaar number is required',
      'any.required': 'Aadhaar number is required',
    }),
  }),
};

const getKycRequests = {
  query: Joi.object().keys({
    status: Joi.string().valid(VERIFICATION_STATUS.IN_REVIEW, VERIFICATION_STATUS.APPROVED, VERIFICATION_STATUS.REJECTED),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
    searchQuery: Joi.string().optional().allow(''),
    isExport: Joi.boolean().optional(),
  }),
};

const updateKycStatus = {
  params: Joi.object().keys({
    documentId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object().keys({
    status: Joi.string().valid(VERIFICATION_STATUS.APPROVED, VERIFICATION_STATUS.REJECTED).required(),
    remarks: Joi.string().when('status', {
      is: VERIFICATION_STATUS.REJECTED,
      then: Joi.string().required().messages({
        'any.required': 'Remarks are required when rejecting KYC',
      }),
      otherwise: Joi.string().optional(),
    }),
  }),
};

const getKycStatus = {
  params: Joi.object().keys({
    userId: Joi.string().custom(objectId).required(),
  }),
};

module.exports = {
  submitKycRequest,
  getKycRequests,
  updateKycStatus,
  getKycStatus,
};
