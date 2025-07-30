const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');
const { TransactionLogType } = require('../utils/constants');

const transactionSchema = mongoose.Schema(
  {
    userId: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'User',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    payment_mode: {
      type: String,
      enum: ['IMPS', 'NEFT', 'RTGS', 'TOPUP'],
      required: true,
    },
    beneficiary_name: {
      type: String,
      trim: true,
    },
    beneficiary_account_numb: {
      type: String,
      trim: true,
    },
    beneficiary_ifsc_code: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'SUCCESS', 'FAILED', 'CANCELLED'],
      default: 'PENDING',
    },
    PaymentReferenceNo: {
      type: String,
      trim: true,
    },
    CMPReferenceNo: {
      type: String,
      trim: true,
    },
    // Status: {
    //   type: String,
    //   trim: true,
    // },
    transaction_id: {
      type: String,
      trim: true,
    },
    errorMessage: {
      type: String,
      trim: true,
    },
    trx_id: {
      type: String,
      trim: true,
    },
    utr_no: {
      type: String,
      trim: true,
    },
    paymentRefNo: {
      type: String,
      trim: true,
    },
    fees: {
      type: Number,
      default: 0.0,
    },
    payable: {
      type: Number,
    },
    remark: {
      type: String,
      trim: true,
    },
    type: {
      type: String,
      trim: true,
    },
    transactionType: {
      type: String,
      enum: ['PAYOUT', 'BULK_PAYOUT', 'PAY_IN_API', 'PAY_IN'],
      trim: true,
    },
    currency: {
      type: String,
      default: 'INR',
      trim: true,
    },
    transactionDate: {
      type: Date,
    },
    requestData: {
      type: Object,
    },
    responseData: {
      type: Object,
    },
    transactionLogType:{
      type: String,
      enum: Object.values(TransactionLogType),
      trim: true,
    }
  },
  {
    timestamps: true,
  },
);

// Add plugins
transactionSchema.plugin(toJSON);
transactionSchema.plugin(paginate);

/**
 * @typedef Transaction
 */
const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;
