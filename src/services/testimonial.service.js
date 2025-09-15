const Testimonial = require('../models/testimonial.model');

const createTestimonial = async (data) => {
  try {
    return await Testimonial.create(data);
  } catch (error) {
    throw error;
  }
};

const getAllTestimonials = async (query = {}) => {
  try {
    const {
      page = 1,
      limit = 10,
      sortBy,
      search = '',
      visible,
    } = query;

    const filter = {};
    if (typeof visible !== 'undefined') filter.visible = visible;

    const options = {
      page: Number(page) || 1,
      limit: Number(limit) || 10,
    };

    // support sortBy in format field:asc,field2:desc
    if (sortBy) options.sortBy = sortBy;

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
        $or: [{ name: regex }, { body: regex }, { location: regex }],
      };
    }

    const combined = { ...filter, ...searchFilter };

    const [totalResults, results] = await Promise.all([
      Testimonial.countDocuments(combined),
      Testimonial.find(combined).sort(sort).skip(skip).limit(options.limit),
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

const getTestimonialById = async (id) => {
  try {
    if (!id) throw new Error('Testimonial ID is required');
    const doc = await Testimonial.findById(id);
    if (!doc) throw new Error('Testimonial not found');
    return doc;
  } catch (error) {
    throw error;
  }
};

const updateTestimonial = async (id, data) => {
  try {
    if (!id) throw new Error('Testimonial ID is required');
    const existing = await Testimonial.findById(id);
    if (!existing) throw new Error('Testimonial not found');
    return await Testimonial.findByIdAndUpdate(id, data, { new: true });
  } catch (error) {
    throw error;
  }
};

const deleteTestimonial = async (id) => {
  try {
    if (!id) throw new Error('Testimonial ID is required');
    const existing = await Testimonial.findById(id);
    if (!existing) throw new Error('Testimonial not found');
    return await Testimonial.findByIdAndDelete(id);
  } catch (error) {
    throw error;
  }
};

module.exports = {
  createTestimonial,
  getAllTestimonials,
  getTestimonialById,
  updateTestimonial,
  deleteTestimonial,
};
