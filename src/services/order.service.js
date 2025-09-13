const Order = require('../models/order.model');
const Address = require('../models/address.model');
const Cart = require('../models/cart.model');
const User = require('../models/user.model');
const { emailService } = require('./index');
const mongoose = require('mongoose');

/**
 * Get all orders with pagination, filtering and search (admin use)
 * @param {Object} query
 * @returns {Promise<{results: any[], currentResults: number, page: number, limit: number, totalPages: number, totalResults: number}>}
 */
const getAllOrders = async (query = {}) => {
  try {
    const {
      page = 1,
      limit = 10,
      sortBy,
      search = '',
      status,
      userId,
      phoneNumber,
      productId,
      createdFrom,
      createdTo,
    } = query;

    const filter = {};
    if (status) filter.status = status;
    if (userId) filter.userId = userId;
    if (phoneNumber) filter.phoneNumber = phoneNumber;
    if (productId) filter['productsDetails.productId'] = productId;
    if (createdFrom || createdTo) {
      filter.createdAt = {};
      if (createdFrom) filter.createdAt.$gte = new Date(createdFrom);
      if (createdTo) filter.createdAt.$lte = new Date(createdTo);
    }

    const options = {
      page: Number(page) || 1,
      limit: Number(limit) || 10,
    };

    const sort = (() => {
      if (!sortBy) return { createdAt: -1 };
      const sortObj = {};
      const fields = String(sortBy).split(',');
      for (const f of fields) {
        const trimmed = f.trim();
        if (!trimmed) continue;
        if (trimmed.includes(':')) {
          const [key, order] = trimmed.split(':');
          sortObj[key] = order === 'asc' ? 1 : -1;
        } else if (trimmed.startsWith('-')) {
          sortObj[trimmed.substring(1)] = -1;
        } else {
          sortObj[trimmed] = 1;
        }
      }
      return Object.keys(sortObj).length ? sortObj : { createdAt: -1 };
    })();

    const skip = (options.page - 1) * options.limit;

    let searchFilter = {};
    if (search && String(search).trim() !== '') {
      const term = String(search).trim();
      const regex = { $regex: term, $options: 'i' };
      const orConditions = [
        { phoneNumber: regex },
        { status: regex },
        { 'cancelDetails.reason': regex },
        { 'address.addressLine1': regex },
        { 'address.addressLine2': regex },
        { 'address.city': regex },
        { 'address.state': regex },
        { 'address.zip': regex },
      ];

      if (mongoose.Types.ObjectId.isValid(term)) {
        orConditions.unshift({ _id: new mongoose.Types.ObjectId(term) });
      }

      searchFilter = { $or: orConditions };
    }

    const combined = { ...filter, ...searchFilter };

    const [totalResults, results] = await Promise.all([
      Order.countDocuments(combined),
      Order.find(combined)
        .populate({ path: 'userId', select: 'email phoneNumber role user_details' })
        .populate({ path: 'productsDetails.productId', select: 'name price images' })
        .sort(sort)
        .skip(skip)
        .limit(options.limit),
    ]);

    const totalPages = Math.ceil(totalResults / options.limit);
    return {
      results,
      currentResults: results.length,
      page: options.page,
      limit: options.limit,
      totalPages,
      totalResults,
    };
  } catch (error) {
    throw error;
  }
};

