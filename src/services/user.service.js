const httpStatus = require('http-status');
const { User, OTP, Token, Invitation, Topup, Transaction } = require('../models');
const ApiError = require('../utils/ApiError');
const { getFileExtensionFromBase64, uploadS3 } = require('../Helpers/aws-s3');
const config = require('../config/config');
const fs = require('fs');
const { CHARGE_TYPE, COMMISSION_TYPE } = require('../utils/constants');
const bcrypt = require('bcryptjs/dist/bcrypt');
const { adminUserTypePermissions } = require('../config/roles');
const { checkKycVerification } = require('../utils/kycVerification');

/**
 * Create a user
 * @param {Object} userBody
 * @returns {Promise<User>}
 */
const createUser = async (userBody) => {
  if (userBody.phoneNumber && (await User.isPhoneNumberTaken(userBody.phoneNumber))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Phone number already taken!');
  }
  if (userBody.email && (await User.isEmailTaken(userBody.email))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  }
  // Assign permissions for admin based on userType
  if (userBody.role === 'admin' && userBody.userType) {
    userBody.permissions = adminUserTypePermissions[userBody.userType] || [];
  }
  return User.create(userBody);
};

/**
 * Create a new user
 * @param {Object} userBody
 * @returns {Promise<User>}
 */
const createNewUser = async (userBody) => {
  if (!userBody.phoneNumber) throw new ApiError(httpStatus.BAD_REQUEST, 'Phone number is required!');

  if (await User.isPhoneNumberTaken(userBody.phoneNumber)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Phone number already taken!');
  }
  if (await User.isEmailTaken(userBody.email)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  }
  userBody.authMethods = [{ method: userBody.authMethod, phoneNumber: userBody.phoneNumber }];
  // Assign permissions for admin based on userType
  if (userBody.role === 'admin' && userBody.userType) {
    userBody.permissions = adminUserTypePermissions[userBody.userType] || [];
  }
  return User.create(userBody);
};

/**
 * Query for users
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @param {string} [searchTerm] - Search term for basic search
 * @param {string} [searchQuery] - Search query for comprehensive search
 * @returns {Promise<QueryResult>}
 */
const queryUsers = async (filter, options, searchTerm, searchQuery) => {
  options.populate = 'assignedPayinBank,assignedPayoutBank';
  const users = await User.paginate(filter, options, searchTerm, searchQuery);
  return users;
};

/**
 * Get user by id
 * @param {string|ObjectId} id
 * @returns {Promise<User>}
 */
const getUserById = async (id) => {
  const user = await User.findById(id).populate('assignedPayinBank').populate('assignedPayoutBank').select('-password');
  return user;
};

/**
 * Get user by phone number
 * @param {string} phoneNumber
 * @returns {Promise<User|null>}
 */
const getUserByPhone = async (phoneNumber) => {
  return User.findOne({ phoneNumber }).select('-password');
};

/**
 * Get user by email
 * @param {string} email
 * @returns {Promise<User>}
 */
const getUserByEmail = async (email) => {
  return User.findOne({ email });
};

/**
 * Update user profile by id
 * @param {ObjectId} userId
 * @param {Object} updateBody
 * @returns {Promise<User>}
 */
const updateUserProfileById = async (userId, updateBody) => {
  const user = await getUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  // Handle nested fields like user_details
  const updateObject = { ...updateBody };

  // If user_details is present in update body, merge with existing instead of replacing
  if (updateObject.user_details && user.user_details) {
    updateObject.user_details = {
      ...user.user_details,
      ...updateObject.user_details
    };
  }

  // Handle availableBalance update
  if (updateObject.availableBalance !== undefined) {
    const currentBalance = user.availableBalance || 0;
    const inputBalance = Number(updateObject.availableBalance);

    // If negative balance would make total negative, throw error
    if (inputBalance < 0 && Math.abs(inputBalance) > currentBalance) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Insufficient balance for this operation');
    }

    // Calculate the new balance (add the input value to current balance)
    updateObject.availableBalance = currentBalance + inputBalance;
  }

  // If admin and userType is being updated, only set default permissions if no custom permissions provided
  if ((user.role === 'admin' || updateObject.role === 'admin') && updateObject.userType && !updateObject.permissions) {
    updateObject.permissions = adminUserTypePermissions[updateObject.userType] || [];
  }

  // Use $set to only update the specified fields
  await User.findByIdAndUpdate(userId, { $set: updateObject }, { new: true });
  const updatedUser = await getUserById(userId);
  return updatedUser;
};

