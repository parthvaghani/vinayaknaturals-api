const catchAsync = require('../utils/catchAsync');
const service = require('../services/order.service');

const getAllOrders = catchAsync(async (req, res) => {
  const userRole = req.user && req.user.role;
  if (userRole !== 'admin') {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }
  const data = await service.getAllOrders(req.query);
  return res.status(200).json({ success: true, message: 'Orders fetched successfully', data });
});

const createOrder = catchAsync(async (req, res) => {
  const userId = req.user && req.user._id;
  const phoneNumber = req.user && req.user.phoneNumber;
  const created = await service.createOrderFromCart({ userId, addressId: req.params.id, phoneNumber });
  return res.status(201).json({ success: true, message: 'Order placed successfully', data: created });
});

const getMyOrders = catchAsync(async (req, res) => {
  const userId = req.user && req.user._id;
  const userRole = req.user && req.user.role;
  const results = await service.getOrdersByUser(userId, userRole);
  return res.status(200).json({ success: true, message: 'Orders fetched successfully', data: results });
});

const getOrderById = catchAsync(async (req, res) => {
  const userId = req.user && req.user._id;
  const order = await service.getOrderById(req.params.id, userId, req.user.role);
  if (!order) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }
  return res.status(200).json({ success: true, message: 'Order fetched successfully', data: order });
});

const cancelOrder = catchAsync(async (req, res) => {
  const userId = req.user && req.user._id;
  if (req.user.role !== 'admin' && !userId.toString()) {
    return res.status(403).json({ success: false, message: 'Forbidden: user mismatch' });
  }
  const updated = await service.cancelOrder(req.params.id, userId, req.body.reason, req.user.role);
  if (!updated) {
    return res.status(404).json({ success: false, message: 'Order not found or not authorized' });
  }
  return res.status(200).json({ success: true, message: 'Order canceled successfully', data: updated });
});

const updateStatus = catchAsync(async (req, res) => {
  const { status, note } = req.body;
  const updated = await service.updateOrderStatus(req.params.id, status, note, req.user.role);
  return res.status(200).json({ success: true, message: 'Order status updated successfully', data: updated });
});

module.exports = {
  getAllOrders,
  createOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
  updateStatus,
};

