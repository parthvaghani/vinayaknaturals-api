const Product = require('../models/product.model');

const createProduct = async (data) => {
  try {
    return await Product.create(data);
  } catch (error) {
    throw error;
  }
};

const getAllProducts = async () => {
  try {
    return await Product.find().populate('category');
  } catch (error) {
    throw error;
  }
};

const getProductById = async (id) => {
  try {
    if (!id) throw new Error('Product ID is required');
    const product = await Product.findById(id).populate('category');
    if (!product) throw new Error('Product not found');
    return await Product.findById(id).populate('category');
  } catch (error) {
    throw error;
  }
};

const updateProduct = async (id, data) => {
  try {
    if (!id) throw new Error('Product ID is required');
    const product = await Product.findById(id);
    if (!product) throw new Error('Product not found');
    return await Product.findByIdAndUpdate(id, data, { new: true });
  } catch (error) {
    throw error;
  }
};

const deleteProduct = async (id) => {
  try {
    if (!id) throw new Error('Product ID is required');
    const product = await Product.findById(id);
    if (!product) throw new Error('Product not found');
    return await Product.findByIdAndDelete(id);
  } catch (error) {
    throw error;
  }
};

module.exports = {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
};
