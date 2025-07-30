const { Topup, Transaction } = require('../models');

const getTopupByUserId = async (userId) => {
  const topup = await Topup.find({ userId });
  return topup;
};

const getWithdrawByUserId = async (userId) => {
  const withdraw = await Transaction.find({ userId });
  return withdraw;
};

function calculateGrowth(data) {
  const now = new Date();
  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setMonth(now.getMonth() - 6);
  const threeMonthsAgo = new Date(now);
  threeMonthsAgo.setMonth(now.getMonth() - 3);

  let first3MonthAmount = 0;
  let second3MonthAmount = 0;
  let totalAmount = 0;

  data.forEach((item) => {
    if (item.status !== 'approved' && item.status !== 'SUCCESS') return;
    const createdAt = new Date(item.createdAt);
    const amount = typeof item.amount === 'number' ? item.amount : 0;

    if (createdAt >= sixMonthsAgo && createdAt < threeMonthsAgo) {
      first3MonthAmount += amount;
    } else if (createdAt >= threeMonthsAgo && createdAt <= now) {
      second3MonthAmount += amount;
    }
    totalAmount += amount;
  });

  const growth =
      first3MonthAmount === 0 ? second3MonthAmount > 0 ? 100 : 0 : ((second3MonthAmount - first3MonthAmount) / first3MonthAmount) * 100;

  return {
    first3MonthAmount,
    second3MonthAmount,
    growth: parseFloat(growth.toFixed(2)),
    totalAmount,
  };
}


module.exports = {
  getTopupByUserId,
  calculateGrowth,
  getWithdrawByUserId
};