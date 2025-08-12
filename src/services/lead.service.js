const Lead = require('../models/lead.model');

const createLead = async (data, reqInfo = {}) => {
  try {
    const doc = await Lead.create({
      ...data,
      sourceUrl: reqInfo.sourceUrl,
      userAgent: reqInfo.userAgent,
      ipAddress: reqInfo.ipAddress,
    });
    return doc;
  } catch (error) {
    throw error;
  }
};

const getLeads = async (query = {}) => {
  try {
    const {
      page = 1,
      limit = 10,
      sortBy,
      search = '',
      status,
      whatsappIntent,
      whatsappSent,
    } = query;

    const filter = {};
    if (status) filter.status = status;
    if (typeof whatsappIntent !== 'undefined') filter.whatsappIntent = whatsappIntent;
    if (typeof whatsappSent !== 'undefined') filter.whatsappSent = whatsappSent;

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
          { page: regex },
          { button: regex },
          { message: regex },
          { phoneNumber: regex },
          { sourceUrl: regex },
          { userAgent: regex },
          { ipAddress: regex },
        ],
      };
    }

    const combined = { ...filter, ...searchFilter };

    const [totalResults, results] = await Promise.all([
      Lead.countDocuments(combined),
      Lead.find(combined).sort(sort).skip(skip).limit(options.limit),
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

const getLeadById = async (id) => {
  try {
    if (!id) throw new Error('Lead ID is required');
    const doc = await Lead.findById(id);
    if (!doc) return null;
    return doc;
  } catch (error) {
    throw error;
  }
};

module.exports = { createLead, getLeads, getLeadById };

