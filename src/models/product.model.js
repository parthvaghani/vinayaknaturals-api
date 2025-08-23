const mongoose = require('mongoose');

// const variantSchema = new mongoose.Schema({
//   unit: { type: String, required: true }, // e.g., gm or kg
//   weight: { type: String, required: true }, // e.g., 250 or 500g
//   price: { type: Number, required: true },
//   discount: { type: Number, default: 0 },
// }, { _id: false });

const productSchema = new mongoose.Schema({
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductCategory', required: true },
  name: { type: String, required: true },
  description: String,
  images: [String],
  ingredients: [String],
  benefits: [String],
  isPremium: { type: Boolean, default: false },
  isPopular: { type: Boolean, default: false },
  variants: {
    gm: [{
      weight: { type: String, required: true }, // e.g., 250 or 500g
      price: { type: Number, required: true },
      discount: { type: Number, default: 0 },
    }],
    kg: [{
      weight: { type: String, required: true }, // e.g., 250 or 500g
      price: { type: Number, required: true },
      discount: { type: Number, default: 0 },
    }]
  },
  review: [{
    userId: { type: mongoose.Schema.Types.ObjectId },
    reviewStar: { type: Number },
    msg: { type: String }
  }],
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
