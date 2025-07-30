const httpStatus = require('http-status');
const { Transaction, User, Topup} = require('../models');
const ApiError = require('../utils/ApiError');
const { TransactionLogType } = require('../utils/constants');

/**
 * Generate data array for Excel export based on data type
 * @param {string} dataType - Type of data to export (transactions, topups, payouts, bulkPayments, bankStatements)
 * @param {Object} filters - Query filters to apply
 * @param {Object} user - Current user
 * @returns {Object} - { data, fileName }
 */
const generateExcelData = async (dataType, filters, user) => {
  let data = [];
  const fileName = `${dataType}_export_${new Date().toISOString().split('T')[0]}.xlsx`;
  switch (dataType) {
    case 'transactions':
      data = await getTransactions(filters, user);
      break;
    case 'topups':
      data = await getTopups(filters, user);
      break;
    case 'payouts':
      data = await getPayouts(filters, user);
      break;
    case 'bulkPayments':
      data = await getBulkPayments(filters, user);
      break;
    case 'bankStatements':
      data = await getBankStatements(filters, user);
      break;
    default:
      throw new ApiError(httpStatus.BAD_REQUEST, `Unsupported data type: ${dataType}`);
  }

  return { data, fileName };
};

/**
 * Get transaction data for Excel export
 * @param {Object} filters - Query filters
 * @param {Object} user - Current user
 * @returns {Array} - Formatted transaction data
 */
const getTransactions = async (filters, user) => {
  const query = {};
  if (filters.transactionId) {
    query._id = filters.transactionId;
  }

  if (filters.transactionType) {
    query.transactionType = filters.transactionType;
  }
  if (filters.startDate || filters.endDate) {
    query.transactionDate = {};
    if (filters.startDate) {
      query.transactionDate.$gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      query.transactionDate.$lte = new Date(filters.endDate);
    }
  }

  if (filters.status) {
    query.status = filters.status;
  }

  query.userId = user.id;

  if (user.role !== 'admin') {
    query.userId = user.id;
  } else if (filters.userId) {
    query.userId = filters.userId;
  }
  let transactions = [];
  if (filters.limit <= 20) {
    const options = {
      page: filters.page,
      limit: filters.limit,
      sortBy: 'transactionDate:desc'
    };
    const result = await Transaction.paginate(query, options);
    transactions = await result?.results;
  } else {
    transactions = await Transaction.find(query).sort({ createdAt: -1 });
  }

  return transactions.map(transaction => {
    return {
      'Transaction ID': transaction._id.toString(),
      'Type': `${transaction.payment_mode === 'TOPUP' ? TransactionLogType.ADD_BALANCE : TransactionLogType.TRANSFER_MONEY} (${transaction.payment_mode})`,
      'Amount': transaction.amount,
      'Currency': transaction.currency,
      'Status': transaction.status,
      'Date & Time': new Date(transaction.createdAt).toLocaleString(),
    };
  });
};

const getTopups = async (filters, user) => {
  const query = {};
  if (filters.utrNumber) {
    query.utrNumber = filters.utrNumber;
  }
  if (filters.startDate || filters.endDate) {
    query.createdAt = {};
    if (filters.startDate) {
      query.createdAt.$gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      query.createdAt.$lte = new Date(filters.endDate);
    }
  }
  if (filters.utrNumber) {
    query.utrNumber = filters.utrNumber;
  }
  if (filters.status) {
    query.status = filters.status;
  }
  if (user.role !== 'admin') {
    query.userId = user.id;
  } else if (filters.userId) {
    query.userId = filters.userId;
  }
  let topups = [];

  if (filters.limit <= 20 && filters.page) {
    const options = {
      page: filters.page,
      limit: filters.limit,
    };
    const result = await Topup.paginate(query, options);
    topups = await result?.results;
  } else {
    topups = await Topup.find(query).sort({ createdAt: -1 });
  }

  const userIds = [...new Set(topups.map((topup) => topup.userId))];
  const usersBalance = await User.find({ _id: { $in: userIds } }).select('availableBalance');

  return topups.map(topup => {
    return {
      'Utr Number': topup.utrNumber,
      'Date & Time': new Date(topup.createdAt).toLocaleString(),
      'Available Balance': usersBalance.find(user => user._id.toString() === topup.userId.toString())?.availableBalance || 0,
      'Amount': topup.amount || 'N/A',
      'Currency': 'INR',
      'Status': topup.status,
      'Remarks': topup.remarks || 'N/A',
    };
  });
};

