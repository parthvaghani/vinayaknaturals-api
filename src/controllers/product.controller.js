const service = require('../services/product.service');

const create = async (req, res) => {
  try {
    if (!req.body.category) return res.status(400).json({ message: 'Product category is required' });
    if (!req.body.name) return res.status(400).json({ message: 'Product name is required' });
    if (!req.body.description) return res.status(400).json({ message: 'Product description is required' });
    if (!req.body.images) return res.status(400).json({ message: 'Product images are required' });
    if (!req.body.ingredients) return res.status(400).json({ message: 'Product ingredients are required' });
    if (!req.body.benefits) return res.status(400).json({ message: 'Product benefits are required' });
    if (!req.body.isPremium) return res.status(400).json({ message: 'Product isPremium is required' });
    if (!req.body.isPopular) return res.status(400).json({ message: 'Product isPopular is required' });
    // if (!req.body.variants.unit) return res.status(400).json({ message: 'Product variant unit is required' });
    // if (!req.body.variants.weight) return res.status(400).json({ message: 'Product variant weight is required' });
    // if (!req.body.variants.price) return res.status(400).json({ message: 'Product variant price is required' });
    const product = await service.createProduct(req.body);
    res.status(201).json({ message: 'Product created successfully', data: product });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
};

const getAll = async (req, res) => {
  try {
    const products = await service.getAllProducts();
    res.status(200).json({ message: 'Products fetched successfully', data: products });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
};

const getById = async (req, res) => {
  try {
    if (!req.params.id) return res.status(400).json({ message: 'Product ID is required' });
    const product = await service.getProductById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.status(200).json({ message: 'Product fetched successfully', data: product });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
};

const update = async (req, res) => {
  try {
    if (!req.params.id) return res.status(400).json({ message: 'Product ID is required' });
    const updated = await service.updateProduct(req.params.id, req.body);
    res.status(200).json({ message: 'Product updated successfully', data: updated });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
};

const remove = async (req, res) => {
  try {
    if (!req.params.id) return res.status(400).json({ message: 'Product ID is required' });
    await service.deleteProduct(req.params.id);
    res.status(200).json({ message: 'Product deleted successfully' });
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