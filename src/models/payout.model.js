const mongoose = require('mongoose');

const payoutSchema = mongoose.Schema(
  {
    bankName: {
      type: String,
      trim: true,
    },
    beneficiaryName: {
      type: String,
      trim: true,
    },
    beneficiaryAccountNumber: {
      type: String,
      trim: true,
    },
    beneficiaryIfscCode: {
      type: String,
      trim: true,
    },
    paymentMode: {
      type: String,
      enum: ['IMPS', 'NEFT', 'RTGS'],
      default: 'IMPS',
    },
    amount: {
      type: String,
      required: true,
    },
    payableAmount: {
      type: Number,
      required: true,
    },
    chargeAmount: {
      type: String,
      required: true,
    },
    remark: {
      type: String,
      required: true,
    },
    paymentDate: {
      type: Date,
      required: true,
    },
    transactionId: {
      type: String,
      required: true,
    },
    paymentReferenceNumber: {
      type: String,
      required: true,
    },
    trxId: {
      type: String,
      required: true,
    },
    utrNumber: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending',
    },
    requestId: {
      type: String,
      required: true,
    },
    user: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

const PAYOUT = mongoose.model('Payout', payoutSchema);

module.exports = PAYOUT;
