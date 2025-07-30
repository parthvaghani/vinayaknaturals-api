const axios = require('axios');
const config = require('../config/config');
const { faker } = require('@faker-js/faker');
const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const logger = require('../config/logger');
const { transactionService, userService } = require('./index');
const { User, Bank, BulkProcessing } = require('../models');
const XLSX = require('xlsx');
const path = require('path');
const { uploadFileToS3 } = require('../Helpers/aws-s3');
const { TRANSACTION_TYPE, TransactionLogType, DEFAULT_PAYOUT_BANK } = require('../utils/constants');

const getBankConfig = async (userId) => {
  try {
    const user = await User.findById(userId).populate('assignedPayoutBank');

    if (!user.assignedPayoutBank) {
      user.assignedPayoutBank = await Bank.findOne({ bankKey: DEFAULT_PAYOUT_BANK });
    }

    if (!user) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'User does not exist');
    }

    const bank = user.assignedPayoutBank;

    if (bank.status !== 'active') {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Assigned bank is inactive');
    }
    const bankKey = bank.bankKey;

    const baseUrl = config.bank[`${bankKey}_BASE_URL`] || config.bank.teja_finance;
    const accessKey = config.bank[`${bankKey}_ACCESS_KEY`] || config.bank.bank_access_key;
    const merchantKey = config.bank[`${bankKey}_MERCHANT_KEY`] || config.bank.bank_merchant_key;
    const clientId = config.bank[`${bankKey}_CLIENT_ID`] || config.bank.bank_client_id;
    const apiPassword = config.bank[`${bankKey}_API_PASSWORD`] || config.bank.bank_api_password;

    return {
      bankKey,
      baseUrl,
      accessKey,
      merchantKey,
      clientId,
      apiPassword,
    };
  } catch (error) {
    logger.error('Error getting bank config:', error);
    throw error;
  }
};

const makeTestBankPayment = async (paymentData, userId) => {
  try {
    logger.info(`Initiating test bank payment for beneficiary: ${paymentData.beneficiary_name}`);

    let transaction;
    if (userId) {
      const transactionData = {
        userId,
        amount: paymentData.amount,
        payment_mode: paymentData.payment_mode,
        beneficiary_name: paymentData.beneficiary_name,
        beneficiary_account_numb: paymentData.beneficiary_account_numb,
        beneficiary_ifsc_code: paymentData.beneficiary_ifsc_code,
        status: 'PENDING',
        type: `${TransactionLogType.TRANSFER_MONEY} (${paymentData.payment_mode})`,
        transactionType: TRANSACTION_TYPE.PAYOUT,
        currency: 'INR',
        fees: 0.0,
        payable: paymentData.amount,
        remark: 'Pending',
        transactionDate: new Date(),
        requestData: paymentData,
      };

      transaction = await transactionService.createTransaction(transactionData);
      logger.info(`Test transaction log created with ID: ${transaction.id}`);
    }

    // Default to TEJA_FINANCE base URL for test payments
    const BANK_API_URL = `${config.bank.teja_finance}/merchant/teja-x-payouts-payments`;

    const response = await axios.post(BANK_API_URL, paymentData, {
      headers: {
        'Content-Type': 'application/json',
        'access-key': config.bank.bank_access_key,
        'merchant-key': config.bank.bank_merchant_key,
        'client-id': config.bank.bank_client_id,
        'api-password': config.bank.bank_api_password,
        Authorization: `Bearer ${paymentData.bearer_token}`,
        request_id: faker.string.uuid(),
      },
    });

    logger.info(`Test bank payment API response received: ${JSON.stringify(response.data)}`);

    // Update transaction record with success details
    if (userId && transaction && response.data.status) {
      const updateData = {
        status: 'SUCCESS',
        PaymentReferenceNo: response.data.data?.PaymentReferenceNo,
        paymentRefNo: response.data.data?.PaymentReferenceNo,
        CMPReferenceNo: response.data.data?.CMPReferenceNo,
        Status: response.data.data?.Status,
        transaction_id: response.data.data?.transaction_id,
        trx_id: response.data.data?.transaction_id,
        utr_no: response.data.data?.utr_no || response.data.data?.UTR_NO,
        remark: 'Success',
        responseData: response.data,
      };

      await transactionService.updateTransaction(transaction.id, updateData);
      logger.info(`Transaction updated to SUCCESS with ID: ${transaction.id}`);
    }

    return response.data;
  } catch (error) {
    logger.error(`Bank payment error: ${error}`);

    if (userId) {
      const updateData = {
        status: 'FAILED',
        remark: error.message || 'Payment failed',
        responseData: error.response?.data || { message: error.message },
      };

      await transactionService.updateTransactionByUserId(userId, updateData);
    }

    if (error.response) {
      throw new ApiError(error.response.status || httpStatus.BAD_REQUEST, error.response.data || 'Bank payment failed');
    }
    throw new ApiError(httpStatus.BAD_REQUEST, error.message || 'Bank payment failed');
  }
};

