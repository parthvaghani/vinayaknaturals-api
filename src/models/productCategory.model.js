const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    category: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    description: String,
    heroImage: String,
    pricingEnabled: { type: Boolean, default: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model('ProductCategory', categorySchema);
