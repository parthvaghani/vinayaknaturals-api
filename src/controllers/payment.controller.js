const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const paymentService = require('../services/payment.service');
const { User, Bank } = require('../models');
const ApiError = require('../utils/ApiError');
const { checkKycVerification } = require('../utils/kycVerification');
const { DEFAULT_PAYOUT_BANK } = require('../utils/constants');

const makeTestPayment = catchAsync(async (req, res) => {
  await checkKycVerification(
    req.user,
    'KYC verification required. Please complete your verification before initiating transactions.',
  );
  const result = await paymentService.makeTestBankPayment(req.body, req.user.id);
  res.status(httpStatus.OK).json(result);
});

const makePayment = catchAsync(async (req, res) => {
  await checkKycVerification(
    req.user,
    'KYC verification required. Please complete your verification before initiating transactions.',
  );
  if (req.user.availableBalance < req.body.amount) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Insufficient balance');
  }
  const user = await User.findById(req.user.id).populate('assignedPayoutBank');

  if (!user.assignedPayoutBank) {
    user.assignedPayoutBank = await Bank.findOne({ bankKey: DEFAULT_PAYOUT_BANK });
  }

  if (user.assignedPayoutBank.status !== 'active') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Your assigned bank is inactive. Please contact admin.');
  }

  const result = await paymentService.makeBankPayment(req.body, req.user.id);
  res.status(httpStatus.OK).json(result);
});

const makeBulkBankPayments = catchAsync(async (req, res) => {
  await checkKycVerification(
    req.user,
    'KYC verification required. Please complete your verification before initiating bulk transactions.',
  );

  const user = await User.findById(req.user.id).populate('assignedPayoutBank');

  if (!user.assignedPayoutBank) {
    user.assignedPayoutBank = await Bank.findOne({ bankKey: DEFAULT_PAYOUT_BANK });
  }

  if (user.assignedPayoutBank.status !== 'active') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Your assigned bank is inactive. Please contact admin.');
  }

  if (!req.file) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Excel file is required');
  }

  const { payment_mode, bearer_token } = req.body;

  const result = await paymentService.processBulkPayments(req.file.buffer, req.file.originalname, req.user, req.user.id, {
    payment_mode,
    bearer_token,
  });

  res.status(httpStatus.ACCEPTED).json({ success: true, message: 'Bulk payments initiated', result });
});

const getBulkPaymentStatus = catchAsync(async (req, res) => {
  const result = await paymentService.getBulkProcessingStatus(req.params.bulkProcessingId, req.user.id);

  res.status(httpStatus.OK).json(result);
});

const getUserBulkProcessingTasks = catchAsync(async (req, res) => {
  const minimal = req.query.minimal !== 'false';

  const tasks = await paymentService.getUserBulkProcessingTasks(req.user.id, minimal);
  res.status(httpStatus.OK).json({ success: true, count: tasks.length, tasks });
});

module.exports = {
  makeTestPayment,
  makePayment,
  makeBulkBankPayments,
  getBulkPaymentStatus,
  getUserBulkProcessingTasks,
};
