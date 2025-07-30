const DEFAULT_PAYOUT_BANK = 'TEJA';
const DEFAULT_PAYIN_BANK = 'SMEP';
/**
 * Enum for commission types
 * @readonly
 * @enum {string}
 */
const COMMISSION_TYPE = Object.freeze({
  PAYIN: 'payin',
  PAYOUT: 'payout',
});

/**
 * Enum for charge types
 * @readonly
 * @enum {string}
 */
const CHARGE_TYPE = Object.freeze({
  PERCENTAGE: 'percentage',
  FIXED: 'fixed',
});

/**
 * Enum for KYC verification status
 * @readonly
 * @enum {string}
 */
const VERIFICATION_STATUS = Object.freeze({
  IN_REVIEW: 'IN_REVIEW',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  PENDING: 'PENDING',
});

/**
 * Enum for document types
 * @readonly
 * @enum {string}
 */
const DOCUMENT_TYPE = Object.freeze({
  AADHAAR: 'AADHAAR',
  PAN: 'PAN',
  PASSPORT: 'PASSPORT',
  DRIVING_LICENSE: 'DRIVING_LICENSE',
  OTHER: 'OTHER',
});

/**
 * Enum for document file types
 * @readonly
 * @enum {string}
 */
const FILE_TYPE = Object.freeze({
  FRONT: 'FRONT',
  BACK: 'BACK',
  OTHER: 'OTHER',
});

/**
 * Enum for payout types
 * @readonly
 * @enum {string}
 */
const TRANSACTION_TYPE = Object.freeze({
  PAYOUT: 'PAYOUT',
  BULK_PAYOUT: 'BULK_PAYOUT',
  PAY_IN_API: 'PAY_IN_API',
  PAY_IN: 'PAY_IN',
});

/**
 * Enum for ticket precedence
 * @readonly
 * @enum {string}
 */
const TICKET_PRECEDENCE = Object.freeze({
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
});

/**
 * Enum for ticket status
 * @readonly
 * @enum {string}
 */
const TICKET_STATUS = Object.freeze({
  OPEN: 'open',
  CLOSED: 'closed',
});

/**
 * Enum for transaction log type
 * @readonly
 * @enum {string}
 */
const TransactionLogType = Object.freeze({
  ADD_BALANCE: 'ADD-BALANCE',
  ADD_SUBTRACT_BALANCE: 'ADD-SUBTRACT-BALANCE',
  TRANSFER_MONEY: 'TRANSFER-MONEY',
});

/**
 * Enum for bank environment types
 * @readonly
 * @enum {string}
 */
const BANK_ENV_TYPE = Object.freeze({
  TEST: 'test',
  LIVE: 'live',
  BOTH: 'both',
});

module.exports = {
  COMMISSION_TYPE,
  CHARGE_TYPE,
  VERIFICATION_STATUS,
  DOCUMENT_TYPE,
  FILE_TYPE,
  TRANSACTION_TYPE,
  TICKET_PRECEDENCE,
  TICKET_STATUS,
  TransactionLogType,
  BANK_ENV_TYPE,
  DEFAULT_PAYOUT_BANK,
  DEFAULT_PAYIN_BANK
};
