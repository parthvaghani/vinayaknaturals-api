const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { bankService } = require('../services');
const ApiError = require('../utils/ApiError');
const pick = require('../utils/pick');

const createBank = catchAsync(async (req, res) => {
  const bank = await bankService.createBank(req.body);
  res.status(httpStatus.CREATED).send({ success: true, message: 'Bank created successfully', bank });
});

const getBanks = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['name', 'status', 'envType']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const searchTerm = req.query.searchTerm || '';
  let searchQuery = req.query.searchQuery || '';
  searchQuery = searchQuery.replace(/^\+/, '');
  const result = await bankService.queryBanks(filter, options, searchTerm, searchQuery);
  res.status(httpStatus.OK).send({ success: true, message: 'Banks fetched successfully', result });
});

const getBank = catchAsync(async (req, res) => {
  const bank = await bankService.getBankById(req.params.bankId);
  if (!bank) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Bank not found');
  }
  res.status(httpStatus.OK).send({ success: true, message: 'Bank fetched successfully', bank });
});

const updateBank = catchAsync(async (req, res) => {
  const bank = await bankService.updateBankById(req.params.bankId, req.body);
  res.status(httpStatus.OK).send({ success: true, message: 'Bank updated successfully', bank });
});

const deleteBank = catchAsync(async (req, res) => {
  await bankService.deleteBankById(req.params.bankId);
  res.status(httpStatus.OK).send({ success: true, message: 'Bank deleted successfully' });
});

const assignBankToUser = catchAsync(async (req, res) => {
  const user = await bankService.assignBankToUser(req.params.userId, req.body.bankId , req.params.type);
  res.status(httpStatus.OK).send({ success: true, message: 'Bank assigned to user successfully', user });
});

module.exports = {
  createBank,
  getBanks,
  getBank,
  updateBank,
  deleteBank,
  assignBankToUser,
};
