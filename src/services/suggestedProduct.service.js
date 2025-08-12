const SuggestedProduct = require('../models/suggestedProduct.model');

const createSuggestedProduct = async (data) => {
  try {
    return await SuggestedProduct.create(data);
  } catch (error) {
    throw error;
  }
};

const getAllSuggestedProducts = async (query = {}) => {
  try {
    const {
      page = 1,
      limit = 10,
      sortBy,
      search = '',
      status,
    } = query;

    const filter = {};
    if (status) filter.status = status;

    const options = {
      page: Number(page) || 1,
      limit: Number(limit) || 10,
    };

    const sort = (() => {
      if (!sortBy) return { createdAt: -1 };
      const sortObj = {};
      const fields = String(sortBy).split(',');
      for (const f of fields) {
        const trimmed = f.trim();
        if (!trimmed) continue;
        if (trimmed.includes(':')) {
          const [key, order] = trimmed.split(':');
          sortObj[key] = order === 'asc' ? 1 : -1;
        } else if (trimmed.startsWith('-')) {
          sortObj[trimmed.substring(1)] = -1;
        } else {
          sortObj[trimmed] = 1;
        }
      }
      return Object.keys(sortObj).length ? sortObj : { createdAt: -1 };
    })();

    const skip = (options.page - 1) * options.limit;

    let searchFilter = {};
    if (search && String(search).trim() !== '') {
      const regex = { $regex: String(search), $options: 'i' };
      searchFilter = {
        $or: [
          { name: regex },
          { description: regex },
          { ingredients: regex },
        ],
      };
    }

    const combined = { ...filter, ...searchFilter };

    const [totalResults, results] = await Promise.all([
      SuggestedProduct.countDocuments(combined),
      SuggestedProduct.find(combined).sort(sort).skip(skip).limit(options.limit),
    ]);

    const totalPages = Math.ceil(totalResults / options.limit);
    return {
      results,
      currentResults: results.length,
      page: options.page,
      limit: options.limit,
      totalPages,
      totalResults,
    };
  } catch (error) {
    throw error;
  }
};

const getSuggestedProductById = async (id) => {
  try {
    if (!id) throw new Error('Suggested product ID is required');
    const doc = await SuggestedProduct.findById(id);
    if (!doc) throw new Error('Suggested product not found');
    return doc;
  } catch (error) {
    throw error;
  }
};

const updateSuggestedProduct = async (id, data) => {
  try {
    if (!id) throw new Error('Suggested product ID is required');
    const existing = await SuggestedProduct.findById(id);
    if (!existing) throw new Error('Suggested product not found');
    return await SuggestedProduct.findByIdAndUpdate(id, data, { new: true });
  } catch (error) {
    throw error;
  }
};

const deleteSuggestedProduct = async (id) => {
  try {
    if (!id) throw new Error('Suggested product ID is required');
    const existing = await SuggestedProduct.findById(id);
    if (!existing) throw new Error('Suggested product not found');
    return await SuggestedProduct.findByIdAndDelete(id);
  } catch (error) {
    throw error;
  }
};

module.exports = {
  createSuggestedProduct,
  getAllSuggestedProducts,
  getSuggestedProductById,
  updateSuggestedProduct,
  deleteSuggestedProduct,
};

