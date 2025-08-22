const Joi = require('joi');
const { objectId } = require('./custom.validation');

const addToCart = {
  body: Joi.object().keys({
    productId: Joi.string().custom(objectId).required(),
    totalProduct: Joi.number().required(),
    weight: Joi.string().trim().required(),
    weightVariant: Joi.string().valid('gm', 'kg').required(),
  }),
};

const updateCart = {
  body: Joi.object().keys({
    action: Joi.string().valid('increment', 'decrement', 'weight').required(),
    cartId: Joi.string().custom(objectId).required(),
    weight: Joi.string().optional().allow(''), // allows empty string
    weightVariant: Joi.string().valid('gm', 'kg').optional(),
  }),
};

const deleteCart = {
  params: Joi.object().keys({
    id: Joi.string().hex().length(24).required().messages({
      'string.hex': 'Invalid cart ID',
      'string.length': 'Cart ID must be 24 characters',
      'any.required': 'Cart ID is required',
    }),
  }),
};

const userLocalStorageCart = {
  body: Joi.object().keys({
    cart: Joi.array().items(
      Joi.object().keys({
        productId: Joi.string().custom(objectId).required(),
        weight: Joi.number().required(),
        weightVariant: Joi.string().valid('gm', 'kg').required(),
        totalProduct: Joi.number().required(),
      })
    ).required(),
  }),
};

module.exports = {
  addToCart,
  updateCart,
  deleteCart,
  userLocalStorageCart
};