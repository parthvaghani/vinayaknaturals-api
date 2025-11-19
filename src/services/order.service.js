const Order = require('../models/order.model');
const Address = require('../models/address.model');
const Cart = require('../models/cart.model');
const User = require('../models/user.model');
const { emailService, productService, invoiceService } = require('./index');
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
      posOrder,
    } = query;

    const filter = {};
    if (status) filter.status = status;
    if (userId) filter.userId = userId;
    if (phoneNumber) filter.phoneNumber = phoneNumber;
    if (productId) filter['productsDetails.productId'] = productId;
    if (typeof posOrder !== 'undefined') filter.posOrder = posOrder === 'true' || posOrder === true;
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

// ignore cart sync
// const createOrderFromCart = async ({ cartItems, userId, addressId, ReqBody }) => {
//   const address = await Address.findOne({ _id: addressId, userId });
//   if (!address) {
//     const error = new Error('Address not found');
//     error.statusCode = 404;
//     throw error;
//   }

//   if (!cartItems || cartItems.length === 0) {
//     const error = new Error('Cart is empty');
//     error.statusCode = 400;
//     throw error;
//   }

//   // Build productsDetails array using cart's weightVariant and weight, and product's variants for price/discount
//   // First check all products' categories have pricingEnabled true
//   const categoryIds = cartItems
//     .map((item) => item.productId && item.productId.category)
//     .filter(Boolean);

//   const uniqueCategoryIds = [...new Set(categoryIds.map(id => id.toString()))];
//   const categories = await require('../models/productCategory.model').find({
//     _id: { $in: uniqueCategoryIds }
//   });

//   const nonPricedCategory = categories.find((cat) => cat.pricingEnabled === false);
//   if (nonPricedCategory) {
//     const error = new Error(`Order cannot be placed for category "${nonPricedCategory.name}" as pricing is disabled.`);
//     error.statusCode = 400;
//     throw error;
//   }

//   // Build productsDetails as before
//   const productsDetails = cartItems.map((item) => {
//     const product = item.productId;
//     const weightVariant = item.weightVariant; // 'gm' or 'kg' from cart
//     const weight = item.weight; // e.g. '200' or '1'
//     let pricePerUnit = 0;
//     let discount = 0;
//     if (product && product.variants && product.variants[weightVariant] && Array.isArray(product.variants[weightVariant])) {
//       const foundVariant = product.variants[weightVariant].find(
//         (v) => v && v.weight && v.weight.toString() === weight.toString(),
//       );
//       if (foundVariant) {
//         pricePerUnit = typeof foundVariant.price === 'number' ? foundVariant.price : 0;
//         discount = typeof foundVariant.discount === 'number' ? foundVariant.discount : 0;
//       }
//     }

//     return {
//       productId: product._id,
//       weightVariant: weightVariant,
//       weight: weight,
//       pricePerUnit,
//       discount,
//       totalUnit: item.totalProduct,
//     };
//   });

//   const user = await User.findById(userId).select('phoneNumber');
//   const phoneNumber = user && user.phoneNumber ? user.phoneNumber : '';
//   const orderDoc = await Order.create({
//     userId,
//     address: {
//       addressLine1: address.addressLine1,
//       addressLine2: address.addressLine2,
//       city: address.city,
//       state: address.state,
//       zip: address.zip,
//       country: address.country || 'IND',
//     },
//     productsDetails,
//     phoneNumber,
//     applyCoupon: {
//       couponId: ReqBody.couponId,
//       discountAmount: ReqBody.discountAmount,
//       discountPercentage: ReqBody.discountPercentage,
//     },
//     statusHistory: [
//       { status: 'placed', updatedBy: 'user', note: 'Order placed' }
//     ],
//   });

//   // Increment coupon usage count AND log usage if coupon was applied
//   if (ReqBody.couponId) {
//     await Coupon.updateOne(
//       { _id: ReqBody.couponId },
//       {
//         $inc: { usageCount: 1 },
//         $push: {
//           usageLog: {
//             userId: userId,
//             usedAt: new Date(),
//             orderId: ReqBody.orderId || null,
//           }
//         }
//       }
//     );
//   }

