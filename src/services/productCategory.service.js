const ProductCategory = require('../models/productCategory.model');

const createCategory = async (data) => {
  try {
    return await ProductCategory.create(data);
  } catch (error) {
    throw error;
  }
};

const getAllCategories = async () => {
  try {
    return await ProductCategory.find();
  } catch (error) {
    throw error;
  }
};

const getCategoryById = async (id) => {
  try {
    if (!id) throw new Error('Category ID is required');
    const cat = await ProductCategory.findById(id);
    if (!cat) throw new Error('Category not found');
    return await ProductCategory.findById(id);
  } catch (error) {
    throw error;
  }
};

const updateCategory = async (id, data) => {
  try {
    if (!id) throw new Error('Category ID is required');
    const cat = await ProductCategory.findById(id);
    if (!cat) throw new Error('Category not found');
    return await ProductCategory.findByIdAndUpdate(id, data, { new: true });
  } catch (error) {
    throw error;
  }
};

const deleteCategory = async (id) => {
  try {
    if (!id) throw new Error('Category ID is required');
    const cat = await ProductCategory.findById(id);
    if (!cat) throw new Error('Category not found');
    return await ProductCategory.findByIdAndDelete(id);
  } catch (error) {
    throw error;
  }
};

module.exports = {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
};
