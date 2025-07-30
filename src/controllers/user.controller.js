const httpStatus = require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { userService, authService, transactionService } = require('../services');
const { excelService } = require('../services');
const { TransactionLogType, TRANSACTION_TYPE } = require('../utils/constants');
const ExcelJS = require('exceljs');
const { allAdminUserTypes, allAdminPermissions, adminUserTypePermissions } = require('../config/roles');

const createUser = catchAsync(async (req, res) => {
  const user = await userService.createUser(req.body);
  res.status(httpStatus.CREATED).send(user);
});

const getUsers = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['role']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const searchTerm = req.query.searchTerm;
  let searchQuery = req.query.searchQuery || '';
  searchQuery = searchQuery.replace(/^\+/, '');
  const fieldsToMap = ['businessName'];
  // Handle status filter
  if (req.query.status) {
    filter.isActive = req.query.status === 'active';
  }

  fieldsToMap.forEach((field) => {
    if (filter[field]) {
      filter[`user_details.${field}`] = filter[field];
      delete filter[field];
    }
  });

  if (req.query.isExport) {
    const fileName = `users_export_${new Date().toISOString().split('T')[0]}.xlsx`;
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Users');


    const result = await excelService.getUsers(options);
    if (result.length > 0) {
      const headers = Object.keys(result[0]);

      worksheet.addRow(headers);
      worksheet.getRow(1).font = {
        bold: true,
        size: 14
      };

      result.forEach(item => {
        const rowData = headers.map(header => item[header]);
        worksheet.addRow(rowData);
      });

      worksheet.columns.forEach(column => {
        let maxLength = 0;
        column.eachCell({ includeEmpty: true }, cell => {
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
      size: buffer.length
    });
  } else {
    const result = await userService.queryUsers(filter, options, searchTerm, searchQuery);
    res.send(result);
  }
});

const getUser = catchAsync(async (req, res) => {
  const { userId } = req.params;  
  const user = await userService.getUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  res.send({ ...user._doc });
});

const updateUser = catchAsync(async (req, res) => {
  const userId = req.params.userId;
  const updateData = { ...req.body };

  // Initialize user_details as an empty object if it doesn't exist or isn't an object
  if (!updateData.user_details || typeof updateData.user_details !== 'object') {
    updateData.user_details = {};
  }

  // Map root level fields to user_details if they exist
  const userDetailFields = ['name', 'country', 'city', 'zip', 'address', 'gender', 'phone', 'avatar'];
  userDetailFields.forEach(field => {
    if (req.body[field] !== undefined) {
      updateData.user_details[field] = req.body[field];
    }
  });

  // Clean up - remove root level fields that were moved to user_details
  userDetailFields.forEach(field => {
    if (field in updateData) {
      delete updateData[field];
    }
  });

  // Handle file upload if present
  if (req.file) {
    const imageUrl = await userService.uploadProfileImageS3(userId, req.file, 'profile-images');
    updateData.user_details = updateData.user_details || {};
    updateData.user_details.avatar = imageUrl;
  }

  const updatedUser = await userService.updateUserProfileById(userId, updateData);
  const { ...userWithoutPassword } = updatedUser._doc;

  // --- Add transaction if availableBalance is present in payload ---
  if (typeof req.body.availableBalance === 'number') {
    const amount = req.body.availableBalance;
    const transactionLogType = amount >= 0 ? TransactionLogType.ADD_BALANCE : TransactionLogType.ADD_SUBTRACT_BALANCE;
    const transactionData = {
      userId: userId,
      amount: amount,
      payment_mode: 'IMPS',
      status: 'SUCCESS',
      transactionType: TRANSACTION_TYPE.PAY_IN,
      type: `${TransactionLogType.TRANSFER_MONEY} (IMPS)`,
      transactionLogType,
      currency: 'INR',
      transactionDate: new Date(),
      remark: amount >= 0 ? 'Balance Added by Admin' : 'Balance Subtracted by Admin',
    };
    await transactionService.createTransaction(transactionData);
  }

  res.send({
    success: true,
    user: userWithoutPassword,
    message: 'User updated successfully',
  });
});

const clearToken = catchAsync(async (req, res) => {
  await userService.clearToken(req.params.userId);
  res.status(httpStatus.NO_CONTENT).send();
});
const deleteUser = catchAsync(async (req, res) => {
  await userService.deleteUserById(req.params.userId);
  res.send({ message: 'User deleted successfully' });
});

const uploadProfileImage = catchAsync(async (req, res) => {
  const file = req.file;
  const userId = req.params.userId;
  const imageUrl = await userService.uploadProfileImageS3(userId, file, 'profile-images');
  await userService.updateUserProfileById(userId, { user_details: { avatar: imageUrl } });
  res.send({ success: true, imageUrl, message: 'Profile picture updated!' });
});

const searchAndGetUser = catchAsync(async (req, res) => {
  const { searchTerm, userId } = req.params;
  const result = await userService.searchAndGetUser(userId, searchTerm);
  res.send({ success: true, result });
});

const get_user = catchAsync(async (req, res) => {
  const { ids } = req.body;
  const result = await userService.get_user(ids);
  res.send({ success: true, result: result });
});

const searchCities = catchAsync(async (req, res) => {
  const { searchTerms } = req.params;
  const result = await userService.searchCities(searchTerms);
  res.send({ success: true, result: result });
});

const searchStates = catchAsync(async (req, res) => {
  const { searchTerms } = req.params;
  const result = await userService.searchStates(searchTerms);
  res.send({ success: true, result: result });
});

const getMe = catchAsync(async (req, res) => {
  const user = req.user;
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  const userDoc = user.toJSON();

  if (user.role === 'admin') {
    const { topup, withdraw, userData } = await userService.getAllAdminData();

    const totalDepositAmount = topup.reduce((acc, curr) => acc + curr.amount, 0);
    const totalBalanceOfUsers = userData.reduce((acc, curr) => acc + curr.availableBalance, 0);
    const totalPgBalance = userData.reduce((acc, curr) => acc + curr.pgBalance, 0);

    // Get today's date at 00:00:00 and tomorrow's 00:00:00
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    // Filter and calculate today's withdrawal amount
    const todaysWithdrawals = withdraw.filter(item => {
      const createdAt = new Date(item.createdAt);
      return createdAt >= startOfDay && createdAt < endOfDay;
    });

    const todaysWithdrawAmount = todaysWithdrawals.reduce((acc, curr) => acc + curr.amount, 0);

    return res.send({
      ...userDoc,
      totalDepositAmount,
      totalBalanceOfUsers,
      totalPgBalance,
      todaysWithdrawAmount,
    });
  }


  const topup = await userService.getTopupByUserId(user._id);
  const topupGrowth = userService.calculateGrowth(topup);
  const withdraw = await userService.getWithdrawByUserId(user._id);
  const withdrawGrowth = userService.calculateGrowth(withdraw);

  delete userDoc.password;
  delete userDoc.acceptedTerms;
  delete userDoc.profileCompleted;
  delete userDoc.commissionConfig;

  res.send({
    ...userDoc,
    topupGrowth,
    withdrawGrowth,
  });
});

const setUserActiveStatus = catchAsync(async (req, res) => {
  const {
    params: { id },
  } = req;

  const getUser = await userService.get_user(id);

  if (!getUser.length) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Provided User not found');
  }

  await userService.updateActiveStatus(id, !getUser[0].isActive);

  res.send({ success: true });
});

