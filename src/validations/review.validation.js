const Joi = require('joi');
const { objectId } = require('./custom.validation');

const create = {
  body: Joi.object().keys({
    productId: Joi.string().custom(objectId).required().messages({
      'any.required': 'Product ID is required',
    }),
    reviewStar: Joi.number().min(1).max(5).required().messages({
      'number.base': 'Review star must be a number',
      'number.min': 'Review star must be at least 1',
      'number.max': 'Review star must be at most 5',
      'any.required': 'Review star is required',
    }),
    msg: Joi.string().max(500).allow('').optional().messages({
      'string.max': 'Review message must not exceed 500 characters',
    }),
  }),
};

const listByProduct = {
  params: Joi.object().keys({
    productId: Joi.string().custom(objectId).required(),
  }),
  query: Joi.object().keys({}),
};

const listAll = {
  query: Joi.object().keys({
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    search: Joi.string().allow('').optional(),
  }),
};

module.exports = { create, listByProduct, listAll };
