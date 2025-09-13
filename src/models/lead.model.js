const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema(
  {
    page: { type: String, required: true, trim: true }, // Page or section where the button was clicked
    button: { type: String, trim: true }, // Button label or identifier
    message: { type: String, trim: true }, // Message user typed (e.g., for WhatsApp)
    phoneNumber: { type: String, trim: true }, // Optional contact number (E.164 if possible)
    status: {
      type: String,
      enum: ['new', 'contacted', 'closed'],
      default: 'new',
    },
    sourceUrl: { type: String, trim: true }, // Referer URL captured from request
    userAgent: { type: String, trim: true },
    ipAddress: { type: String, trim: true },
    metadata: { type: Object }, // Any extra context sent by frontend
    whatsappIntent: { type: Boolean, default: false }, // Whether this lead intended WhatsApp send
    whatsappSent: { type: Boolean, default: false }, // If frontend confirms sent
  },
  { timestamps: true },
);

module.exports = mongoose.model('WhatsAppLead', leadSchema);