/**
 * Make a bank payment
 * @param {Object} paymentData - The payment data
 * @param {number} paymentData.amount - The payment amount
 * @param {string} paymentData.payment_mode - The payment mode (IMPS/NEFT/RTGS)
 * @param {string} paymentData.beneficiary_name - The beneficiary name
 * @param {string} paymentData.beneficiary_account_numb - The beneficiary account number
 * @param {string} paymentData.beneficiary_ifsc_code - The beneficiary IFSC code
 * @param {string} paymentData.bearer_token - The bearer token for authentication
 * @param {string} userId - User ID
 * @param {Object} options - Additional options
 * @param {boolean} options.isBulkPayment - Whether this is part of a bulk payment
 * @returns {Promise<Object>} The payment response
 * @throws {ApiError} If the payment fails
 */
const makeBankPayment = async (paymentData, userId, options = {}) => {
  let transaction;
  try {
    logger.info(`Initiating bank payment for beneficiary: ${paymentData.beneficiary_name}`);

    const transactionData = {
      userId,
      amount: paymentData.amount,
      payment_mode: paymentData.payment_mode,
      beneficiary_name: paymentData.beneficiary_name,
      beneficiary_account_numb: paymentData.beneficiary_account_numb,
      beneficiary_ifsc_code: paymentData.beneficiary_ifsc_code,
      status: 'PENDING',
      type: `${TransactionLogType.TRANSFER_MONEY} (${paymentData.payment_mode})`,
      transactionType: options.isBulkPayment ? TRANSACTION_TYPE.BULK_PAYOUT : TRANSACTION_TYPE.PAYOUT,
      currency: 'INR',
      fees: 0.0,
      payable: paymentData.amount,
      remark: 'Pending',
      transactionDate: new Date(),
      requestData: paymentData,
    };
    transaction = await transactionService.createTransaction(transactionData);
    logger.info(`Transaction log created with ID: ${transaction.id}`);

    // Get bank config for the user's assigned bank
    const bankConfig = await getBankConfig(userId);

    // Use the bank's specific API URL
    const BANK_API_URL = `${bankConfig.baseUrl}/merchant/teja-x-payouts-payments`;

    const response = await axios.post(BANK_API_URL, paymentData, {
      headers: {
        'Content-Type': 'application/json',
        'access-key': bankConfig.accessKey,
        'merchant-key': bankConfig.merchantKey,
        'client-id': bankConfig.clientId,
        'api-password': bankConfig.apiPassword,
        Authorization: `Bearer ${paymentData.bearer_token}`,
        request_id: faker.number.int({ min: 1000000000, max: 9999999999 }),
      },
    });

    // Update transaction record with success details
    if (response.data.status) {
      const updateData = {
        status: 'SUCCESS',
        PaymentReferenceNo: response.data.data?.PaymentReferenceNo,
        paymentRefNo: response.data.data?.PaymentReferenceNo,
        CMPReferenceNo: response.data.data?.CMPReferenceNo,
        Status: response.data.data?.Status,
        transaction_id: response.data.data?.transaction_id,
        trx_id: response.data.data?.transaction_id,
        utr_no: response.data.data?.utr_no || response.data.data?.UTR_NO,
        remark: 'Success',
        responseData: response.data,
      };

      await transactionService.updateTransaction(transaction.id, updateData);
      logger.info(`Transaction updated to SUCCESS with ID: ${transaction.id}`);

      await userService.deductUserBalance(userId, paymentData.amount);
      logger.info(`Deducted ${paymentData.amount} from user ${userId}'s balance`);
    }

    logger.info(`Bank payment successful for beneficiary: ${paymentData.beneficiary_name}`);
    return response.data;
  } catch (error) {
    logger.error(`Bank payment failed for beneficiary: ${paymentData.beneficiary_name}`, error);

    const errorMessage = error.response?.data?.message || error.message || 'Unknown error occurred';
    const statusCode = error.response?.status || httpStatus.INTERNAL_SERVER_ERROR;

    if (transaction) {
      const updateData = {
        status: 'FAILED',
        remark: errorMessage,
        responseData: error.response?.data || { message: error.message },
      };

      await transactionService.updateTransaction(transaction.id, updateData);
      logger.error(`Transaction updated to FAILED with ID: ${transaction.id}`);
    }

    throw new ApiError(statusCode, `Bank payment failed: ${errorMessage}`);
  }
};

