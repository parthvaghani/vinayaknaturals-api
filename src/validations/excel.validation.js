const Joi = require('joi');
const { objectId } = require('./custom.validation');

const exportExcel = {
  body: Joi.object().keys({
    dataType: Joi.string().required().valid('transactions', 'topups', 'payouts', 'bulkPayments', 'bankStatements'),
    filters: Joi.object({
      startDate: Joi.date().iso(),
      endDate: Joi.date().iso().min(Joi.ref('startDate')).message('End date must be after start date'),
      status: Joi.string(),
      type: Joi.string(),
      userId: Joi.string().custom(objectId),
      bankId: Joi.string().custom(objectId),
    }).optional(),
  }),
};

const exportTransactions = {
  query: Joi.object().keys({
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).message('End date must be after start date'),
    status: Joi.string(),
    type: Joi.string(),
    userId: Joi.string().custom(objectId),
  }),
};

const exportTopups = {
  query: Joi.object().keys({
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).message('End date must be after start date'),
    status: Joi.string(),
    userId: Joi.string().custom(objectId),
  }),
};

const exportPayouts = {
  query: Joi.object().keys({
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).message('End date must be after start date'),
    status: Joi.string(),
    userId: Joi.string().custom(objectId),
  }),
};

const exportBulkPayments = {
  query: Joi.object().keys({
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).message('End date must be after start date'),
    status: Joi.string().optional(),
    userId: Joi.string().custom(objectId),
  }),
};

const exportBankStatements = {
  query: Joi.object().keys({
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).message('End date must be after start date'),
    bankId: Joi.string().custom(objectId),
  }),
};

module.exports = {
  exportExcel,
  exportTransactions,
  exportTopups,
  exportPayouts,
  exportBulkPayments,
  exportBankStatements,
};