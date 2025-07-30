const { getPayinBankEnvValue } = require('../utils/payin');
const logger = require('../config/logger');
const httpStatus = require('http-status');
const { payinService } = require('../services');

async function finflexAuthMiddleware(req, res, next) {
  const clientId = req.headers['x-client-id'];
  const clientSecret = req.headers['x-client-secret'];

  if (!clientId || !clientSecret) {
    return res.status(400).json({
      status: false,
      message: 'x-client-id and x-client-secret headers are required',
    });
  }

  try {
    const { value: validatedClientId } = await getPayinBankEnvValue(clientId, 'clientId');
    const { value: validatedClientSecret, envMode, user: userData } = await getPayinBankEnvValue(clientId, 'accessKey');
    logger.info(`Validated client ID: ${validatedClientId}`);
    logger.info(`Validated client secret: ${validatedClientSecret}`);
    logger.info(`Environment mode: ${envMode}`);

    const response = await payinService.payinAuth(validatedClientId, validatedClientSecret);

    if (response?.access_token) {
      req.headers['Authorization'] = response.access_token;
    }

    req.smeBank = {
      clientId: validatedClientId,
      clientSecret: validatedClientSecret,
    };
    req.user = userData || { clientId: validatedClientId };

    next();
  } catch (err) {
    return res.status(401).json({ status: false, message: err.message || 'Invalid credentials' });
  }
}

async function payinAuthMiddleware(req, res, next) {
  const authHeader = req.header('Authorization');
  const clientId = req.body.client_id;

  if (req.user && req.smeBank) {
    return next();
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(httpStatus.UNAUTHORIZED).json({
      success: false,
      message: 'Please provide valid access token',
    });
  }

  if (!clientId) {
    return res.status(400).json({
      status: false,
      message: 'client_id is required in request body',
    });
  }

  try {
    const { value: validatedClientId, user: userData } = await getPayinBankEnvValue(clientId, 'clientId');
    logger.info(`Validated client ID: ${validatedClientId}`);

    req.smeBank = {
      clientId: validatedClientId,
    };
    req.user = userData || { clientId: validatedClientId };

    next();
  } catch (err) {
    return res.status(401).json({ status: false, message: err.message || 'Invalid credentials' });
  }
}

module.exports = {
  finflexAuthMiddleware,
  payinAuthMiddleware,
};
