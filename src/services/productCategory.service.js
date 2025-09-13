const ProductCategory = require('../models/productCategory.model');

const createCategory = async (data) => {
  try {
    return await ProductCategory.create(data);
  } catch (error) {
    throw error;
  }
};

const getAllCategories = async (query = {}) => {
  try {
    const { page = 1, limit = 10, sortBy, search = '', pricingEnabled } = query;

    const filter = {};
    if (typeof pricingEnabled !== 'undefined') filter.pricingEnabled = pricingEnabled;

    const options = {
      page: Number(page) || 1,
      limit: Number(limit) || 10,
      sortBy,
    };

    const sort = (() => {
      if (!options.sortBy) return { createdAt: -1 };
      const sortObj = {};
      const fields = String(options.sortBy).split(',');
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
        $or: [{ category: regex }, { name: regex }, { description: regex }, { heroImage: regex }],
      };
    }

    const combined = { ...filter, ...searchFilter };

    const [totalResults, results] = await Promise.all([
      ProductCategory.countDocuments(combined),
      ProductCategory.find(combined).sort(sort).skip(skip).limit(options.limit),
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

const getCategoryById = async (id) => {
  try {
    if (!id) throw new Error('Category ID is required');
    const cat = await ProductCategory.findById(id);
    if (!cat) throw new Error('Category not found');
    return await ProductCategory.findById(id);
  } catch (error) {
    throw error;
  }
};

const updateCategory = async (id, data) => {
  try {
    if (!id) throw new Error('Category ID is required');
    const cat = await ProductCategory.findById(id);
    if (!cat) throw new Error('Category not found');
    return await ProductCategory.findByIdAndUpdate(id, data, { new: true });
  } catch (error) {
    throw error;
  }
};

const deleteCategory = async (id) => {
  try {
    if (!id) throw new Error('Category ID is required');
    const cat = await ProductCategory.findById(id);
    if (!cat) throw new Error('Category not found');
    return await ProductCategory.findByIdAndDelete(id);
  } catch (error) {
    throw error;
  }
};

module.exports = {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
};
