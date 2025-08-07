const Joi = require('joi');
const { objectId } = require('./custom.validation'); // Create a helper if needed for ObjectId validation

// Variants schema for gm/kg
const variantSchema = Joi.object({
  weight: Joi.string().required().messages({
    'string.empty': 'Variant weight is required',
    'any.required': 'Variant weight is required',
  }),
  price: Joi.number().required().messages({
    'number.base': 'Variant price must be a number',
    'any.required': 'Variant price is required',
  }),
  discount: Joi.number().default(0).messages({
    'number.base': 'Discount must be a number',
  }),
});

const createProduct = {
  body: Joi.object().keys({
    category: Joi.string().custom(objectId).required().messages({
      'any.required': 'Product category is required',
    }),
    name: Joi.string().required().messages({
      'string.empty': 'Product name is required',
      'any.required': 'Product name is required',
    }),
    description: Joi.string().required().messages({
      'string.empty': 'Product description is required',
      'any.required': 'Product description is required',
    }),
    images: Joi.array().items(Joi.string().uri()).min(1).required().messages({
      'array.base': 'Images must be an array',
      'any.required': 'Product images are required',
    }),
    ingredients: Joi.array().items(Joi.string()).min(1).required().messages({
      'array.base': 'Ingredients must be an array of strings',
      'any.required': 'Product ingredients are required',
    }),
    benefits: Joi.array().items(Joi.string()).min(1).required().messages({
      'array.base': 'Benefits must be an array of strings',
      'any.required': 'Product benefits are required',
    }),
    isPremium: Joi.boolean().required().messages({
      'any.required': 'isPremium flag is required',
    }),
    isPopular: Joi.boolean().required().messages({
      'any.required': 'isPopular flag is required',
    }),
    variants: Joi.object({
      gm: Joi.array().items(variantSchema),
      kg: Joi.array().items(variantSchema),
    }).required().messages({
      'any.required': 'Variants object is required',
    }),
  }),
};

const updateProduct = {
  params: Joi.object().keys({
    id: Joi.string().custom(objectId).required().messages({
      'any.required': 'Product ID is required',
    }),
  }),
  body: Joi.object().keys({
    category: Joi.string().custom(objectId).optional(),
    name: Joi.string().optional(),
    description: Joi.string().optional(),
    images: Joi.array().items(Joi.string().uri()).optional(),
    ingredients: Joi.array().items(Joi.string()).optional(),
    benefits: Joi.array().items(Joi.string()).optional(),
    isPremium: Joi.boolean().optional(),
    isPopular: Joi.boolean().optional(),
    variants: Joi.object({
      gm: Joi.array().items(variantSchema),
      kg: Joi.array().items(variantSchema),
    }).optional(),
  }),
};

const getProductById = {
  params: Joi.object().keys({
    id: Joi.string().custom(objectId).required(),
  }),
};

const deleteProduct = {
  params: Joi.object().keys({
    id: Joi.string().custom(objectId).required(),
  }),
};

module.exports = {
  createProduct,
  updateProduct,
  getProductById,
  deleteProduct,
};
