const Joi = require('joi');
const { objectId } = require('./custom.validation');

const createTestimonial = {
  body: Joi.object().keys({
    name: Joi.string().required().messages({
      'string.empty': 'Name is required',
      'any.required': 'Name is required',
    }),
    body: Joi.string().required().messages({
      'string.empty': 'Body is required',
      'any.required': 'Body is required',
    }),
    img: Joi.string().uri().optional(),
    location: Joi.string().optional(),
    visible: Joi.boolean().optional(),
  }),
};

const updateTestimonial = {
  params: Joi.object().keys({
    id: Joi.string().custom(objectId).required().messages({
      'any.required': 'Testimonial ID is required',
    }),
  }),
  body: Joi.object()
    .keys({
      name: Joi.string().optional(),
      body: Joi.string().optional(),
      img: Joi.string().uri().optional(),
      location: Joi.string().optional(),
      visible: Joi.boolean().optional(),
    })
    .min(1),
};

const getTestimonialById = {
  params: Joi.object().keys({
    id: Joi.string().custom(objectId).required(),
  }),
};

const deleteTestimonial = {
  params: Joi.object().keys({
    id: Joi.string().custom(objectId).required(),
  }),
};

const getTestimonials = {
  query: Joi.object().keys({
    search: Joi.string().allow('').optional(),
    sortBy: Joi.string().optional(),
    visible: Joi.boolean().optional(),
  }),
};

module.exports = {
  createTestimonial,
  updateTestimonial,
  getTestimonialById,
  deleteTestimonial,
  getTestimonials,
};