const getPayouts = async (filters, user) => {
  const query = {};
  if (filters.startDate && filters.endDate) {
    query.createdAt = {
      $gte: new Date(filters.startDate),
      $lte: new Date(filters.endDate)
    };
  }
  if (filters.status) {
    query.status = filters.status;
  }
  if (user.role !== 'admin') {
    query.userId = user.id;
  } else if (filters.userId) {
    query.userId = filters.userId;
  }
  const payouts = await Transaction.find(query).sort({ createdAt: -1 });
  return payouts.map(payout => {
    return {
      'Transaction ID': payout._id.toString(),
      'Type': payout.type,
      'Amount': payout.amount,
      'Currency': payout.currency,
      'Status': payout.status,
      'Date & Time': new Date(payout.createdAt).toLocaleString(),
    };
  });
};

const getBulkPayments = async (filters, user) => {
  const query = {};

  // Apply date range filter if provided
  if (filters.startDate && filters.endDate) {
    query.createdAt = {
      $gte: new Date(filters.startDate),
      $lte: new Date(filters.endDate)
    };
  }

  // Filter by status if provided
  if (filters.status) {
    query.status = filters.status;
  }

  // If not admin, only return user's own bulk payments
  if (user.role !== 'admin') {
    query.userId = user.id;
  } else if (filters.userId) {
    // Admin can filter by specific user
    query.userId = filters.userId;
  }

  const bulkPayments = await Transaction.find(query).sort({ createdAt: -1 });
  return bulkPayments.map(bulkPayment => {
    return {
      'Transaction ID': bulkPayment._id.toString(),
      'Type': bulkPayment.type,
      'Amount': bulkPayment.amount,
      'Currency': bulkPayment.currency,
      'Status': bulkPayment.status,
      'Date & Time': new Date(bulkPayment.createdAt).toLocaleString(),
    };
  });
};

/**
 * Get bank statement data for export
 */
const getBankStatements = async (filters, user) => {
  const query = {};

  // Apply date range filter if provided
  if (filters.startDate && filters.endDate) {
    query.date = {
      $gte: new Date(filters.startDate),
      $lte: new Date(filters.endDate)
    };
  }

  // If not admin, check if user has assigned bank
  if (user.role !== 'admin') {
    const userWithBank = await User.findById(user.id).populate('assignedBank');
    if (!userWithBank?.assignedBank) {
      throw new ApiError(httpStatus.FORBIDDEN, 'You do not have an assigned bank');
    }
    query.bankId = userWithBank.assignedBank._id;
  } else if (filters.bankId) {
    // Admin can filter by specific bank
    query.bankId = filters.bankId;
  }

  // Get bank statements - this would need to be replaced with actual implementation
  // This is just a placeholder assuming bank statements are stored somewhere
  const bankStatements = [];

  // Format the data for Excel - this is just a sample structure
  return bankStatements.map(statement => {
    return {
      'Date': statement.date,
      'Reference Number': statement.referenceNumber,
      'Description': statement.description,
      'Debit': statement.debit || 0,
      'Credit': statement.credit || 0,
      'Balance': statement.balance,
      'Bank Name': statement.bankName
    };
  });
};

const getUsers = async (filters) => {
  const query = {};
  const options = {
    limit: filters.limit,
    page: filters.page,
    limit: filters.limit,
    populate: 'assignedPayinBank,assignedPayoutBank'
  };
  const result = await User.paginate(query, options);

  return result.results.map(user => {
    return {
      'Name': user.user_details.name,
      'Email': user.email,
      'Phone': user.phoneNumber,
      'Active Status': user.isActive,
      'Role': user.role,
      'Available Balance': user.availableBalance,
      'Assigned Payin Bank': user.assignedPayinBank?.name || 'N/A',
      'Assigned Payout Bank': user.assignedPayoutBank?.name || 'N/A'
    };
  });
};

