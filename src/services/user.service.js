const httpStatus = require('http-status');
const { User, Token } = require('../models');
const ApiError = require('../utils/ApiError');
const { getFileExtensionFromBase64, uploadS3 } = require('../Helpers/aws-s3');
const bcrypt = require('bcryptjs/dist/bcrypt');
const { adminUserTypePermissions } = require('../config/roles');

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
  const users = await User.paginate(filter, options, searchTerm, searchQuery);
  return users;
};

/**
 * Get user by id
 * @param {string|ObjectId} id
 * @returns {Promise<User>}
 */
const getUserById = async (id) => {
  const user = await User.findById(id).select('-password');
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
      ...updateObject.user_details,
    };
  }

  // // Handle availableBalance update
  // if (updateObject.availableBalance !== undefined) {
  //   const currentBalance = user.availableBalance || 0;
  //   const inputBalance = Number(updateObject.availableBalance);

  //   // If negative balance would make total negative, throw error
  //   if (inputBalance < 0 && Math.abs(inputBalance) > currentBalance) {
  //     throw new ApiError(httpStatus.BAD_REQUEST, 'Insufficient balance for this operation');
  //   }

  //   // Calculate the new balance (add the input value to current balance)
  //   updateObject.availableBalance = currentBalance + inputBalance;
  // }

  // // If admin and userType is being updated, only set default permissions if no custom permissions provided
  // if ((user.role === 'admin' || updateObject.role === 'admin') && updateObject.userType && !updateObject.permissions) {
  //   updateObject.permissions = adminUserTypePermissions[updateObject.userType] || [];
  // }

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
        let connectionStatus;
        let invitationId;
        if (isConnected) {
          connectionStatus = 'connected';
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

const updateUserData = async (id, data) => {
  await User.updateOne({ _id: id }, { $set: data });
};

const getAllAdminData = async () => {
  const userData = await User.find({ role: 'user' });
  return {
    userData,
  };
};

module.exports = {
  createUser,
  queryUsers,
  getUserById,
  getUserByEmail,
  updateUserById,
  deleteUserById,
  getUserByPhone,
  createNewUser,
  updateUserProfileById,
  encodeFileToBase64,
  uploadProfileImageS3,
  searchAndGetUser,
  get_user,
  clearToken,
  updateUserData,
  getAllAdminData,
};
