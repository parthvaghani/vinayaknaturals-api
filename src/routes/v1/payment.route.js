const express = require('express');
const validate = require('../../middlewares/validate');
const paymentController = require('../../controllers/payment.controller');
const paymentValidation = require('../../validations/payment.validation');
const auth = require('../../middlewares/auth');
const { uploadExcel } = require('../../Helpers/multer');

const router = express.Router();

//NOTE - Do not delete this endpoint
router.post('/payment', paymentController.makeTestPayment);
router.post('/make-payment', auth(), validate(paymentValidation.makePayment), paymentController.makePayment);

router.post(
  '/make-bulk-payment',
  auth(),
  uploadExcel.single('paymentFile'),
  validate(paymentValidation.makeBulkPayment),
  paymentController.makeBulkBankPayments,
);
router.get(
  '/bulk-payment-status/:bulkProcessingId',
  auth(),
  validate(paymentValidation.getBulkPaymentStatus),
  paymentController.getBulkPaymentStatus,
);

router.get('/user-bulk-tasks', auth(), paymentController.getUserBulkProcessingTasks);

module.exports = router;

/**
 * @swagger
 * tags:
 *   name: Payment
 *   description: Payment-related API endpoints
 */

/**
 * @swagger
 * /payment/payment:
 *   post:
 *     summary: Make a test payment
 *     tags: [Payment]
 *     description: Make a test bank payment using Teja Finance API. Requires bearer token in request body
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - beneficiary_name
 *               - beneficiary_account_numb
 *               - beneficiary_ifsc_code
 *               - amount
 *               - payment_mode
 *               - x_reference_no
 *               - bearer_token
 *             properties:
 *               beneficiary_name:
 *                 type: string
 *                 description: Beneficiary name
 *               beneficiary_account_numb:
 *                 type: string
 *                 description: Beneficiary account number
 *               beneficiary_ifsc_code:
 *                 type: string
 *                 description: Beneficiary IFSC code
 *               amount:
 *                 type: string
 *                 description: Payment amount
 *               payment_mode:
 *                 type: string
 *                 description: Payment mode
 *               x_reference_no:
 *                 type: string
 *                 description: Reference number
 *               request_id:
 *                 type: string
 *                 description: Unique request identifier
 *                 format: uuid
 *               bearer_token:
 *                 type: string
 *                 description: Bearer token for authentication
 *                 example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
 *     responses:
 *       200:
 *         description: Payment successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   description: Payment status
 *                 data:
 *                   type: object
 *                   properties:
 *                     PaymentReferenceNo:
 *                       type: string
 *                       description: Payment reference number
 *                     CMPReferenceNo:
 *                       type: string
 *                       description: CMP reference number
 *                     Status:
 *                       type: string
 *                       description: Payment status
 *                     transaction_id:
 *                       type: string
 *                       description: Transaction ID
 *                     amount:
 *                       type: string
 *                       description: Amount in INR
 *       400:
 *         description: Payment failed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 'access-key':
 *                   type: array
 *                   items:
 *                     type: string
 *                   description: Access key validation error
 */

/**
 * @swagger
 * /payment/make-payment:
 *   post:
 *     summary: Make a payment
 *     tags: [Payment]
 *     description: Make a bank payment with request validation using Teja Finance API
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - beneficiary_name
 *               - beneficiary_account_numb
 *               - beneficiary_ifsc_code
 *               - amount
 *               - payment_mode
 *               - x_reference_no
 *               - bearer_token
 *             properties:
 *               beneficiary_name:
 *                 type: string
 *                 description: Beneficiary name
 *                 example: John Doe
 *               beneficiary_account_numb:
 *                 type: string
 *                 description: Beneficiary account number
 *                 example: "123456789012"
 *               beneficiary_ifsc_code:
 *                 type: string
 *                 description: Beneficiary IFSC code
 *                 example: SBIN0001234
 *               amount:
 *                 type: string
 *                 description: Payment amount
 *                 example: "1000"
 *               payment_mode:
 *                 type: string
 *                 description: Payment mode
 *                 example: IMPS
 *               x_reference_no:
 *                 type: string
 *                 description: Reference number
 *                 example: "REF123456789"
 *               request_id:
 *                 type: string
 *                 description: Unique request identifier
 *                 format: uuid
 *                 example: "f47ac10b-58cc-4372-a567-0e02b2c3d479"
 *               bearer_token:
 *                 type: string
 *                 description: Bearer token for authentication
 *                 example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
 *     responses:
 *       200:
 *         description: Payment successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   description: Payment status
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     PaymentReferenceNo:
 *                       type: string
 *                       description: Payment reference number
 *                       example: "PAY123456789"
 *                     CMPReferenceNo:
 *                       type: string
 *                       description: CMP reference number
 *                       example: "CMP987654321"
 *                     Status:
 *                       type: string
 *                       description: Payment status
 *                       example: "SUCCESS"
 *                     transaction_id:
 *                       type: string
 *                       description: Transaction ID
 *                       example: "TXN123456789"
 *                     amount:
 *                       type: string
 *                       description: Amount in INR
 *                       example: "1000.00"
 *       400:
 *         description: Validation error or payment failed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: number
 *                   description: HTTP status code
 *                   example: 400
 *                 message:
 *                   type: string
 *                   description: Error message
 *                   example: "Invalid IFSC code format"
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: number
 *                   description: HTTP status code
 *                   example: 401
 *                 message:
 *                   type: string
 *                   description: Error message
 *                   example: "Please authenticate"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: number
 *                   description: HTTP status code
 *                   example: 500
 *                 message:
 *                   type: string
 *                   description: Error message
 *                   example: "Payment failed: Internal server error"
 */

