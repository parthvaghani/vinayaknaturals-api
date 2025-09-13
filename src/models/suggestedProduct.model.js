const mongoose = require('mongoose');

const suggestedProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    ingredients: {
      type: [String],
      required: true,
      validate: {
        validator: function arrayHasAtLeastOneElement(value) {
          return Array.isArray(value) && value.length > 0;
        },
        message: 'At least one ingredient is required',
      },
    },
    description: { type: String, required: true, trim: true },
    // Optional workflow fields for admins to manage suggestions later
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'approved', 'rejected'],
      default: 'pending',
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model('SuggestedProduct', suggestedProductSchema);
