const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');

const bulkProcessingSchema = mongoose.Schema(
  {
    userId: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'User',
      required: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    fileUrl: {
      type: String,
      required: true,
    },
    totalRecords: {
      type: Number,
      required: true,
    },
    processedRecords: {
      type: Number,
      default: 0,
    },
    successfulRecords: {
      type: Number,
      default: 0,
    },
    failedRecords: {
      type: Number,
      default: 0,
    },
    batchSize: {
      type: Number,
      default: 10,
    },
    status: {
      type: String,
      enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'],
      default: 'PENDING',
    },
    errors: [
      {
        row: Number,
        message: String,
        data: Object,
      },
    ],
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

// Add plugins
bulkProcessingSchema.plugin(toJSON);
bulkProcessingSchema.plugin(paginate);

/**
 * @typedef BulkProcessing
 */
const BulkProcessing = mongoose.model('BulkProcessing', bulkProcessingSchema);

module.exports = BulkProcessing;
