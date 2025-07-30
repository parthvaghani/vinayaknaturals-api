const express = require('express');
const { createTopup, updateTopup, getUserTopups, getAllTopups } = require('../../controllers/topup.controller');
const auth = require('../../middlewares/auth');
const { upload } = require('../../Helpers/multer');
const validate = require('../../middlewares/validate');
const { topupValidation } = require('../../validations');

const router = express.Router();

router.post('/', auth(), upload.single('screenshot'), validate(topupValidation.createTopup), createTopup);
router.patch('/:id', auth('getUsers'), validate(topupValidation.updateTopup), updateTopup);
router.get('/', auth(), getUserTopups);
router.get('/all', auth('getUsers'), getAllTopups);
/**
 * @swagger
 * tags:
 *   - name: Topup
 *     description: Topup management and operations
 *
 * /topup:
 *   post:
 *     summary: Create a new topup
 *     tags: [Topup]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               utrNumber:
 *                 type: string
 *               amount:
 *                 type: number
 *               screenshot:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Topup created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Topup'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *
 *   get:
 *     summary: Get user's topups
 *     description: Retrieve all topups for the authenticated user.
 *     tags: [Topup]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: utrNumber
 *         schema:
 *           type: string
 *         description: Filter by UTR number
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
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected]
 *         description: Filter by topup status
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
 *           default: 10
 *         description: Maximum number of topups per page
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *     responses:
 *       200:
 *         description: List of user's topups
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     results:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Topup'
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 10
 *                     totalPages:
 *                       type: integer
 *                       example: 1
 *                     totalResults:
 *                       type: integer
 *                       example: 1
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *
 * /topup/all:
 *   get:
 *     summary: Get all topups (admin)
 *     description: Retrieve all topups (admin only).
 *     tags: [Topup]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected]
 *         description: Filter by topup status
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filter by user ID
 *       - in: query
 *         name: utrNumber
 *         schema:
 *           type: string
 *         description: Filter by UTR number
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
 *         name: searchTerm
 *         schema:
 *           type: string
 *         description: Search term for basic search (UTR number)
 *       - in: query
 *         name: searchQuery
 *         schema:
 *           type: string
 *         description: Comprehensive search query across UTR number and topup ID
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
 *           default: 10
 *         description: Maximum number of topups per page
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *     responses:
 *       200:
 *         description: List of all topups
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     results:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Topup'
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 10
 *                     totalPages:
 *                       type: integer
 *                       example: 1
 *                     totalResults:
 *                       type: integer
 *                       example: 1
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *
 * /topup/{id}:
 *   patch:
 *     summary: Update a topup (admin)
 *     tags: [Topup]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Topup ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, approved, rejected]
 *     responses:
 *       200:
 *         description: Topup updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Topup'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */

module.exports = router;