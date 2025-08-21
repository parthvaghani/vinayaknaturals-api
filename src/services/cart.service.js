const { response } = require('express');
const cartModel = require('../models/cart.model');


const getUserCart = async (userId) => {
  const getData = await cartModel.find({ userId: userId, isOrdered: false }).populate('productId');
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
    isOrdered:false
  });
  return cartItem;
};
const updateCart = async (_id, updateData) => {
  try {
    return await cartModel.findByIdAndUpdate(
      _id,
      { $set: updateData },
      { new: true, runValidators: true }
    );
  } catch (error) {
    response.error('Error updating cart:', error.message);
    return null;
  }
};

const getCartById = async (cartId, userId) => {
  const data = await cartModel.findOne({_id: cartId, userId});
  return data;
};


const deleteCartById = async (cartId, userId) => {
  return await cartModel.findOneAndDelete({ _id: cartId, userId });
};


module.exports = {
  getUserCart,
  addToCart,
  getCartByDetails,
  updateCart,
  getCartById,
  deleteCartById
};