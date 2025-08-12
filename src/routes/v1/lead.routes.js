const validate = require('../../middlewares/validate');
const validation = require('../../validations/lead.validation');
const router = require('express').Router();
const controller = require('../../controllers/lead.controller');

// Public endpoints: capture and list leads
router.post('/whatsApp-lead', validate(validation.createLead), controller.create);
router.get('/whatsApp-lead', validate(validation.getLeads), controller.getAll);
router.get('/whatsApp-lead/:id', validate(validation.getLeadById), controller.getById);

module.exports = router;

