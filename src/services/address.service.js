const Address = require('../models/address.model');

const createAddress = async (data) => {
  return Address.create(data);
};

const getAddressesByUser = async (userId) => {
  const results = await Address.find({ userId: userId }).populate({ path: 'userId', select: 'phoneNumber' });
  return results;
};

const getAddressById = async (id, userId) => {
  return Address.findOne({ _id: id, userId });
};

const updateAddress = async (id, userId, data, role) => {
  const filter = role === 'admin' ? { _id: id } : { _id: id, userId };
  return Address.findOneAndUpdate(filter, data, { new: true });
};

const deleteAddress = async (id, userId, role) => {
  const filter = role === 'admin' ? { _id: id } : { _id: id, userId };
  const result = await Address.findOneAndDelete(filter);
  return !!result;
};

module.exports = {
  createAddress,
  getAddressesByUser,
  getAddressById,
  updateAddress,
  deleteAddress,
};

