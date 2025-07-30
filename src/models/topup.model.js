const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');
const config = require('../config/config');

const topupSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'User',
      required: true,
    },
    utrNumber: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      default: 0,
    },
    screenshot: {
      type: String,
      required: true,
      get: function(v) {
        if (!v) return v;
        if (v.startsWith('http')) return v;
        return `${config.aws.baseUrl}${v}`;
      },
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    remarks: {
      type: String,
      default: '',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

topupSchema.plugin(toJSON);
topupSchema.plugin(paginate);
topupSchema.set('toJSON', { getters: true });
topupSchema.set('toObject', { getters: true });

// Add pre-hooks for find operations to add AWS base URL to screenshot
topupSchema.pre('find', function() {
  this._addAwsBaseUrl = true;
});

topupSchema.pre('findOne', function() {
  this._addAwsBaseUrl = true;
});

// Add post-hooks to transform screenshot URL in query results
topupSchema.post('find', function(docs) {
  if (this._addAwsBaseUrl && docs && docs.length) {
    docs.forEach(doc => {
      if (doc.screenshot && !doc.screenshot.startsWith('http')) {
        doc.screenshot = `${config.aws.baseUrl}${doc.screenshot}`;
      }
    });
  }
});

topupSchema.post('findOne', function(doc) {
  if (this._addAwsBaseUrl && doc && doc.screenshot && !doc.screenshot.startsWith('http')) {
    doc.screenshot = `${config.aws.baseUrl}${doc.screenshot}`;
  }
});


const Topup = mongoose.model('Topup', topupSchema);

module.exports = Topup;