const getUserCommissionConfig = catchAsync(async (req, res) => {
  const { userId } = req.params;
  const user = await userService.getUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  res.send({
    success: true,
    commissionConfig: user.commissionConfig || {},
  });
});

const updateUserCommissionConfig = catchAsync(async (req, res) => {
  const { userId } = req.params;
  const { commissionConfig } = req.body;

  const user = await userService.getUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  const updatedUser = await userService.updateUserProfileById(userId, { commissionConfig });

  res.send({
    success: true,
    message: 'Commission configuration updated successfully',
    commissionConfig: updatedUser.commissionConfig,
  });
});

const deleteUserCommissionConfig = catchAsync(async (req, res) => {
  const { userId } = req.params;

  const user = await userService.getUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  const defaultCommissionConfig = {
    payin: {
      startRange: 0,
      endRange: 0,
      chargeType: 'percentage',
      value: 5,
    },
    payout: {
      startRange: 0,
      endRange: 0,
      chargeType: 'percentage',
      value: 5,
    },
  };

  await userService.updateUserProfileById(userId, { commissionConfig: defaultCommissionConfig });

  res.send({
    success: true,
    message: 'Commission configuration reset to defaults',
    commissionConfig: defaultCommissionConfig,
  });
});

// Get all users' commission configurations
const getAllCommissionConfigs = catchAsync(async (req, res) => {
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await userService.getAllCommissionConfigs(options);
  res.send(result);
});

const calculateCommission = catchAsync(async (req, res) => {
  const { userId } = req.params;
  const { amount } = req.body;

  const result = await userService.calculateCommission(userId, parseFloat(amount));

  res.send({
    success: true,
    result,
  });
});

