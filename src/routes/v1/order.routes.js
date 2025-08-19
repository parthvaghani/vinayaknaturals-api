const express = require('express');
const validate = require('../../middlewares/validate');
const validation = require('../../validations/order.validation');
const controller = require('../../controllers/order.controller');
const auth = require('../../middlewares/auth');

const router = express.Router();

router.get('/', auth(), controller.getMyOrders);
router.get('/all', auth(), validate(validation.getAllOrders), controller.getAllOrders);
router.post('/:id', auth(), validate(validation.createOrder), controller.createOrder);
router.get('/:id', auth(), validate(validation.getOrderById), controller.getOrderById);
router.patch('/:id', auth(), validate(validation.cancelOrder), controller.cancelOrder);

module.exports = router;

