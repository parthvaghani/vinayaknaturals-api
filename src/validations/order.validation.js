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
    // razorpayPaymentId: Joi.string().allow('').default(null),
    reason: Joi.string().allow('').default(null),
  }),
};

const getAllOrders = {
  query: Joi.object().keys({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).default(10),
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
  body: Joi.object()
    .keys({
      status: Joi.string().valid('placed', 'accepted', 'inprogress', 'completed', 'cancelled', 'delivered').optional(),
      paymentStatus: Joi.string().valid('paid', 'unpaid').optional(),
      note: Joi.string().allow('', null),
      trackingNumber: Joi.number().optional(),
      trackingLink: Joi.string().optional(),
      courierName: Joi.string().optional(),
      customMessage: Joi.string().optional(),
    })
    .or('status', 'paymentStatus'),
};

const updateOrder = {
  params: orderIdParam,
  body: Joi.object().keys({
    address: Joi.object()
      .keys({
        addressLine1: Joi.string().optional(),
        addressLine2: Joi.string().optional(),
        city: Joi.string().optional(),
        state: Joi.string().optional(),
        zip: Joi.string().optional(),
        country: Joi.string().optional(),
      })
      .optional(),
    phoneNumber: Joi.string().optional(),
    productsDetails: Joi.array()
      .items(
        Joi.object().keys({
          productId: Joi.string().custom(objectId).required(),
          weightVariant: Joi.string().required(),
          weight: Joi.string().required(),
          pricePerUnit: Joi.number().required(),
          discount: Joi.number().default(0),
          totalUnit: Joi.number().default(0),
        }),
      )
      .optional(),
    shippingCharge: Joi.number().optional(),
  }),
};

const downloadInvoice = {
  params: orderIdParam,
};

const createPosOrder = {
  body: Joi.object().keys({
    cart: Joi.array()
      .items(
        Joi.object().keys({
          productId: Joi.string().custom(objectId).required(),
          weightVariant: Joi.string().required(),
          weight: Joi.string().required(),
          totalProduct: Joi.number().required(),
        }),
      )
      .min(1)
      .required(),
    address: Joi.object()
      .keys({
        addressLine1: Joi.string().required(),
        addressLine2: Joi.string().allow('').optional(),
        city: Joi.string().required(),
        state: Joi.string().required(),
        zip: Joi.string().required(),
        country: Joi.string().default('IND'),
      })
      .required(),
    phoneNumber: Joi.string().required(),
    couponId: Joi.string().custom(objectId).optional(),
    discountAmount: Joi.number().default(0),
    discountPercentage: Joi.number().default(0),
  }),
};

module.exports = {
  createOrder,
  getOrderById,
  cancelOrder,
  getAllOrders,
  updateStatus,
  updateOrder,
  downloadInvoice,
  createPosOrder,
};
