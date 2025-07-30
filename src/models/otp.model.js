const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');

const otpSchema = mongoose.Schema(
  {
    phoneNumber: {
      type: String,
      trim: true,
    },
    otp: {
      type: Number,
      orderKey: 1,
    },
    expireAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

// add plugin that converts mongoose to json
otpSchema.plugin(toJSON);
otpSchema.plugin(paginate);

const OTP = mongoose.model('Otp', otpSchema);

module.exports = OTP;
