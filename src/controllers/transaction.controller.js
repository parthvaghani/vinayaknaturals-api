const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { transactionService, excelService } = require('../services');
const ApiError = require('../utils/ApiError');
const pick = require('../utils/pick');
const ExcelJS = require('exceljs');
const logger = require('../config/logger');
const { TransactionLogType } = require('../utils/constants');
const { validateTransactions: validateTxns } = require('../services/validationTransaction.cron');

/**
 * Get transactions for the current user
 */
const getUserTransactions = catchAsync(async (req, res) => {
  const { startDate, endDate, transactionId, isExport, limit, page } = req.query;
  const user = req.user;

  if (isExport) {
    const filter = {
      userId: user?._id,
    };

    if (req.query.status) {
      filter.status = req.query.status;
    }

    if (transactionId) {
      filter.transactionId = transactionId;
    }

    if (req.query.type) {
      filter.type = req.query.type;
    }

    if (req.query.transactionType) {
      filter.transactionType = { $in: req.query.transactionType };
    }

    if (startDate) {
      filter.startDate = startDate;
    }

    if (endDate) {
      filter.endDate = endDate;
    }

    if (limit <= 20) {
      filter.limit = parseInt(limit);
      filter.page = parseInt(page);
    }

    try {
      const data = await excelService.getTransactions(filter, user);
      const fileName = `transactions_export_${new Date().toISOString().split('T')[0]}.xlsx`;

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Transactions');

      if (data.length > 0) {
        const headers = Object.keys(data[0]);

        worksheet.addRow(headers);
        worksheet.getRow(1).font = {
          bold: true,
          size: 14,
        };

        data.forEach((item) => {
          const rowData = headers.map((header) => item[header]);
          worksheet.addRow(rowData);
        });

        worksheet.columns.forEach((column) => {
          let maxLength = 0;
          column.eachCell({ includeEmpty: true }, (cell) => {
            const columnLength = cell.value ? cell.value.toString().length : 10;
            if (columnLength > maxLength) {
              maxLength = columnLength;
            }
          });
          column.width = maxLength < 10 ? 10 : maxLength + 2;
        });
      }
      // Generate buffer
      const buffer = await workbook.xlsx.writeBuffer();
      const base64Data = buffer.toString('base64');
      return res.status(200).json({
        success: true,
        data: base64Data,
        fileName: fileName,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        size: buffer.length,
      });
    } catch (error) {
      logger.error('Excel generation error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to generate Excel file',
        error: error.message,
      });
    }
  }

  // Handle single transaction by ID
  if (transactionId) {
    const transaction = await transactionService.getTransactionById(transactionId);
    if (!transaction || transaction.userId.toString() !== req.user.id) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Transaction not found');
    }
    return res.status(httpStatus.OK).send({
      status: true,
      data: {
        results: [formatTransaction(transaction)],
        page: 1,
        limit: 1,
        totalPages: 1,
        totalResults: 1,
      },
    });
  }

  // Handle regular transaction list query
  const filter = pick(req.query, ['status', 'payment_mode', 'type', 'transactionType']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);

  if (filter.transactionType) {
    filter.transactionType = { $in: filter.transactionType };
  }

  if (startDate || endDate) {
    filter.transactionDate = {};
    if (startDate) {
      filter.transactionDate.$gte = new Date(startDate);
    }
    if (endDate) {
      filter.transactionDate.$lte = new Date(endDate);
    }
  }

  // Default sort by transaction date descending
  if (!options.sortBy) {
    options.sortBy = 'transactionDate:desc';
  }

  const result = await transactionService.getTransactionsByUserId(req.user.id, options, filter);

  // Format response to match expected frontend format
  const formattedResults = result.results.map(formatTransaction);

  res.status(httpStatus.OK).send({
    status: true,
    data: {
      results: formattedResults,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
      totalResults: result.totalResults,
    },
  });
});

/**
 * Format transaction data for response
 */