/**
 * @swagger
 * /payment/upload-bulk-payment:
 *   post:
 *     summary: Upload Excel file for bulk payments
 *     tags: [Payment]
 *     description: Upload an Excel file containing payment details for bulk processing
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - paymentFile
 *               - payment_mode
 *               - bearer_token
 *             properties:
 *               paymentFile:
 *                 type: string
 *                 format: binary
 *                 description: Excel file (.xlsx) containing payment details with columns for amount, beneficiary name, account number and IFSC code
 *               payment_mode:
 *                 type: string
 *                 enum: [IMPS, NEFT, RTGS]
 *                 description: Payment mode to use for all transactions in the Excel file
 *               bearer_token:
 *                 type: string
 *                 description: Bearer token for authentication with the payment provider
 *     responses:
 *       202:
 *         description: File accepted for processing
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 bulkProcessingId:
 *                   type: string
 *                   description: Bulk processing ID for tracking
 *                   example: "60d5f8e75d4fbc2a6c8e4b1a"
 *                 fileName:
 *                   type: string
 *                   description: Original filename
 *                   example: "payments.xlsx"
 *                 totalRecords:
 *                   type: number
 *                   description: Total number of records in the file
 *                   example: 100
 *                 status:
 *                   type: string
 *                   description: Processing status
 *                   example: "PENDING"
 *       400:
 *         description: Invalid file or validation error
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /payment/bulk-payment-status/{bulkProcessingId}:
 *   get:
 *     summary: Get bulk payment processing status
 *     tags: [Payment]
 *     description: Get the status of a bulk payment processing job. Frontend can poll this endpoint to track processing progress.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bulkProcessingId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the bulk processing job returned from upload-bulk-payment endpoint
 *     responses:
 *       200:
 *         description: Processing status details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   description: Bulk processing ID
 *                   example: "60d5f8e75d4fbc2a6c8e4b1a"
 *                 userId:
 *                   type: string
 *                   description: ID of the user who initiated the processing
 *                   example: "60d5f8e75d4fbc2a6c8e4b1b"
 *                 fileName:
 *                   type: string
 *                   description: Original filename
 *                   example: "payments.xlsx"
 *                 fileUrl:
 *                   type: string
 *                   description: S3 URL of the uploaded file
 *                   example: "https://bucket.s3.ap-south-1.amazonaws.com/bulk-payments/123/file.xlsx"
 *                 totalRecords:
 *                   type: number
 *                   description: Total number of records in the file
 *                   example: 100
 *                 processedRecords:
 *                   type: number
 *                   description: Number of records processed so far
 *                   example: 50
 *                 successfulRecords:
 *                   type: number
 *                   description: Number of successful payments
 *                   example: 45
 *                 failedRecords:
 *                   type: number
 *                   description: Number of failed payments
 *                   example: 5
 *                 batchSize:
 *                   type: number
 *                   description: Number of records processed in each batch
 *                   example: 10
 *                 status:
 *                   type: string
 *                   enum: [PENDING, PROCESSING, COMPLETED, FAILED]
 *                   description: Current processing status
 *                   example: "PROCESSING"
 *                 errors:
 *                   type: array
 *                   description: List of errors encountered during processing
 *                   items:
 *                     type: object
 *                     properties:
 *                       row:
 *                         type: number
 *                         description: Row number in the Excel file (1-based) or -1 for global errors
 *                         example: 5
 *                       message:
 *                         type: string
 *                         description: Error message
 *                         example: "Invalid IFSC code format"
 *                       data:
 *                         type: object
 *                         description: The payment data that caused the error
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                   description: Timestamp when processing started
 *                   example: "2023-06-01T12:00:00Z"
 *                 completedAt:
 *                   type: string
 *                   format: date-time
 *                   description: Timestamp when processing completed (null if not completed)
 *                   example: "2023-06-01T12:05:30Z"
 *       401:
 *         description: Unauthorized - User not authenticated
 *       404:
 *         description: Bulk processing record not found
 */

