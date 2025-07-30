const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const payinService = require('../services/payin.service');

const payinAuth = catchAsync(async (req, res) => {
  const { clientId, clientSecret } = req.smeBank;
  const data = await payinService.payinAuth(clientId, clientSecret);
  res.status(httpStatus.OK).json({
    status: true,
    token: data.access_token,
    message: 'SME Bank authentication successful',
  });
});

const createPayinOrder = catchAsync(async (req, res) => {
  try {
    const { clientId } = req.smeBank; // sme client_id from env
    const user = req.user;
    const client_id = req.body.client_id; // finflex client_id
    const authHeader = req.headers['Authorization'];
    const result = await payinService.createPayinOrder(
      {
        clientId,
        client_id,
        amount: req.body.amount,
        order_id: req.body.order_id,
        callback_url: req.body.callback_url,
        customer_details: req.body.customer_details,
      },
      authHeader,
      user,
    );
    res.status(httpStatus.CREATED).json(result);
  } catch (error) {
    throw error;
  }
});

const checkQrStatus = catchAsync(async (req, res) => {
  const { clientId } = req.smeBank;
  const { slug, ref_id } = req.body;
  const user = req.user;
  const authHeader = req.headers['Authorization'];
  const result = await payinService.checkQrStatusService({ clientId, slug, ref_id }, authHeader, user);
  res.status(httpStatus.OK).json(result);
});

module.exports = {
  createPayinOrder,
  payinAuth,
  checkQrStatus,
};
