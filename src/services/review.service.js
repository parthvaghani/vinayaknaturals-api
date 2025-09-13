const Review = require('../models/review.model');
const Product = require('../models/product.model');
const Order = require('../models/order.model');

const createReview = async ({ userId, productId, reviewStar, msg }) => {
  try {
    if (!userId) throw new Error('User ID is required');
    if (!productId) throw new Error('Product ID is required');
    if (!reviewStar) throw new Error('Review star is required');

    // Ensure product exists
    const product = await Product.findById(productId);
    if (!product) throw new Error('Product not found');

    // Ensure the user has a delivered order containing this product
    const deliveredOrder = await Order.findOne({
      userId: userId,
      status: 'delivered',
      'productsDetails.productId': productId,
    });
    if (!deliveredOrder) throw new Error('You can only review products that you have purchased and received');

    // Create review (unique index will prevent duplicates)
    const review = await Review.create({ userId, productId, reviewStar, msg });
    return review;
  } catch (error) {
    if (error && error.code === 11000) {
      // duplicate key (userId, productId)
      throw new Error('You have already reviewed this product');
    }
    throw error;
  }
};

const listProductReviews = async ({ productId }) => {
  try {
    if (!productId) throw new Error('Product ID is required');
    const filter = { productId };
    const results = await Review.find(filter)
      .populate('userId', 'user_details email')
      .populate('productId', 'name')
      .sort({ createdAt: -1 });
    return { results };
  } catch (error) {
    throw error;
  }
};

const listAllReviews = async ({ page = 1, limit = 10, search = '' }) => {
  try {
    const skip = (Number(page) - 1) * Number(limit);
    const filter = {};
    if (search && String(search).trim() !== '') {
      filter.msg = { $regex: String(search), $options: 'i' };
    }
    const [totalResults, results] = await Promise.all([
      Review.countDocuments(filter),
      Review.find(filter)
        .populate('userId', 'user_details email')
        .populate('productId', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
    ]);
    const totalPages = Math.ceil(totalResults / Number(limit));
    return { results, page: Number(page), limit: Number(limit), totalPages, totalResults };
  } catch (error) {
    throw error;
  }
};

module.exports = { createReview, listProductReviews, listAllReviews };
