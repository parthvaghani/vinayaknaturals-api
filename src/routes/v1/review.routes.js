const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const controller = require('../../controllers/review.controller');
const validation = require('../../validations/review.validation');

const router = express.Router();

// Create a review
router.post('/', auth(), validate(validation.create), controller.create);

// List reviews by product
router.get('/product-reviews/:productId', validate(validation.listByProduct), controller.listByProduct);

// List all reviews
router.get('/', validate(validation.listAll), controller.listAll);

module.exports = router;
