const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    reviewStar: { type: Number, min: 1, max: 5, required: true },
    msg: { type: String, default: '' },
  },
  { timestamps: true },
);

// Prevent duplicate reviews by the same user for the same product
reviewSchema.index({ userId: 1, productId: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);
