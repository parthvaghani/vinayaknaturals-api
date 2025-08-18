const catchAsync = require('../utils/catchAsync');
const service = require('../services/cart.service');
const { getProductById } = require('../services/product.service');

// Get all cart items for user
const getUserCartItems = catchAsync(async (req, res) => {
  const user = req.user;
  const data = await service.getUserCart(user?._id);
  if (!data) {
    return res.status(400).json({
      success: false,
      message: 'Something Went Wrong In Get User Cart'
    });
  }
  return res.status(200).json({
    success: true,
    message: 'Get Cart Data successfully',
    data: data
  });
});

// Add a product to cart
const addToCart = catchAsync(async (req, res) => {
  const user = req.user;
  const product = await getProductById(req.body.productId);

  let variantLabel = '';
  let variantId = '';
  const weightInput = req.body.weight;
  if (product && product.variants) {
    for (const type of ['gm', 'kg']) {
      const arr = product.variants[type];
      if (Array.isArray(arr)) {
        const found = arr.find(v => v.weight === weightInput);
        if (found) {
          variantLabel = type;
          variantId = found._id;
          break;
        }
      }
    }
  }

  if (!variantLabel || !variantId) {
    return res.status(400).json({
      success: false,
      message: 'Variant not found for the given weight'
    });
  }

  const dataPayload = {
    userId: user?._id,
    productId: req.body.productId,
    totalProduct: req.body.totalProduct || 1,
    weight: weightInput,
    weightVariant: variantLabel,
    variantId: variantId,
  };

  const existingCart = await service.getCartByDetails({
    userId: dataPayload.userId,
    productId: dataPayload.productId,
    weight: dataPayload.weight,
    variantId: dataPayload.variantId,
  });

  if (existingCart) {
    const updatedProduct = (existingCart?.totalProduct || 0) + dataPayload.totalProduct;
    const updatedData = await service.updateCart(existingCart?._id, { totalProduct: updatedProduct });
    if (updatedData.modifiedCount === 0) {
      return res.status(400).json({
        success: false,
        message: 'Something Went Wrong In Add Product To Cart'
      });
    }
    return res.status(200).json({
      success: true,
      message: 'Product has been added to your cart',
    });
  } else {
    const data = await service.addToCart(dataPayload);
    if (!data) {
      return res.status(400).json({
        success: false,
        message: 'Something Went Wrong In Add Product To Cart'
      });
    }
    return res.status(200).json({
      success: true,
      message: 'Product has been added to your cart'
    });
  }
});

// Update cart: handles weight, increment, decrement
const updateCart = catchAsync(async (req, res) => {
  const user = req.user;
  const { cartId, action, weight } = req.body;

  const cartItem = await service.getCartById(cartId, user?._id);
  if (!cartItem) {
    return res.status(400).json({
      success: false,
      message: 'Cart item not found'
    });
  }

  let updatedData;
  let message;

  switch (action) {
    case 'weight': {
      const product = await getProductById(cartItem.productId);

      let selectedVariant = null;
      let variantLabel = '';

      // 🔹 Search in gm and kg separately so we know the label
      for (const type of ['gm', 'kg']) {
        const arr = product?.variants?.[type] || [];
        const found = arr.find(v => v.weight === weight);
        if (found) {
          selectedVariant = found;
          variantLabel = type; // ✅ gm or kg
          break;
        }
      }

      if (!selectedVariant) {
        return res.status(400).json({
          success: false,
          message: 'Variant not found for the given weight'
        });
      }

      updatedData = await service.updateCart(cartItem._id, {
        weight: selectedVariant.weight,
        variantId: selectedVariant._id,
        weightVariant: variantLabel,       // ✅ now always "gm" or "kg"
        price: selectedVariant.price       // ✅ also update price
      });

      message = 'Product variant updated successfully';
      break;
    }

    case 'increment': {
      const newQty = (cartItem.totalProduct || 0) + 1;
      updatedData = await service.updateCart(cartItem._id, { totalProduct: newQty });
      message = 'Product quantity increased successfully';
      break;
    }

    case 'decrement': {
      const currentQty = cartItem.totalProduct || 1;
      if (currentQty <= 1) {
        updatedData = await service.deleteCartById(cartItem._id, user._id);
        message = 'Product removed successfully';
      } else {
        updatedData = await service.updateCart(cartItem._id, { totalProduct: currentQty - 1 });
        message = 'Product quantity decreased successfully';
      }
      break;
    }

    default:
      return res.status(400).json({
        success: false,
        message: 'Invalid action for updating cart'
      });
  }

  if (!updatedData) {
    return res.status(400).json({
      success: false,
      message: 'Something went wrong while updating cart'
    });
  }

  return res.status(200).json({
    success: true,
    message,
    data: updatedData // optional: return updated item
  });
});


// Remove cart item
const remove = catchAsync(async (req, res) => {
  const cartId = req.params.id;
  const userId = req.user._id;

  if (req.user.role !== 'user') {
    return res.status(403).json({ message: 'Only users can delete cart items' });
  }

  if (!cartId) {
    return res.status(400).json({ message: 'Cart ID is required' });
  }

  const cartItem = await service.getCartById(cartId, userId);
  if (!cartItem) {
    return res.status(404).json({ message: 'Cart item not found or does not belong to user' });
  }

  const deleteResult = await service.deleteCartById(cartId, userId);
  if (deleteResult.modifiedCount === 0) {
    return res.status(400).json({
      success: false,
      message: 'Something Went Wrong In Remove Product From Cart'
    });
  }

  return res.status(200).json({
    success: true,
    message: 'Product removed from cart successfully'
  });
});

module.exports = {
  getUserCartItems,
  addToCart,
  updateCart,
  remove,
};
