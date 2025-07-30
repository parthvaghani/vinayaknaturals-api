const httpStatus = require('http-status');
const { QrCode, User } = require('../models');
const ApiError = require('../utils/ApiError');
const { getTransactionByOrderId } = require('./transaction.service');
const axios = require('axios');
const config = require('../config/config');
const { transactionService } = require('.');
const { TRANSACTION_TYPE, TransactionLogType } = require('../utils/constants');
const { checkQrStatusService } = require('./payin.service');
const logger = require('../config/logger');

/**
 * Generate QR code for payment
 * @param {Object} qrData
 * @param {string} qrData.clientSecret
 * @param {string} qrData.clientId
 * @param {string} qrData.client_id
 * @param {number} qrData.amount
 * @param {string} qrData.order_id
 * @param {string} qrData.callback_url
 * @param {Object} qrData.customer_details
 * @param {Object} user - User object
 * @param {Object} req - Express request object
 * @returns {Promise<Object>} QR code data
 */
const generateQrCode = async (qrData, authHeader, user) => {
  const customerDetails = {
    name: user.user_details.name,
    email: user.email,
    phone: user.phoneNumber,
  };
  try {
    const orderPayload = {
      client_id: qrData.clientId,
      amount: qrData.amount,
      order_id: qrData.order_id,
      callback_url: qrData.callback_url,
      customer_details: customerDetails,
    };

    // Check if order already exists using transaction model
    const existingOrder = await getTransactionByOrderId(qrData.order_id);
    if (existingOrder) {
      throw new ApiError('Order already exists');
    }

    let orderResponse;
    try {
      orderResponse = await axios.post(
        `${config.sme_bank.base_url_live}/api/external/create-order`,
        JSON.stringify(orderPayload),
        {
          headers: {
            Authorization: `Bearer ${authHeader}`,
            'Content-Type': 'application/json',
          },
        },
      );
    } catch (err) {
      throw new ApiError(httpStatus.BAD_REQUEST, `Failed to create order: ${err.response?.data?.message || err.message}`);
    }

    if (orderResponse?.data?.order_slug) {
      orderPayload.slug = orderResponse?.data?.order_slug;
      orderPayload.client_id = qrData.client_id;

      // Create transaction record with payin data
      const transactionData = {
        userId: user._id,
        status: 'PENDING',
        amount: orderPayload.amount,
        payment_mode: 'IMPS',
        transactionType: TRANSACTION_TYPE.PAY_IN_API,
        type: TransactionLogType.TRANSFER_MONEY,
        requestData: {
          ...orderPayload,
          order_id: qrData.order_id,
          callback_url: qrData.callback_url,
          customer_details: qrData.customer_details,
          slug: orderPayload.slug,
        },
        currency: 'INR',
        transactionDate: new Date(),
        remark: 'Payin',
      };

      // Create transaction record
      const transaction = await transactionService.createTransaction(transactionData);

      const qrPayload = {
        slug: orderResponse?.data.order_slug,
        client_id: qrData.clientId,
      };

      let qrResponse;
      try {
        qrResponse = await axios.post(
          `${config.sme_bank.base_url_live}/api/external/generate-qr`,
          JSON.stringify(qrPayload),
          {
            headers: {
              Authorization: `Bearer ${authHeader}`,
              'Content-Type': 'application/json',
            },
          },
        );
      } catch (err) {
        throw new ApiError(httpStatus.BAD_REQUEST, `Failed to generate QR: ${err.response?.data?.message || err.message}`);
      }

      if (qrResponse?.data?.ref_id) {
        // Update transaction with ref_id and response data
        const updateData = {
          requestData: {
            ...orderPayload,
            ref_id: qrResponse.data.ref_id,
          },
          responseData: {
            ...orderResponse.data,
            ...qrResponse.data,
          },
        };

        await transactionService.updateTransaction(transaction.id, updateData);
      }

      await QrCode.create({
        slug: orderResponse?.data?.order_slug,
        referralId: qrResponse.data.ref_id,
        orderId: qrData.order_id,
        qrCode: qrResponse.data.qrcode,
        amount: qrData.amount,
        createdBy: user._id,
      });

      return {
        slug: orderResponse?.data?.order_slug,
        referralId: qrResponse.data.ref_id,
        orderId: qrData.order_id,
        qrCode: qrResponse.data.qrcode,
        amount: qrData.amount,
        createdBy: user._id,
      };
    } else {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Failed to create order');
    }
  } catch (error) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, error.statusCode);
  }
};

