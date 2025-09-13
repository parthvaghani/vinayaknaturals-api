const Joi = require('joi');
const { objectId } = require('./custom.validation');

const phoneE164 = Joi.string()
  .pattern(/^\+[1-9]\d{1,14}$/)
  .messages({ 'string.pattern.base': 'Phone number must be in E.164 format (e.g., +1234567890)' });

const createLead = {
  body: Joi.object().keys({
    page: Joi.string().trim().required().messages({ 'any.required': 'page is required' }),
    button: Joi.string().trim().optional(),
    message: Joi.string().trim().allow('').optional(),
    phoneNumber: phoneE164.allow('').optional(),
    metadata: Joi.object().unknown(true).optional(),
    whatsappIntent: Joi.boolean().optional(),
    whatsappSent: Joi.boolean().optional(),
    sourceUrl: Joi.string().uri().optional(),
  }),
};

const getLeads = {
  query: Joi.object().keys({
    search: Joi.string().allow('').optional(),
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    sortBy: Joi.string().optional(),
    status: Joi.string().valid('new', 'contacted', 'closed').optional(),
    whatsappIntent: Joi.boolean().optional(),
    whatsappSent: Joi.boolean().optional(),
  }),
};

const getLeadById = {
  params: Joi.object().keys({
    id: Joi.string().custom(objectId).required(),
  }),
};

module.exports = { createLead, getLeads, getLeadById };
