const mongoose = require('mongoose');
const { BANK_ENV_TYPE } = require('../utils/constants');
const { toJSON, paginate } = require('./plugins');

const bankSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    bankKey: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    envType: {
      type: String,
      enum: Object.values(BANK_ENV_TYPE),
      required: true,
      default: BANK_ENV_TYPE.BOTH,
    },
  },
  {
    timestamps: true,
  },
);

// Add plugins
bankSchema.plugin(toJSON);
bankSchema.plugin(paginate);

/**
 * Check if bank name is already taken
 * @param {string} name - The bank name
 * @param {ObjectId} [excludeBankId] - The id of the bank to be excluded
 * @returns {Promise<boolean>}
 */
bankSchema.statics.isNameTaken = async function (name, excludeBankId) {
  const bank = await this.findOne({ name, _id: { $ne: excludeBankId } });
  return !!bank;
};

/**
 * Check if bank key is already taken
 * @param {string} bankKey - The bank key
 * @param {ObjectId} [excludeBankId] - The id of the bank to be excluded
 * @returns {Promise<boolean>}
 */
bankSchema.statics.isBankKeyTaken = async function (bankKey, excludeBankId) {
  const bank = await this.findOne({ bankKey, _id: { $ne: excludeBankId } });
  return !!bank;
};

/**
 * Custom paginate method for Bank model with searchQuery support
 * @param {Object} [filter] - Mongo filter
 * @param {Object} [options] - Query options
 * @param {string} [searchTerm] - Simple search term for basic search
 * @param {string} [searchQuery] - Comprehensive search query across bank data
 * @returns {Promise<QueryResult>}
 */
bankSchema.statics.paginate = async function (filter, options, searchTerm, searchQuery) {
  let sort = '';
  if (options.sortBy) {
    const sortingCriteria = [];
    options.sortBy.split(',').forEach((sortOption) => {
      const [key, order] = sortOption.split(':');
      sortingCriteria.push((order === 'desc' ? '-' : '') + key);
    });
    sort = sortingCriteria.join(' ');
  } else {
    sort = '-createdAt';
  }

  const limit = options.limit && parseInt(options.limit, 10) > 0 ? parseInt(options.limit, 10) : 10;
  const page = options.page && parseInt(options.page, 10) > 0 ? parseInt(options.page, 10) : 1;
  const skip = (page - 1) * limit;

  // Basic search filter based on searchTerm
  const searchFilter = searchTerm ? {
    $or: [{ name: { $regex: searchTerm, $options: 'i' } }, { bankKey: { $regex: searchTerm, $options: 'i' } }],
  } : {};

  // Comprehensive search across bank data when searchQuery is provided
  let searchQueryFilter = {};
  if (searchQuery && searchQuery.trim() !== '') {
    searchQueryFilter = {
      $or: [
        { name: { $regex: searchQuery, $options: 'i' } },
        { bankKey: { $regex: searchQuery, $options: 'i' } },
        { status: { $regex: searchQuery, $options: 'i' } },
      ],
    };
  }

  // Combine all filters
  const combinedFilter = {
    ...filter,
    ...searchFilter,
    ...(searchQuery && searchQuery.trim() !== '' ? searchQueryFilter : {}),
  };

  const countPromise = this.countDocuments(combinedFilter).exec();
  let docsPromise = this.find(combinedFilter).sort(sort).skip(skip).limit(limit);

  if (options.populate) {
    options.populate.split(',').forEach((populateOption) => {
      docsPromise = docsPromise.populate(
        populateOption
          .split('.')
          .reverse()
          .reduce((a, b) => ({ path: b, populate: a })),
      );
    });
  }

  docsPromise = docsPromise.exec();

  return Promise.all([countPromise, docsPromise]).then((values) => {
    const [totalResults, results] = values;
    const totalPages = Math.ceil(totalResults / limit);
    const result = {
      results,
      page,
      limit,
      totalPages,
      totalResults,
    };
    return Promise.resolve(result);
  });
};

/**
 * @typedef Bank
 */
const Bank = mongoose.model('Bank', bankSchema);

module.exports = Bank;
