const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { kycService, excelService } = require('../services');
const ApiError = require('../utils/ApiError');
const pick = require('../utils/pick');
const { VERIFICATION_STATUS } = require('../utils/constants');
const ExcelJS = require('exceljs');

const submitKycRequest = catchAsync(async (req, res) => {
  const { documentNumber } = req.body;
  const userId = req.user.id;
  const maxSize = 3 * 1024 * 1024;

  if (!req.files || !req.files.frontImage || !req.files.backImage) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Front and back images of Aadhaar card are required');
  }

  const frontImage = req.files.frontImage[0];
  const backImage = req.files.backImage[0];

  if (frontImage.size > maxSize || backImage.size > maxSize) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'File size exceeds the limit of 3MB');
  }

  const document = await kycService.submitKycRequest(userId, documentNumber, frontImage, backImage);

  res.status(httpStatus.CREATED).send({
    success: true,
    message: 'KYC request submitted successfully and pending verification',
    data: {
      documentId: document.id,
      status: document.status,
      createdAt: document.createdAt,
    },
  });
});

const getKycRequests = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['status']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  let searchQuery = req.query.searchQuery || '';
  searchQuery = searchQuery.replace(/^\+/, '');

  const result = await kycService.getKycRequests(filter, options, searchQuery);

  if (req.query.isExport) {
    const data = await excelService.getKycRequests(result.results);
    const fileName = `kyc_requests_export_${new Date().toISOString().split('T')[0]}.xlsx`;
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('KYC Requests');

    if (data.length > 0) {
      const headers = Object.keys(data[0]);

      worksheet.addRow(headers);
      worksheet.getRow(1).font = {
        bold: true,
        size: 14
      };

      data.forEach(item => {
        const rowData = headers.map(header => item[header]);
        worksheet.addRow(rowData);
      });

      worksheet.columns.forEach(column => {
        let maxLength = 0;
        column.eachCell({ includeEmpty: true }, cell => {
          const columnLength = cell.value ? cell.value.toString().length : 10;
          if (columnLength > maxLength) {
            maxLength = columnLength;
          }
        });
        column.width = maxLength < 10 ? 10 : maxLength + 2;
      });
    }
    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    const base64Data = buffer.toString('base64');
    return res.status(200).json({
      success: true,
      data: base64Data,
      fileName: fileName,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      size: buffer.length
    });
  }

  const sanitizedResult = {
    ...result,
    results: result.results.map((doc) => {
      const user = doc.userId ? { id: doc.userId._id, businessName: doc.userId.businessName, email: doc.userId.email } : null;

      return {
        id: doc.id,
        documentType: doc.documentType,
        documentNumber: doc.documentNumber || null,
        status: doc.status,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
        user,
        files: doc.files,
      };
    }),
  };

  res.send({
    success: true,
    ...sanitizedResult,
  });
});

const getKycStatus = catchAsync(async (req, res) => {
  const userId = req.params.userId || req.user.id;

  if (req.user.role !== 'admin' && req.user.id !== userId) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You are not authorized to access this information');
  }

  const document = await kycService.getKycStatusByUserId(userId);

  if (!document) {
    return res.send({
      success: true,
      data: {
        status: VERIFICATION_STATUS.PENDING,
        remarks: 'Your verification is not complete, please submit your information.',
      },
    });
  }
  const documentDetails = {
    id: document.id,
    documentType: document.documentType,
    documentNumber: document.documentNumber || null,
    status: document.status,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
    files: document.files,
    remarks: document.remarks,
    verifiedAt: document.verifiedAt,
    user: {
      id: document.userId._id,
      businessName: document.userId.businessName,
      email: document.userId.email,
    },
  };

  res.send({
    success: true,
    data: documentDetails,
  });
});

const updateKycStatus = catchAsync(async (req, res) => {
  const { documentId } = req.params;
  const { status, remarks } = req.body;
  const adminId = req.user.id;

  const document = await kycService.updateKycStatus(documentId, status, remarks, adminId);

  res.send({
    success: true,
    message: `KYC ${status.toLowerCase()} successfully`,
    data: {
      documentId: document.id,
      status: document.status,
      updatedAt: document.updatedAt,
    },
  });
});

module.exports = {
  submitKycRequest,
  getKycRequests,
  getKycStatus,
  updateKycStatus,
};
