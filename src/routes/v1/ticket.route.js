const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const { ticketValidation } = require('../../validations');
const { ticketController } = require('../../controllers');
const { uploadTicket } = require('../../Helpers/multer');

const router = express.Router();

// Create a new ticket
router.post(
  '/',
  auth(),
  uploadTicket.array('images', 5), // Allow up to 5 images, 3MB each
  validate(ticketValidation.createTicket),
  ticketController.createTicket
);

// Get all tickets (admin only)
router.get(
  '/admin',
  auth(),
  validate(ticketValidation.getTickets),
  ticketController.getAllTickets
);

// Get user's tickets
router.get(
  '/',
  auth(),
  validate(ticketValidation.getTickets),
  ticketController.getUserTickets
);

// Get a specific ticket
router.get(
  '/:ticketId',
  auth(),
  validate(ticketValidation.getTicket),
  ticketController.getTicketById
);

// Add a reply to a ticket
router.post(
  '/:ticketId/reply',
  auth(),
  uploadTicket.array('images', 5), // Allow up to 5 images, 3MB each
  validate(ticketValidation.addReply),
  ticketController.addTicketReply
);

// Close a ticket (admin only)
router.patch(
  '/:ticketId/close',
  auth(),
  validate(ticketValidation.closeTicket),
  ticketController.closeTicket
);

module.exports = router;

/**
 * @swagger
 * tags:
 *   name: Tickets
 *   description: Ticket management and retrieval
 */

/**
 * @swagger
 * /tickets:
 *   post:
 *     summary: Create a new ticket
 *     description: Users can create new support tickets.
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - subject
 *               - precedence
 *               - message
 *             properties:
 *               subject:
 *                 type: string
 *                 description: Ticket subject
 *               precedence:
 *                 type: string
 *                 enum: [low, medium, high]
 *                 description: Ticket priority
 *               message:
 *                 type: string
 *                 description: Ticket message content
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Images related to the ticket (max 5, each up to 3MB)
 *     responses:
 *       "201":
 *         description: Created
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
 *                   example: "Ticket created successfully"
 *                 ticket:
 *                   type: object
 *       "400":
 *         description: Bad Request
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *
 *   get:
 *     summary: Get all user tickets
 *     description: Users can retrieve all their tickets.
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [open, closed]
 *         description: Filter by ticket status
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by start date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by end date
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *         description: Sort by field (e.g., createdAt:desc)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Maximum number of tickets
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number
 *     responses:
 *       "200":
 *         description: OK
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
 *                   example: "Tickets fetched successfully"
 *                 result:
 *                   type: object
 *                   properties:
 *                     results:
 *                       type: array
 *                       items:
 *                         type: object
 *                     page:
 *                       type: number
 *                     limit:
 *                       type: number
 *                     totalPages:
 *                       type: number
 *                     totalResults:
 *                       type: number
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 */

/**
 * @swagger
 * /tickets/admin:
 *   get:
 *     summary: Get all tickets (admin)
 *     description: Admins can retrieve all tickets.
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [open, closed]
 *         description: Filter by ticket status
 *       - in: query
 *         name: precedence
 *         schema:
 *           type: string
 *           enum: [low, medium, high]
 *         description: Filter by ticket priority
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by start date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by end date
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *         description: Sort by field (e.g., createdAt:desc)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Maximum number of tickets
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number
 *     responses:
 *       "200":
 *         description: OK
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
 *                   example: "All tickets fetched successfully"
 *                 result:
 *                   type: object
 *                   properties:
 *                     results:
 *                       type: array
 *                       items:
 *                         type: object
 *                     page:
 *                       type: number
 *                     limit:
 *                       type: number
 *                     totalPages:
 *                       type: number
 *                     totalResults:
 *                       type: number
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 */

/**
 * @swagger
 * /tickets/{ticketId}:
 *   get:
 *     summary: Get ticket by ID
 *     description: Get details of a specific ticket.
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema:
 *           type: string
 *         description: Ticket ID
 *     responses:
 *       "200":
 *         description: OK
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
 *                   example: "Ticket fetched successfully"
 *                 ticket:
 *                   type: object
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @swagger
 * /tickets/{ticketId}/reply:
 *   post:
 *     summary: Add a reply to a ticket
 *     description: Add a reply to an existing ticket.
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema:
 *           type: string
 *         description: Ticket ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *                 description: Reply message content
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Images related to the reply (max 5, each up to 3MB)
 *     responses:
 *       "200":
 *         description: OK
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
 *                   example: "Reply added successfully"
 *                 ticket:
 *                   type: object
 *       "400":
 *         description: Bad Request
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @swagger
 * /tickets/{ticketId}/close:
 *   patch:
 *     summary: Close a ticket
 *     description: Admin can close a ticket.
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema:
 *           type: string
 *         description: Ticket ID
 *     responses:
 *       "200":
 *         description: OK
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
 *                   example: "Ticket closed successfully"
 *                 ticket:
 *                   type: object
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */ 