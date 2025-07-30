const { transactionService, payinService } = require('.');
const { CronAudit } = require('../models');
const logger = require('../config/logger');
const { getPayinBankEnvValue } = require('../utils/payin');

async function validateTransactions(userId) {
  try {
    let pendingTxns;
    if (userId) {
      pendingTxns = await transactionService.getPendingPayinApiTransactions(userId);
      logger.info(`[validateTransactions] Found ${pendingTxns.length} pending PAY_IN_API transactions for userId: ${userId}`);
    } else {
      pendingTxns = await transactionService.getPendingPayinApiTransactions();
      logger.info(`[validateTransactions] Found ${pendingTxns.length} pending PAY_IN_API transactions (no userId provided)`);
    }
    let processed = 0;
    await Promise.all(pendingTxns.map(async (txn) => {
      try {
        const { client_id, slug, ref_id } = txn.requestData || {};
        if (!client_id || !slug || !ref_id) {
          logger.warn(`[validateTransactions] Missing client_id/slug/ref_id for transaction ${txn._id}`);
          return;
        }
        const { value: clientId } = await getPayinBankEnvValue(client_id, 'clientId');
        const { value: clientSecret, user } = await getPayinBankEnvValue(client_id, 'accessKey');
        if (!user) {
          logger.warn(`[validateTransactions] No user found for client_id ${client_id}, transaction ${txn._id}`);
          return;
        }
        const authResp = await payinService.payinAuth(clientId, clientSecret);
        const authHeader = authResp.access_token;
        if (!authHeader) {
          logger.warn(`[validateTransactions] No auth token for user ${user._id}, transaction ${txn._id}`);
          return;
        }
        logger.info(`[validateTransactions] Processing transaction ${txn._id}`);
        await payinService.checkQrStatusService({ clientId, slug, ref_id }, authHeader, user);
        processed++;
      } catch (err) {
        logger.error(`[validateTransactions] Error processing transaction ${txn._id}: ${err.message}`);
      }
    }));
    logger.info(`[validateTransactions] Completed run. Processed: ${processed}, Total: ${pendingTxns.length}`);
  } catch (err) {
    logger.error(`[validateTransactions] Cron job failed: ${err.message}`);
  }
}

async function lambdaHandler(event, context) {
  logger.info('lambdaHandler', event, context);
  await validateTransactions();
  await CronAudit.create({ timestamp: Date.now() });
  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Validation transaction cron executed' }),
  };
}

module.exports = {
  validateTransactions,
  lambdaHandler,
};