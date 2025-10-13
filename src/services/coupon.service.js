const Coupon = require('../models/coupon.model');
const User = require('../models/user.model');

// Utility to generate random coupon codes
function generateCouponCode(prefix = 'SAVE') {
  const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase(); // 6-char random
  return `${prefix}-${randomPart}`;
}

const createCoupon = async (data) => {
  const exists = await Coupon.findOne({ couponCode: data.couponCode.trim() });
  if (exists) {
    throw new Error(`Coupon code "${data.couponCode}" already exists`);
  }

  // If couponCode is missing, auto-generate one
  if (!data.couponCode || data.couponCode.trim() === '') {
    let unique = false;
    let code;

    // Try generating a unique one (avoid duplicates)
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
  return await Coupon.find().populate('userType', 'user_details.name email');
};

const getCouponById = async (id) => {
  return await Coupon.findById(id).populate('userType', 'name email');
};

const updateCoupon = async (id, data) => {
  if (data.couponCode) {
    const exists = await Coupon.findOne({ couponCode: data.couponCode.trim() });
    if (exists) {
      throw new Error(`Coupon code "${data.couponCode}" already exists`);
    }
  }
  return await Coupon.findByIdAndUpdate(id, data, { new: true });
};

const deleteCoupon = async (id) => {
  return await Coupon.findByIdAndDelete(id);
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

  if (coupon.type === 'unique' && (!userId || coupon.userType._id.toString() !== userId)) {
    throw new Error('This coupon is only valid for a specific user');
  }

  const discount = (cartValue * coupon.maxDiscountValue) / 100;

  // Increment usage count
  // coupon.usageCount += 1;
  await coupon.save();

  return { couponId: coupon._id, couponCode: coupon.couponCode, discount, percentage: `${coupon.maxDiscountValue}%` };
};

const getCouponsForUser = async (userId) => {
  // ✅ Check if user exists
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const now = new Date();

  // 🏷️ Generic coupons: available to everyone
  const genericCoupons = await Coupon.find({
    type: 'generic',
    isActive: true,
    startDate: { $lte: now },
    expiryDate: { $gte: now },
  });
  // console.log('genericCoupons ::>', genericCoupons);

  // 🧍 Unique coupons: only for this user
  const uniqueCoupons = await Coupon.find({
    userType: userId,
    type: 'unique',
    isActive: true,
    startDate: { $lte: now },
    expiryDate: { $gte: now },
  });
  // console.log('uniqueCoupons ::>', uniqueCoupons);

  return [...genericCoupons, ...uniqueCoupons];
};


module.exports = {
  createCoupon,
  getAllCoupons,
  getCouponById,
  updateCoupon,
  deleteCoupon,
  applyCoupon,
  getCouponsForUser
};