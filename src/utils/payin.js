const httpStatus = require('http-status');
const config = require('../config/config');
const { Bank } = require('../models');
const User = require('../models/user.model');
const ApiError = require('./ApiError');
const { DEFAULT_PAYIN_BANK } = require('./constants');

/**
 * Convert status to our generic transaction status
 * @param {string} status - status
 * @returns {string} - Our generic transaction status
 */
function toGenericStatus(status) {
  switch (status?.toLowerCase()) {
    case 'paid':
    case 'completed':
    case 'approved':
    case 'success':
      return 'SUCCESS';
    case 'unpaid':
    case 'pending':
    case 'initiated':
      return 'PENDING';
    case 'failed':
    case 'cancelled':
    case 'rejected':
    case 'expired':
      return 'FAILED';
    default:
      return 'PENDING';
  }
}

async function getPayinBankEnvValue(key, type) {
  if (typeof key !== 'string' || !key.startsWith('finflex_')) {
    throw new Error('Invalid key format');
  }

  const isTest = key.startsWith('finflex_test_');
  const isLive = key.startsWith('finflex_live_');

  if (!isTest && !isLive) {
    throw new Error('Key must be either test or live');
  }

  // First validate that the user has valid keys
  const user = await User.findOne({
    $or: [
      { 'finflexKeys.test.clientId': key },
      { 'finflexKeys.test.accessKey': key },
      { 'finflexKeys.live.clientId': key },
      { 'finflexKeys.live.accessKey': key },
    ],
  }).populate('assignedPayinBank');

  if (!user) {
    throw new Error('Invalid key: No user found with this key');
  }

  if (!user.assignedPayinBank) {
    user.assignedPayinBank = await Bank.findOne({ bankKey: DEFAULT_PAYIN_BANK });
  }

  if (user.assignedPayinBank.status !== 'active') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Your assigned bank is inactive. Please contact admin.');
  }

  const envType = user.assignedPayinBank && user.assignedPayinBank.envType;
  if (envType === 'test' && isLive) {
    throw new Error('Please provide test credentials based on your assigned payin bank. Live credentials are not allowed.');
  }
  if (envType === 'live' && isTest) {
    throw new Error('Please provide live credentials based on your assigned payin bank. Test credentials are not allowed.');
  }

  const envMode = isTest ? 'test' : 'live';
  const userKeys = user.finflexKeys[envMode];

  // Verify that the user has the required keys
  if (!userKeys || !userKeys.clientId || !userKeys.accessKey) {
    throw new Error(`User is missing required ${envMode} mode keys`);
  }

  // After validation, return the corresponding SME bank credentials from config
  let value;
  if (type === 'clientId') {
    value = isTest ? config.sme_bank.client_id_test : config.sme_bank.client_id_live;
  } else if (type === 'accessKey') {
    value = isTest ? config.sme_bank.client_secret_test : config.sme_bank.client_secret_live;
  } else {
    throw new Error('Invalid type specified. Must be "clientId" or "accessKey"');
  }

  if (!value) {
    throw new Error(`Missing SME bank config value for type: ${type}, env: ${envMode}`);
  }

  return { value, user, envMode };
}

module.exports = {
  getPayinBankEnvValue,
  toGenericStatus,
};
