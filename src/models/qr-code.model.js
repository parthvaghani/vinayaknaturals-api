const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');

const qrCodeSchema = mongoose.Schema(
  {
    slug: {
      type: String,
      required: true,
      trim: true,
    },
    referralId: {
      type: String,
      required: true,
      trim: true,
    },
    orderId: {
      type: String,
      required: true,
      trim: true,
    },
    qrCode: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['paid', 'unpaid'],
      default: 'unpaid',
    },
    credited: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Add plugins
qrCodeSchema.plugin(toJSON);
qrCodeSchema.plugin(paginate);

/**
 * @typedef QrCode
 */
const QrCode = mongoose.model('QrCode', qrCodeSchema);

module.exports = QrCode;