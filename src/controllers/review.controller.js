const service = require('../services/review.service');

const create = async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    const { productId, reviewStar, msg } = req.body;
    const review = await service.createReview({ userId, productId, reviewStar, msg });
    res.status(201).json({ message: 'Review added successfully', data: review });
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ message: error.message });
    }
    if (
      error.message.includes('already reviewed') ||
      error.message.includes('purchased and received') ||
      error.message.includes('required')
    ) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
};

const listByProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const data = await service.listProductReviews({ productId });
    res.status(200).json({ message: 'Reviews fetched successfully', ...data });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
};

const listAll = async (req, res) => {
  try {
    const { page, limit, search } = req.query;
    const data = await service.listAllReviews({ page, limit, search });
    res.status(200).json({ message: 'Reviews fetched successfully', ...data });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
};

module.exports = { create, listByProduct, listAll };
