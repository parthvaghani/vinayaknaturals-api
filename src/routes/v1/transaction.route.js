const express = require('express');
const validate = require('../../middlewares/validate');
const transactionController = require('../../controllers/transaction.controller');
const transactionValidation = require('../../validations/transaction.validation');
const auth = require('../../middlewares/auth');

const router = express.Router();

router.use(auth());

router.get('/', validate(transactionValidation.getUserTransactions), transactionController.getUserTransactions);

router.get('/:transactionId', validate(transactionValidation.getTransactionById), transactionController.getTransactionById);

router.get('/admin/all', auth('getAllTransactions'), validate(transactionValidation.getAllTransactions), transactionController.getAllTransactions);

router.get('/validate/pending', transactionController.validateTransactions);

module.exports = router;

/**
 * @swagger
 * tags:
 *   name: Transactions
 *   description: Transaction management and retrieval
 */

/**
 * @swagger
 * /transactions:
 *   get:
 *     summary: Get user's transactions
 *     description: Logged in users can retrieve their own transactions.
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, SUCCESS, FAILED, CANCELLED]
 *         description: Filter by transaction status
 *       - in: query
 *         name: payment_mode
 *         schema:
 *           type: string
 *           enum: [IMPS, NEFT, RTGS]
 *         description: Filter by payment mode
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter by transaction type
 *       - in: query
 *         name: transactionType
 *         schema:
 *           type: string
 *           enum: [PAYOUT, BULK_PAYOUT, PAY_IN_API, PAY_IN]
 *         description: Filter by transaction type
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *         description: Sort by field:order (e.g. createdAt:desc)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *         default: 10
 *         description: Maximum number of transactions
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: transactionId
 *         schema:
 *           type: string
 *         description: Filter by transaction ID
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by end date (YYYY-MM-DD)
 *       - in: query
 *         name: isExport
 *         schema:
 *           type: boolean
 *         description: Export transactions as Excel file if true
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     results:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           userId:
 *                             type: string
 *                           amount:
 *                             type: number
 *                           payment_mode:
 *                             type: string
 *                             enum: [IMPS, NEFT, RTGS]
 *                           transactionType:
 *                             type: string
 *                             enum: [PAYOUT, BULK_PAYOUT, PAY_IN_API, PAY_IN]
 *                           beneficiary_name:
 *                             type: string
 *                           beneficiary_account_numb:
 *                             type: string
 *                           beneficiary_ifsc_code:
 *                             type: string
 *                           status:
 *                             type: string
 *                             enum: [PENDING, SUCCESS, FAILED, CANCELLED]
 *                           paymentReferenceNo:
 *                             type: string
 *                           transactionId:
 *                             type: string
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                           updatedAt:
 *                             type: string
 *                             format: date-time
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     totalResults:
 *                       type: integer
 *       "401":
 *         description: Unauthorized
 *       "403":
 *         description: Forbidden
 */

/**
 * @swagger
 * /transactions/{transactionId}:
 *   get:
 *     summary: Get a transaction by ID
 *     description: Logged in users can retrieve their own transactions, admins can retrieve any transaction.
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: transactionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Transaction ID
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 userId:
 *                   type: string
 *                 amount:
 *                   type: number
 *                 payment_mode:
 *                   type: string
 *                   enum: [IMPS, NEFT, RTGS]
 *                 transactionType:
 *                   type: string
 *                   enum: [PAYOUT, BULK_PAYOUT, PAY_IN_API, PAY_IN]
 *                 beneficiary_name:
 *                   type: string
 *                 beneficiary_account_numb:
 *                   type: string
 *                 beneficiary_ifsc_code:
 *                   type: string
 *                 status:
 *                   type: string
 *                   enum: [PENDING, SUCCESS, FAILED]
 *                 paymentReferenceNo:
 *                   type: string
 *                 transactionId:
 *                   type: string
 *                 errorMessage:
 *                   type: string
 *                 requestData:
 *                   type: object
 *                 responseData:
 *                   type: object
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *       "401":
 *         description: Unauthorized
 *       "403":
 *         description: Forbidden
 *       "404":
 *         description: Transaction not found
 */

/**
 * @swagger
 * /transactions/admin/all:
 *   get:
 *     summary: Get all transactions
 *     description: Only admins can retrieve all transactions.
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, SUCCESS, FAILED]
 *         description: Filter by transaction status
 *       - in: query
 *         name: payment_mode
 *         schema:
 *           type: string
 *           enum: [IMPS, NEFT, RTGS]
 *         description: Filter by payment mode
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filter by user ID. If not provided, returns transactions for all users.
 *       - in: query
 *         name: transactionId
 *         schema:
 *           type: string
 *         description: Get a specific transaction by ID
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter transactions on or after this date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter transactions on or before this date (YYYY-MM-DD)
 *       - in: query
 *         name: transactionType
 *         schema:
 *           type: string
 *           enum: [PAYOUT, BULK_PAYOUT, PAY_IN_API, PAY_IN]
 *           default: PAYOUT
 *         description: Filter by transaction type
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *         description: Sort by field:order (e.g. createdAt:desc)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *         default: 10
 *         description: Maximum number of transactions
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       userId:
 *                         type: string
 *                       amount:
 *                         type: number
 *                       payment_mode:
 *                         type: string
 *                         enum: [IMPS, NEFT, RTGS]
 *                       beneficiary_name:
 *                         type: string
 *                       beneficiary_account_numb:
 *                         type: string
 *                       beneficiary_ifsc_code:
 *                         type: string
 *                       status:
 *                         type: string
 *                         enum: [PENDING, SUCCESS, FAILED]
 *                       transactionType:
 *                         type: string
 *                         enum: [PAYOUT, BULK_PAYOUT, PAY_IN_API, PAY_IN]
 *                       paymentReferenceNo:
 *                         type: string
 *                       transactionId:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 *                 totalResults:
 *                   type: integer
 *       "401":
 *         description: Unauthorized
 *       "403":
 *         description: Forbidden
 */

/**
 * @swagger
 * /transactions/validate/pending:
 *   get:
 *     summary: Validate pending transactions
 *     description: Validates and updates the status of pending transactions. Only admins can access this endpoint.
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       "200":
 *         description: Validation completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       "401":
 *         description: Unauthorized
 *       "403":
 *         description: Forbidden
 */
