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

const updateCart = async (_id, totalProduct, weight, weightVariant) => {
  let data;
  if (weight) {
    data = await cartModel.updateOne({_id: _id}, {weight:weight, weightVariant:weightVariant});
  }
  else {
    data = await cartModel.updateOne({_id: _id}, {totalProduct:totalProduct});
  }
  return data;
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