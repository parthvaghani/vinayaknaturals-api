const httpStatus = require('http-status');
const { Bank, User } = require('../models');
const ApiError = require('../utils/ApiError');
const logger = require('../config/logger');

/**
 * Create a bank
 * @param {Object} bankBody
 * @returns {Promise<Bank>}
 */
const createBank = async (bankBody) => {
  try {
    if (await Bank.isNameTaken(bankBody.name)) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Bank name already taken');
    }

    return Bank.create(bankBody);
  } catch (error) {
    logger.error('Error creating bank:', error);
    throw error;
  }
};

/**
 * Query for banks
 * @param {Object} filter - MongoDB filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page
 * @param {number} [options.page] - Current page
 * @param {string} [searchTerm] - Search term for basic search
 * @param {string} [searchQuery] - Search query for comprehensive search
 * @returns {Promise<QueryResult>}
 */
const queryBanks = async (filter, options, searchTerm, searchQuery) => {
  try {
    const banks = await Bank.paginate(filter, options, searchTerm, searchQuery);
    return banks;
  } catch (error) {
    logger.error('Error querying banks:', error);
    throw error;
  }
};

/**
 * Get bank by id
 * @param {ObjectId} id
 * @returns {Promise<Bank>}
 */
const getBankById = async (id) => {
  try {
    return Bank.findById(id);
  } catch (error) {
    logger.error(`Error getting bank by ID ${id}:`, error);
    throw error;
  }
};

/**
 * Update bank by id
 * @param {ObjectId} bankId
 * @param {Object} updateBody
 * @returns {Promise<Bank>}
 */
const updateBankById = async (bankId, updateBody) => {
  try {
    const bank = await getBankById(bankId);
    if (!bank) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Bank not found');
    }

    if (updateBody.name && (await Bank.isNameTaken(updateBody.name, bankId))) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Bank name already taken');
    }

    if (updateBody.name) {
      // Update bankKey if name changes
      updateBody.bankKey = updateBody.name
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/[^\w\-]+/g, '') // Remove special characters
        .replace(/\-\-+/g, '-'); // Replace multiple hyphens with single hyphen
    }

    Object.assign(bank, updateBody);
    await bank.save();
    return bank;
  } catch (error) {
    logger.error(`Error updating bank ${bankId}:`, error);
    throw error;
  }
};

/**
 * Delete bank by id
 * @param {ObjectId} bankId
 * @returns {Promise<Bank>}
 */
const deleteBankById = async (bankId) => {
  try {
    const bank = await getBankById(bankId);
    if (!bank) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Bank not found');
    }
    await User.updateMany({ assignedPayinBank: bankId }, { $unset: { assignedPayinBank: 1 } });

    await User.updateMany({ assignedPayoutBank: bankId }, { $unset: { assignedPayoutBank: 1 } });
    await Bank.deleteOne({ _id: bankId });
    return bank;
  } catch (error) {
    logger.error(`Error deleting bank ${bankId}:`, error);
    throw error;
  }
};

/**
 * Assign bank to user
 * @param {ObjectId} userId
 * @param {ObjectId} bankId
 * @returns {Promise<User>}
 */
const assignBankToUser = async (userId, bankId, type) => {
  try {
    const bank = await getBankById(bankId);
    if (!bank) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Bank not found');
    }

    // Check status
    if (bank.status !== 'active') {
      throw new ApiError(httpStatus.BAD_REQUEST, `${type} bank is inactive or missing`);
    }

    // Get user
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
    }

    const updateField = type === 'payin' ? { assignedPayinBank: bankId } : { assignedPayoutBank: bankId };

    // Update user
    const updatedUser = await User.findByIdAndUpdate(userId, { $set: updateField }, { new: true, runValidators: false });

    return updatedUser;
  } catch (error) {
    throw error; // or handle next(error) if in Express route
  }
};

module.exports = {
  createBank,
  queryBanks,
  getBankById,
  updateBankById,
  deleteBankById,
  assignBankToUser,
};
