const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const { kycValidation } = require('../../validations');
const { kycController } = require('../../controllers');
const { upload } = require('../../Helpers/multer');

const router = express.Router();

// User KYC submission route
router.post(
  '/submit',
  auth(),
  upload.fields([
    { name: 'frontImage', maxCount: 1 },
    { name: 'backImage', maxCount: 1 },
  ]),
  validate(kycValidation.submitKycRequest),
  kycController.submitKycRequest,
);

// User can check their own KYC status
router.get('/status', auth(), kycController.getKycStatus);

// Admin routes
router.get('/requests', auth('manageUsers'), validate(kycValidation.getKycRequests), kycController.getKycRequests);

// Admin approve/reject KYC
router.patch(
  '/requests/:documentId',
  auth('manageUsers'),
  validate(kycValidation.updateKycStatus),
  kycController.updateKycStatus,
);

// Admin can check specific user's KYC status
router.get('/user/:userId', auth('manageUsers'), validate(kycValidation.getKycStatus), kycController.getKycStatus);

module.exports = router;

/**
 * @swagger
 * tags:
 *   name: KYC
 *   description: KYC verification and management
 */

/**
 * @swagger
 * /kyc/submit:
 *   post:
 *     summary: Submit KYC verification request
 *     description: Users can submit their KYC verification request by uploading Aadhaar card images
 *     tags: [KYC]
 *     security:
 *       - bearerAuth: []
 *     consumes:
 *       - multipart/form-data
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - documentNumber
 *               - frontImage
 *               - backImage
 *             properties:
 *               documentNumber:
 *                 type: string
 *                 description: Aadhaar card number (12 digits, should not start with 0 or 1)
 *                 example: "2345 6789 0123"
 *                 pattern: "^[2-9][0-9]{11}$"
 *               frontImage:
 *                 type: string
 *                 format: binary
 *                 description: Front image of Aadhaar card
 *               backImage:
 *                 type: string
 *                 format: binary
 *                 description: Back image of Aadhaar card
 *     responses:
 *       "201":
 *         description: KYC submission successful
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
 *                   example: KYC request submitted successfully and pending verification
 *                 data:
 *                   type: object
 *                   properties:
 *                     documentId:
 *                       type: string
 *                       example: 5ebac534954b54139806c112
 *                     status:
 *                       type: string
 *                       example: PENDING
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *       "400":
 *         description: Bad Request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: number
 *                   example: 400
 *                 message:
 *                   type: string
 *                   example: "Aadhaar number must be 12 digits"
 *       "401":
 *         description: Unauthorized
 */

/**
 * @swagger
 * /kyc/status:
 *   get:
 *     summary: Get current user's KYC status
 *     description: Logged in users can check their KYC verification status
 *     tags: [KYC]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       "200":
 *         description: KYC status information
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
 *                     isKycSubmitted:
 *                       type: boolean
 *                       example: true
 *                     kycVerificationStatus:
 *                       type: string
 *                       enum: [PENDING, APPROVED, REJECTED, PENDING]
 *                       example: PENDING
 *                     submittedAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                     message:
 *                       type: string
 *                       example: KYC is pending verification
 *                     document:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           example: 5ebac534954b54139806c112
 *                         documentType:
 *                           type: string
 *                           example: AADHAAR
 *                         documentNumber:
 *                           type: string
 *                           example: XXXX-XXXX-1234
 *                         status:
 *                           type: string
 *                           enum: [PENDING, APPROVED, REJECTED]
 *                           example: PENDING
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *                         updatedAt:
 *                           type: string
 *                           format: date-time
 *                         files:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               fileType:
 *                                 type: string
 *                                 enum: [FRONT, BACK, OTHER]
 *                                 example: FRONT
 *                               fileUrl:
 *                                 type: string
 *                                 format: uri
 *                                 example: https://example.com/documents/front.jpg
 *                         remarks:
 *                           type: string
 *                           example: null
 *                         verifiedAt:
 *                           type: string
 *                           format: date-time
 *                           example: null
 *       "401":
 *         description: Unauthorized
 */

/**
 * @swagger
 * /kyc/requests:
 *   get:
 *     summary: Get all KYC requests
 *     description: Admin can fetch all KYC verification requests with pagination and filtering
 *     tags: [KYC]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: searchQuery
 *         schema:
 *           type: string
 *         description: Search by document number, user name or email
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, APPROVED, REJECTED]
 *         description: Filter by KYC status
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *         description: Sort by field (format - field:order, e.g. createdAt:desc)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Maximum number of results per page
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *     responses:
 *       "200":
 *         description: List of KYC verification requests
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: 5ebac534954b54139806c112
 *                       documentType:
 *                         type: string
 *                         example: AADHAAR
 *                       documentNumber:
 *                         type: string
 *                         example: XXXX-XXXX-1234
 *                       status:
 *                         type: string
 *                         enum: [PENDING, APPROVED, REJECTED]
 *                         example: PENDING
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                       user:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             example: 5ebac534954b54139806c112
 *                           businessName:
 *                             type: string
 *                             example: ABC Corp
 *                           email:
 *                             type: string
 *                             format: email
 *                             example: user@example.com
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
 *         description: Unauthorized
 *       "403":
 *         description: Forbidden
 */

/**
 * @swagger
 * /kyc/requests/{documentId}:
 *   patch:
 *     summary: Update KYC verification request status
 *     description: Admin can approve or reject KYC verification requests
 *     tags: [KYC]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *         description: KYC document ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [APPROVED, REJECTED]
 *                 example: APPROVED
 *               remarks:
 *                 type: string
 *                 description: Required when rejecting KYC
 *                 example: Documents are unclear
 *     responses:
 *       "200":
 *         description: Status updated successfully
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
 *                   example: KYC approved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     documentId:
 *                       type: string
 *                       example: 5ebac534954b54139806c112
 *                     status:
 *                       type: string
 *                       example: APPROVED
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       "400":
 *         description: Bad request
 *       "401":
 *         description: Unauthorized
 *       "403":
 *         description: Forbidden
 *       "404":
 *         description: KYC document not found
 */

/**
 * @swagger
 * /kyc/user/{userId}:
 *   get:
 *     summary: Get specific user's KYC status
 *     description: Admin can check KYC verification status for any user
 *     tags: [KYC]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       "200":
 *         description: KYC status information
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
 *                     isKycSubmitted:
 *                       type: boolean
 *                       example: true
 *                     kycVerificationStatus:
 *                       type: string
 *                       enum: [PENDING, APPROVED, REJECTED, PENDING]
 *                       example: PENDING
 *                     submittedAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                     message:
 *                       type: string
 *                       example: KYC is pending verification
 *                     document:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           example: 5ebac534954b54139806c112
 *                         documentType:
 *                           type: string
 *                           example: AADHAAR
 *                         documentNumber:
 *                           type: string
 *                           example: XXXX-XXXX-1234
 *                         status:
 *                           type: string
 *                           enum: [PENDING, APPROVED, REJECTED]
 *                           example: PENDING
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *                         updatedAt:
 *                           type: string
 *                           format: date-time
 *                         files:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               fileType:
 *                                 type: string
 *                                 enum: [FRONT, BACK, OTHER]
 *                                 example: FRONT
 *                               fileUrl:
 *                                 type: string
 *                                 format: uri
 *                                 example: https://example.com/documents/front.jpg
 *                         remarks:
 *                           type: string
 *                           example: null
 *                         verifiedAt:
 *                           type: string
 *                           format: date-time
 *                           example: null
 *       "401":
 *         description: Unauthorized
 *       "403":
 *         description: Forbidden
 *       "404":
 *         description: User not found
 */
