const Joi = require('joi');
const { objectId } = require('./custom.validation');
const { TICKET_PRECEDENCE, TICKET_STATUS } = require('../utils/constants');

const createTicket = {
  body: Joi.object().keys({
    subject: Joi.string().required().trim().min(3).max(100).messages({
      'string.empty': 'Subject is required',
      'string.min': 'Subject must be at least 3 characters long',
      'string.max': 'Subject cannot exceed 100 characters',
      'any.required': 'Subject is required',
    }),
    precedence: Joi.string().required().valid(...Object.values(TICKET_PRECEDENCE)).messages({
      'any.only': `Precedence must be one of: ${Object.values(TICKET_PRECEDENCE).join(', ')}`,
      'any.required': 'Precedence is required',
    }),
    message: Joi.string().required().trim().max(1000).messages({
      'string.empty': 'Message is required',
      'string.max': 'Message cannot exceed 1000 characters',
      'any.required': 'Message is required',
    }),
  }),
};

const getTickets = {
  query: Joi.object().keys({
    userId: Joi.string().custom(objectId),
    status: Joi.string().valid(...Object.values(TICKET_STATUS)),
    precedence: Joi.string().valid(...Object.values(TICKET_PRECEDENCE)),
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const getTicket = {
  params: Joi.object().keys({
    ticketId: Joi.string().custom(objectId).required(),
  }),
};

const addReply = {
  params: Joi.object().keys({
    ticketId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object().keys({
    message: Joi.string().required().trim().min(1).max(1000).messages({
      'string.empty': 'Reply message is required',
      'string.min': 'Reply message cannot be empty',
      'string.max': 'Reply message cannot exceed 1000 characters',
      'any.required': 'Reply message is required',
    }),
  }),
};

const closeTicket = {
  params: Joi.object().keys({
    ticketId: Joi.string().custom(objectId).required(),
  }),
};

module.exports = {
  createTicket,
  getTickets,
  getTicket,
  addReply,
  closeTicket,
}; 