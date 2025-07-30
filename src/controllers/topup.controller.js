const { Topup } = require('../models');
const httpStatus = require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const { userService, excelService, transactionService } = require('../services');
const User = require('../models/user.model');
const { checkKycVerification } = require('../utils/kycVerification');
const ExcelJS = require('exceljs');
const { TRANSACTION_TYPE, TransactionLogType } = require('../utils/constants');
const catchAsync = require('../utils/catchAsync');
const { toGenericStatus } = require('../utils/payin');

// POST /v1/topups (User): Create a new topup request
const createTopup = catchAsync(async (req, res, next) => {
  const { utrNumber } = req.body;

  if (!req.file) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Screenshot is required');
  }

  await checkKycVerification(
    req.user,
    'KYC verification required. Please complete your verification before initiating topups.',
  );

  const screenshot = await userService.uploadProfileImageS3(req.user.id, req.file, 'topups');

  if (!screenshot) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to upload screenshot');
  }

  const topup = await Topup.create({
    userId: req.user.id,
    utrNumber,
    screenshot,
    amount: null,
    status: 'pending',
  });

  const transactionData = {
    userId: req.user.id,
    amount: topup.amount || 0,
    payment_mode: 'TOPUP',
    status: toGenericStatus(topup.status),
    transactionType: TRANSACTION_TYPE.PAY_IN,
    utr_no: topup.utrNumber,
    currency: 'INR',
    transactionDate: new Date(),
    remark: topup.remarks || 'Topup',
  };

  await transactionService.createTransaction(transactionData);

  res.status(httpStatus.CREATED).json({
    success: true,
    data: topup,
    message: 'Topup request submitted successfully',
  });
});

// PATCH /v1/topups/:id (Admin): Update topup amount and status
const updateTopup = catchAsync(async (req, res, next) => {
  try {
    const { id } = req.params;
    const { amount, status, userId, utrNumber, remarks } = req.body;

    const update = { updatedAt: new Date() };
    if (amount !== undefined) update.amount = amount;
    if (status) update.status = status;
    if (utrNumber) update.utrNumber = utrNumber;
    if (remarks) update.remarks = remarks;

    const user = await User.findById(userId);

    if (amount !== undefined) {
      const currentBalance = user.availableBalance || 0;
      const inputBalance = Number(amount);

      // If negative balance would make total negative, throw error
      if (inputBalance < 0 && Math.abs(inputBalance) > currentBalance) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Insufficient balance for this operation');
      }
      update.amount = inputBalance;
    }

    const topup = await Topup.findByIdAndUpdate(id, update, { new: true });

    if (topup.amount && topup.status === 'approved') {
      await User.findByIdAndUpdate(userId, {
        $inc: { availableBalance: topup.amount },
      });
    }

    const transactionData = {
      userId: userId,
      amount: topup.amount,
      payment_mode: 'TOPUP',
      beneficiary_name: user.name || '',
      status: toGenericStatus(topup.status),
      transactionType: TRANSACTION_TYPE.PAY_IN,
      transactionLogType: TransactionLogType.ADD_BALANCE,
      utr_no: topup.utrNumber,
      currency: 'INR',
      transactionDate: new Date(),
      remark: topup.remarks || 'Topup',
    };

    await transactionService.createTransaction(transactionData);

    res.status(httpStatus.OK).json({
      success: true,
      data: topup,
      message: 'Topup updated successfully',
    });
  } catch (error) {
    next(error);
  }
});

// GET /v1/topups (User): Get user's topup history
const getUserTopups = catchAsync(async (req, res, next) => {
  try {
    const filter = { userId: req.user.id };
    const { isExport } = req.query;
    const options = pick(req.query, ['sortBy', 'limit', 'page', 'utrNumber']);
    const { utrNumber, startDate, endDate } = req.query;
    if (isExport) {
      filter.limit = options.limit;
      filter.page = options.page;
      const data = await excelService.getTopups(filter, req.user);
      const fileName = `topups_export_${new Date().toISOString().split('T')[0]}.xlsx`;
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

    // Default sorting by latest first
    if (!options.sortBy) {
      options.sortBy = 'createdAt:desc';
    }

    // Add status filter if provided
    if (req.query.status) {
      filter.status = req.query.status;
    }

    // Add UTR number filter if provided
    if (utrNumber) {
      filter.utrNumber = utrNumber;
    }

    // Add date range filters if provided
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.createdAt.$lte = new Date(endDate);
      }
    }

    const result = await Topup.paginate(filter, options);

    const user = await User.findById(req.user.id).select('availableBalance name email phoneNumber');
    const availableBalance = user ? user.availableBalance : 0;

    const resultsWithBalance = result.results.map((item) => ({
      ...item.toObject({ getters: true }),
      user: { availableBalance },
    }));

    res.status(httpStatus.OK).json({
      success: true,
      data: {
        results: resultsWithBalance,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
        totalResults: result.totalResults,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /v1/topups/all (Admin): Get all topups with filters
const getAllTopups = catchAsync(async (req, res, next) => {
  try {
    const filter = {};
    const options = pick(req.query, ['sortBy', 'limit', 'page', 'utrNumber']);
    const { startDate, endDate, utrNumber } = req.query;
    // Default sorting by latest first
    if (!options.sortBy) {
      options.sortBy = 'createdAt:desc';
    }

    // Add status filter if provided
    if (req.query.status) {
      filter.status = req.query.status;
    }

    // Add UTR number filter if provided
    if (utrNumber) {
      filter.utrNumber = utrNumber;
    }

    // Add user filter if provided
    if (req.query.userId) {
      filter.userId = req.query.userId;
    }

    // Add date range filters if provided
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.createdAt.$lte = new Date(endDate);
      }
    }

    if (req.query.isExport === 'true') {
      const sendFilter = {
        limit: options.limit,
        page: options.page,
        sortBy: options.sortBy,
        utrNumber: utrNumber,
        startDate: startDate,
        endDate: endDate,
      };
      const data = await excelService.getTopups(sendFilter, req.user);
      // console.log(data.length);
      const fileName = `topups_export_${new Date().toISOString().split('T')[0]}.xlsx`;
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

    const result = await Topup.paginate(filter, options);

    const userIds = [...new Set(result.results.map((topup) => topup.userId))];

    const users = await User.find({ _id: { $in: userIds } }).select('_id availableBalance');

    const userBalanceMap = users.reduce((acc, user) => ({ ...acc, [user._id.toString()]: user.availableBalance }), {});

    const resultsWithBalance = result.results.map((topup) => ({
      ...topup.toObject({ getters: true }),
      remarks: topup.remarks || '',
      user: {
        ...topup.user,
        availableBalance: userBalanceMap[topup.userId?.toString()] || 0,
      },
    }));

    res.status(httpStatus.OK).json({
      success: true,
      data: {
        results: resultsWithBalance,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
        totalResults: result.totalResults,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = {
  createTopup,
  updateTopup,
  getUserTopups,
  getAllTopups,
};
