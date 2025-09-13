const mongoose = require('mongoose');

const testimonialSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    body: { type: String, required: true, trim: true },
    img: { type: String, trim: true },
    location: { type: String, trim: true },
    visible: { type: Boolean, default: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Testimonial', testimonialSchema);
