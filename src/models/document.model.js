const mongoose = require('mongoose');
const { toJSON, kycPaginate } = require('./plugins');
const { DOCUMENT_TYPE, FILE_TYPE, VERIFICATION_STATUS } = require('../utils/constants');
const config = require('../config/config');

const documentSchema = mongoose.Schema(
  {
    userId: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'User',
      required: true,
    },
    documentType: {
      type: String,
      enum: Object.values(DOCUMENT_TYPE),
      required: true,
    },
    documentNumber: {
      type: String,
      required: true,
      trim: true,
    },
    files: [
      {
        fileType: {
          type: String,
          enum: Object.values(FILE_TYPE),
          required: true,
        },
        fileUrl: {
          type: String,
          required: true,
        },
      },
    ],
    status: {
      type: String,
      enum: Object.values(VERIFICATION_STATUS),
      default: VERIFICATION_STATUS.PENDING,
    },
    remarks: {
      type: String,
      trim: true,
    },
    verifiedBy: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'User',
    },
    verifiedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

documentSchema.plugin(toJSON);
documentSchema.plugin(kycPaginate);

documentSchema.pre('find', function () {
  this._addAwsBaseUrl = true;
});

documentSchema.pre('findOne', function () {
  this._addAwsBaseUrl = true;
});

documentSchema.post('find', function (docs) {
  if (this._addAwsBaseUrl) {
    if (docs && docs.length) {
      docs.forEach((doc) => {
        if (doc.files && doc.files.length) {
          doc.files.forEach((file) => {
            if (!file.fileUrl.startsWith('http')) {
              file.fileUrl = `${config.aws.baseUrl}${file.fileUrl}`;
            }
          });
        }
      });
    }
  }
});

documentSchema.post('findOne', function (doc) {
  if (this._addAwsBaseUrl && doc) {
    if (doc.files && doc.files.length) {
      doc.files.forEach((file) => {
        if (!file.fileUrl.startsWith('http')) {
          file.fileUrl = `${config.aws.baseUrl}${file.fileUrl}`;
        }
      });
    }
  }
});

/**
 * @typedef Document
 */
const Document = mongoose.model('Document', documentSchema);

module.exports = Document;
