const httpStatus = require('http-status');
const config = require('../config/config');
const ApiError = require('../utils/ApiError');
const { default: axios } = require('axios');
const { transactionService, userService } = require('.');
const { TRANSACTION_TYPE, TransactionLogType } = require('../utils/constants');
const { getTransactionByOrderId, getTransactionByRefId } = require('./transaction.service');
const { toGenericStatus } = require('../utils/payin');
const logger = require('../config/logger');

function calculatePayinCommission(amount, commissionRate = 3) {
  const commission = (amount * commissionRate) / 100;
  const net_amount = amount - commission;
  return {
    commission,
    commission_rate: commissionRate,
    net_amount,
  };
}

async function payinAuth(clientId, clientSecret) {
  const payload = {
    client_id: clientId,
    client_secret: clientSecret,
  };
  const response = await axios.post(`${config.sme_bank.base_url_live}/api/external/auth`, payload, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
  return response.data;
}

async function createPayinOrder(
  { clientId, client_id, amount, order_id, callback_url, customer_details },
  authHeader,
  user,
) {
  const orderPayload = {
    client_id: clientId,
    amount,
    order_id,
    callback_url,
    customer_details,
  };

  // Check if order already exists using transaction model
  const existingOrder = await getTransactionByOrderId(order_id);
  if (existingOrder) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Order already exists');
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
    orderPayload.client_id = client_id;

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
        order_id,
        callback_url,
        customer_details,
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
      client_id: clientId,
    };

    let qrResponse;
    try {
      qrResponse = await axios.post(`${config.sme_bank.base_url_live}/api/external/generate-qr`, JSON.stringify(qrPayload), {
        headers: {
          Authorization: `Bearer ${authHeader}`,
          'Content-Type': 'application/json',
        },
      });
    } catch (err) {
      throw new ApiError(httpStatus.BAD_REQUEST, `Failed to generate QR: ${err.response?.data?.message || err.message}`);
    }

    if (qrResponse?.data?.ref_id) {
      // Update transaction with ref_id and response data
      const updateData = {
        requestData: {
          ...transactionData.requestData,
          ref_id: qrResponse.data.ref_id,
        },
        // responseData: {
        //   ...orderResponse.data,
        //   ...qrResponse.data,
        // },
      };

      await transactionService.updateTransaction(transaction.id, updateData);

      pollStatus(
        {
          clientId,
          slug: orderResponse?.data?.order_slug,
          ref_id: qrResponse.data.ref_id,
        },
        authHeader,
        user,
      ).catch((err) => logger.error('Polling error:', err));
    }

    return {
      message: 'Order created and QR generated successfully',
      slug: orderResponse?.data?.order_slug,
      ...qrResponse.data,
    };
  } else {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Failed to create order');
  }
}

async function checkQrStatusService({ clientId, slug, ref_id }, authHeader, user, credited) {
  let qrStatusResponse;
  try {
    qrStatusResponse = await axios.post(
      `${config.sme_bank.base_url_live}/api/external/check-qr-status`,
      { client_id: clientId, slug, ref_id },
      {
        headers: {
          Authorization: `Bearer ${authHeader}`,
          'Content-Type': 'application/json',
        },
      },
    );
  } catch (err) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Typof API error: ${err.response?.data?.message || err.message}`);
  }

  // Find transaction by ref_id using the service function
  const payinOrder = await getTransactionByRefId(ref_id);
  if (!payinOrder) {
    throw new ApiError(httpStatus.NOT_FOUND, 'No payin order found with the provided ref_id');
  }

  // Update transaction with status check response data
  if (qrStatusResponse?.data) {
    const paymentStatus = qrStatusResponse.data.payment_status;
    if (paymentStatus === 'paid' && !credited) {
      await userService.addUserBalance(user._id, payinOrder.amount, 'pgBalance');
      logger.info(`Added ${payinOrder.amount} to user ${user._id}'s pg balance`);
    }
    const convertedStatus = toGenericStatus(paymentStatus);

    const updateData = {
      status: convertedStatus,
      // responseData: {
      //   ...payinOrder.responseData,
      //   ...qrStatusResponse.data,
      // },
    };

    await transactionService.updateTransaction(payinOrder.id, updateData);
  }

  const responseData = { ...qrStatusResponse.data };
  if ('callback_url' in responseData) {
    delete responseData.callback_url;
  }

  return {
    ...responseData,
    payment_status: toGenericStatus(qrStatusResponse.data.payment_status),
    transactionId: payinOrder.id,
  };
}

async function pollStatus({ clientId, slug, ref_id }, authHeader, user) {
  const interval = 3000;
  const timeout = 10000;
  const maxAttempts = Math.ceil(timeout / interval);
  let attempts = 0;

  while (attempts < maxAttempts) {
    logger.info(`Polling attempt ${attempts + 1} of ${maxAttempts} for ref_id ${ref_id}`);
    try {
      const order = await checkQrStatusService({ clientId, slug, ref_id }, authHeader, user);
      if (order.payment_status === 'SUCCESS') {
        logger.info(`Transaction ${order.transactionId} completed`);
        return;
      }
    } catch (err) {
      logger.error('Polling error:', err);
    }
    attempts++;
    if (attempts < maxAttempts) {
      await new Promise((resolve) => {
        global.setTimeout(resolve, interval);
      });
    }
  }
  logger.info(`Transaction with ref_id ${ref_id} timed out after ${timeout / 1000} seconds`);
}

module.exports = {
  calculatePayinCommission,
  payinAuth,
  createPayinOrder,
  checkQrStatusService,
};
