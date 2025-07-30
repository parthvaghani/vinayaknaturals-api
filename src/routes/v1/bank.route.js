const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const bankValidation = require('../../validations/bank.validation');
const bankController = require('../../controllers/bank.controller');

const router = express.Router();

// Admin only routes
router
  .route('/')
  .post(auth('manageUsers'), validate(bankValidation.createBank), bankController.createBank)
  .get(auth('manageUsers'), validate(bankValidation.getBanks), bankController.getBanks);

router
  .route('/:bankId')
  .get(auth('manageUsers'), validate(bankValidation.getBank), bankController.getBank)
  .patch(auth('manageUsers'), validate(bankValidation.updateBank), bankController.updateBank)
  .delete(auth('manageUsers'), validate(bankValidation.deleteBank), bankController.deleteBank);
router
  .route('/assign/:userId/:type')
  .post(auth('manageUsers'), validate(bankValidation.assignBankToUser), bankController.assignBankToUser);

module.exports = router;

/**
 * @swagger
 * tags:
 *   name: Bank
 *   description: Bank management and operations
 */

/**
 * @swagger
 * /banks:
 *   post:
 *     summary: Create a bank
 *     description: Only admins can create banks.
 *     tags: [Bank]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - bankKey
 *               - envType
 *             properties:
 *               name:
 *                 type: string
 *                 description: Bank name
 *                 example: Akhand Anand Co.op Bank
 *               bankKey:
 *                 type: string
 *                 description: Bank key
 *                 example: AACX
 *               envType:
 *                 type: string
 *                 description: Bank environment type
 *                 enum: [test, live, both]
 *                 example: test
 *     responses:
 *       "201":
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Bank'
 *       "400":
 *         description: Bad Request
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *
 *   get:
 *     summary: Get all banks
 *     description: Only admins can retrieve all banks.
 *     tags: [Bank]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: Bank name
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Bank status
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *         description: sort by query in the form of field:desc/asc (ex. name:asc)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Maximum number of banks
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: searchTerm
 *         schema:
 *           type: string
 *         description: Search term
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
 *                     $ref: '#/components/schemas/Bank'
 *                 page:
 *                   type: integer
 *                   example: 1
 *                 limit:
 *                   type: integer
 *                   example: 10
 *                 totalPages:
 *                   type: integer
 *                   example: 1
 *                 totalResults:
 *                   type: integer
 *                   example: 1
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 */

/**
 * @swagger
 * /banks/{bankId}:
 *   get:
 *     summary: Get a bank
 *     description: Only admins can fetch a bank.
 *     tags: [Bank]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bankId
 *         required: true
 *         schema:
 *           type: string
 *         description: Bank ID
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Bank'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 *
 *   patch:
 *     summary: Update a bank
 *     description: Only admins can update a bank.
 *     tags: [Bank]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bankId
 *         required: true
 *         schema:
 *           type: string
 *         description: Bank ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Bank name
 *                 example: New Bank Name
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *                 description: Bank status
 *                 example: inactive
 *               envType:
 *                 type: string
 *                 description: Bank environment type
 *                 enum: [test, live, both]
 *                 example: test
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Bank'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 *
 *   delete:
 *     summary: Delete a bank
 *     description: Only admins can delete a bank.
 *     tags: [Bank]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bankId
 *         required: true
 *         schema:
 *           type: string
 *         description: Bank ID
 *     responses:
 *       "204":
 *         description: No content
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */
/**
 * @swagger
 * /banks/assign/{userId}/{type}:
 *   post:
 *     summary: Assign a bank (payin or payout) to a user
 *     description: |
 *       Only admins (or users with `manageUsers` permission) can assign a bank to a user.
 *     tags: [Bank]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the user
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [payin, payout]
 *         description: The type of bank assignment (payin or payout)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bankId
 *             properties:
 *               bankId:
 *                 type: string
 *                 description: ID of the bank to assign
 *                 example: 64f8fa621fcbadcd12345678
 *     responses:
 *       200:
 *         description: Bank assigned successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Invalid request or bank inactive
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
