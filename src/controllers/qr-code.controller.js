const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { qrCodeService } = require('../services');
const logger = require('../config/logger');

const generateQrCode = catchAsync(async (req, res) => {
  const { clientId } = req.smeBank;
  const clientIdHeader = req.headers['x-client-id'];
  const authHeader = req.headers['Authorization'];
  logger.info(`Client ID from header: ${clientIdHeader}`);

  // Extract required data from request body
  const { amount, order_id, callback_url } = req.body;

  // Prepare data for QR code generation
  const qrData = {
    clientId,
    client_id: req.body.client_id,
    amount,
    order_id,
    callback_url,
  };
  // Use the new QR code service
  const result = await qrCodeService.generateQrCode(qrData, authHeader, req.user);
  res.status(httpStatus.CREATED).json({
    status: true,
    message: 'QR code generated successfully',
    data: result,
  });
});

const getAllQrCode = catchAsync(async (req, res) => {
  const result = await qrCodeService.getAllQrCode(req.user._id);
  logger.info('QR codes fetched successfully');
  res.status(httpStatus.OK).json({
    status: true,
    message: 'QR code fetched successfully',
    data: result,
  });
});

const getAllQrCodeWithStatusUpdate = catchAsync(async (req, res) => {
  const authHeader = req.headers['Authorization'];
  const { clientId } = req.smeBank;
  const result = await qrCodeService.getAllQrCodeWithStatusUpdate(req.user, authHeader, clientId);
  res.status(httpStatus.OK).json({
    status: true,
    message: 'QR codes fetched and updated successfully',
    data: result,
  });
});

const getSingleQrCode = catchAsync(async (req, res) => {
  const { slug } = req.params;
  const result = await qrCodeService.getSingleQrCodeBySlug(slug);
  res.status(httpStatus.OK).json({
    status: true,
    message: 'QR code fetched successfully',
    data: result,
  });
});

const updateQrCode = catchAsync(async (req, res) => {
  const { slug } = req.params;
  const result = await qrCodeService.updateQrCode(slug, req.body.status);
  logger.info('QR code status updated successfully');
  res.status(httpStatus.OK).json({
    status: true,
    message: 'Status updated successfully',
    data: result,
  });
});

module.exports = {
  generateQrCode,
  getAllQrCode,
  getSingleQrCode,
  updateQrCode,
  getAllQrCodeWithStatusUpdate,
};