//   await Cart.updateMany({ userId, isOrdered: false }, { $set: { isOrdered: true } });

//   try {
//     // Populate for email templates (product names)
//     const populatedOrder = await Order.findById(orderDoc._id)
//       .populate({ path: 'productsDetails.productId', select: 'name' })
//       .lean();

//     // Fetch buyer details
//     const buyer = await User.findById(userId).select('email user_details.name').lean();
//     const buyerEmail = buyer && buyer.email ? buyer.email : null;
//     const buyerName = buyer && buyer.user_details && buyer.user_details.name ? buyer.user_details.name : '';

//     // Send emails in parallel (non-blocking)
//     await Promise.allSettled([
//       emailService.sendOrderPlacedEmailForBuyer(buyerEmail, populatedOrder, buyerName, ReqBody.discountAmount),
//       emailService.sendOrderPlacedEmailForSeller(buyerEmail, populatedOrder, buyerName, ReqBody.discountAmount),
//     ]);
//   } catch (error) {
//     return error;
//   }
//   return { orderDoc, ReqBody };
// };

const createOrderFromCart = async ({ userId, addressId, phoneNumber, ReqBody, isGuestOrder = false, isNewAccount = false, resetToken = null }) => {
  const address = await Address.findOne({ _id: addressId, userId });
  if (!address) {
    const error = new Error('Address not found');
    error.statusCode = 404;
    throw error;
  }

  const productsDetails = await Promise.all(ReqBody?.cart?.map(async (item) => {
    const weightVariant = item.weightVariant; // 'gm' or 'kg' from cart
    const weight = item.weight; // e.g. '200' or '1'
    let pricePerUnit = 0;
    let discount = 0;
    const findProdcut = await productService.getProductById(item.productId);
    // Remove or replace console.log for lint compliance
    // console.log('findProdcut', findProdcut);
    if (findProdcut.variants && findProdcut.variants[weightVariant] && Array.isArray(findProdcut.variants[weightVariant])) {
      const foundVariant = findProdcut.variants[weightVariant].find(
        (v) => v && v.weight && v.weight.toString() === weight.toString(),
      );
      if (foundVariant) {
        pricePerUnit = typeof foundVariant.price === 'number' ? foundVariant.price : 0;
        discount = typeof foundVariant.discount === 'number' ? foundVariant.discount : 0;
      }
    }

    return {
      productId: item.productId,
      weightVariant: weightVariant,
      weight: weight,
      pricePerUnit,
      discount,
      totalUnit: item.totalProduct,
    };
  }));

  // Use provided phoneNumber for guest orders, otherwise fetch from user
  let finalPhoneNumber = phoneNumber;
  if (!finalPhoneNumber) {
    const user = await User.findById(userId).select('phoneNumber');
    finalPhoneNumber = user && user.phoneNumber ? user.phoneNumber : '';
  }
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
    phoneNumber: finalPhoneNumber,
    applyCoupon: {
      couponId: ReqBody.couponId,
      discountAmount: ReqBody.discountAmount,
      discountPercentage: ReqBody.discountPercentage,
    },
    statusHistory: [
      { status: 'placed', updatedBy: 'user', note: 'Order placed' }
    ],
  });

  // // Increment coupon usage count AND log usage if coupon was applied
  if (ReqBody.couponId) {
    await Coupon.updateOne(
      { _id: ReqBody.couponId },
      {
        $inc: { usageCount: 1 },
        $push: {
          usageLog: {
            userId: userId,
            usedAt: new Date(),
            orderId: ReqBody.orderId || null,
          }
        }
      }
    );
  }

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

    // Generate invoice number and save to order
    const invoiceNumber = await invoiceService.generateInvoiceNumber();
    await Order.findByIdAndUpdate(orderDoc._id, { invoiceNumber });

    // Update populatedOrder with invoice number
    populatedOrder.invoiceNumber = invoiceNumber;

    // Generate invoice PDF
    const invoicePDFBuffer = await invoiceService.generateInvoicePDF(populatedOrder, buyerName, buyerEmail);

    // Send emails in parallel (non-blocking)
    console.log('buyerEmail', buyerEmail);
    await Promise.allSettled([
      emailService.sendOrderPlacedEmailForBuyer(buyerEmail, populatedOrder, buyerName, ReqBody.discountAmount, invoicePDFBuffer, isNewAccount, resetToken),
      emailService.sendOrderPlacedEmailForSeller(buyerEmail, populatedOrder, buyerName, ReqBody.discountAmount, invoicePDFBuffer),
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
      .populate({ path: 'productsDetails.productId' });
  } else {
    return Order.find({ userId })
      .sort({ createdAt: -1 })
      .populate({ path: 'userId', select: 'email phoneNumber role user_details' })
      .populate({ path: 'productsDetails.productId' });
  }
};

