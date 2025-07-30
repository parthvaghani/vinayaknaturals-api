const httpStatus = require('http-status');
const { Ticket } = require('../models');
const ApiError = require('../utils/ApiError');
const { TICKET_STATUS } = require('../utils/constants');

/**
 * Generate a unique ticket ID
 * @returns {string} Unique ticket ID
 */
const generateTicketId = async () => {
  const prefix = 'SUP';
  const randomNum = Math.floor(100000 + (Math.random() * 900000)); // 6-digit random number
  const ticketId = `${prefix}${randomNum}`;

  // Check if ID already exists
  const existingTicket = await Ticket.findOne({ ticketId });
  if (existingTicket) {
    // If exists, try again
    return generateTicketId();
  }

  return ticketId;
};

/**
 * Create a new ticket
 * @param {ObjectId} userId - User ID
 * @param {Object} ticketBody - Ticket data
 * @returns {Promise<Ticket>}
 */
const createTicket = async (userId, ticketBody) => {
  const ticketId = await generateTicketId();

  // Convert precedence to lowercase to match enum values
  const precedence = ticketBody.precedence.toLowerCase();

  return Ticket.create({
    ticketId,
    userId,
    subject: ticketBody.subject,
    precedence,
    message: ticketBody.message,
    images: ticketBody.images || [],
    replies: [],
    status: TICKET_STATUS.OPEN,
  });
};

/**
 * Query for tickets
 * @param {Object} filter - Filter options
 * @param {Object} options - Query options
 * @returns {Promise<QueryResult>}
 */
const queryTickets = async (filter, options) => {
  options.populate = 'userId';

  const data = await Ticket.paginate(filter, options);

  const tickets = data.results.map(ticket => {
    const ticketObj = ticket.toObject();
    const { email, user_details, _id: userId, phoneNumber, businessName } = ticketObj.userId;
    return {
      ...ticketObj,
      userId: userId,
      userDetails: {
        email,
        name: user_details.name,
        phoneNumber,
        businessName,
      },
    };
  });
  return tickets;
};

/**
 * Get ticket by id
 * @param {ObjectId} id - Ticket ID
 * @returns {Promise<Ticket>}
 */
const getTicketById = async (id) => {
  return Ticket.findById(id)
    .populate('userId', 'businessName email user_details.name user_details.avatar role')
    .populate('replies.userId', 'businessName email user_details.name user_details.avatar');
};

/**
 * Get ticket by ticketId string
 * @param {string} ticketId - Ticket ID string
 * @returns {Promise<Ticket>}
 */
const getTicketByTicketId = async (ticketId) => {
  return Ticket.findOne({ ticketId }).populate('userId', 'email phoneNumber businessName user_details.name');
};

/**
 * Get tickets by user id
 * @param {ObjectId} userId - User ID
 * @param {Object} options - Query options
 * @param {Object} filter - Filter options
 * @returns {Promise<QueryResult>}
 */
const getTicketsByUserId = async (userId, options, filter = {}) => {
  const filters = { userId, ...filter };
  const tickets = await Ticket.paginate(filters, options);
  return tickets;
};

/**
 * Update ticket status
 * @param {ObjectId} ticketId - Ticket ID
 * @param {string} status - New status
 * @returns {Promise<Ticket>}
 */
const updateTicketStatus = async (ticketId, status) => {
  const ticket = await getTicketById(ticketId);

  if (!ticket) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Ticket not found');
  }

  ticket.status = status;
  await ticket.save();

  return ticket;
};

/**
 * Add a reply to a ticket
 * @param {ObjectId} ticketId - Ticket ID
 * @param {ObjectId} userId - User ID
 * @param {Object} replyBody - Reply data
 * @returns {Promise<Ticket>}
 */
const addTicketReply = async (ticketId, user, replyBody) => {
  const ticket = await getTicketById(ticketId);

  if (!ticket) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Ticket not found');
  }

  // Only the ticket owner or admin can reply
  if (ticket.userId._id.toString() !== user.id && user.role !== 'admin') {
    throw new ApiError(httpStatus.FORBIDDEN, 'Not authorized to reply to this ticket');
  }

  const reply = {
    userId: user.id,
    message: replyBody.message,
    images: replyBody.images || [],
    createdAt: new Date(),
  };

  ticket.replies.push(reply);
  await ticket.save();

  return ticket;
};

module.exports = {
  createTicket,
  queryTickets,
  getTicketById,
  getTicketByTicketId,
  getTicketsByUserId,
  updateTicketStatus,
  addTicketReply,
};