/**
 * Update user by id
 * @param {ObjectId} userId
 * @param {Object} updateBody
 * @returns {Promise<User>}
 */
const updateUserById = async (userId, updateBody) => {
  const user = await getUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  if (updateBody.email && (await User.isEmailTaken(updateBody.email, userId))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  }
  if (updateBody.password) {
    updateBody.password = await bcrypt.hash(updateBody.password, 8);
  }
  // If admin and userType is being updated, only set default permissions if no custom permissions provided
  if ((user.role === 'admin' || updateBody.role === 'admin') && updateBody.userType && !updateBody.permissions) {
    updateBody.permissions = adminUserTypePermissions[updateBody.userType] || [];
  }
  const updateObject = Object.assign(user, updateBody);
  await User.findByIdAndUpdate(userId, { $set: updateObject }, { new: true });
  const updatedUser = await getUserById(userId);
  return updatedUser;
};

/**
 * Update otp doc by phone
 * @param {string} phoneNumber
 * @param {Number} otp
 * @returns {Promise<OTP>}
 */
const sendOTP = async (phoneNumber, otp) => {
  //TODO - Integrate 'msg91' service to send OTP in real device
  if (!phoneNumber || !phoneNumber.startsWith('+91')) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid Phone number!');
  }
  const otpDoc = await OTP.findOneAndUpdate(
    { phoneNumber },
    //prettier-ignore
    { phoneNumber, otp, expireAt: new Date(Date.now() + (1 * 60 * 1000)) },
    { new: true, upsert: true },
  );
  return otpDoc;
};

const clearToken = async (userId) => {
  const user = await getUserById(userId);
  await User.findByIdAndUpdate(userId, { userDeviceToken: '' });
  return user;
};

/**
 * Delete user by id
 * @param {ObjectId} userId
 * @returns {Promise<User>}
 */
const deleteUserById = async (userId) => {
  try {
    const user = await getUserById(userId);
    if (!user) {
      throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
    }

    // Delete user's tokens
    await Token.deleteMany({ user: userId });

    // Remove user from other users' connections
    await User.updateMany({ connections: userId }, { $pull: { connections: userId } });

    // Delete user's OTP records
    await OTP.deleteMany({ phoneNumber: user.phoneNumber });

    // Delete user's invitations
    // await Invitation.deleteMany({ $or: [{ from: userId }, { to: userId }] });

    // Delete the user - using deleteOne for atomic operation
    const result = await User.deleteOne({ _id: userId });
    if (!result.deletedCount) {
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to delete user');
    }

    return { message: 'User deleted successfully' };
  } catch (error) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, error.message);
  }
};

/**
 * Upload profile image for user
 * @param {ObjectId} userId
 * @param {File} file - The file to upload
 * @returns {Promise<string>} - Uploaded file URL
 */
const uploadProfileImageS3 = async (userId, file, rootFolder) => {
  if (!file) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Image is required!');
  }
  const base64Data = encodeFileToBase64(file);
  const extension = getFileExtensionFromBase64(base64Data);
  const fileName = `${rootFolder}/${userId}-${Date.now()}.${extension}`;
  try {
    const uploaded = await uploadS3(base64Data, fileName);
    if (!uploaded.status) {
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, uploaded.message);
    }
    return `/${fileName}`;
  } catch (error) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, error.message);
  }
};

/**
 * Encode file to base64 string
 * @param {File} file - The file to encode
 * @returns {string} - The base64 encoded string
 */
const encodeFileToBase64 = (file) => {
  const encoded = file.buffer?.toString('base64');
  if (!encoded) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'File encoding failed!');
  }
  return `data:${file.mimetype};base64,${encoded}`;
};

/**
 * Search user by phone
 * @param {mongoose.Types.ObjectId} userId - The ID of the user.
 * @param {string} searchTerm - search term.
 * @returns {Promise<response>}
 */
const searchAndGetUser = async (userId, searchTerm) => {
  try {
    const user = await getUserById(userId);
    const result = await User.find({
      _id: { $ne: userId },
      $or: [{ phoneNumber: searchTerm.toString() }, { freytoId: searchTerm.toString() }],
    }).select('-password');
    const response = await Promise.all(
      result.map(async (resultUser) => {
        const isConnected = user.connections.some((connId) => connId.equals(resultUser._id));
        const isRequested = await Invitation.exists({
          from: userId,
          to: resultUser._id,
          status: 'pending',
        });
        let connectionStatus;
        let invitationId;
        if (isConnected) {
          connectionStatus = 'connected';
        } else if (isRequested) {
          connectionStatus = 'request_sent';
          invitationId = isRequested?._id;
        } else {
          connectionStatus = 'not_connected';
        }
        return {
          ...resultUser.toObject(),
          connectionStatus,
          invitationId,
        };
      }),
    );
    return response;
  } catch (error) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, error.message);
  }
};

