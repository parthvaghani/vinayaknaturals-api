const Joi = require('joi');
const { objectId } = require('./custom.validation');

const createAddress = {
  body: Joi.object().keys({
    label: Joi.string().valid('Home', 'Work', 'Other').default('Home'),
    addressLine1: Joi.string().required(),
    addressLine2: Joi.string().required(),
    city: Joi.string().required(),
    state: Joi.string().required(),
    zip: Joi.string().required(),
    country: Joi.string().default('IND'),
    isDefault: Joi.boolean().required(),
  }),
};

const addressIdParam = Joi.object().keys({
  id: Joi.string().custom(objectId).required(),
});

const getAddressById = { params: addressIdParam };

const updateAddress = {
  params: addressIdParam,
  body: Joi.object()
    .keys({
      label: Joi.string().valid('Home', 'Office', 'Other').optional(),
      addressLine1: Joi.string().optional(),
      addressLine2: Joi.string().allow('').optional(),
      city: Joi.string().optional(),
      state: Joi.string().optional(),
      zip: Joi.string().optional(),
      country: Joi.string().optional(),
      isDefault: Joi.boolean().optional(),
    })
    .min(1),
};

const deleteAddress = { params: addressIdParam };

module.exports = {
  createAddress,
  getAddressById,
  updateAddress,
  deleteAddress,
};
