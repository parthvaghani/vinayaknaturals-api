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
    const { sortBy, search = '', visible } = query;

    const filter = {};
    if (typeof visible !== 'undefined') filter.visible = visible;

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

    let searchFilter = {};
    if (search && String(search).trim() !== '') {
      const regex = { $regex: String(search), $options: 'i' };
      searchFilter = {
        $or: [{ name: regex }, { body: regex }, { location: regex }],
      };
    }

    const combined = { ...filter, ...searchFilter };

    const results = await Testimonial.find(combined).sort(sort);
    return results;
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
