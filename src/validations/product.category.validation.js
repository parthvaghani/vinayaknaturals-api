const Joi = require('joi');
const { objectId } = require('./custom.validation');

const createCategory = {
  body: Joi.object().keys({
    category: Joi.string().trim().required().messages({
      'string.empty': 'Category slug is required',
      'any.required': 'Category slug is required',
    }),
    name: Joi.string().trim().required().messages({
      'string.empty': 'Category name is required',
      'any.required': 'Category name is required',
    }),
    description: Joi.string().trim().required().messages({
      'string.empty': 'Category description is required',
      'any.required': 'Category description is required',
    }),
    heroImage: Joi.string().uri().optional().messages({
      'string.uri': 'Hero image must be a valid URL',
    }),
    pricingEnabled: Joi.boolean().optional(),
  }),
};

const updateCategory = {
  params: Joi.object().keys({
    id: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object().keys({
    category: Joi.string().trim().optional(),
    name: Joi.string().trim().optional(),
    description: Joi.string().trim().optional(),
    heroImage: Joi.string().uri().optional(),
    pricingEnabled: Joi.boolean().optional(),
  }),
};

const getCategoryById = {
  params: Joi.object().keys({
    id: Joi.string().hex().length(24).required().messages({
      'string.hex': 'Invalid category ID',
      'string.length': 'Category ID must be 24 characters',
      'any.required': 'Category ID is required',
    }),
  }),
};

const deleteCategory = {
  params: Joi.object().keys({
    id: Joi.string().hex().length(24).required().messages({
      'string.hex': 'Invalid category ID',
      'string.length': 'Category ID must be 24 characters',
      'any.required': 'Category ID is required',
    }),
  }),
};

module.exports = {
  createCategory,
  updateCategory,
  getCategoryById,
  deleteCategory,
};
