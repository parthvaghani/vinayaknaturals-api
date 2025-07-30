const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');

const cronAuditSchema = mongoose.Schema(
  {
    timestamp: {
      type: Number,
      require: true,
    },
  },
  { timestamps: true },
);

cronAuditSchema.plugin(toJSON);
cronAuditSchema.plugin(paginate);

const cronAudit = mongoose.model('CronAudit', cronAuditSchema);

module.exports = cronAudit;
