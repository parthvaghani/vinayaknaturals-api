const validate = require('../../middlewares/validate');
const validation = require('../../validations/suggestedProduct.validation');
const router = require('express').Router();
const auth = require('../../middlewares/auth');
const controller = require('../../controllers/suggestedProduct.controller');

// Public can create suggestions; admins manage them
router.post('/suggested', validate(validation.createSuggestedProduct), controller.create);
router.get('/suggested', validate(validation.getSuggestedProducts), controller.getAll);
router.get('/suggested/:id', validate(validation.getSuggestedProductById), controller.getById);
router.put('/suggested/:id', auth(), validate(validation.updateSuggestedProduct), controller.update);
router.delete('/suggested/:id', auth(), validate(validation.deleteSuggestedProduct), controller.remove);

module.exports = router;

