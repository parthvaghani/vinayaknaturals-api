const catchAsync = require('../utils/catchAsync');
const service = require('../services/order.service');
const ApiError = require('../utils/ApiError');
const httpStatus = require('http-status');
const productCategoryModel = require('../models/productCategory.model');
const { productService, tokenService } = require('../services');
const User = require('../models/user.model');
const Address = require('../models/address.model');
const crypto = require('crypto');

const getAllOrders = catchAsync(async (req, res) => {
  const userRole = req.user && req.user.role;
  if (userRole !== 'admin') {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }
  const data = await service.getAllOrders(req.query);
  return res.status(200).json({ success: true, message: 'Orders fetched successfully', data });
});

// ignore cart sync
// const createOrder = catchAsync(async (req, res) => {
//   const ReqBody = req.body;
//   const userId = req.user && req.user._id;
//   const phoneNumber = req.user && req.user.phoneNumber;
//   const cartItems = await cartModel.find({ userId, isOrdered: false }).populate('productId');
//   if (cartItems.length === 0) {
//     return res.status(400).json({ success: false, message: 'Cart is empty' });
//   }
//   const categoryIds = cartItems
//     .map((item) => item.productId && item.productId.category)
//     .filter(Boolean);

//   const uniqueCategoryIds = [...new Set(categoryIds.map(id => id.toString()))];
//   const categories = await productCategoryModel.find({
//     _id: { $in: uniqueCategoryIds }
//   });

//   const nonPricedCategory = categories.find((cat) => cat.pricingEnabled === false);
//   if (nonPricedCategory) {
//     return res.status(400).json({ success: false, message: `Order cannot be placed because ${cartItems.map(item => item.productId.name).join(', ')} is currently unavailable for now.`});
//   }
//   const created = await service.createOrderFromCart({ cartItems, userId, addressId: req.params.id, phoneNumber, ReqBody });
//   return res.status(201).json({ success: true, message: 'Order placed successfully', data: created });
// });

const createOrder = catchAsync(async (req, res) => {
  const ReqBody = req.body;
  const userId = req.user && req.user._id;
  const phoneNumber = req.user && req.user.phoneNumber;

  if (ReqBody.cart.length === 0) {
    return res.status(400).json({ success: false, message: 'Cart is empty' });
  }
  ReqBody.cart.map(async (item) => {
    const findProduct = await productService.getProductById(item?.productId);
    if (!findProduct) {
      return res.status(400).json({
        success: false,
        message: 'Product not found',
      });
    }
  });
  const categoryIds = ReqBody.cart
    .map((item) => item.productId && item.category)
    .filter(Boolean);

  const uniqueCategoryIds = [...new Set(categoryIds.map(id => id.toString()))];
  const categories = await productCategoryModel.find({
    _id: { $in: uniqueCategoryIds }
  });

  const nonPricedCategory = categories.find((cat) => cat.pricingEnabled === false);
  if (nonPricedCategory) {
    return res.status(400).json({
      success: false,
      message: `Order cannot be placed because ${ReqBody.cart.map(item => item.productId && item.productId.name).filter(Boolean).join(', ')} is currently unavailable for now.`
    });
  }
  const created = await service.createOrderFromCart({ userId, addressId: req.params.id, phoneNumber, ReqBody });
  return res.status(201).json({ success: true, message: 'Order placed successfully', data: created });
});

const getMyOrders = catchAsync(async (req, res) => {
  const userId = req.user && req.user._id;
  const userRole = req.user && req.user.role;
  const results = await service.getOrdersByUser(userId, userRole);
  return res.status(200).json({ success: true, message: 'Orders fetched successfully', data: results });
});

const getOrderById = catchAsync(async (req, res) => {
  const userId = req.user && req.user._id;
  const order = await service.getOrderById(req.params.id, userId, req.user.role);
  if (!order) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }
  return res.status(200).json({ success: true, message: 'Order fetched successfully', data: order });
});

const cancelOrder = catchAsync(async (req, res) => {
  const userId = req.user && req.user._id;
  if (req.user.role !== 'admin' && !userId.toString()) {
    return res.status(403).json({ success: false, message: 'Forbidden: user mismatch' });
  }
  const updated = await service.cancelOrder(req.params.id, userId, req.body.reason, req.user.role);
  if (!updated) {
    return res.status(404).json({ success: false, message: 'Order not found or not authorized' });
  }
  return res.status(200).json({ success: true, message: 'Order canceled successfully', data: updated });
});

const updateStatus = catchAsync(async (req, res) => {
  const { status, paymentStatus, note, trackingNumber, trackingLink, courierName, customMessage } = req.body;
  const updated = await service.updateOrderStatus(req.params.id, status, paymentStatus, note, trackingNumber, trackingLink, courierName, customMessage, req.user.role, req.user._id);
  return res.status(200).json({ success: true, message: 'Order status updated successfully', data: updated });
});