/**
 * Process Excel file for bulk payments in batches
 * @param {Object} fileBuffer - Excel file buffer
 * @param {string} originalFilename - Original file name
 * @param {Object} user - User object
 * @param {string} userId - User ID
 * @param {Object} payloadData - Additional payload data (payment_mode and bearer_token)
 * @returns {Promise<Object>} Bulk processing record
 */
const processBulkPayments = async (fileBuffer, originalFilename, user, userId, payloadData = {}) => {
  try {
    logger.info(`Processing bulk payments for user: ${userId}`);

    // Read Excel file
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    if (!data || data.length === 0) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Excel file is empty or contains no valid data');
    }

    logger.info(`First row of Excel file: ${JSON.stringify(data[0])}`);

    const fieldMappings = {
      amount: ['amount', 'AMOUNT'],
      beneficiary_name: ['beneficiary_name', 'BENEFICIARY_NAME', 'BENEFICIARY NAME', 'beneficiary name'],
      beneficiary_account_numb: ['beneficiary_account_numb', 'ACCOUNT_NUMBER', 'ACCOUNT NUMBER', 'account number'],
      beneficiary_ifsc_code: ['beneficiary_ifsc_code', 'IFSC_CODE', 'IFSC CODE', 'ifsc code'],
    };

    let totalAmountNeeded = 0;
    data.forEach((payment) => {
      const amountField = Object.keys(payment).find((key) =>
        fieldMappings.amount.some((mapping) => key.toLowerCase() === mapping.toLowerCase()),
      );
      if (amountField) {
        totalAmountNeeded += parseFloat(payment[amountField]);
      }
    });

    if (user.availableBalance < totalAmountNeeded) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Insufficient balance. Required: ${totalAmountNeeded}, Available: ${user.availableBalance}`,
      );
    }

    const requiredFieldsInExcel = ['amount', 'beneficiary_name', 'beneficiary_account_numb', 'beneficiary_ifsc_code'];

    const missingFields = [];
    if (data.length > 0) {
      const firstRow = data[0];
      const excelHeaders = Object.keys(firstRow).map((header) => header.toLowerCase());

      requiredFieldsInExcel.forEach((requiredField) => {
        const matchingHeader = fieldMappings[requiredField].find((mapping) => excelHeaders.includes(mapping.toLowerCase()));

        if (!matchingHeader) {
          missingFields.push(requiredField);
        }
      });
    }

    if (missingFields.length > 0) {
      throw new ApiError(httpStatus.BAD_REQUEST, `Excel file is missing required fields: ${missingFields.join(', ')}`);
    }

    if (!payloadData.payment_mode) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'payment_mode is required in the request payload');
    }

    if (!payloadData.bearer_token) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'bearer_token is required in the request payload');
    }

    const fileExtension = path.extname(originalFilename);
    const uniqueFileName = `bulk-payments/${userId}/${Date.now()}${fileExtension}`;

    let contentType = 'application/vnd.ms-excel';
    if (fileExtension.toLowerCase() === '.xlsx') {
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    }

    const uploadResult = await uploadFileToS3(fileBuffer, uniqueFileName, contentType);

    if (!uploadResult.status) {
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to upload file to storage');
    }

    const fileUrl = uploadResult.fileUrl;

    const bulkProcessing = await BulkProcessing.create({
      userId,
      fileName: originalFilename,
      fileUrl,
      totalRecords: data.length,
      processedRecords: 0,
      successfulRecords: 0,
      failedRecords: 0,
      batchSize: 10,
      status: 'PENDING',
    });

    // Start processing in background
    processBulkPaymentsInBatches(data, userId, bulkProcessing._id, fieldMappings, payloadData);

    return {
      bulkProcessingId: bulkProcessing._id,
      fileName: originalFilename,
      totalRecords: data.length,
      status: 'PENDING',
    };
  } catch (error) {
    logger.error(`Error processing bulk payments: ${error.message}`);
    throw error;
  }
};

/**
 * Process payments in batches (runs in background)
 * @param {Array} payments - Array of payment data from Excel
 * @param {string} userId - User ID
 * @param {string} bulkProcessingId - Bulk processing record ID
 * @param {Object} fieldMappings - Mapping between Excel headers and our field names
 * @param {Object} payloadData - Additional payload data (payment_mode and bearer_token)
 */
const processBulkPaymentsInBatches = async (payments, userId, bulkProcessingId, fieldMappings, payloadData) => {
  try {
    // Update status to PROCESSING
    await BulkProcessing.findByIdAndUpdate(bulkProcessingId, { status: 'PROCESSING' });

    const batchSize = 10;
    const totalBatches = Math.ceil(payments.length / batchSize);

    // eslint-disable-next-line no-undef
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    // Process batches
    for (let i = 0; i < totalBatches; i++) {
      const start = i * batchSize;
      const end = Math.min(start + batchSize, payments.length);
      const batch = payments.slice(start, end);

      logger.info(`Processing batch ${i + 1}/${totalBatches} for bulk processing ${bulkProcessingId}`);

      const results = [];

      for (let index = 0; index < batch.length; index++) {
        const payment = batch[index];
        try {
          const mappedPayment = {
            payment_mode: payloadData.payment_mode,
            bearer_token: payloadData.bearer_token,
            x_reference_no: faker.string.uuid(),
            request_id: faker.number.int({ min: 1000000000, max: 9999999999 }),
          };

          Object.keys(fieldMappings).forEach((ourField) => {
            let excelField = null;

            for (const mapping of fieldMappings[ourField]) {
              const excelFieldKey = Object.keys(payment).find((key) => key.toLowerCase() === mapping.toLowerCase());
              if (excelFieldKey) {
                excelField = excelFieldKey;
                break;
              }
            }

            if (excelField) {
              mappedPayment[ourField] = payment[excelField];
            }
          });

          if (
            !mappedPayment.amount ||
            !mappedPayment.beneficiary_name ||
            !mappedPayment.beneficiary_account_numb ||
            !mappedPayment.beneficiary_ifsc_code
          ) {
            throw new Error('Missing required fields in row data');
          }

          const result = await makeBankPayment(mappedPayment, userId, { isBulkPayment: true });

          results.push({
            success: true,
            rowIndex: start + index,
            payment: mappedPayment,
            result,
          });
        } catch (error) {
          results.push({
            success: false,
            rowIndex: start + index,
            payment,
            error: error.message,
          });
        }

        // Wait 3 seconds after each payment (regardless of success/failure)
        logger.info(
          `Waiting 3 seconds before next payment (${start + index + 1}/${batch.length} in batch ${i + 1}/${totalBatches})...`,
        );
        await delay(3000);
      }

      // Count successful and failed payments
      const successCount = results.filter((r) => r.success).length;
      const failedResults = results.filter((r) => !r.success);

      // Update bulk processing record
      await BulkProcessing.findByIdAndUpdate(bulkProcessingId, {
        $inc: {
          processedRecords: batch.length,
          successfulRecords: successCount,
          failedRecords: failedResults.length,
        },
        $push: {
          errors: {
            $each: failedResults.map((r) => ({
              row: r.rowIndex + 1, // Convert to 1-based index
              message: r.error,
              data: r.payment,
            })),
          },
        },
      });
    }

    // Update status to COMPLETED
    await BulkProcessing.findByIdAndUpdate(bulkProcessingId, {
      status: 'COMPLETED',
      completedAt: new Date(),
    });

    logger.info(`Bulk processing ${bulkProcessingId} completed`);
  } catch (error) {
    logger.error(`Error in batch processing: ${error}`);

    // Update status to FAILED
    await BulkProcessing.findByIdAndUpdate(bulkProcessingId, {
      status: 'FAILED',
      $push: {
        errors: {
          row: -1, // Global error
          message: error.message,
        },
      },
    });
  }
};

/**
 * Get bulk processing status
 * @param {string} bulkProcessingId - Bulk processing ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Bulk processing status
 */
const getBulkProcessingStatus = async (bulkProcessingId, userId) => {
  const bulkProcessing = await BulkProcessing.findOne({
    _id: bulkProcessingId,
    userId,
  });

  if (!bulkProcessing) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Bulk processing record not found');
  }

  return bulkProcessing;
};

/**
 * Get all bulk processing tasks for a user
 * @param {string} userId - User ID
 * @param {boolean} minimal - Whether to return minimal data (omitting errors.data, fileName, fileUrl)
 * @returns {Promise<Array>} List of bulk processing tasks
 */
const getUserBulkProcessingTasks = async (userId, minimal = true) => {
  // Define projection based on minimal flag
  let projection = {};
  if (minimal) {
    projection = {
      'errors.data': 0,
      fileName: 0,
      fileUrl: 0,
    };
  }

  const tasks = await BulkProcessing.find({ userId }, projection).sort({ createdAt: -1 }).exec();

  // Check for stalled tasks (in PROCESSING state for more than 10 minutes)
  const tenMinutesInMs = 10 * 60 * 1000;
  const tenMinutesAgo = new Date(Date.now() - tenMinutesInMs);
  const stalledTaskIds = [];

  // Identify stalled tasks in JavaScript
  for (const task of tasks) {
    if (task.status === 'PROCESSING' && new Date(task.updatedAt) < tenMinutesAgo) {
      stalledTaskIds.push(task._id);

      task.status = 'FAILED';
      if (!task.errors) {
        task.errors = [];
      }
      task.errors.push({
        row: -1,
        message: 'Processing timed out after 10 minutes of inactivity',
      });
    }
  }

  if (stalledTaskIds.length > 0) {
    logger.warn(`Found ${stalledTaskIds.length} stalled tasks, marking as FAILED`);

    BulkProcessing.updateMany(
      { _id: { $in: stalledTaskIds } },
      {
        $set: { status: 'FAILED' },
        $push: {
          errors: {
            row: -1,
            message: 'Processing timed out after 10 minutes of inactivity',
          },
        },
      },
    ).catch((err) => {
      logger.error(`Error updating stalled tasks: ${err.message}`);
    });
  }

  return tasks;
};

module.exports = {
  makeTestBankPayment,
  makeBankPayment,
  processBulkPayments,
  getBulkProcessingStatus,
  getUserBulkProcessingTasks,
};
