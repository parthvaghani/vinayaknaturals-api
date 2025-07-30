const mongoose = require('mongoose');

/**
 * KYC pagination plugin that supports searching in related user data
 * @param {Schema} schema - The mongoose schema
 */
const kycPaginate = (schema) => {
  /**
   * @typedef {Object} QueryResult
   * @property {Document[]} results - Results found
   * @property {number} page - Current page
   * @property {number} limit - Maximum number of results per page
   * @property {number} totalPages - Total number of pages
   * @property {number} totalResults - Total number of documents
   */
  /**
   * Query for KYC documents with pagination and search in related user data
   * @param {Object} [filter] - Mongo filter
   * @param {Object} [options] - Query options
   * @param {string} [options.sortBy] - Sorting criteria using the format: sortField:(desc|asc)
   * @param {string} [options.populate] - Populate data fields. Default is 'userId'
   * @param {number} [options.limit] - Maximum number of results per page (default = 10)
   * @param {number} [options.page] - Current page (default = 1)
   * @param {string} [searchQuery] - Search query for user fields and document fields
   * @returns {Promise<QueryResult>}
   */
  schema.statics.kycPaginate = async function (filter, options, searchQuery) {
    const Model = mongoose.model('User');
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

    // If searchQuery is provided, first find matching users
    if (searchQuery && searchQuery.trim() !== '') {
      const userQuery = {
        $or: [
          { businessName: { $regex: searchQuery, $options: 'i' } },
          { email: { $regex: searchQuery, $options: 'i' } }
        ]
      };
      
      // Find users matching the search criteria
      const matchingUsers = await Model.find(userQuery).select('_id');
      const userIds = matchingUsers.map(user => user._id);
      
      // Add matching userIds to the filter along with document field searches
      if (userIds.length > 0) {
        filter = {
          ...filter,
          $or: [
            { userId: { $in: userIds } },
            { documentNumber: { $regex: searchQuery, $options: 'i' } },
            { documentType: { $regex: searchQuery, $options: 'i' } },
            { remarks: { $regex: searchQuery, $options: 'i' } }
          ]
        };
      } else {
        // If no matching users, search only document fields
        filter = {
          ...filter,
          $or: [
            { documentNumber: { $regex: searchQuery, $options: 'i' } },
            { documentType: { $regex: searchQuery, $options: 'i' } },
            { remarks: { $regex: searchQuery, $options: 'i' } }
          ]
        };
      }
    }

    // Get total count for pagination
    const countPromise = this.countDocuments(filter).exec();
    
    // Find documents with pagination
    let docsPromise = this.find(filter).sort(sort).skip(skip).limit(limit);

    // Apply populate if specified
    const populateOption = options.populate || 'userId';
    docsPromise = docsPromise.populate(
      populateOption
        .split('.')
        .reverse()
        .reduce((a, b) => ({ path: b, populate: a }))
    );

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
};

module.exports = kycPaginate;
