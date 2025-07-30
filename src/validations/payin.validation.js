const Joi = require('joi');

const createPayinOrder = {
  headers: Joi.object()
    .keys({
      'x-client-id': Joi.string().required().messages({
        'string.empty': 'Client ID header is required',
        'any.required': 'Client ID header is required',
      }),
      'x-client-secret': Joi.string().required().messages({
        'string.empty': 'Client secret header is required',
        'any.required': 'Client secret header is required',
      }),
    })
    .unknown(true),
  body: Joi.object().keys({
    client_id: Joi.string().required(),
    amount: Joi.number().required(),
    order_id: Joi.string().required(),
    callback_url: Joi.string().required(),
    customer_details: Joi.object().keys({
      email: Joi.string().required(),
      mobile: Joi.string().required(),
      name: Joi.string().required(),
    }),
  }),
};

const payinAuth = {
  headers: Joi.object()
    .keys({
      'x-client-id': Joi.string().required().messages({
        'string.empty': 'Client ID header is required',
        'any.required': 'Client ID header is required',
      }),
      'x-client-secret': Joi.string().required().messages({
        'string.empty': 'Client secret header is required',
        'any.required': 'Client secret header is required',
      }),
    })
    .unknown(true),
  body: Joi.object().keys({}).unknown(true),
};

const checkQrStatus = {
  headers: Joi.object()
    .keys({
      'x-client-id': Joi.string().required().messages({
        'string.empty': 'Client ID header is required',
        'any.required': 'Client ID header is required',
      }),
      'x-client-secret': Joi.string().required().messages({
        'string.empty': 'Client secret header is required',
        'any.required': 'Client secret header is required',
      }),
    })
    .unknown(true),
  body: Joi.object().keys({
    client_id: Joi.string().required(),
    slug: Joi.string().required(),
    ref_id: Joi.string().required(),
  }),
};

module.exports = {
  createPayinOrder,
  payinAuth,
  checkQrStatus,
};
