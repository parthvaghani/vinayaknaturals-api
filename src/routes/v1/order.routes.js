const express = require('express');
const validate = require('../../middlewares/validate');
const validation = require('../../validations/order.validation');
const controller = require('../../controllers/order.controller');
const auth = require('../../middlewares/auth');

const router = express.Router();

router.post('/pos', auth(), validate(validation.createPosOrder), controller.createPosOrder);
router.post('/:id', auth(), validate(validation.createOrder), controller.createOrder);
router.patch('/:id', auth(), validate(validation.cancelOrder), controller.cancelOrder);
router.patch('/:id/status', auth(), validate(validation.updateStatus), controller.updateStatus);
router.put('/:id', auth(), validate(validation.updateOrder), controller.updateOrder);
router.get('/', auth(), controller.getMyOrders);
router.get('/all', auth(), validate(validation.getAllOrders), controller.getAllOrders);
router.get('/:id/invoice', auth(), validate(validation.downloadInvoice), controller.downloadInvoice);
router.get('/:id', auth(), validate(validation.getOrderById), controller.getOrderById);

module.exports = router;