const getKycRequests = async (data) => {
  return data.map(item => {
    return {
      'Business Name': item.userId?.businessName,
      'Name': item.userId?.user_details?.name,
      'Email': item.userId?.email,
      'KYC Status': item?.status === 'IN_REVIEW' ? 'In Review' : item?.status,
      'Document Type': item.documentType,
      'Document Number': item.documentNumber,
      'Created At': new Date(item.createdAt).toLocaleString(),
    };
  });
};

const getAdminTransactions = async (filters, user) => {
  const query = {};
  if (filters.transactionId) {
    query._id = filters.transactionId;
  }

  if (filters.transactionType) {
    query.transactionType = filters.transactionType;
  }
  if (filters.startDate || filters.endDate) {
    query.transactionDate = {};
    if (filters.startDate) {
      query.transactionDate.$gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      query.transactionDate.$lte = new Date(filters.endDate);
    }
  }

  if (filters.status) {
    query.status = filters.status;
  }

  if (user.role !== 'admin') {
    query.userId = user.id;
  } else if (filters.userId) {
    query.userId = filters.userId;
  }
  let transactions = [];
  if (filters.limit <= 20) {
    const options = {
      page: filters.page,
      limit: filters.limit,
      sortBy: filters.sortBy || 'transactionDate:desc'
    };
    const result = await Transaction.paginate(query, options);
    transactions = await result?.results;
  } else {
    transactions = await Transaction.find(query).sort({ createdAt: -1 });
  }

  return transactions.map(transaction => {
    return {
      'Transaction ID': transaction._id.toString(),
      'Type': transaction.type,
      'Amount': transaction.amount,
      'Currency': transaction.currency,
      'Status': transaction.status,
      'Date & Time': new Date(transaction.createdAt).toLocaleString(),
    };
  });
};


module.exports = {
  generateExcelData,
  getTransactions,
  getTopups,
  getUsers,
  getKycRequests,
  getAdminTransactions
};

// const getTransactions = async (filters, user) => {
//   const query = {};

//   if (filters.startDate || filters.endDate) {
//     query.transactionDate = {};
//     if (filters.startDate) {
//       query.transactionDate.$gte = new Date(filters.startDate);
//     }
//     if (filters.endDate) {
//       query.transactionDate.$lte = new Date(filters.endDate);
//     }
//   }

//   query.userId = user.id;

//   if (filters.status) {
//     query.status = filters.status;
//   }

//   if (user.role !== 'admin') {
//     query.userId = user.id;
//   } else if (filters.userId) {
//     query.userId = filters.userId;
//   }
//   let transactions = [];
//   if (filters.limit <= 20 && filters.page) {
//     const options = {
//       page: parseInt(filters.page, 10),
//       limit: parseInt(filters.limit, 10),
//       sort: { createdAt: -1 }
//     };
//     const result = await Transaction.paginate(query, options);
//     transactions = await result?.results;
//   } else {
//     transactions = await Transaction.find(query).sort({ createdAt: -1 });
//   }

//   return transactions.map(transaction => {
//     return {
//       'Transaction ID': transaction._id.toString(),
//       'Type': transaction.type,
//       'Amount': transaction.amount,
//       'Currency': transaction.currency,
//       'Status': transaction.status,
//       'Date & Time': new Date(transaction.createdAt).toLocaleString(),

//       // 'User ID': transaction.userId.toString(),
//       // 'Beneficiary Name': transaction.beneficiary_name,
//       // 'Beneficiary Account Number': transaction.beneficiary_account_number,
//       // 'IFSC Code': transaction.beneficiary_ifsc_code,
//       // 'Payment Mode': transaction.payment_mode,
//       // 'Payment Ref No': transaction.paymentRefNo,
//       // 'CMP Ref No': transaction.CMPReferenceNo,
//       // 'Transaction ID (Bank)': transaction.transaction_id,
//       // 'TRX ID': transaction.trx_id,
//       // 'UTR No': transaction.utr_no,
//       // 'Fees': transaction.fees,
//       // 'Payable': transaction.payable,
//       // 'Remark': transaction.remark,
//       // 'Request Data': JSON.stringify(transaction.requestData),
//       // 'Response Data': JSON.stringify(transaction.responseData),
//     };
//   });
// };
