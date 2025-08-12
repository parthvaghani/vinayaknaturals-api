const validate = require('../../middlewares/validate');
const validation = require('../../validations/testimonial.validation');
const router = require('express').Router();
const auth = require('../../middlewares/auth');
const controller = require('../../controllers/testimonial.controller');

router.post('/testimonial', auth(), validate(validation.createTestimonial), controller.create);
router.get('/testimonial', validate(validation.getTestimonials), controller.getAll);
router.get('/testimonial/:id', validate(validation.getTestimonialById), controller.getById);
router.put('/testimonial/:id', auth(), validate(validation.updateTestimonial), controller.update);
router.delete('/testimonial/:id', auth(), validate(validation.deleteTestimonial), controller.remove);

module.exports = router;