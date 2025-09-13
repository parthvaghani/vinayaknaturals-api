const service = require('../services/lead.service');

const create = async (req, res) => {
  try {
    const { page, button, message, phoneNumber, metadata, whatsappIntent, whatsappSent } = req.body || {};

    if (!page) return res.status(400).json({ message: 'page is required' });

    const reqInfo = {
      sourceUrl: req.body?.sourceUrl,
      userAgent: req.headers['user-agent'],
      ipAddress: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip,
    };

    const doc = await service.createLead(
      { page, button, message, phoneNumber, metadata, whatsappIntent: !!whatsappIntent, whatsappSent: !!whatsappSent },
      reqInfo,
    );

    return res.status(201).json({ message: 'Lead captured successfully', data: doc });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Internal server error' });
  }
};

const getAll = async (req, res) => {
  try {
    const docs = await service.getLeads(req.query);
    return res.status(200).json({ message: 'Leads fetched successfully', data: docs });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Internal server error' });
  }
};

const getById = async (req, res) => {
  try {
    const { id } = req.params || {};
    if (!id) return res.status(400).json({ message: 'id is required' });
    const doc = await service.getLeadById(id);
    if (!doc) return res.status(404).json({ message: 'Lead not found' });
    return res.status(200).json({ message: 'Lead fetched successfully', data: doc });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Internal server error' });
  }
};

module.exports = { create, getAll, getById };
