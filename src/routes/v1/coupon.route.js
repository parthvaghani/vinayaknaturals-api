const express = require('express');
const validate = require('../../middlewares/validate');
const validation = require('../../validations/coupon.validation');
const couponController = require('../../controllers/coupon.controller');
// const auth = require('../../middlewares/auth');

const router = express.Router();

// const validate = (schema) => (req, res, next) => {
//   const { error } = schema.validate(req.body, { abortEarly: true });
//   if (error) {
//     return res.status(400).json({
//       success: false,
//       message: error.details[0].message,
//     });
//   }
//   next();
// };

router.post('/', validate(validation.couponValidationSchema), couponController.createCoupon);
router.get('/', couponController.getCoupons);
router.get('/:id', couponController.getCoupon);
router.put('/:id', validate(validation.couponValidationSchema), couponController.updateCoupon);
router.delete('/:id', couponController.deleteCoupon);
router.post('/apply', couponController.applyCoupon);
router.post('/user-coupons', couponController.getUserCoupons);

module.exports = router;