// Generate Finflex keys for a user
const generateFinflexKeys = catchAsync(async (req, res) => {
  const userId = req.user._id;
  if (!userId) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'User not authenticated');
  }

  const { isRegenerate = false, isLive = false } = req.body;

  const user = await userService.getUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  let message = '';
  const finflexKeys = user.finflexKeys || { test: {}, live: {} };

  const hasExistingTestKeys = finflexKeys.test?.clientId;
  const hasExistingLiveKeys = finflexKeys.live?.clientId;

  // Generate a 10-digit client ID with prefix
  const generateClientId = (type) => {
    const timestamp = Date.now().toString().slice(-6); // Last 6 digits of timestamp
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0'); // 4 random digits
    const prefix = type === 'live' ? 'finflex_live_' : 'finflex_test_';
    return `${prefix}${timestamp}${random}`;
  };

  if (!isRegenerate && !isLive && hasExistingTestKeys) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Test keys already exist. Please use regenerate mode to update existing keys.'
    );
  }

  if (isRegenerate) {
    if (isLive) {
      if (!hasExistingLiveKeys) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'No existing live keys found. Please generate live keys after KYC verification.');
      }

      const newLiveKeys = authService.generateFinFlexKeys('live');
      finflexKeys.live = {
        ...newLiveKeys,
        clientId: finflexKeys.live.clientId // Keep existing client ID
      };
      message = 'Live keys updated successfully';
    } else {
      if (!hasExistingTestKeys) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'No existing test keys found. Please generate test keys first.');
      }

      const newTestKeys = authService.generateFinFlexKeys('test');
      finflexKeys.test = {
        ...newTestKeys,
        clientId: finflexKeys.test.clientId // Keep existing client ID
      };
      message = 'Test keys updated successfully';
    }
  } else {
    if (isLive) {
      if (user.kycVerificationStatus !== 'APPROVED') {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Cannot generate live keys. Complete KYC verification first.');
      }

      if (!hasExistingLiveKeys) {
        const liveKeys = authService.generateFinFlexKeys('live');
        finflexKeys.live = {
          ...liveKeys,
          clientId: generateClientId('live')
        };
        message = 'Live keys generated successfully';
      } else {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Live keys already exist. Please use regenerate mode to update them.');
      }
    } else {
      if (!hasExistingTestKeys) {
        const testKeys = authService.generateFinFlexKeys('test');
        finflexKeys.test = {
          ...testKeys,
          clientId: generateClientId('test')
        };
        message = 'Test keys generated successfully';
      }
    }
  }

  const updatedUser = await userService.updateUserProfileById(userId, { finflexKeys });

  return res.send({
    success: true,
    message,
    keys: {
      test: updatedUser.finflexKeys.test,
      live: updatedUser.finflexKeys.live
    },
    isKycVerified: user.kycVerificationStatus === 'APPROVED'
  });
});

const transferPgBalance = catchAsync(async (req, res) => {
  const { userId } = req.params;
  const { amount } = req.body;
  const user = await userService.transferPgBalanceToAvailable(userId, amount);

  await transactionService.createTransaction({
    userId,
    amount,
    payment_mode: 'IMPS',
    status: 'SUCCESS',
    transactionType: TRANSACTION_TYPE.PAY_IN,
    type: TransactionLogType.TRANSFER_MONEY,
    transactionLogType: TransactionLogType.TRANSFER_MONEY,
    currency: 'INR',
    transactionDate: new Date(),
    remark: '(TRANSFER-PG-BALANCE) PG balance moved to available balance',
  });

  res.send({
    success: true,
    message: 'PG balance transferred successfully',
    pgBalance: user.pgBalance,
    availableBalance: user.availableBalance,
  });
});

// Admin meta endpoint: returns all user types, all permissions, and default permissions mapping
const getAdminMeta = (req, res) => {
  res.send({
    userTypes: allAdminUserTypes,
    permissions: allAdminPermissions,
    defaultPermissions: adminUserTypePermissions,
  });
};

module.exports = {
  createUser,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  uploadProfileImage,
  searchAndGetUser,
  get_user,
  searchCities,
  searchStates,
  clearToken,
  getMe,
  setUserActiveStatus,
  getUserCommissionConfig,
  updateUserCommissionConfig,
  deleteUserCommissionConfig,
  getAllCommissionConfigs,
  calculateCommission,
  generateFinflexKeys,
  getAdminMeta,
  transferPgBalance,
};
