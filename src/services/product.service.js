const Product = require('../models/product.model');
const Cart = require('../models/product.model');
const ProductCategory = require('../models/productCategory.model');
const Order = require('../models/order.model');
const path = require('path');
const { uploadFileToS3, deleteFileFromS3 } = require('../Helpers/aws-s3');
// const { url } = require('inspector');

const createProduct = async (data, files) => {
  try {
    // Upload images to S3 if files are provided (multer memoryStorage)
    if (files && files.length > 0) {
      const uploads = await Promise.all(
        files.map(async (file, index) => {
          const safeName = path.basename(file.originalname).replace(/\s+/g, '-');
          const key = `products/${Date.now()}-${index}-${safeName}`;
          const result = await uploadFileToS3(file.buffer, key, file.mimetype);

          if (!result.status) {
            throw new Error('Failed to upload image');
          }
          return { url: key };
        }),
      );
      data.images = uploads;
    }
    return await Product.create(data);
  } catch (error) {
    throw error;
  }
};

const getAllProducts = async (query = {}) => {
  try {
    const { page = 1, limit = 10, sortBy, search = '', category, isPremium, isPopular } = query;

    const filter = {};
    if (category) filter.category = category;
    if (typeof isPremium !== 'undefined') filter.isPremium = isPremium;
    if (typeof isPopular !== 'undefined') filter.isPopular = isPopular;

    const options = {
      page: Number(page) || 1,
      limit: Number(limit) || 10,
    };

    // support sortBy in format field:asc,field2:desc
    if (sortBy) options.sortBy = sortBy;
    options.populate = 'category';

    // If the Product model had the paginate plugin, we could call Product.paginate
    // Since it doesn't, we emulate pagination here.
    const sort = (() => {
      if (!options.sortBy) return { createdAt: -1 };
      const sortObj = {};
      const fields = String(options.sortBy).split(',');
      for (const f of fields) {
        const trimmed = f.trim();
        if (!trimmed) continue;
        if (trimmed.includes(':')) {
          const [key, order] = trimmed.split(':');
          sortObj[key] = order === 'asc' ? 1 : -1;
        } else if (trimmed.startsWith('-')) {
          sortObj[trimmed.substring(1)] = -1;
        } else {
          sortObj[trimmed] = 1;
        }
      }
      return Object.keys(sortObj).length ? sortObj : { createdAt: -1 };
    })();

    const skip = (options.page - 1) * options.limit;

    // Build search across relevant fields
    let searchFilter = {};
    if (search && String(search).trim() !== '') {
      const regex = { $regex: String(search), $options: 'i' };
      // find matching categories by name/description
      const matchingCategories = await ProductCategory.find({
        $or: [{ name: regex }, { description: regex }, { category: regex }],
      }).select('_id');
      const categoryIds = matchingCategories.map((c) => c._id);
      searchFilter = {
        $or: [
          { name: regex },
          { description: regex },
          { ingredients: regex },
          { benefits: regex },
          ...(categoryIds.length ? [{ category: { $in: categoryIds } }] : []),
        ],
      };
    }

    const combined = { ...filter, ...searchFilter };

    const [totalResults, results] = await Promise.all([
      Product.countDocuments(combined),
      Product.find(combined).populate('category').sort(sort).skip(skip).limit(options.limit),
    ]);

    const totalPages = Math.ceil(totalResults / options.limit);
    return {
      results,
      currentResults: results.length,
      page: options.page,
      limit: options.limit,
      totalPages,
      totalResults,
    };
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

const updateProduct = async (id, data, files) => {
  try {
    if (!id) throw new Error('Product ID is required');
    const product = await Product.findById(id);
    if (!product) throw new Error('Product not found');

    // 1) Upload new images (if any) to S3 and prepare $push payload
    let uploads = [];
    if (files && files.length > 0) {
      uploads = await Promise.all(
        files.map(async (file, index) => {
          const safeName = path.basename(file.originalname).replace(/\s+/g, '-');
          const key = `products/${Date.now()}-${index}-${safeName}`;
          const result = await uploadFileToS3(file.buffer, key, file.mimetype);
          if (!result.status) {
            throw new Error('Failed to upload image');
          }
          return { url: key };
        }),
      );
    }

    // 2) Build updates; split into two to avoid 'images' path conflicts
    let imagesToRemove = [];
    if (data && Object.prototype.hasOwnProperty.call(data, 'imagesToRemove')) {
      if (Array.isArray(data.imagesToRemove)) {
        imagesToRemove = data.imagesToRemove;
      } else if (data.imagesToRemove !== undefined && data.imagesToRemove !== null && data.imagesToRemove !== '') {
        imagesToRemove = [data.imagesToRemove];
      }
    }
    // First update: $pull
    if (imagesToRemove.length > 0) {
      await Product.findByIdAndUpdate(id, { $pull: { images: { url: { $in: imagesToRemove } } } }, { new: false });
    }

    // Build $set and $push for second update
    const dataClone = { ...data };
    delete dataClone.images; // never set images directly
    delete dataClone.imagesToRemove; // helper only
    const secondUpdate = {};
    if (Object.keys(dataClone).length > 0) {
      secondUpdate.$set = dataClone;
    }
    if (uploads.length > 0) {
      secondUpdate.$push = { images: { $each: uploads } };
    }

    // Second update: $set and/or $push
    let updated;
    if (Object.keys(secondUpdate).length) {
      updated = await Product.findByIdAndUpdate(id, secondUpdate, { new: true });
    } else {
      updated = await Product.findById(id);
    }

    // 4) Delete removed images from S3 AFTER DB update succeeds
    if (imagesToRemove.length > 0) {
      await Promise.all(
        imagesToRemove.map(async (imgKey) => {
          try {
            await deleteFileFromS3(imgKey);
          } catch {
            /* noop */
          }
        }),
      );
    }

    return updated;
  } catch (error) {
    throw error;
  }
};

const deleteProduct = async (id) => {
  try {
    if (!id) throw new Error('Product ID is required');
    const product = await Product.findById(id);
    if (!product) throw new Error('Product not found');
    if (product.images && product.images.length) {
      await Promise.all(
        product.images.map(async (img) => {
          try {
            await deleteFileFromS3(img.url);
          } catch {
            /* noop */
          }
        }),
      );
    }
    return await Product.findByIdAndDelete(id);
  } catch (error) {
    throw error;
  }
};

const addProductReview = async (productId, userId, reviewData) => {
  try {
    if (!productId) throw new Error('Product ID is required');
    if (!userId) throw new Error('User ID is required');

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) throw new Error('Product not found');

    // Check if user has any delivered orders containing this product
    const deliveredOrder = await Order.findOne({
      userId: userId,
      status: 'delivered',
      'productsDetails.productId': productId,
    });

    if (!deliveredOrder) {
      throw new Error('You can only review products that you have purchased and received');
    }

    // Check if user has already reviewed this product
    const existingReview = product.review.find((review) => review.userId.toString() === userId.toString());

    if (existingReview) {
      throw new Error('You have already reviewed this product');
    }

    // Add the review
    const newReview = {
      userId: userId,
      reviewStar: reviewData.reviewStar,
      msg: reviewData.msg,
    };

    product.review.push(newReview);
    await product.save();

    return product;
  } catch (error) {
    throw error;
  }
};

const deleteProductFromCart = async (id) => {
  try {
    if (!id) throw new Error('Product ID is required');
    const product = await Product.findById(id);
    if (!product) throw new Error('Product not found');
    const getCartProduct = await Cart.find({ productId: id });
    if (getCartProduct) {
      await Cart.deleteMany({ productId: id });
    }
    return { message: 'All cart items with this product have been deleted' };
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
  addProductReview,
  deleteProductFromCart,
};