const createOrderFromCart = async ({ userId, addressId, ReqBody }) => {
  const address = await Address.findOne({ _id: addressId, userId });
  if (!address) {
    const error = new Error('Address not found');
    error.statusCode = 404;
    throw error;
  }

  const cartItems = await Cart.find({ userId, isOrdered: false }).populate('productId');
  if (!cartItems || cartItems.length === 0) {
    const error = new Error('Cart is empty');
    error.statusCode = 400;
    throw error;
  }

  // Build productsDetails array using cart's weightVariant and weight, and product's variants for price/discount
  const productsDetails = cartItems.map((item) => {
    const product = item.productId;
    const weightVariant = item.weightVariant; // 'gm' or 'kg' from cart
    const weight = item.weight; // e.g. '200' or '1'
    let pricePerUnit = 0;
    let discount = 0;
    if (product && product.variants && product.variants[weightVariant] && Array.isArray(product.variants[weightVariant])) {
      const foundVariant = product.variants[weightVariant].find(
        (v) => v && v.weight && v.weight.toString() === weight.toString(),
      );
      if (foundVariant) {
        pricePerUnit = typeof foundVariant.price === 'number' ? foundVariant.price : 0;
        discount = typeof foundVariant.discount === 'number' ? foundVariant.discount : 0;
      }
    }

    return {
      productId: product._id,
      weightVariant: weightVariant,
      weight: weight,
      pricePerUnit,
      discount,
      totalUnit: item.totalProduct,
    };
  });

  const user = await User.findById(userId).select('phoneNumber');
  const phoneNumber = user && user.phoneNumber ? user.phoneNumber : '';

  const orderDoc = await Order.create({
    userId,
    address: {
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2,
      city: address.city,
      state: address.state,
      zip: address.zip,
      country: address.country || 'IND',
    },
    productsDetails,
    phoneNumber,
    statusHistory: [{ status: 'placed', updatedBy: 'user', note: 'Order placed' }],
  });

  await Cart.updateMany({ userId, isOrdered: false }, { $set: { isOrdered: true } });

  try {
    // Populate for email templates (product names)
    const populatedOrder = await Order.findById(orderDoc._id)
      .populate({ path: 'productsDetails.productId', select: 'name' })
      .lean();

    // Fetch buyer details
    const buyer = await User.findById(userId).select('email user_details.name').lean();
    const buyerEmail = buyer && buyer.email ? buyer.email : null;
    const buyerName = buyer && buyer.user_details && buyer.user_details.name ? buyer.user_details.name : '';

    // Send emails in parallel (non-blocking)
    await Promise.allSettled([
      emailService.sendOrderPlacedEmailForBuyer(buyerEmail, populatedOrder, buyerName),
      emailService.sendOrderPlacedEmailForSeller(buyerEmail, populatedOrder, buyerName),
    ]);
  } catch (error) {
    return error;
  }
  return { orderDoc, ReqBody };
};

const getOrdersByUser = async (userId, userRole) => {
  if (userRole === 'admin') {
    return Order.find()
      .populate({ path: 'userId', select: 'email phoneNumber role user_details' })
      .populate({ path: 'productsDetails.productId', select: 'name price images' });
  } else {
    return Order.find({ userId })
      .sort({ createdAt: -1 })
      .populate({ path: 'userId', select: 'email phoneNumber role user_details' })
      .populate({ path: 'productsDetails.productId', select: 'name price images review' });
  }
};

const getOrderById = async (id, userId, role) => {
  const filter = role === 'admin' ? { _id: id } : { _id: id, userId };
  return Order.findOne(filter)
    .populate({ path: 'userId', select: 'email phoneNumber role user_details' })
    .populate({ path: 'productsDetails.productId', select: 'name price images review' });
};

const cancelOrder = async (id, userId, reason, role) => {
  const filter = role === 'admin' ? { _id: id } : { _id: id, userId };
  const updatedOrder = await Order.findOneAndUpdate(
    filter,
    {
      $set: {
        status: 'cancelled',
        'cancelDetails.reason': reason || null,
        'cancelDetails.canceledBy': role === 'admin' ? 'admin' : 'user',
        'cancelDetails.date': Date.now(),
      },
      $push: {
        statusHistory: {
          status: 'cancelled',
          updatedBy: role === 'admin' ? 'admin' : 'user',
          note: reason || null,
          date: new Date(),
        },
      },
    },
    { new: true },
  ).populate([
    { path: 'userId', select: 'email phoneNumber role user_details' },
    { path: 'productsDetails.productId', select: 'name price images' },
  ]);

  // Send email notifications after successful cancellation
  if (updatedOrder) {
    const buyerEmail = updatedOrder.userId?.email;
    const buyerName = updatedOrder.userId?.user_details?.name || 'Customer';

    // Send email to buyer
    if (buyerEmail) {
      emailService.sendOrderStatusUpdateEmailForBuyer(buyerEmail, updatedOrder, 'cancelled', buyerName, reason);
    }

    // Send email to seller
    emailService.sendOrderStatusUpdateEmailForSeller(updatedOrder, 'cancelled', buyerEmail, buyerName, reason);
  }

  return updatedOrder;
};

const allowedTransitions = {
  placed: ['accepted', 'cancelled'],
  accepted: ['inprogress', 'cancelled'],
  inprogress: ['completed'],
  completed: ['delivered'],
  delivered: [],
  cancelled: [],
};

const ApiError = require('../utils/ApiError');
const httpStatus = require('http-status');