/**
 * Get user data by ID.
 * @param {mongoose.Types.ObjectId} get_user - The ID of the user.
 * @returns {Promise<Object>}
 */
const get_user = async (get_user) => {
  try {
    const data = await User.find({ _id: get_user });

    return data;
  } catch (error) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, error.message);
  }
};

/**
 * Search for cities.
 * @param {string} searchTerms - The search term for cities.
 * @returns {Promise<Array>}
 */

const searchCities = async (searchTerms) => {
  let filteredCities;
  const data = await fs.promises.readFile('./src/Helpers/cities.json', 'utf-8');
  const citiesData = JSON.parse(data);
  if (searchTerms === 'all') {
    filteredCities = citiesData;
  } else {
    filteredCities = citiesData
      .filter((city) => city.label.toLowerCase().includes(searchTerms.toLowerCase()))
      .sort((a, b) => a.label.localeCompare(b.label));
  }
  if (filteredCities.length === 0) {
    throw new ApiError(httpStatus.NOT_FOUND, 'No data found');
  }

  return filteredCities;
};

/**
 * Search for states.
 * @param {string} searchTerms - The search term for states.
 * @returns {Promise<Array>}
 */
const searchStates = async (searchTerms) => {
  let filteredStates;
  const data = await fs.promises.readFile('./src/Helpers/states.json', 'utf-8');
  const stateData = JSON.parse(data);
  if (searchTerms === 'all') {
    filteredStates = stateData;
  } else {
    filteredStates = stateData
      .filter((state) => state.label.toLowerCase().includes(searchTerms.toLowerCase()))
      .sort((a, b) => a.label.localeCompare(b.label));
  }
  if (filteredStates.length === 0) {
    throw new ApiError(httpStatus.NOT_FOUND, 'No data found');
  }
  return filteredStates;
};

const updateActiveStatus = async (id, isActive) => {
  await User.updateOne({ _id: id }, { isActive: isActive });
};

const updateUserData = async (id, data) => {
  await User.updateOne({ _id: id }, { $set: data });
};

/**
 * Get all users' commission configurations
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const getAllCommissionConfigs = async (options) => {
  options.populate = 'assignedPayoutBank';
  const users = await User.paginate({}, options);

  // Transform data to focus on commission configs
  const result = {
    ...users,
    results: users.results.map((user) => ({
      userId: user._id,
      businessName: user.businessName,
      email: user.email,
      commissionConfig: user.commissionConfig || {},
    })),
  };

  return result;
};

/**
 * Calculate commission for a user based on amount
 * @param {ObjectId} userId - User ID
 * @param {number} amount - Transaction amount
 * @returns {Promise<Object>} - Calculated amount details
 */
const calculateCommission = async (userId, amount) => {
  if (!amount || amount <= 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid amount');
  }

  const user = await getUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  const { commissionConfig } = user;
  let commissionAmount = 0;
  let commissionType = COMMISSION_TYPE.PAYOUT;

  if (!commissionConfig.payout) {
    // Default commission calculation (5%)
    commissionAmount = amount * 0.05;
  } else if (
    amount >= commissionConfig.payout.startRange &&
    (commissionConfig.payout.endRange === 0 || amount <= commissionConfig.payout.endRange)
  ) {
    commissionType = commissionConfig.payout.commissionType;

    if (commissionConfig.payout.chargeType === CHARGE_TYPE.PERCENTAGE) {
      commissionAmount = amount * (commissionConfig.payout.value / 100);
    } else if (commissionConfig.payout.chargeType === CHARGE_TYPE.FIXED) {
      commissionAmount = commissionConfig.payout.value;
    }
  } else {
    // Fallback to default commission
    commissionAmount = amount * 0.05;
  }

  // Calculate final amount based on commission type
  let finalAmount = amount;
  if (commissionType === COMMISSION_TYPE.PAYIN) {
    finalAmount = amount - commissionAmount;
  } else {
    finalAmount = amount + commissionAmount;
  }

  return {
    originalAmount: amount,
    commissionAmount,
    finalAmount,
    chargeType: commissionConfig.payout.chargeType,
  };
};

