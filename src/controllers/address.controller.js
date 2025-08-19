const catchAsync = require('../utils/catchAsync');
const service = require('../services/address.service');

const createAddress = catchAsync(async (req, res) => {
  const userId = req.user && req.user._id;
  const payload = { ...req.body, userId };
  // If the new address is to be set as default, ensure only one default per user
  const getUserAddress = await service.getAddressesByUser(userId);
  if (req.body.isDefault === true && Array.isArray(getUserAddress)) {
    // Find if any address is currently default
    const defaultAddress = getUserAddress.find(addr => addr.isDefault === true);
    if (defaultAddress) {
      // Unset isDefault for all other addresses of this user
      await Promise.all(
        getUserAddress
          .filter(addr => addr.isDefault === true)
          .map(addr => service.updateAddress(addr._id, userId, { isDefault: false }, req.user.role))
      );
    }
  }
  const created = await service.createAddress(payload);
  return res.status(201).json({ success: true, message: 'Address created successfully', data: created });
});

const getMyAddresses = catchAsync(async (req, res) => {
  const userId = req.user && req.user._id;
  const result = await service.getAddressesByUser(userId, req.query);
  return res.status(200).json({ success: true, message: 'Addresses fetched successfully', data: result });
});

const updateAddress = catchAsync(async (req, res) => {
  const userId = req.user && req.user._id;
  // If the current request wants to set this address as default,
  // unset isDefault for all other addresses of this user
  if (req.body.isDefault === true) {
    const userAddresses = await service.getAddressesByUser(userId);
    if (Array.isArray(userAddresses)) {
      // Unset isDefault for all other addresses except the one being updated
      await Promise.all(
        userAddresses
          .filter(addr => addr.isDefault === true && addr._id.toString() !== req.params.id)
          .map(addr => service.updateAddress(addr._id, userId, { isDefault: false }, req.user.role))
      );
    }
  }
  const updated = await service.updateAddress(req.params.id, userId, req.body, req.user.role);
  if (!updated) {
    return res.status(404).json({ success: false, message: 'Address not found' });
  }
  return res.status(200).json({ success: true, message: 'Address updated successfully', data: updated });
//   return res.status(200).json({ success: true, message: 'Address updated successfully' });
});

const deleteAddress = catchAsync(async (req, res) => {
  const userId = req.user && req.user._id;
  const getUserAddress = await service.getAddressById(req.params.id, userId);
  if (getUserAddress && getUserAddress.isDefault === true) {
    return res.status(400).json({
      success: false,
      message: 'Cannot delete default address. Please transfer default status to another address before deleting.'
    });
  }
  const deleted = await service.deleteAddress(req.params.id, userId, req.user.role);
  if (!deleted) {
    return res.status(404).json({ success: false, message: 'Address not found' });
  }
  return res.status(200).json({ success: true, message: 'Address deleted successfully' });
});

module.exports = {
  createAddress,
  getMyAddresses,
  updateAddress,
  deleteAddress,
};