const updateOrderStatus = async (id, newStatus, newPaymentStatus, note, role, requestUserId) => {
  // Only admin can update status (except cancel which has separate flow)
  const order = await Order.findById(id);
  if (!order) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Order not found');
  }

  // Non-admins can only update paymentStatus, and only on their own orders
  if (role !== 'admin') {
    if (!requestUserId || order.userId.toString() !== requestUserId.toString()) {
      throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden');
    }
    if (typeof newStatus === 'string' && newStatus !== '') {
      throw new ApiError(httpStatus.FORBIDDEN, 'Only admins can update order status');
    }
  }

  const current = order.status;
  // Idempotent: if status is same, optionally update paymentStatus and/or append note and return
  if (current === newStatus) {
    let changed = false;
    if (typeof newPaymentStatus === 'string' && newPaymentStatus !== order.paymentStatus) {
      order.paymentStatus = newPaymentStatus;
      changed = true;
    }
    if (note && note !== '') {
      order.statusHistory.push({ status: newStatus, updatedBy: 'admin', note: note || null, date: new Date() });
      changed = true;
    }
    if (changed) {
      await order.save();
    }
    await order.populate([
      { path: 'userId', select: 'email phoneNumber role user_details' },
      { path: 'productsDetails.productId', select: 'name price images' },
    ]);
    return order;
  }
  const allowed = allowedTransitions[current] || [];
  if (typeof newStatus === 'string' && newStatus !== '' && !allowed.includes(newStatus)) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Invalid status transition from ${current} to ${newStatus}`);
  }

  if (typeof newStatus === 'string' && newStatus !== '') {
    order.status = newStatus;
  }
  if (typeof newPaymentStatus === 'string' && newPaymentStatus !== order.paymentStatus) {
    order.paymentStatus = newPaymentStatus;
  }
  if (typeof newStatus === 'string' && newStatus !== '') {
    order.statusHistory.push({
      status: newStatus,
      updatedBy: role === 'admin' ? 'admin' : 'user',
      note: note || null,
      date: new Date(),
    });
  } else if (note && note !== '') {
    order.statusHistory.push({
      status: order.status,
      updatedBy: role === 'admin' ? 'admin' : 'user',
      note: note || null,
      date: new Date(),
    });
  }
  await order.save();
  await order.populate([
    { path: 'userId', select: 'email phoneNumber role user_details' },
    { path: 'productsDetails.productId', select: 'name price images' },
  ]);

  // Send email notifications after successful status update
  if (typeof newStatus === 'string' && newStatus !== '') {
    const buyerEmail = order.userId?.email;
    const buyerName = order.userId?.user_details?.name || 'Customer';

    // Send email to buyer
    if (buyerEmail) {
      emailService.sendOrderStatusUpdateEmailForBuyer(buyerEmail, order, newStatus, buyerName, note);
    }

    // Send email to seller
    emailService.sendOrderStatusUpdateEmailForSeller(order, newStatus, buyerEmail, buyerName, note);
  }

  return order;
};

const updateOrder = async (id, updateData, userId, role) => {
  const filter = role === 'admin' ? { _id: id } : { _id: id, userId };
  const order = await Order.findOne(filter);

  if (!order) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Order not found');
  }

  // Only allow updates if order is in 'placed' status
  if (order.status === 'cancelled' || order.status === 'delivered') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Order can not be updated when status is "cancelled or delivered');
  }

  // Build update object with only provided fields
  const updateObject = {};

  if (updateData.address) {
    updateObject.address = { ...order.address, ...updateData.address };
  }

  if (updateData.phoneNumber !== undefined) {
    updateObject.phoneNumber = updateData.phoneNumber;
  }

  if (updateData.productsDetails) {
    updateObject.productsDetails = updateData.productsDetails;
  }

  if (updateData.shippingCharge !== undefined) {
    updateObject.shippingCharge = updateData.shippingCharge;
  }

  // Add to status history
  updateObject.$push = {
    statusHistory: {
      status: order.status,
      updatedBy: role === 'admin' ? 'admin' : 'user',
      note: 'Order details updated',
      date: new Date(),
    },
  };

  const updatedOrder = await Order.findOneAndUpdate(filter, updateObject, { new: true }).populate([
    { path: 'userId', select: 'email phoneNumber role user_details' },
    { path: 'productsDetails.productId', select: 'name price images' },
  ]);

  return updatedOrder;
};

module.exports = {
  getAllOrders,
  createOrderFromCart,
  getOrdersByUser,
  getOrderById,
  cancelOrder,
  updateOrderStatus,
  updateOrder,
};
