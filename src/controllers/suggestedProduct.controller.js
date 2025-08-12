const service = require('../services/suggestedProduct.service');

const create = async (req, res) => {
  try {
    const { name, ingredients, description } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required' });
    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      return res.status(400).json({ message: 'Ingredients are required' });
    }
    if (!description) return res.status(400).json({ message: 'Description is required' });
    const doc = await service.createSuggestedProduct(req.body);
    res.status(201).json({ message: 'Suggestion submitted successfully', data: doc });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
};

const getAll = async (req, res) => {
  try {
    const docs = await service.getAllSuggestedProducts(req.query);
    res.status(200).json({ message: 'Suggestions fetched successfully', data: docs });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
};

const getById = async (req, res) => {
  try {
    if (!req.params.id) return res.status(400).json({ message: 'ID is required' });
    const doc = await service.getSuggestedProductById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Suggestion not found' });
    res.status(200).json({ message: 'Suggestion fetched successfully', data: doc });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
};

const update = async (req, res) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(400).json({ message: 'You do not have permission to access this resource.' });
    }
    if (!req.params.id) return res.status(400).json({ message: 'ID is required' });
    const updated = await service.updateSuggestedProduct(req.params.id, req.body);
    res.status(200).json({ message: 'Suggestion updated successfully', data: updated });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
};

const remove = async (req, res) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(400).json({ message: 'You do not have permission to access this resource.' });
    }
    if (!req.params.id) return res.status(400).json({ message: 'ID is required' });
    await service.deleteSuggestedProduct(req.params.id);
    res.status(200).json({ message: 'Suggestion deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
};

module.exports = { create, getAll, getById, update, remove };