const updateOrder = catchAsync(async (req, res) => {
  const userId = req.user && req.user._id;
  if (req.user.role === 'user') {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'This action can be accessed only by admin');
  }
  const updated = await service.updateOrder(req.params.id, req.body, userId, req.user.role);
  return res.status(200).json({ success: true, message: 'Order updated successfully', data: updated });
});

const downloadInvoice = catchAsync(async (req, res) => {
  const userId = req.user && req.user._id;
  const userRole = req.user && req.user.role;
  const { pdfBuffer, invoiceNumber, order } = await service.downloadInvoice(req.params.id, userId, userRole);

  // Set headers for PDF download
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoiceNumber || order._id}.pdf"`);
  res.setHeader('Content-Length', pdfBuffer.length);

  return res.send(pdfBuffer);
});

const createPosOrder = catchAsync(async (req, res) => {
  const ReqBody = req.body;
  const userId = req.user && req.user._id;

  if (ReqBody.cart.length === 0) {
    return res.status(400).json({ success: false, message: 'Cart is empty' });
  }

  // Validate all products exist
  for (const item of ReqBody.cart) {
    const findProduct = await productService.getProductById(item?.productId);
    if (!findProduct) {
      return res.status(400).json({
        success: false,
        message: 'Product not found',
      });
    }
  }

  const categoryIds = ReqBody.cart
    .map((item) => item.productId && item.category)
    .filter(Boolean);

  const uniqueCategoryIds = [...new Set(categoryIds.map(id => id.toString()))];
  const categories = await productCategoryModel.find({
    _id: { $in: uniqueCategoryIds }
  });

  const nonPricedCategory = categories.find((cat) => cat.pricingEnabled === false);
  if (nonPricedCategory) {
    return res.status(400).json({
      success: false,
      message: `Order cannot be placed because ${ReqBody.cart.map(item => item.productId && item.productId.name).filter(Boolean).join(', ')} is currently unavailable for now.`
    });
  }

  const created = await service.createPosOrder({ userId, ReqBody });
  return res.status(201).json({ success: true, message: 'POS Order placed successfully', data: created });
});

const createGuestOrder = catchAsync(async (req, res) => {
  const { name, email, phoneNumber, address, cart, couponId, discountAmount, discountPercentage } = req.body;

  // Validate cart is not empty
  if (cart.length === 0) {
    return res.status(400).json({ success: false, message: 'Cart is empty' });
  }

  // Validate all products exist
  for (const item of cart) {
    const findProduct = await productService.getProductById(item?.productId);
    if (!findProduct) {
      return res.status(400).json({
        success: false,
        message: 'Product not found',
      });
    }
  }

  // Check if user already exists by email
  let existingUser = await User.findOne({
    email: email.toLowerCase()
  });

  // Check if phone number already exists
  // let existingPhoneUser = await User.findOne({
  //   phoneNumber: phoneNumber
  // });

  // if (existingPhoneUser) {
  //   throw new ApiError(httpStatus.BAD_REQUEST, 'Phone number already taken!');
  // }

  let userId;
  let isNewAccount = false;
  let resetToken = null;

  // If user doesn't exist, create a new account with empty password (guest user)
  if (!existingUser) {
    const newUser = await User.create({
      email: email.toLowerCase(),
      phoneNumber,
      password: '', // Empty password for guest users
      user_details: {
        name,
        country: address.country || 'IND',
      },
      acceptedTerms: true,
      role: 'user',
      isActive: true,
      profileCompleted: false,
    });

    userId = newUser._id;
    isNewAccount = true;

    // Generate reset password token for new account
    resetToken = await tokenService.generateResetPasswordToken(email.toLowerCase());
  } else {
    // User exists - use existing account for order
    userId = existingUser._id;
    isNewAccount = false;
  }

  // Create address and link to user
  const newAddress = await Address.create({
    userId,
    addressLine1: address.addressLine1,
    addressLine2: address.addressLine2 || '',
    city: address.city,
    state: address.state,
    zip: address.zip,
    country: address.country || 'IND',
    isDefault: true,
    label: 'Home',
  });

  // Prepare order data
  const ReqBody = {
    cart,
    couponId,
    discountAmount: discountAmount || 0,
    discountPercentage: discountPercentage || 0,
  };

  // Create order using the service
  const created = await service.createOrderFromCart({
    userId,
    addressId: newAddress._id,
    phoneNumber,
    ReqBody,
    isGuestOrder: true,
    isNewAccount,
    resetToken,
  });

  return res.status(201).json({
    success: true,
    message: isNewAccount
      ? 'Order placed successfully! An account has been created for you. Check your email to set your password.'
      : 'Order placed successfully!',
    data: created,
    isNewAccount,
  });
});

module.exports = {
  getAllOrders,
  createOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
  updateStatus,
  updateOrder,
  downloadInvoice,
  createPosOrder,
  createGuestOrder,
};