const getOrderById = async (id, userId, role) => {
  const filter = role === 'admin' ? { _id: id } : { _id: id, userId };
  return Order.findOne(filter)
    .populate({ path: 'userId', select: 'email phoneNumber role user_details' })
    .populate({ path: 'productsDetails.productId' });
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
const { Coupon } = require('../models');
const logger = require('../config/logger');

const updateOrderStatus = async (id, newStatus, newPaymentStatus, note, trackingNumber, trackingLink, courierName, customMessage, role, requestUserId) => {
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
    // Tracking details are stored in statusHistory, not as direct properties
    if (typeof note === 'string' && note !== order.note) {
      order.note = note;
      changed = true;
    }
    if (changed) {
      order.statusHistory.push({ status: newStatus, updatedBy: 'admin', note: note || null, date: new Date() });
    }
    if (note && note !== '') {
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
      trackingNumber: trackingNumber || null,
      trackingLink: trackingLink || null,
      courierName: courierName || null,
      customMessage: customMessage || null,
      date: new Date(),
    });
  } else if (note && note !== '') {
    order.statusHistory.push({
      status: order.status,
      updatedBy: role === 'admin' ? 'admin' : 'user',
      note: note || null,
      trackingNumber: trackingNumber || null,
      trackingLink: trackingLink || null,
      courierName: courierName || null,
      customMessage: customMessage || null,
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

    // Prepare tracking details for completed status
    // Get tracking details from the latest status history entry
    const latestStatusEntry = order.statusHistory && order.statusHistory.length > 0 ? order.statusHistory[order.statusHistory.length - 1] : {};

    const trackingDetails = newStatus === 'completed' ? {
      trackingNumber: latestStatusEntry.trackingNumber || null,
      trackingLink: latestStatusEntry.trackingLink || null,
      courierName: latestStatusEntry.courierName || null,
      customMessage: latestStatusEntry.customMessage || null
    } : {};

    // Debug logging to check tracking details (uncomment for debugging)
    // const logger = require('../config/logger');
    // logger.info('Order tracking details:', {
    //   latestStatusEntry,
    //   trackingDetails,
    //   statusHistory: order.statusHistory
    // });

    // Send email to buyer
    if (buyerEmail) {
      emailService.sendOrderStatusUpdateEmailForBuyer(buyerEmail, order, newStatus, buyerName, note, trackingDetails);
    }

    // Send email to seller
    emailService.sendOrderStatusUpdateEmailForSeller(order, newStatus, buyerEmail, buyerName, note, trackingDetails);
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

const downloadInvoice = async (orderId, userId, role) => {
  // Get order with populated fields
  const order = await getOrderById(orderId, userId, role);

  if (!order) {
    const error = new Error('Order not found');
    error.statusCode = 404;
    throw error;
  }

  // Get buyer details
  const buyerName = order.userId?.user_details?.name || 'Customer';
  const buyerEmail = order.userId?.email || 'Customer';

  // Generate invoice PDF
  const pdfBuffer = await invoiceService.generateInvoicePDF(order, buyerName, buyerEmail);

  return {
    pdfBuffer,
    invoiceNumber: order.invoiceNumber,
    order,
  };
};

const createPosOrder = async ({ userId, ReqBody }) => {
  const productsDetails = await Promise.all(ReqBody?.cart?.map(async (item) => {
    const weightVariant = item.weightVariant; // 'gm' or 'kg' from cart
    const weight = item.weight; // e.g. '200' or '1'
    let pricePerUnit = item.price || 0; // Use price from frontend if available
    let discount = item.discount || 0; // Use discount from frontend if available

    // If price not provided in request, try to fetch from product database
    if (!item.price && item.productId) {
      try {
        const findProduct = await productService.getProductById(item.productId);

        if (findProduct && findProduct.variants && findProduct.variants[weightVariant] && Array.isArray(findProduct.variants[weightVariant])) {
          const foundVariant = findProduct.variants[weightVariant].find(
            (v) => v && v.weight && v.weight.toString() === weight.toString(),
          );
          if (foundVariant) {
            pricePerUnit = typeof foundVariant.price === 'number' ? foundVariant.price : 0;
            discount = typeof foundVariant.discount === 'number' ? foundVariant.discount : 0;
          } else {
            // Log warning if variant not found
            logger.warn(`Variant not found for product ${item.productId}, weight: ${weight}, variant: ${weightVariant}`);
            logger.warn('Available variants:', findProduct.variants[weightVariant]);
          }
        } else {
          logger.warn(`Product ${item.productId} has no variants or invalid structure`);
        }
      } catch (error) {
        logger.error(`Error fetching product ${item.productId}:`, error);
      }
    }

    return {
      productId: item.productId,
      weightVariant: weightVariant,
      weight: weight,
      pricePerUnit,
      discount,
      totalUnit: item.totalProduct,
    };
  }));

  const orderDoc = await Order.create({
    userId,
    address: {
      addressLine1: ReqBody.address.addressLine1,
      addressLine2: ReqBody.address.addressLine2 || '',
      city: ReqBody.address.city,
      state: ReqBody.address.state,
      zip: ReqBody.address.zip,
      country: ReqBody.address.country || 'IND',
    },
    productsDetails,
    phoneNumber: ReqBody.phoneNumber,
    applyCoupon: {
      couponId: ReqBody.couponId,
      discountAmount: ReqBody.discountAmount,
      discountPercentage: ReqBody.discountPercentage,
    },
    posOrder: true,
    statusHistory: [
      { status: 'placed', updatedBy: 'user', note: 'POS Order placed' }
    ],
  });

  // Increment coupon usage count AND log usage if coupon was applied
  if (ReqBody.couponId) {
    await Coupon.updateOne(
      { _id: ReqBody.couponId },
      {
        $inc: { usageCount: 1 },
        $push: {
          usageLog: {
            userId: userId,
            usedAt: new Date(),
            orderId: orderDoc._id,
          }
        }
      }
    );
  }

  try {
    // Populate for email templates (product names)
    const populatedOrder = await Order.findById(orderDoc._id)
      .populate({ path: 'productsDetails.productId', select: 'name' })
      .lean();

    // Fetch buyer details
    const buyer = await User.findById(userId).select('email user_details.name').lean();
    const buyerEmail = buyer && buyer.email ? buyer.email : null;
    const buyerName = buyer && buyer.user_details && buyer.user_details.name ? buyer.user_details.name : '';

    // Generate invoice number and save to order
    const invoiceNumber = await invoiceService.generateInvoiceNumber();
    await Order.findByIdAndUpdate(orderDoc._id, { invoiceNumber });

    // Update populatedOrder with invoice number
    populatedOrder.invoiceNumber = invoiceNumber;

    // Send emails in parallel (non-blocking)
    await Promise.allSettled([
      emailService.sendOrderPlacedEmailForBuyer(buyerEmail, populatedOrder, buyerName, ReqBody.discountAmount),
      emailService.sendOrderPlacedEmailForSeller(buyerEmail, populatedOrder, buyerName, ReqBody.discountAmount),
    ]);
  } catch (error) {
    return error;
  }

  return { orderDoc, ReqBody };
};

module.exports = {
  getAllOrders,
  createOrderFromCart,
  getOrdersByUser,
  getOrderById,
  cancelOrder,
  updateOrderStatus,
  updateOrder,
  downloadInvoice,
  createPosOrder,
};
