const express = require('express');
const validate = require('../../middlewares/validate');
const payinController = require('../../controllers/payin.controller');
const payinValidation = require('../../validations/payin.validation');
const { finflexAuthMiddleware } = require('../../middlewares/payin');

const router = express.Router();

// Payin endpoint
router.post('/auth', validate(payinValidation.payinAuth), finflexAuthMiddleware, payinController.payinAuth);
router.post('/create-order', validate(payinValidation.createPayinOrder), finflexAuthMiddleware, payinController.createPayinOrder);
router.post('/check-qr-status', validate(payinValidation.checkQrStatus), finflexAuthMiddleware, payinController.checkQrStatus);

module.exports = router;

/**
 * @swagger
 * tags:
 *   name: Pay In
 *   description: Pay-in operations
 */

/**
 * @swagger
 * /payin/create-order:
 *   post:
 *     summary: Create payin order (deposit)
 *     tags: [Pay In]
 *     description: Create a payin order (deposit). This is the opposite of payout (withdraw). This endpoint supports two authentication methods - either use client credentials headers OR bearer token.
 *     parameters:
 *       - in: header
 *         name: x-client-id
 *         required: false
 *         schema:
 *           type: string
 *         description: Finflex client ID (starts with finflex_test_ or finflex_live_)
 *         example: "finflex_test_6868706820"
 *       - in: header
 *         name: x-client-secret
 *         required: false
 *         schema:
 *           type: string
 *         description: Finflex client secret
 *         example: "finflex_test_be3798f8-deed-4215-97b4-556049549670"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - client_id
 *               - amount
 *               - order_id
 *               - callback_url
 *               - customer_details
 *             properties:
 *               client_id:
 *                 type: string
 *                 example: finflex_test_6868706820
 *               amount:
 *                 type: number
 *                 example: 10
 *               order_id:
 *                 type: string
 *                 example: 321sdf
 *               callback_url:
 *                 type: string
 *                 example: https://google.com
 *               customer_details:
 *                 type: object
 *                 required:
 *                   - email
 *                   - mobile
 *                   - name
 *                 properties:
 *                   email:
 *                     type: string
 *                     example: donation@gmail.com
 *                   mobile:
 *                     type: string
 *                     example: 9040660463
 *                   name:
 *                     type: string
 *                     example: Testing
 *     responses:
 *       201:
 *         description: Payin order created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Payin order created successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     order_id:
 *                       type: string
 *                       example: "321sdf"
 *                     client_id:
 *                       type: string
 *                       example: "finflex_test_6868706820"
 *                     amount:
 *                       type: number
 *                       example: 10
 *                     status:
 *                       type: string
 *                       example: "pending"
 *                     payment_url:
 *                       type: string
 *                       example: "https://payment.smebank.com/pay/abc123"
 *                     transaction_id:
 *                       type: string
 *                       example: "txn_987654321"
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-07-04T10:30:00Z"
 *       401:
 *         description: Authentication failed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Authentication failed - please provide either valid client credentials or a valid Bearer token"
 */

/**
 * @swagger
 * /payin/check-qr-status:
 *   post:
 *     summary: Check QR payment status and get payin order details
 *     tags: [Pay In]
 *     description: Check the payment status of a QR order and return additional payin order details from the database using ref_id.
 *     parameters:
 *       - in: header
 *         name: x-client-id
 *         required: false
 *         schema:
 *           type: string
 *         description: Finflex client ID (starts with finflex_test_ or finflex_live_)
 *         example: "finflex_test_6868706820"
 *       - in: header
 *         name: x-client-secret
 *         required: false
 *         schema:
 *           type: string
 *         description: Finflex client secret
 *         example: "finflex_test_be3798f8-deed-4215-97b4-556049549670"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - client_id
 *               - slug
 *               - ref_id
 *             properties:
 *               client_id:
 *                 type: string
 *                 example: finflex_test_6868706820
 *               slug:
 *                 type: string
 *                 example: QXCtRyzcsJp9
 *               ref_id:
 *                 type: string
 *                 example: QXCtRyzcsJp91752058602
 *     responses:
 *       200:
 *         description: Status and payin order details returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 typof:
 *                   type: object
 *                   description: Response from Typof API
 *                 payin_order:
 *                   type: object
 *                   description: Payin order details from DB
 *       401:
 *         description: Authentication failed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Authentication failed - please provide either valid client credentials or a valid Bearer token"
 *       404:
 *         description: Payin order not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: number
 *                   example: 404
 *                 message:
 *                   type: string
 *                   example: "Payin order not found with the provided ref_id"
 */ 