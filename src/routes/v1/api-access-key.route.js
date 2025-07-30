const express = require('express');
const validate = require('../../middlewares/validate');
const auth = require('../../middlewares/auth');
const userValidation = require('../../validations/user.validation');
const userController = require('../../controllers/user.controller');   


const router = express.Router();

router
  .route('/')
  .patch(
    auth(),
    validate(userValidation.generateFinflexKeys),
    userController.generateFinflexKeys
  );

module.exports = router;
 

/**
 * @swagger
 * tags:
 *   name: API
 *   description: API Access Key management
 */

/**
 * @swagger
 * /access-key:
 *   patch:
 *     summary: Generate new Finflex API keys
 *     description: |
 *       Generate new access key, merchant key, and API password while preserving the client ID.
 *       - For test keys (`isLive: false`) - No restrictions
 *       - For live keys (`isLive: true`):
 *         * If KYC is verified - Live keys will be generated
 *         * If KYC is not verified - Test keys will be generated instead
 *     tags: [API]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               isLive:
 *                 type: boolean
 *                 default: false
 *               isRegenerate:
 *                 type: boolean
 *                 default: false
 *           example:
 *             isLive: false
 *             isRegenerate: false
 *     responses:
 *       200:
 *         description: Keys generated successfully
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
 *                   example: Test keys generated successfully
 *                 keys:
 *                   type: object
 *                   properties:
 *                     accessKey:
 *                       type: string
 *                       example: ak_test_1234567890abcdef
 *                     merchantKey:
 *                       type: string
 *                       example: mk_test_1234567890abcdef
 *                     apiPassword:
 *                       type: string
 *                       example: ap_test_1234567890abcdef
 *                     clientId:
 *                       type: string
 *                 keyType:
 *                   type: string
 *                   enum: [test, live]
 *                   example: test
 *                 isKycVerified:
 *                   type: boolean
 *                   example: false
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */

