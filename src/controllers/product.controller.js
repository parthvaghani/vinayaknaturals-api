
const service = require('../services/product.service');

const create = async (req, res) => {
  try {
    const product = await service.createProduct(req.body, req.files);
    res.status(201).json({ message: 'Product created successfully', data: product });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
};

const getAll = async (req, res) => {
  try {
    const products = await service.getAllProducts(req.query);
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
    if (req.user.role !== 'admin') return res.status(400).json({ message: 'You do not have permission to access this resource.' });
    if (!req.params.id) return res.status(400).json({ message: 'Product ID is required' });
    const updated = await service.updateProduct(req.params.id, req.body, req.files);
    res.status(200).json({ message: 'Product updated successfully', data: updated });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
};

const remove = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(400).json({ message: 'You do not have permission to access this resource.' });
    await service.deleteProductFromCart(req.params.id);
    await service.deleteProduct(req.params.id);
    res.status(200).json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
};

const addReview = async (req, res) => {
  try {
    if (!req.params.id) return res.status(400).json({ message: 'Product ID is required' });
    if (!req.body.reviewStar) return res.status(400).json({ message: 'Review star is required' });
    // if (!req.body.msg) return res.status(400).json({ message: 'Review message is required' });

    const product = await service.addProductReview(req.params.id, req.user.id, req.body);
    res.status(200).json({ message: 'Review added successfully', data: product });
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ message: error.message });
    }
    if (error.message.includes('already reviewed') || error.message.includes('purchased and received')) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
};

module.exports = {
  create,
  getAll,
  getById,
  update,
  remove,
  addReview,
};