/**
 * Deduct amount from user's available balance
 * @param {ObjectId} userId - User ID
 * @param {number} amount - Amount to deduct
 * @returns {Promise<User>} - Updated user object
 * @throws {ApiError} - If user not found or has insufficient balance
 */
const deductUserBalance = async (userId, amount) => {
  const user = await getUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  if (user.availableBalance < amount) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Insufficient balance');
  }

  user.availableBalance -= amount;
  await user.save();
  return user;
};

/**
 * Add amount to a specified user's balance field
 * @param {ObjectId} userId - User ID
 * @param {number} amount - Amount to add
 * @param {string} balanceField - The balance field to update (e.g., 'availableBalance' or 'pgBalance')
 * @returns {Promise<User>} - Updated user object
 * @throws {ApiError} - If user not found or balance field is invalid
 */
const addUserBalance = async (userId, amount, balanceField) => {
  const user = await getUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  if (!(balanceField in user)) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Invalid balance field: ${balanceField}`);
  }

  if (typeof user[balanceField] !== 'number') {
    throw new ApiError(httpStatus.BAD_REQUEST, `Balance field '${balanceField}' is not a number`);
  }

  user[balanceField] += amount;
  await user.save();
  return user;
};

/**
 * Transfer amount from pgBalance to availableBalance for a user
 * @param {ObjectId} userId - User ID
 * @param {number} amount - Amount to transfer
 * @returns {Promise<User>} - Updated user object
 * @throws {ApiError} - If user not found or insufficient pgBalance
 */
const transferPgBalanceToAvailable = async (userId, amount) => {
  const user = await getUserById(userId);
  await checkKycVerification(
    user,
    'KYC verification required. Please complete your verification before initiating transactions.',
  );
  if (typeof amount !== 'number' || amount <= 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Amount must be a positive number');
  }
  if (user.pgBalance < amount) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Insufficient PG balance');
  }
  user.pgBalance -= amount;
  user.availableBalance += amount;
  await user.save();
  return user;
};

const getTopupByUserId = async (userId) => {
  const topup = await Topup.find({ userId, status: 'approved' });
  return topup;
};

const getAllAdminData = async () => {
  const topup = await Topup.find({ status: 'approved' });
  const withdraw = await Transaction.find({ status: 'SUCCESS' });
  const userData = await User.find({ role: 'user' });
  return {
    topup,
    withdraw,
    userData
  };
};

const getWithdrawByUserId = async (userId) => {
  const withdraw = await Transaction.find({ userId, status: 'SUCCESS', transactionType: { $in: ['PAYOUT', 'BULK_PAYOUT'] } });
  return withdraw;
};

function calculateGrowth(data) {
  const now = new Date();
  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setMonth(now.getMonth() - 6);
  const threeMonthsAgo = new Date(now);
  threeMonthsAgo.setMonth(now.getMonth() - 3);

  let first3MonthAmount = 0;
  let second3MonthAmount = 0;
  let totalAmount = 0;

  data.forEach((item) => {
    if (item.status !== 'approved' && item.status !== 'SUCCESS') return;
    const createdAt = new Date(item.createdAt);
    const amount = typeof item.amount === 'number' ? item.amount : 0;

    if (createdAt >= sixMonthsAgo && createdAt < threeMonthsAgo) {
      first3MonthAmount += amount;
    } else if (createdAt >= threeMonthsAgo && createdAt <= now) {
      second3MonthAmount += amount;
    }
    totalAmount += amount;
  });

  const growth =
    first3MonthAmount === 0 ? second3MonthAmount > 0 ? 100 : 0 : ((second3MonthAmount - first3MonthAmount) / first3MonthAmount) * 100;

  return {
    first3MonthAmount,
    second3MonthAmount,
    growth: parseFloat(growth.toFixed(2)),
    totalAmount,
  };
}

module.exports = {
  createUser,
  queryUsers,
  getUserById,
  getUserByEmail,
  updateUserById,
  deleteUserById,
  getUserByPhone,
  createNewUser,
  sendOTP,
  updateUserProfileById,
  encodeFileToBase64,
  uploadProfileImageS3,
  searchAndGetUser,
  get_user,
  searchCities,
  searchStates,
  clearToken,
  updateActiveStatus,
  updateUserData,
  getAllCommissionConfigs,
  calculateCommission,
  deductUserBalance,
  addUserBalance,
  getTopupByUserId,
  calculateGrowth,
  getWithdrawByUserId,
  getAllAdminData,
  transferPgBalanceToAvailable
};
