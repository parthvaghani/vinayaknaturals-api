const httpStatus = require('http-status');
const { Transaction } = require('../models');
const ApiError = require('../utils/ApiError');
const logger = require('../config/logger');
const { checkKycVerification } = require('../utils/kycVerification');
const { TransactionLogType, TRANSACTION_TYPE } = require('../utils/constants');

/**
 * Create a transaction log
 * @param {Object} transactionData
 * @returns {Promise<Transaction>}
 */
const createTransaction = async (transactionData) => {
  logger.info(`Creating transaction log for user: ${transactionData.userId}`);

  await checkKycVerification(
    transactionData.userId,
    'KYC verification required. Please complete your verification before initiating transactions.',
  );

  // Set default transaction date if not provided
  if (!transactionData.transactionDate) {
    transactionData.transactionDate = new Date();
  }

  // Generate type field based on payment_mode if not provided
  if (!transactionData.type && transactionData.payment_mode) {
    transactionData.type = `${TransactionLogType.TRANSFER_MONEY} (${transactionData.payment_mode})`;
  }

  // Set currency if not provided
  if (!transactionData.currency) {
    transactionData.currency = 'INR';
  }

  // Calculate payable amount if not provided
  if (!transactionData.payable && transactionData.amount) {
    const fees = transactionData.fees || 0;
    transactionData.payable = transactionData.amount + fees;
  }

  return Transaction.create(transactionData);
};

/**
 * Get transaction by id
 * @param {ObjectId} id
 * @returns {Promise<Transaction>}
 */
const getTransactionById = async (id) => {
  return Transaction.findById(id);
};

const getTransactionByIdForAdmin = async (id) => {
  return Transaction.findOne({
    _id: id,
    status: { $in: ['FAILED', 'PENDING'] },
    transactionType: { $in: ['PAYOUT', 'BULK_PAYOUT'] },
  });
};

/**
 * Get transaction by order id
 * @param {ObjectId} id
 * @returns {Promise<Transaction>}
 */
const getTransactionByOrderId = async (order_id) => {
  return Transaction.findOne({ 'requestData.order_id': order_id });
};

/**
 * Get transaction by ref_id (for payin orders)
 * @param {String} ref_id
 * @returns {Promise<Transaction>}
 */
const getTransactionByRefId = async (ref_id) => {
  return Transaction.findOne({ 'requestData.ref_id': ref_id });
};

/**
 * Get all transactions for a user
 * @param {ObjectId} userId
 * @param {Object} options - Query options
 * @param {Object} filter - Filter criteria
 * @returns {Promise<QueryResult>}
 */
const getTransactionsByUserId = async (userId, options, filter = {}) => {
  const userFilter = { ...filter, userId };
  return Transaction.paginate(userFilter, options);
};

/**
 * Update transaction status
 * @param {ObjectId} transactionId
 * @param {Object} updateBody
 * @returns {Promise<Transaction>}
 */
const updateTransaction = async (transactionId, updateBody) => {
  const transaction = await getTransactionById(transactionId);
  if (!transaction) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Transaction not found');
  }

  // If updating status to SUCCESS, ensure we capture all required details
  if (updateBody.status === 'SUCCESS' && updateBody.responseData?.data) {
    const responseData = updateBody.responseData.data;

    // Map API response fields to our transaction model
    if (responseData.PaymentReferenceNo) {
      updateBody.PaymentReferenceNo = responseData.PaymentReferenceNo;
      updateBody.paymentRefNo = responseData.PaymentReferenceNo;
    }

    if (responseData.CMPReferenceNo) {
      updateBody.CMPReferenceNo = responseData.CMPReferenceNo;
    }

    if (responseData.Status) {
      updateBody.Status = responseData.Status;
    }

    if (responseData.transaction_id) {
      updateBody.transaction_id = responseData.transaction_id;
      updateBody.trx_id = responseData.transaction_id;
    }

    // Extract UTR if available in response
    if (responseData.utr_no || responseData.UTR_NO || responseData.utr) {
      updateBody.utr_no = responseData.utr_no || responseData.UTR_NO || responseData.utr;
    }

    // Set transaction date if available
    if (!updateBody.transactionDate) {
      updateBody.transactionDate = new Date();
    }

    // Set type if not already set
    if (!transaction.type && transaction.payment_mode) {
      updateBody.type = `${TransactionLogType.TRANSFER_MONEY} (${transaction.payment_mode})`;
    }

    // Set remark based on status
    if (!updateBody.remark) {
      updateBody.remark =
        updateBody.status === 'SUCCESS' ? 'Success' : updateBody.status === 'FAILED' ? 'Failed' : 'Pending';
    }
  }

  Object.assign(transaction, updateBody);
  await transaction.save();
  return transaction;
};

/**
 * Update the most recent transaction for a user
 * @param {ObjectId} userId
 * @param {Object} updateBody
 * @returns {Promise<Transaction>}
 */
const updateTransactionByUserId = async (userId, updateBody) => {
  try {
    const transactions = await Transaction.find({ userId, status: 'PENDING' }).sort({ createdAt: -1 }).limit(1);

    if (transactions.length === 0) {
      logger.warn(`No pending transactions found for user ${userId}`);
      return null;
    }

    const transaction = transactions[0];
    logger.info(`Updating transaction ${transaction.id} for user ${userId}`);

    return updateTransaction(transaction.id, updateBody);
  } catch (error) {
    logger.error(`Error updating transaction for user ${userId}:`, error);
    throw error;
  }
};

/**
 * Get all transactions with pagination and filtering
 * @param {Object} filter - Filter criteria (userId, status, payment_mode, etc.) If empty, returns all transactions
 * @param {Object} options - Query options (limit, page, sortBy)
 * @returns {Promise<QueryResult>}
 */
const queryTransactions = async (filter, options) => {
  return Transaction.paginate(filter, options);
};

/**
 * Get all PENDING PAY_IN_API transactions
 * @param {ObjectId} userId - Optional user ID to filter transactions
 * @returns {Promise<Array<Transaction>>}
 */
const getPendingPayinApiTransactions = async (userId) => {
  const filter = { status: 'PENDING', transactionType: TRANSACTION_TYPE.PAY_IN_API };
  if (userId) {
    filter.userId = userId;
  }
  return Transaction.find(filter);
};

module.exports = {
  createTransaction,
  getTransactionById,
  getTransactionsByUserId,
  updateTransaction,
  updateTransactionByUserId,
  queryTransactions,
  getTransactionByOrderId,
  getTransactionByRefId,
  getPendingPayinApiTransactions, // <-- export new helper
  getTransactionByIdForAdmin
};
