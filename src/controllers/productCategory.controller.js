const service = require('../services/productCategory.service');

const create = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(400).json({ message: 'You do not have permission to access this resource.' });
    if (!req.body.name) return res.status(400).json({ message: 'Category name is required' });
    if (!req.body.description) return res.status(400).json({ message: 'Category description is required' });
    const cat = await service.createCategory(req.body);
    res.status(201).json({ message: 'Category created successfully', data: cat });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
};

const getAll = async (req, res) => {
  try {
    const cats = await service.getAllCategories(req.query);
    res.status(200).json({ message: 'Categories fetched successfully', data: cats });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
};

const getById = async (req, res) => {
  try {
    if (!req.params.id) return res.status(400).json({ message: 'Category ID is required' });
    const cat = await service.getCategoryById(req.params.id);
    if (!cat) return res.status(404).json({ message: 'Category not found' });
    res.status(200).json({ message: 'Category fetched successfully', data: cat });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
};

const update = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(400).json({ message: 'You do not have permission to access this resource.' });
    if (!req.params.id) return res.status(400).json({ message: 'Category ID is required' });
    const updated = await service.updateCategory(req.params.id, req.body);
    res.status(200).json({ message: 'Category updated successfully', data: updated });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
};

const remove = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(400).json({ message: 'You do not have permission to access this resource.' });
    if (!req.params.id) return res.status(400).json({ message: 'Category ID is required' });
    await service.deleteCategory(req.params.id);
    res.status(200).json({ message: 'Category deleted successfully' });
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
