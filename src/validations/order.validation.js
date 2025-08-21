const Joi = require('joi');
const { objectId } = require('./custom.validation');

const createOrder = {
  params: Joi.object().keys({
    id: Joi.string().custom(objectId).required(),
  }),
};

const orderIdParam = Joi.object().keys({
  id: Joi.string().custom(objectId).required(),
});

const getOrderById = { params: orderIdParam };

const cancelOrder = {
  params: orderIdParam,
  body: Joi.object().keys({
    reason: Joi.string().allow('').default(null),
  }),
};

const getAllOrders = {
  query: Joi.object().keys({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sortBy: Joi.string(),
    search: Joi.string().allow(''),
    status: Joi.string().valid('placed', 'accepted', 'inprogress', 'completed', 'cancelled', 'delivered'),
    userId: Joi.string().custom(objectId),
    phoneNumber: Joi.string(),
    productId: Joi.string().custom(objectId),
    createdFrom: Joi.date().iso(),
    createdTo: Joi.date().iso(),
  }),
};

const updateStatus = {
  params: orderIdParam,
  body: Joi.object().keys({
    status: Joi.string().valid('placed', 'accepted', 'inprogress', 'completed', 'cancelled', 'delivered').required(),
    note: Joi.string().allow('', null),
  }),
};

module.exports = {
  createOrder,
  getOrderById,
  cancelOrder,
  getAllOrders,
  updateStatus,
};

