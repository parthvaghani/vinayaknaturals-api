const httpStatus = require('http-status');
const { Document, User } = require('../models');
const ApiError = require('../utils/ApiError');
const { VERIFICATION_STATUS, DOCUMENT_TYPE, FILE_TYPE } = require('../utils/constants');
const { userService } = require('.');

/**
 * Submit a new KYC request
 * @param {ObjectId} userId
 * @param {string} documentNumber
 * @param {Buffer|string} frontImage
 * @param {Buffer|string} backImage
 * @returns {Promise<Document>}
 */
const submitKycRequest = async (userId, documentNumber, frontImage, backImage) => {
  const existingKyc = await Document.findOne({
    userId,
    documentType: DOCUMENT_TYPE.AADHAAR,
    status: { $in: [VERIFICATION_STATUS.IN_REVIEW, VERIFICATION_STATUS.APPROVED] },
  });

  if (existingKyc) {
    if (existingKyc.status === VERIFICATION_STATUS.APPROVED) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Your KYC is already approved');
    } else {
      throw new ApiError(httpStatus.BAD_REQUEST, 'You already have a pending KYC request');
    }
  }

  const frontUrl = await userService.uploadProfileImageS3(userId, frontImage, 'kyc');

  if (!frontUrl) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to upload front image');
  }

  const backUrl = await userService.uploadProfileImageS3(userId, backImage, 'kyc');

  if (!backUrl) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to upload back image');
  }

  const document = await Document.create({
    userId,
    documentType: DOCUMENT_TYPE.AADHAAR,
    documentNumber,
    files: [
      {
        fileType: FILE_TYPE.FRONT,
        fileUrl: frontUrl,
      },
      {
        fileType: FILE_TYPE.BACK,
        fileUrl: backUrl,
      },
    ],
    status: VERIFICATION_STATUS.IN_REVIEW,
  });

  await User.updateOne({ _id: userId }, { $set: { kycVerificationStatus: VERIFICATION_STATUS.IN_REVIEW } });

  return document;
};

/**
 * Get all KYC requests
 * @param {Object} filter - MongoDB filter
 * @param {Object} options - Query options
 * @param {string} searchQuery - Search query for user fields and document fields
 * @returns {Promise<QueryResult>}
 */
const getKycRequests = async (filter, options, searchQuery) => {
  options.populate = 'userId';
  const documents = await Document.kycPaginate(filter, options, searchQuery);
  return documents;
};

/**
 * Get KYC status for a user
 * @param {ObjectId} userId
 * @returns {Promise<Document>}
 */
const getKycStatusByUserId = async (userId) => {
  const document = await Document.findOne({ userId, documentType: DOCUMENT_TYPE.AADHAAR })
    .populate('userId')
    .sort({ createdAt: -1 });
  return document;
};

/**
 * Update KYC status
 * @param {ObjectId} documentId
 * @param {string} status
 * @param {string} [remarks]
 * @param {ObjectId} adminId
 * @returns {Promise<Document>}
 */
const updateKycStatus = async (documentId, status, remarks, adminId) => {
  const document = await Document.findById(documentId);
  if (!document) {
    throw new ApiError(httpStatus.NOT_FOUND, 'KYC document not found');
  }

  document.status = status;
  document.remarks = remarks;
  document.verifiedBy = adminId;
  document.verifiedAt = new Date();
  await document.save();

  if (status === VERIFICATION_STATUS.APPROVED) {
    await User.updateOne({ _id: document.userId }, { $set: { kycVerificationStatus: VERIFICATION_STATUS.APPROVED } });
  } else if (status === VERIFICATION_STATUS.REJECTED) {
    await User.updateOne({ _id: document.userId }, { $set: { kycVerificationStatus: VERIFICATION_STATUS.REJECTED } });
  }

  return document;
};

module.exports = {
  submitKycRequest,
  getKycRequests,
  getKycStatusByUserId,
  updateKycStatus,
};
