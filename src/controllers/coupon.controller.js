const couponService = require('../services/coupon.service');

const createCoupon = async (req, res) => {
  try {
    const coupon = await couponService.createCoupon(req.body);
    res.status(201).json({
      success: true,
      message: 'Coupon created successfully',
      data: coupon
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};


const getPosCoupons = async (req, res) => {
  try {
    const coupons = await couponService.getAllPosCoupons();
    res.json({ success: true, data: coupons });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getCoupons = async (req, res) => {
  try {
    const coupons = await couponService.getAllCoupons();
    res.json({ success: true, data: coupons });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getCoupon = async (req, res) => {
  try {
    const coupon = await couponService.getCouponById(req.params.id);
    if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found' });
    res.json({ success: true, data: coupon });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const updateCoupon = async (req, res) => {
  try {
    const coupon = await couponService.updateCoupon(req.params.id, req.body);
    if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found' });
    res.json({ success: true, data: coupon });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

const deleteCoupon = async (req, res) => {
  try {
    const coupon = await couponService.deleteCoupon(req.params.id);
    if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found' });
    res.json({ success: true, message: 'Coupon deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// const applyCoupon = async (req, res) => {
//   try {
//     const { couponCode, userId, orderQuantity, cartValue, level } = req.body;
//     const result = await couponService.applyCoupon({ couponCode, userId, orderQuantity, cartValue, level });
//     res.json({ success: true, data: result });
//   } catch (err) {
//     res.status(400).json({ success: false, message: err.message });
//   }
// };

const applyCoupon = async (req, res) => {
  try {
    const { couponCode, userId, orderQuantity, cartValue, level } = req.body;
    const result = await couponService.applyCoupon({
      couponCode,
      userId,
      orderQuantity,
      cartValue,
      level,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

const getUserCoupons = async (req, res) => {
  try {
    const { userId } = req.body; // or req.query if GET request

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }
    const coupons = await couponService.getCouponsForUser(userId);
    res.json({
      success: true,
      data: coupons
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

module.exports = {
  createCoupon,
  getCoupons,
  getCoupon,
  updateCoupon,
  deleteCoupon,
  applyCoupon,
  getUserCoupons,
  getPosCoupons
};