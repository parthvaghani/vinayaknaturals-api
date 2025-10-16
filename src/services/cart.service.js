const { response } = require('express');
const cartModel = require('../models/cart.model');

const getUserCart = async (userId) => {
  const getData = await cartModel
    .find({ userId: userId, isOrdered: false })
    .populate({
      path: 'productId',
      populate: { path: 'category' },
    });
  return getData;
};

const addToCart = async (payload) => {
  const saveData = await cartModel.create(payload);
  return saveData;
};

const getCartByDetails = async (payload) => {
  const { userId, productId, weight } = payload;
  const cartItem = await cartModel.findOne({
    userId: userId,
    productId: productId,
    weight: weight,
    isOrdered: false,
  });
  return cartItem;
};
const updateCart = async (_id, updateData) => {
  try {
    return await cartModel.findByIdAndUpdate(_id, { $set: updateData }, { new: true, runValidators: true });
  } catch (error) {
    response.error('Error updating cart:', error.message);
    return null;
  }
};

const getCartById = async (cartId, userId) => {
  const data = await cartModel.findOne({ _id: cartId, userId });
  return data;
};

const deleteCartById = async (cartId, userId) => {
  return await cartModel.findOneAndDelete({ _id: cartId, userId });
};

// payload is expected to be an array of cart items, plus userId at top level
// Example payload:
// {
//   userId: "123...",
//   items: [
//     { productId, totalProduct, weight, weightVariant }, ...
//   ]
// }

const deleteUserAllCartItems = async (userId) => {
  return await cartModel.deleteMany({ userId, isOrdered: false });
};

const deleteUserCartItems = async (userId) => {
  return await cartModel.deleteOne({ userId, isOrdered: false });
};

const addItemsToCart = async (userId, insertData) => {

  await deleteUserAllCartItems(userId);

  // Map cart items, ensure each item includes userId
  const itemsToInsert = (insertData || []).map(item => ({
    ...item,
    userId,
    isOrdered: false, // keep it consistently false for new cart items
  }));

  // Insert the provided items in bulk
  const newCartItems = await cartModel.insertMany(itemsToInsert);

  return newCartItems;
};

module.exports = {
  getUserCart,
  addToCart,
  getCartByDetails,
  updateCart,
  getCartById,
  deleteCartById,
  deleteUserCartItems,
  addItemsToCart
};