/**
 * @swagger
 * /payment/make-bulk-payment:
 *   post:
 *     summary: Make multiple payments in one request
 *     tags: [Payment]
 *     description: Process multiple payment transactions in a single API call
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - payments
 *             properties:
 *               payments:
 *                 type: array
 *                 description: Array of payment details
 *                 items:
 *                   type: object
 *                   required:
 *                     - amount
 *                     - payment_mode
 *                     - beneficiary_name
 *                     - beneficiary_account_numb
 *                     - beneficiary_ifsc_code
 *                     - bearer_token
 *                   properties:
 *                     amount:
 *                       type: number
 *                       description: Payment amount
 *                       example: 1000
 *                     payment_mode:
 *                       type: string
 *                       enum: [IMPS, NEFT, RTGS]
 *                       description: Payment mode
 *                       example: "IMPS"
 *                     beneficiary_name:
 *                       type: string
 *                       description: Beneficiary name
 *                       example: "John Doe"
 *                     beneficiary_account_numb:
 *                       type: string
 *                       description: Beneficiary account number
 *                       example: "123456789012"
 *                     beneficiary_ifsc_code:
 *                       type: string
 *                       description: Beneficiary IFSC code
 *                       example: "SBIN0001234"
 *                     bearer_token:
 *                       type: string
 *                       description: Bearer token for authentication
 *                       example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                     x_reference_no:
 *                       type: string
 *                       description: Reference number (optional)
 *                       example: "REF123456789"
 *                     request_id:
 *                       type: string
 *                       description: Unique request identifier (optional)
 *                       example: "req-123-456"
 *     responses:
 *       200:
 *         description: Results of all payment attempts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: number
 *                   description: Total number of payment attempts
 *                   example: 3
 *                 results:
 *                   type: array
 *                   description: Results of each payment attempt
 *                   items:
 *                     type: object
 *                     properties:
 *                       success:
 *                         type: boolean
 *                         description: Whether the payment was successful
 *                         example: true
 *                       payment:
 *                         type: object
 *                         description: The payment details that were submitted
 *                       result:
 *                         type: object
 *                         description: Payment result details (for successful payments)
 *                       error:
 *                         type: string
 *                         description: Error message (for failed payments)
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /payment/user-bulk-tasks:
 *   get:
 *     summary: Get all bulk payment tasks for the current user
 *     tags: [Payment]
 *     description: Retrieves a list of all bulk payment processing tasks for the currently authenticated user, ordered from newest to oldest
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: minimal
 *         schema:
 *           type: boolean
 *           default: true
 *         description: When true, omits detailed error data, fileName and fileUrl from the response to reduce payload size
 *     responses:
 *       200:
 *         description: List of bulk payment tasks
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     description: Bulk processing ID
 *                     example: "60d5f8e75d4fbc2a6c8e4b1a"
 *                   userId:
 *                     type: string
 *                     description: ID of the user who initiated the processing
 *                     example: "60d5f8e75d4fbc2a6c8e4b1b"
 *                   fileName:
 *                     type: string
 *                     description: Original filename (omitted when minimal=true)
 *                     example: "payments.xlsx"
 *                   fileUrl:
 *                     type: string
 *                     description: S3 URL of the uploaded file (omitted when minimal=true)
 *                     example: "https://bucket.s3.ap-south-1.amazonaws.com/bulk-payments/123/file.xlsx"
 *                   totalRecords:
 *                     type: number
 *                     description: Total number of records in the file
 *                     example: 100
 *                   processedRecords:
 *                     type: number
 *                     description: Number of records processed
 *                     example: 50
 *                   successfulRecords:
 *                     type: number
 *                     description: Number of successful payments
 *                     example: 45
 *                   failedRecords:
 *                     type: number
 *                     description: Number of failed payments
 *                     example: 5
 *                   batchSize:
 *                     type: number
 *                     description: Number of records processed in each batch
 *                     example: 10
 *                   status:
 *                     type: string
 *                     enum: [PENDING, PROCESSING, COMPLETED, FAILED]
 *                     description: Current processing status
 *                     example: "COMPLETED"
 *                   errors:
 *                     type: array
 *                     description: List of errors encountered during processing (detailed error data omitted when minimal=true)
 *                     items:
 *                       type: object
 *                       properties:
 *                         row:
 *                           type: number
 *                           description: Row number in the Excel file (1-based) or -1 for global errors
 *                           example: 5
 *                         message:
 *                           type: string
 *                           description: Error message
 *                           example: "Invalid IFSC code format"
 *                         data:
 *                           type: object
 *                           description: The payment data that caused the error (omitted when minimal=true)
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *                     description: Timestamp when the task was created
 *                     example: "2023-06-01T12:00:00Z"
 *                   updatedAt:
 *                     type: string
 *                     format: date-time
 *                     description: Timestamp when the task was last updated
 *                     example: "2023-06-01T12:05:30Z"
 *                   completedAt:
 *                     type: string
 *                     format: date-time
 *                     description: Timestamp when processing completed (null if not completed)
 *                     example: "2023-06-01T12:05:30Z"
 *       401:
 *         description: Unauthorized - User not authenticated
 */
