const Joi = require('joi');
const { objectId } = require('./custom.validation');

const createSuggestedProduct = {
  body: Joi.object().keys({
    name: Joi.string().required().messages({
      'string.empty': 'Name is required',
      'any.required': 'Name is required',
    }),
    ingredients: Joi.array().items(Joi.string()).min(1).required().messages({
      'array.base': 'Ingredients must be an array of strings',
      'any.required': 'Ingredients are required',
    }),
    description: Joi.string().required().messages({
      'string.empty': 'Description is required',
      'any.required': 'Description is required',
    }),
    status: Joi.string().valid('pending', 'reviewed', 'approved', 'rejected').optional(),
  }),
};

const updateSuggestedProduct = {
  params: Joi.object().keys({
    id: Joi.string().custom(objectId).required().messages({
      'any.required': 'ID is required',
    }),
  }),
  body: Joi.object()
    .keys({
      name: Joi.string().optional(),
      ingredients: Joi.array().items(Joi.string()).min(1).optional(),
      description: Joi.string().optional(),
      status: Joi.string().valid('pending', 'reviewed', 'approved', 'rejected').optional(),
    })
    .min(1),
};

const getSuggestedProductById = {
  params: Joi.object().keys({
    id: Joi.string().custom(objectId).required(),
  }),
};

const deleteSuggestedProduct = {
  params: Joi.object().keys({
    id: Joi.string().custom(objectId).required(),
  }),
};

const getSuggestedProducts = {
  query: Joi.object().keys({
    search: Joi.string().allow('').optional(),
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    sortBy: Joi.string().optional(),
    status: Joi.string().valid('pending', 'reviewed', 'approved', 'rejected').optional(),
  }),
};

module.exports = {
  createSuggestedProduct,
  updateSuggestedProduct,
  getSuggestedProductById,
  deleteSuggestedProduct,
  getSuggestedProducts,
};
