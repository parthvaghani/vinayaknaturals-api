const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema(
  {
    couponCode: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
    },
    termsAndConditions: {
      type: String,
    },
    startDate: {
      type: Date,
      required: true,
    },
    expiryDate: {
      type: Date,
      required: true,
    },
    level: {
      type: String,
      enum: ['order', 'product'],
      required: true,
    },
    minOrderQuantity: {
      type: Number,
      default: 0,
    },
    minCartValue: {
      type: Number,
      default: 0,
    },
    maxDiscountValue: {
      type: Number,
      default: 0,
    },
    type: {
      type: String,
      enum: ['unique', 'generic'],
      required: true,
    },
    userType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    maxUsage: {
      type: Number,
      default: 1,
    },
    usageCount: {
      type: Number,
      default: 0,
    },
    // 🆕 NEW FIELD: Maximum times a single user can use this coupon
    maxUsagePerUser: {
      type: Number,
      default: 1, // Default: each user can use only once
    },
    // 🆕 NEW FIELD: Only for first-time orders
    firstOrderOnly: {
      type: Boolean,
      default: false,
    },
    // 🆕 NEW FIELD: Track which users have used this coupon and how many times
    usageLog: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        usedAt: {
          type: Date,
          default: Date.now,
        },
        orderId: {
          type: String, // Optional: link to order ID
        },
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    couponType: {
      type: String,
      enum: ['pos', 'normal'],
      default: 'normal',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Coupon', couponSchema);
