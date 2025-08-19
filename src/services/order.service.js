const Order = require('../models/order.model');
const Address = require('../models/address.model');
const Cart = require('../models/cart.model');
const User = require('../models/user.model');

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
      const regex = { $regex: String(search), $options: 'i' };
      searchFilter = {
        $or: [
          { phoneNumber: regex },
          { status: regex },
          { 'address.addressLine1': regex },
          { 'address.addressLine2': regex },
          { 'address.city': regex },
          { 'address.state': regex },
          { 'address.zip': regex },
        ],
      };
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

const createOrderFromCart = async ({ userId, addressId }) => {
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
    if (
      product &&
      product.variants &&
      product.variants[weightVariant] &&
      Array.isArray(product.variants[weightVariant])
    ) {
      const foundVariant = product.variants[weightVariant].find(
        (v) => v && v.weight && v.weight.toString() === weight.toString()
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
  });

  await Cart.updateMany({ userId, isOrdered: false }, { $set: { isOrdered: true } });

  return orderDoc;
};

const getOrdersByUser = async (userId, userRole) => {
  if (userRole === 'admin') {
    return Order.find()
      .populate({ path: 'userId', select: 'email phoneNumber role user_details' })
      .populate({ path: 'productsDetails.productId', select: 'name price images' });
  }
  else {
    return Order.find({ userId })
      .populate({ path: 'userId', select: 'email phoneNumber role user_details' })
      .populate({ path: 'productsDetails.productId', select: 'name price images' });
  }
};

const getOrderById = async (id, userId, role) => {
  const filter = role === 'admin' ? { _id: id } : { _id: id, userId };
  return Order.findOne(filter)
    .populate({ path: 'userId', select: 'email phoneNumber role user_details' })
    .populate({ path: 'productsDetails.productId', select: 'name price images' });
};

const cancelOrder = async (id, userId, reason, role) => {
  const filter = role === 'admin' ? { _id: id } : { _id: id, userId };
  return Order.findOneAndUpdate(
    filter,
    { $set: { status: 'cancelled', 'cancelDetails.reason': reason || null, 'cancelDetails.canceledBy': role === 'admin' ? 'admin' : 'user', 'cancelDetails.date': Date.now() } },
    { new: true }
  );
};

module.exports = {
  getAllOrders,
  createOrderFromCart,
  getOrdersByUser,
  getOrderById,
  cancelOrder,
};

