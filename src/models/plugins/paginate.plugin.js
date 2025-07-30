const paginate = (schema) => {
  /**
   * @typedef {Object} QueryResult
   * @property {Document[]} results - Results found
   * @property {number} page - Current page
   * @property {number} limit - Maximum number of results per page
   * @property {number} totalPages - Total number of pages
   * @property {number} totalResults - Total number of documents
   */
  /**
   * Query for documents with pagination
   * @param {Object} [filter] - Mongo filter
   * @param {Object} [options] - Query options
   * @param {string} [options.sortBy] - Sorting criteria using the format: sortField:(desc|asc). Multiple sorting criteria should be separated by commas (,)
   * @param {string} [options.populate] - Populate data fields. Hierarchy of fields should be separated by (.). Multiple populating criteria should be separated by commas (,)
   * @param {number} [options.limit] - Maximum number of results per page (default = 10)
   * @param {number} [options.page] - Current page (default = 1)
   * @param {string} [searchTerm] - Simple search term for basic search
   * @param {string} [searchQuery] - Comprehensive search query across all user data
   * @returns {Promise<QueryResult>}
   */
  schema.statics.paginate = async function (filter, options, searchTerm, searchQuery) {
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
      $or: [{ phoneNumber: { $regex: searchTerm, $options: 'i' } }, { email: { $regex: searchTerm, $options: 'i' } }],
    } : {};

    // Comprehensive search across all user data when searchQuery is provided
    let searchQueryFilter = {};
    if (searchQuery && searchQuery.trim() !== '') {
      searchQueryFilter = {
        $or: [
          { businessName: { $regex: searchQuery, $options: 'i' } },
          { email: { $regex: searchQuery, $options: 'i' } },
          { phoneNumber: { $regex: searchQuery, $options: 'i' } },
          { 'user_details.name': { $regex: searchQuery, $options: 'i' } },
          { 'user_details.country': { $regex: searchQuery, $options: 'i' } },
          { role: { $regex: searchQuery, $options: 'i' } },
          { 'remarks': { $regex: searchQuery, $options: 'i' } },
          { 'documentType': { $regex: searchQuery, $options: 'i' } },
          { 'user.businessName': { $regex: searchQuery, $options: 'i' } },
          { 'user.email': { $regex: searchQuery, $options: 'i' } },
          { 'documentNumber': { $regex: searchQuery, $options: 'i' } },
          { 'utrNumber': { $regex: searchQuery, $options: 'i' } },
        ],
      };
    }

    // Combine all filters - if searchQuery is blank, this won't filter anything
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
};

module.exports = paginate;
