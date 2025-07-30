const Joi = require('joi');
const { objectId } = require('./custom.validation');
const { BANK_ENV_TYPE } = require('../utils/constants');

const createBank = {
  body: Joi.object().keys({
    name: Joi.string().required().trim().min(3).messages({
      'string.empty': 'Bank name is required',
      'string.min': 'Bank name must be at least 3 characters long',
      'any.required': 'Bank name is required',
    }),
    bankKey: Joi.string().required().trim().min(2).messages({
      'string.empty': 'Bank key is required',
      'string.min': 'Bank key must be at least 2 characters long',
      'any.required': 'Bank key is required',
    }),
    envType: Joi.string().valid(...Object.values(BANK_ENV_TYPE)).required(),
  }),
};

const getBanks = {
  query: Joi.object().keys({
    name: Joi.string(),
    status: Joi.string().valid('active', 'inactive'),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
    searchTerm: Joi.string().allow('').optional(),
    searchQuery: Joi.string().allow('').optional(),
  }),
};

const getBank = {
  params: Joi.object().keys({
    bankId: Joi.string().custom(objectId),
  }),
};

const updateBank = {
  params: Joi.object().keys({
    bankId: Joi.string().custom(objectId),
  }),
  body: Joi.object()
    .keys({
      name: Joi.string().trim().min(3),
      status: Joi.string().valid('active', 'inactive'),
      envType: Joi.string().valid(...Object.values(BANK_ENV_TYPE)).required(),
    })
    .min(1),
};

const deleteBank = {
  params: Joi.object().keys({
    bankId: Joi.string().custom(objectId),
  }),
};

const assignBankToUser = {
  params: Joi.object().keys({
    userId: Joi.string().custom(objectId).required(),
    type: Joi.string().valid('payin', 'payout').required(),
  }),
  body: Joi.object().keys({
    bankId: Joi.string().custom(objectId).required(),
  }),
};

module.exports = {
  createBank,
  getBanks,
  getBank,
  updateBank,
  deleteBank,
  assignBankToUser,
};