const formatTransaction = (transaction) => ({
  id: transaction.id,
  transaction_id: transaction.transaction_id || transaction.trx_id,
  type:`${transaction.payment_mode === 'TOPUP' ? TransactionLogType.ADD_BALANCE : TransactionLogType.TRANSFER_MONEY} (${transaction.payment_mode})`,
  transactionType: transaction.transactionType,
  amount: transaction.amount.toFixed(2),
  currency: transaction.currency || 'INR',
  status: transaction.status,
  dateTime: transaction.transactionDate ? new Date(transaction.transactionDate).toISOString() : transaction.createdAt,
  beneficiary_name: transaction.beneficiary_name,
  beneficiary_account_numb: transaction.beneficiary_account_numb,
  beneficiary_ifsc_code: transaction.beneficiary_ifsc_code,
  utr_no: transaction.utr_no,
  paymentRefNo: transaction.paymentRefNo || transaction.PaymentReferenceNo,
  fees: transaction.fees ? transaction.fees.toFixed(2) : '0.00',
  payable: transaction.payable ? transaction.payable.toFixed(2) : transaction.amount.toFixed(2),
  remark: transaction.remark,
  transactionLogType: transaction.transactionLogType,
});

/**
 * Get a single transaction by ID
 */
const getTransactionById = catchAsync(async (req, res) => {
  const transaction = await transactionService.getTransactionById(req.params.transactionId);
  if (!transaction) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Transaction not found');
  }

  if (transaction.userId.toString() !== req.user.id && req.user.role !== 'admin') {
    throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden');
  }

  // Format the transaction for the frontend
  const formattedTransaction = {
    transaction_id: transaction.transaction_id || transaction.trx_id,
    date: transaction.transactionDate ? new Date(transaction.transactionDate).toISOString() : transaction.createdAt,
    trx_id: transaction.trx_id || transaction.transaction_id,
    utr_no: transaction.utr_no || '',
    payment_ref_no: transaction.paymentRefNo || transaction.PaymentReferenceNo || '',
    beneficiary_name: transaction.beneficiary_name,
    beneficiary_account_numb: transaction.beneficiary_account_numb,
    beneficiary_ifsc_code: transaction.beneficiary_ifsc_code,
    payment_mode: transaction.payment_mode,
    transactionType: transaction.transactionType,
    amount: `${transaction.amount.toFixed(2)} ${transaction.currency || 'INR'}`,
    fees: `${transaction.fees ? transaction.fees.toFixed(2) : '0.00'} ${transaction.currency || 'INR'}`,
    payable: `${transaction.payable ? transaction.payable.toFixed(2) : transaction.amount.toFixed(2)} ${transaction.currency || 'INR'}`,
    status: transaction.status,
    remark: transaction.remark,
  };

  res.status(httpStatus.OK).send({
    status: true,
    data: formattedTransaction,
  });
});

/**
 * Get all transactions (admin only)
 */
