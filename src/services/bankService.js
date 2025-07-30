const axios = require('axios');
const config = require('../config/config');
const { faker } = require('@faker-js/faker');

const BANK_API_URL = 'https://tejafinance.com/api/v1/prod/merchant/teja-x-payouts-payments';

const bankService = {
  async makeBankPayment(paymentData) {
    try {
      const response = await axios.post(BANK_API_URL, paymentData, {
        headers: {
          'Content-Type': 'application/json',
          'access-key': config.bank.bank_access_key,
          'merchant-key': config.bank.bank_merchant_key,
          'client-id': config.bank.bank_client_id,
          'api-password': config.bank.bank_api_password,
          Authorization: `Bearer ${paymentData.bearer_token}`,
          request_id: faker.string.uuid(),
        },
      });
      return response.data;
    } catch (error) {
      throw new Error(`Bank API error: ${JSON.stringify(error.response.data || error.message || error)}`);
    }
  },
};

module.exports = bankService;
