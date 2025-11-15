const Coupon = require('../models/coupon.model');
const User = require('../models/user.model');
const Order = require('../models/order.model');

// Utility to generate random coupon codes
function generateCouponCode(prefix = 'SAVE') {
  const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${randomPart}`;
}

const createCoupon = async (data) => {
  const exists = await Coupon.findOne({ couponCode: data.couponCode.trim() });
  if (exists) {
    throw new Error(`Coupon code "${data.couponCode}" already exists`);
  }

  if (!data.couponCode || data.couponCode.trim() === '') {
    let unique = false;
    let code;

    while (!unique) {
      code = generateCouponCode();
      const exists = await Coupon.findOne({ couponCode: code });
      if (!exists) unique = true;
    }

    data.couponCode = code;
  }

  const coupon = await Coupon.create(data);
  return coupon;
};

const getAllCoupons = async () => {
  return await Coupon.find().populate({
    path: 'userType',
    select: 'user_details email'
  });
};

const getAllPosCoupons = async () => {
  return await Coupon.find({ couponType: 'pos' }).populate({
    path: 'userType',
    select: 'user_details email'
  });
};

const getCouponById = async (id) => {
  return await Coupon.findById(id).populate('userType', 'name email');
};

const updateCoupon = async (id, data) => {
  if (data.couponCode) {
    const exists = await Coupon.findOne({
      couponCode: data.couponCode.trim(),
      _id: { $ne: id } // Exclude current coupon
    });
    if (exists) {
      throw new Error(`Coupon code "${data.couponCode}" already exists`);
    }
  }
  return await Coupon.findByIdAndUpdate(id, data, { new: true });
};

const deleteCoupon = async (id) => {
  return await Coupon.findByIdAndDelete(id);
};

// 🆕 NEW HELPER: Check if this is user's first order
const isUserFirstOrder = async (userId) => {
  // You need to import your Order model
  const Order = require('../models/order.model'); // Adjust path as needed

  const orderCount = await Order.countDocuments({
    userId: userId,
    status: { $in: ['completed', 'delivered', 'confirmed'] } // Adjust statuses based on your system
  });

  return orderCount === 0;
};

// 🆕 NEW HELPER: Get user's coupon usage count
const getUserCouponUsageCount = async (couponId, userId) => {
  const coupon = await Coupon.findById(couponId);
  if (!coupon) return 0;

  const userUsages = coupon.usageLog.filter(
    log => log.userId.toString() === userId.toString()
  );

  return userUsages.length;
};

const applyCoupon = async ({ couponCode, userId, orderQuantity, cartValue, level }) => {
  const coupon = await Coupon.findOne({ couponCode }).populate('userType', 'user_details.name email');
  if (!coupon) throw new Error('Coupon code is invalid');

  const now = new Date();
  if (now < coupon.startDate) {
    throw new Error('Coupon is not yet active');
  }

  if (now > coupon.expiryDate) {
    throw new Error('Coupon has expired');
  }

  if (coupon.level !== level) {
    throw new Error(`Coupon cannot be applied to this ${level}`);
  }

  if (orderQuantity < coupon.minOrderQuantity) {
    throw new Error(`Minimum order quantity for this coupon is ${coupon.minOrderQuantity}`);
  }

  if (cartValue < coupon.minCartValue) {
    throw new Error(`Minimum cart value for this coupon is ${coupon.minCartValue}`);
  }

  if (coupon.maxUsage <= coupon.usageCount) {
    throw new Error('This coupon has reached its maximum usage limit.');
  }

  // 🆕 NEW VALIDATION: Check if coupon is for first order only
  if (coupon.firstOrderOnly) {
    const isFirstOrder = await isUserFirstOrder(userId);
    if (!isFirstOrder) {
      throw new Error('This coupon is only valid for first-time orders');
    }
  }

  // 🆕 NEW VALIDATION: Check per-user usage limit
  const userUsageCount = await getUserCouponUsageCount(coupon._id, userId);
  if (userUsageCount >= coupon.maxUsagePerUser) {
    throw new Error(`You have reached the maximum usage limit (${coupon.maxUsagePerUser}) for this coupon`);
  }


  if (coupon.type === 'unique' && (!userId || coupon.userType._id.toString() !== userId)) {
    throw new Error('This coupon is only valid for a specific user');
  }

  const discount = (cartValue * coupon.maxDiscountValue) / 100;

  // 🆕 Update usage log and count
  // coupon.usageCount += 1;
  await coupon.save();

  return {
    couponId: coupon._id,
    couponCode: coupon.couponCode,
    discount,
    percentage: `${coupon.maxDiscountValue}%`,
    remainingUsageForUser: coupon.maxUsagePerUser - (userUsageCount + 1)
  };
};

const getCouponsForUser = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const now = new Date();

  // Check if user is a first-time customer
  const isFirstOrder = await isUserFirstOrder(userId);

  // Generic coupons
  const genericQuery = {
    type: 'generic',
    isActive: true,
    startDate: { $lte: now },
    expiryDate: { $gte: now },
    couponType: 'normal'
  };

  // If not first order, exclude first-order-only coupons
  if (!isFirstOrder) {
    genericQuery.firstOrderOnly = false;
  }

  const genericCoupons = await Coupon.find(genericQuery);

  // Filter out coupons where user has reached maxUsagePerUser
  const availableGenericCoupons = [];
  for (const coupon of genericCoupons) {
    const userUsageCount = await getUserCouponUsageCount(coupon._id, userId);

    // Check if coupon is for first order only
    if (coupon.firstOrderOnly) {
      const hasOrders = await Order.exists({ userId });
      if (hasOrders) {
        continue;
      }
    }

    if (userUsageCount < coupon.maxUsagePerUser) {
      availableGenericCoupons.push(coupon);
    }
  }

  // Unique coupons
  const uniqueCoupons = await Coupon.find({
    userType: userId,
    type: 'unique',
    isActive: true,
    startDate: { $lte: now },
    expiryDate: { $gte: now },
  });

  const availableUniqueCoupons = [];
  for (const coupon of uniqueCoupons) {
    const userUsageCount = await getUserCouponUsageCount(coupon._id, userId);
    // Check if coupon is for first order only
    if (coupon.firstOrderOnly) {
      const hasOrders = await Order.exists({ userId });
      if (hasOrders) {
        continue;
      }
    }
    if (userUsageCount < coupon.maxUsagePerUser) {
      availableUniqueCoupons.push(coupon);
    }
  }
  return [...availableGenericCoupons, ...availableUniqueCoupons];
};

module.exports = {
  createCoupon,
  getAllCoupons,
  getCouponById,
  updateCoupon,
  deleteCoupon,
  applyCoupon,
  getCouponsForUser,
  getAllPosCoupons
};
