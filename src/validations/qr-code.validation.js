const Joi = require('joi');

const generateQrCode = {
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
      authorization: Joi.string().required().messages({
        'string.empty': 'Authorization header is required',
        'any.required': 'Authorization header is required',
      }),
    })
    .unknown(true),
  body: Joi.object().keys({
    amount: Joi.number().required().positive().messages({
      'number.base': 'Amount must be a number',
      'number.positive': 'Amount must be positive',
      'any.required': 'Amount is required',
    }),
    order_id: Joi.string().required().messages({
      'string.empty': 'Order ID is required',
      'any.required': 'Order ID is required',
    }),
    callback_url: Joi.string().uri().required().messages({
      'string.uri': 'Callback URL must be a valid URL',
      'string.empty': 'Callback URL is required',
      'any.required': 'Callback URL is required',
    }),
  }),
};

const getSingleQrCode = {
  params: Joi.object().keys({
    slug: Joi.string().required().messages({
      'string.empty': 'QR code slug is required',
      'any.required': 'QR code slug is required',
    }),
  }),
};

const updateQrCode = {
  params: Joi.object().keys({
    slug: Joi.string().required().messages({
      'string.empty': 'QR code slug is required',
      'any.required': 'QR code slug is required',
    }),
  }),
};

module.exports = {
  generateQrCode,
  getSingleQrCode,
  updateQrCode,
};