/**
 * Get all QR codes for a user
 * @param {Object} userId - string
 * @returns {Promise<Array>} List of QR codes
 */
const getAllQrCode = async (userId) => {
  try {
    const qrCodes = await QrCode.find({ createdBy: userId }).sort({ createdAt: -1 });
    return qrCodes;
  } catch (error) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, error.statusCode);
  }
};

/**
 * Get all QR codes for a user and update status if needed
 * @param {Object} user - user object
 * @param {string} authHeader - authorization header
 * @param {string} clientId - client id
 * @returns {Promise<Array>} List of QR codes (with updated statuses)
 */
const getAllQrCodeWithStatusUpdate = async (user, authHeader, clientId) => {
  try {
    const qrCodes = await QrCode.find({ createdBy: user._id }).sort({ createdAt: -1 });
    const updatedQrCodes = await Promise.all(
      qrCodes.map(async (qr) => {
        if (qr.status === 'unpaid') {
          try {
            const statusResult = await checkQrStatusService(
              {
                clientId,
                slug: qr.slug,
                ref_id: qr.referralId,
              },
              authHeader,
              user,
              qr.credited
            );

            if (statusResult.payment_status === 'SUCCESS') {
              qr.credited = true;
              qr.status = 'paid';
              await qr.save();
              const existingTransaction = await getTransactionByOrderId(qr.orderId);
              if (existingTransaction) {
                await transactionService.updateTransaction(existingTransaction._id, {
                  status: 'SUCCESS',
                  remark: 'QR payment marked as paid',
                  transactionDate: new Date(),
                });
              }
            }
          } catch (err) {
            logger.error(`Error checking QR status for ${qr.slug}: ${err.message}`);
          }
        }
        return qr;
      }),
    );
    return updatedQrCodes;
  } catch (error) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, error.statusCode || error.message);
  }
};

/**
 * Get a single QR code by slug
 * @param {string} slug - QR code slug
 * @returns {Promise<Object>} QR code data
 */
const getSingleQrCodeBySlug = async (slug) => {
  try {
    const qrCode = await QrCode.findOne({ slug })
      .select('-credited -orderId -referralId -status -updatedAt -createdAt')
      .populate('createdBy', 'businessName -_id');
    if (!qrCode) {
      throw new ApiError(httpStatus.NOT_FOUND, 'QR code not found');
    }
    return qrCode;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, error.message);
  }
};

const updateQrCode = async (slug, status) => {
  try {
    const qrCode = await QrCode.findOneAndUpdate({ slug }, { status });
    if (!qrCode) {
      throw new ApiError(httpStatus.NOT_FOUND, 'QR code not found');
    }
    // const transactionData = {
    //   userId: user._id,
    //   status: 'SUCCESS',
    //   amount: qrCode.amount,
    //   payment_mode: 'IMPS',
    //   transactionType: TRANSACTION_TYPE.PAY_IN_API,
    //   type: TransactionLogType.TRANSFER_MONEY,
    //   requestData: {
    //     ...qrCode,
    //     order_id: qrCode.orderId,
    //     callback_url: qrCode.callback_url,
    //     customer_details: qrCode.customer_details,
    //     slug: qrCode.slug,
    //   },
    //   currency: 'INR',
    //   transactionDate: new Date(),
    //   remark: 'Payin',
    // };

    // // Create transaction record
    // const transaction = await transactionService.createTransaction(transactionData);

    return qrCode;
  } catch (error) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, error.message);
  }
};

module.exports = {
  generateQrCode,
  getAllQrCode,
  getSingleQrCodeBySlug,
  updateQrCode,
  getAllQrCodeWithStatusUpdate,
};