const getAllTransactions = catchAsync(async (req, res) => {
  const { startDate, endDate, transactionId } = req.query;
  if (req.query.isExport) {
    const filter = {};

    if (req.query.status) {
      filter.status = req.query.status;
    }

    if (req.query.transactionType) {
      filter.transactionType = { $in: req.query.transactionType };
    }

    if (req.query.type) {
      filter.type = req.query.type;
    }

    if (req.query.transactionType) {
      filter.transactionType = req.query.transactionType;
    }

    if (req.query.startDate) {
      filter.startDate = req.query.startDate;
    }

    if (req.query.endDate) {
      filter.endDate = req.query.endDate;
    }

    if (req.query.transactionId) {
      filter.transactionId = req.query.transactionId;
    }

    if (req.query.limit) {
      filter.limit = req.query.limit;
    }

    if (req.query.page) {
      filter.page = req.query.page;
    }

    if (req.query.sortBy) {
      filter.sortBy = req.query.sortBy || 'transactionDate:desc';
    }

    const data = await excelService.getAdminTransactions(filter, req.user);
    const fileName = `transactions_export_${new Date().toISOString().split('T')[0]}.xlsx`;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Transactions');

    if (data.length > 0) {
      const headers = Object.keys(data[0]);

      worksheet.addRow(headers);
      worksheet.getRow(1).font = {
        bold: true,
        size: 14,
      };

      data.forEach((item) => {
        const rowData = headers.map((header) => item[header]);
        worksheet.addRow(rowData);
      });

      worksheet.columns.forEach((column) => {
        let maxLength = 0;
        column.eachCell({ includeEmpty: true }, (cell) => {
          const columnLength = cell.value ? cell.value.toString().length : 10;
          if (columnLength > maxLength) {
            maxLength = columnLength;
          }
        });
        column.width = maxLength < 10 ? 10 : maxLength + 2;
      });
    }
    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    const base64Data = buffer.toString('base64');
    return res.status(200).json({
      success: true,
      data: base64Data,
      fileName: fileName,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      size: buffer.length,
    });
  }

  if (transactionId) {
    const transaction = await transactionService.getTransactionByIdForAdmin(transactionId);
    if (!transaction) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Transaction not found');
    }
    return res.status(httpStatus.OK).send({
      status: true,
      data: {
        results: [formatTransaction(transaction)],
        page: 1,
        limit: 1,
        totalPages: 1,
        totalResults: 1,
      },
    });
  }

  // Create filter from query parameters
  const filter = pick(req.query, ['status', 'payment_mode', 'userId', 'type', 'transactionType']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);

  // console.log('filter', filter);

  // if (filter.transactionType) {
  //   filter.transactionType = { $in: filter.transactionType };
  // }

  // Add date range filters if provided
  if (startDate || endDate) {
    filter.transactionDate = {};
    if (startDate) {
      filter.transactionDate.$gte = new Date(startDate);
    }
    if (endDate) {
      filter.transactionDate.$lte = new Date(endDate);
    }
  }

  // Default sort by transaction date descending
  if (!options.sortBy) {
    options.sortBy = 'transactionDate:desc';
  }

  const result = await transactionService.queryTransactions(filter, options);

  // Format response to match expected frontend format
  const formattedResults = result.results.map((transaction) => ({
    id: transaction.id,
    transaction_id: transaction.transaction_id || transaction.trx_id,
    type: `${transaction.payment_mode === 'TOPUP' ? TransactionLogType.ADD_BALANCE : TransactionLogType.TRANSFER_MONEY} (${transaction.payment_mode})`,
    transactionType: transaction.transactionType,
    amount: transaction.amount.toFixed(2),
    currency: transaction.currency || 'INR',
    status: transaction.status,
    dateTime: transaction.transactionDate ? new Date(transaction.transactionDate).toISOString() : transaction.createdAt,
    beneficiary_name: transaction.beneficiary_name,
    beneficiary_account_numb: transaction.beneficiary_account_numb,
    beneficiary_ifsc_code: transaction.beneficiary_ifsc_code,
    utr_no: transaction.utr_no,
    paymentRefNo: transaction.paymentRefNo || transaction.PaymentReferenceNo,
    fees: transaction.fees ? transaction.fees.toFixed(2) : '0.00',
    payable: transaction.payable ? transaction.payable.toFixed(2) : transaction.amount.toFixed(2),
    userId: transaction.userId,
    remark: transaction.remark,
  }));

  res.status(httpStatus.OK).send({
    status: true,
    data: {
      results: formattedResults,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
      totalResults: result.totalResults,
    },
  });
});

/**
 * Validate pending transactions
 */
const validateTransactions = catchAsync(async (req, res) => {
  await validateTxns(req.user._id);
  res.status(httpStatus.OK).send({
    status: true,
    message: 'Validation transactions completed',
  });
});

module.exports = {
  getUserTransactions,
  getTransactionById,
  getAllTransactions,
  validateTransactions
};
