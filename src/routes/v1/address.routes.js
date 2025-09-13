const express = require('express');
const validate = require('../../middlewares/validate');
const validation = require('../../validations/address.validation');
const controller = require('../../controllers/address.controller');
const auth = require('../../middlewares/auth');

const router = express.Router();

router.post('/', auth(), validate(validation.createAddress), controller.createAddress);
router.get('/', auth(), controller.getMyAddresses);
router.patch('/:id', auth(), validate(validation.updateAddress), controller.updateAddress);
router.delete('/:id', auth(), validate(validation.deleteAddress), controller.deleteAddress);

module.exports = router;

/**
 * @swagger
 * tags:
 *   - name: Addresses
 *     description: Address management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     AddressInput:
 *       type: object
 *       properties:
 *         label:
 *           type: string
 *           enum: [Home, Office, Other]
 *           example: Home
 *         addressLine1:
 *           type: string
 *           example: "221B Baker Street"
 *         addressLine2:
 *           type: string
 *           example: "Near Central Park"
 *         city:
 *           type: string
 *           example: "Mumbai"
 *         state:
 *           type: string
 *           example: "Maharashtra"
 *         zip:
 *           type: string
 *           example: "400001"
 *         country:
 *           type: string
 *           example: "IND"
 *     Address:
 *       allOf:
 *         - $ref: '#/components/schemas/AddressInput'
 *         - type: object
 *           properties:
 *             _id:
 *               type: string
 *             userId:
 *               type: string
 *             createdAt:
 *               type: string
 *               format: date-time
 *             updatedAt:
 *               type: string
 *               format: date-time
 */

/**
 * @swagger
 * /addresses:
 *   post:
 *     summary: Create a new address for current user
 *     tags: [Addresses]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AddressInput'
 *     responses:
 *       201:
 *         description: Address created
 *   get:
 *     summary: Get my addresses
 *     tags: [Addresses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of addresses
 */

/**
 * @swagger
 * /addresses/{id}:
 *   get:
 *     summary: Get address by id (owner or admin)
 *     tags: [Addresses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Address details
 *   patch:
 *     summary: Update address by id (owner or admin)
 *     tags: [Addresses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AddressInput'
 *     responses:
 *       200:
 *         description: Address updated
 *   delete:
 *     summary: Delete address by id (owner or admin)
 *     tags: [Addresses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Address deleted
 */
