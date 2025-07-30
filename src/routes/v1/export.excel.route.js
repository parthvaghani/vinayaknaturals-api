const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const excelController = require('../../controllers/excel.controller');
const excelValidation = require('../../validations/excel.validation');

const router = express.Router();

router.route('/exportExcel').post(auth(), validate(excelValidation.exportExcel), excelController.exportExcel);

module.exports = router;

/**
 * @swagger
 * /exports/exportExcel:
 *   post:
 *     summary: Export data to Excel
 *     description: |
 *       Export transaction, topup, payout, bulk payment, or bank statement data as an Excel file.\n\n
 *       **Note:** The response will trigger an Excel file download if successful.
 *     tags:
 *       - Export
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - dataType
 *             properties:
 *               dataType:
 *                 type: string
 *                 enum: [transactions, topups, payouts, bulkPayments, bankStatements]
 *                 description: Type of data to export (e.g., transactions, topups, payouts, bulkPayments, bankStatements)
 *               filters:
 *                 type: object
 *                 description: Optional filters for the export (e.g., date range, status, userId, bankId, etc.)
 *           example:
 *             dataType: transactions
 *             filters:
 *               startDate: '2024-01-01'
 *               endDate: '2024-01-31'
 *               status: 'success'
 *               userId: 'userId123'
 *               bankId: 'bankId123'
 *     responses:
 *       200:
 *         description: Excel file download
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 */

