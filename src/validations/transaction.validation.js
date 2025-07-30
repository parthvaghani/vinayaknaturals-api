const Joi = require('joi');
const { objectId } = require('./custom.validation');

const getTransactionById = {
  params: Joi.object().keys({
    transactionId: Joi.string().custom(objectId).required(),
  }),
};

const getUserTransactions = {
  query: Joi.object().keys({
    status: Joi.string().valid('PENDING', 'SUCCESS', 'FAILED', 'CANCELLED'),
    payment_mode: Joi.string().valid('IMPS', 'NEFT', 'RTGS'),
    type: Joi.string(),
    transactionType: Joi.array().items(Joi.string().valid('PAYOUT', 'BULK_PAYOUT', 'PAY_IN_API', 'PAY_IN')),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
    transactionId: Joi.string().optional().allow('').custom(objectId),
    startDate: Joi.date().optional(),
    endDate: Joi.date().optional(),
    isExport: Joi.boolean().optional(),
  }),
};

const getAllTransactions = {
  query: Joi.object().keys({
    status: Joi.string().valid('PENDING', 'SUCCESS', 'FAILED', 'CANCELLED'),
    payment_mode: Joi.string().valid('IMPS', 'NEFT', 'RTGS'),
    userId: Joi.string().custom(objectId),
    type: Joi.string(),
    transactionType: Joi.array().items(Joi.string().valid('PAYOUT', 'BULK_PAYOUT', 'PAY_IN_API', 'PAY_IN')),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
    transactionId: Joi.string().optional().allow('').custom(objectId),
    isExport: Joi.boolean().optional(),
    startDate: Joi.date().optional(),
    endDate: Joi.date().optional(),
  }),
};

module.exports = {
  getTransactionById,
  getUserTransactions,
  getAllTransactions,
};