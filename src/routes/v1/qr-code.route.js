const express = require('express');
const validate = require('../../middlewares/validate');
const qrCodeController = require('../../controllers/qr-code.controller');
const qrCodeValidation = require('../../validations/qr-code.validation');
const auth = require('../../middlewares/auth');
const { finflexAuthMiddleware } = require('../../middlewares/payin');

const router = express.Router();

// Generate QR Code endpoint
router.post('/generate-qr-code', validate(qrCodeValidation.generateQrCode), finflexAuthMiddleware, qrCodeController.generateQrCode);
router.get('/get-all-qr-code', auth(), finflexAuthMiddleware, qrCodeController.getAllQrCodeWithStatusUpdate);
router.get('/get-single-qr-code/:slug', validate(qrCodeValidation.getSingleQrCode), qrCodeController.getSingleQrCode);
router.patch('/update-status/:slug', validate(qrCodeValidation.updateQrCode), auth(), qrCodeController.updateQrCode);

module.exports = router;

/**
 * @swagger
 * tags:
 *   name: QR Code
 *   description: QR Code generation and management for payment processing
 */

/**
 * @swagger
 * /qr-code/generate-qr-code:
 *   post:
 *     summary: Generate a QR code for payment
 *     description: Creates a scannable QR code that customers can use to make payments through the Finflex system
 *     tags: [QR Code]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: x-client-id
 *         schema:
 *           type: string
 *         required: true
 *         description: Merchant client ID for API authentication
 *       - in: header
 *         name: x-client-secret
 *         schema:
 *           type: string
 *         required: true
 *         description: Merchant client secret for API authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - order_id
 *               - callback_url
 *             properties:
 *               amount:
 *                 type: number
 *                 description: Payment amount in INR (must be positive and can include decimal points)
 *                 example: 1000.50
 *               order_id:
 *                 type: string
 *                 description: Unique merchant order identifier (must be unique for each transaction)
 *                 example: ORDER-123456-ABCD
 *               callback_url:
 *                 type: string
 *                 format: uri
 *                 description: Valid URL to be called after payment is processed (must be HTTPS)
 *                 example: https://example.com/payment/callback
 *     responses:
 *       "201":
 *         description: QR code created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: true
 *                   description: Indicates successful QR code generation
 *                 message:
 *                   type: string
 *                   example: QR code generated successfully
 *                   description: Human-readable success message
 *                 data:
 *                   type: object
 *                   description: Generated QR code data and transaction details
 *                   properties:
 *                     slug:
 *                       type: string
 *                       example: order-12345
 *                       description: Unique identifier for the QR code transaction
 *                     ref_id:
 *                       type: string
 *                       example: REF-67890
 *                       description: Reference ID for the transaction
 *                     qr_code:
 *                       type: string
 *                       description: Base64 encoded QR code image that can be displayed to users
 *                       example: data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==
 *                     amount:
 *                       type: number
 *                       example: 1000.50
 *                       description: Transaction amount in INR
 *                     order_id:
 *                       type: string
 *                       example: ORDER-123456-ABCD
 *                       description: Merchant order ID as provided in the request
 *       "400":
 *         $ref: '#/components/responses/BadRequest'
 *         description: Bad request - Invalid input parameters or validation failed
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *         description: Unauthorized - Invalid or missing authentication credentials
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *         description: Forbidden - Client does not have permission to generate QR codes
 *       "422":
 *         description: Unprocessable Entity - Request validation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               code: 422
 *               message: Validation error
 *               errors:
 *                 - field: "amount"
 *                   message: "Amount must be a positive number"
 *       "500":
 *         description: Internal Server Error - Something went wrong on the server
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               code: 500
 *               message: Internal server error
 */

