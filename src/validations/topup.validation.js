const Joi = require('joi');
const { objectId } = require('./custom.validation');

const createTopup = {
  body: Joi.object().keys({
    utrNumber: Joi.string().required().min(12).max(22).messages({
      'any.required': 'UTR number is required',
      'string.empty': 'UTR number is required',
      'string.min': 'UTR number must be at least 12 characters',
      'string.max': 'UTR number cannot exceed 22 characters',
    })
  }),
};

const updateTopup = {
  params: Joi.object().keys({
    id: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object().keys({
    userId: Joi.string().custom(objectId).required(),
    amount: Joi.number().required(),
    status: Joi.string().valid('approved', 'rejected').required(),
    remarks: Joi.string().optional(),
  }),
};

module.exports = {
  createTopup,
  updateTopup
};