const Joi = require('joi');
const { objectId } = require('./custom.validation');

// Phone validation for guest orders
const phoneValidation = (value, helpers) => {
  const cleanNumber = value.replace(/[^\d+]/g, '');
  if (!cleanNumber.startsWith('+')) {
    return helpers.error('string.pattern.base', { message: 'Phone number must start with + followed by country code' });
  }
  if (cleanNumber.length < 3) {
    return helpers.error('string.pattern.base', { message: 'Phone number must include country code after +' });
  }
  if (cleanNumber.length < 8 || cleanNumber.length > 16) {
    return helpers.error('string.pattern.base', {
      message: 'Phone number must be between 8 and 16 digits including country code',
    });
  }
  if (!/^\+\d+$/.test(cleanNumber)) {
    return helpers.error('string.pattern.base', { message: 'Phone number can only contain digits after +' });
  }
  return cleanNumber;
};

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
    posOrder: Joi.boolean(),
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
          price: Joi.number().optional(),
          discount: Joi.number().optional(),
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

const createGuestOrder = {
  body: Joi.object().keys({
    name: Joi.string().trim().required().messages({
      'string.empty': 'Name is required',
      'any.required': 'Name is required',
    }),
    email: Joi.string().trim().email().required().messages({
      'string.empty': 'Email is required',
      'any.required': 'Email is required',
      'string.email': 'Please provide a valid email address',
    }),
    phoneNumber: Joi.string().custom(phoneValidation).required().messages({
      'string.empty': 'Phone number is required',
      'any.required': 'Phone number is required',
      'string.pattern.base': '{{#message}}',
    }),
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
    couponId: Joi.string().custom(objectId).optional(),
    discountAmount: Joi.number().default(0),
    discountPercentage: Joi.number().default(0),
    acceptedTerms: Joi.boolean().valid(true).required().messages({
      'any.only': 'You must accept the Terms and Conditions',
      'any.required': 'You must accept the Terms and Conditions',
    }),
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
  createGuestOrder,
};
