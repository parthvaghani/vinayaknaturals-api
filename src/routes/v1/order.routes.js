const express = require('express');
const validate = require('../../middlewares/validate');
const validation = require('../../validations/order.validation');
const controller = require('../../controllers/order.controller');
const auth = require('../../middlewares/auth');

const router = express.Router();

router.post('/:id', auth(), validate(validation.createOrder), controller.createOrder);
router.patch('/:id', auth(), validate(validation.cancelOrder), controller.cancelOrder);
router.patch('/:id/status', auth(), validate(validation.updateStatus), controller.updateStatus);
router.get('/', auth(), controller.getMyOrders);
router.get('/all', auth(), validate(validation.getAllOrders), controller.getAllOrders);
router.get('/:id', auth(), validate(validation.getOrderById), controller.getOrderById);

module.exports = router;

