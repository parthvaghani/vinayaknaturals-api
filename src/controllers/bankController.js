const bankService = require('../services/bankService');

const bankController = {
  async makePayment(req, res) {
    try {
      const paymentData = req.body;
      const result = await bankService.makeBankPayment(paymentData);
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
};

module.exports = bankController;
