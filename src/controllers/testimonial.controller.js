const service = require('../services/testimonial.service');

const create = async (req, res) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(400).json({ message: 'You do not have permission to access this resource.' });
    }
    if (!req.body.name) return res.status(400).json({ message: 'Name is required' });
    if (!req.body.body) return res.status(400).json({ message: 'Body is required' });
    const doc = await service.createTestimonial(req.body);
    res.status(201).json({ message: 'Testimonial created successfully', data: doc });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
};

const getAll = async (req, res) => {
  try {
    const docs = await service.getAllTestimonials(req.query);
    res.status(200).json({ message: 'Testimonials fetched successfully', data: docs });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
};

const getById = async (req, res) => {
  try {
    if (!req.params.id) return res.status(400).json({ message: 'Testimonial ID is required' });
    const doc = await service.getTestimonialById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Testimonial not found' });
    res.status(200).json({ message: 'Testimonial fetched successfully', data: doc });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
};

const update = async (req, res) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(400).json({ message: 'You do not have permission to access this resource.' });
    }
    if (!req.params.id) return res.status(400).json({ message: 'Testimonial ID is required' });
    const updated = await service.updateTestimonial(req.params.id, req.body);
    res.status(200).json({ message: 'Testimonial updated successfully', data: updated });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
};

const remove = async (req, res) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(400).json({ message: 'You do not have permission to access this resource.' });
    }
    if (!req.params.id) return res.status(400).json({ message: 'Testimonial ID is required' });
    await service.deleteTestimonial(req.params.id);
    res.status(200).json({ message: 'Testimonial deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
};

module.exports = {
  create,
  getAll,
  getById,
  update,
  remove,
};