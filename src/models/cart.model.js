const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  totalProduct: { type: Number, required: true, default: 1 },
  weightVariant: { type: String, required: true },
  weight: { type: String, required: true },
  isOrdered: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

module.exports = mongoose.model('Cart', cartSchema);