/**
 * @swagger
 * /qr-code/get-all-qr-code:
 *   get:
 *     summary: Get all QR codes
 *     description: Retrieve all QR codes generated by the authenticated user
 *     tags: [QR Code]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: x-client-id
 *         schema:
 *           type: string
 *         required: true
 *         description: Merchant client ID for API authentication
 *       - in: header
 *         name: x-client-secret
 *         schema:
 *           type: string
 *         required: true
 *         description: Merchant client secret for API authentication
 *     responses:
 *       "200":
 *         description: QR codes retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: true
 *                   description: Indicates successful retrieval of QR codes
 *                 message:
 *                   type: string
 *                   example: QR code fetched successfully
 *                   description: Human-readable success message
 *                 data:
 *                   type: array
 *                   description: List of QR codes
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: 60d6c4c73e8e492a946c12c9
 *                         description: Unique identifier for the QR code record
 *                       slug:
 *                         type: string
 *                         example: order-12345
 *                         description: Unique identifier for the QR code transaction
 *                       referralId:
 *                         type: string
 *                         example: REF-67890
 *                         description: Reference ID for the transaction
 *                       orderId:
 *                         type: string
 *                         example: ORDER-123456-ABCD
 *                         description: Merchant order ID
 *                       qrCode:
 *                         type: string
 *                         description: Base64 encoded QR code image
 *                         example: data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==
 *                       amount:
 *                         type: number
 *                         example: 1000.50
 *                         description: Transaction amount in INR
 *                       status:
 *                         type: string
 *                         example: unpaid
 *                         enum: [paid, unpaid]
 *                         description: Payment status of the QR code
 *                       credited:
 *                         type: boolean
 *                         example: false
 *                         description: Whether the amount has been credited to the user's account
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         example: 2023-06-22T09:12:39.000Z
 *                         description: Date and time when the QR code was created
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                         example: 2023-06-22T09:12:39.000Z
 *                         description: Date and time when the QR code was last updated
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *         description: Unauthorized - Invalid or missing authentication credentials
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *         description: Forbidden - Client does not have permission to access QR codes
 *       "500":
 *         description: Internal Server Error - Something went wrong on the server
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               code: 500
 *               message: Internal server error
 */

/**
 * @swagger
 * /qr-code/get-single-qr-code/{slug}:
 *   get:
 *     summary: Get a single QR code by slug
 *     description: Retrieve a specific QR code by its slug identifier
 *     tags: [QR Code]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Slug identifier of the QR code to retrieve
 *       - in: header
 *         name: x-client-id
 *         schema:
 *           type: string
 *         required: true
 *         description: Merchant client ID for API authentication
 *       - in: header
 *         name: x-client-secret
 *         schema:
 *           type: string
 *         required: true
 *         description: Merchant client secret for API authentication
 *     responses:
 *       "200":
 *         description: QR code retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: true
 *                   description: Indicates successful retrieval of the QR code
 *                 message:
 *                   type: string
 *                   example: QR code fetched successfully
 *                   description: Human-readable success message
 *                 data:
 *                   type: object
 *                   description: QR code data
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: 60d6c4c73e8e492a946c12c9
 *                       description: Unique identifier for the QR code record
 *                     slug:
 *                       type: string
 *                       example: order-12345
 *                       description: Unique identifier for the QR code transaction
 *                     referralId:
 *                       type: string
 *                       example: REF-67890
 *                       description: Reference ID for the transaction
 *                     orderId:
 *                       type: string
 *                       example: ORDER-123456-ABCD
 *                       description: Merchant order ID
 *                     qrCode:
 *                       type: string
 *                       description: Base64 encoded QR code image
 *                       example: data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==
 *                     amount:
 *                       type: number
 *                       example: 1000.50
 *                       description: Transaction amount in INR
 *                     status:
 *                       type: string
 *                       example: unpaid
 *                       enum: [paid, unpaid]
 *                       description: Payment status of the QR code
 *                     credited:
 *                       type: boolean
 *                       example: false
 *                       description: Whether the amount has been credited to the user's account
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: 2023-06-22T09:12:39.000Z
 *                       description: Date and time when the QR code was created
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       example: 2023-06-22T09:12:39.000Z
 *                       description: Date and time when the QR code was last updated
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *         description: Unauthorized - Invalid or missing authentication credentials
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *         description: Forbidden - Client does not have permission to access QR codes
 *       "404":
 *         description: Not Found - QR code with the specified slug does not exist
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               code: 404
 *               message: QR code not found
 *       "500":
 *         description: Internal Server Error - Something went wrong on the server
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               code: 500
 *               message: Internal server error
 */