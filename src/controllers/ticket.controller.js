const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { ticketService, userService } = require('../services');
const ApiError = require('../utils/ApiError');
const pick = require('../utils/pick');
const { TICKET_STATUS } = require('../utils/constants');
const { Ticket } = require('../models');

/**
 * Create a new ticket
 */
const createTicket = catchAsync(async (req, res) => {
  const { subject, precedence, message } = req.body;
  const userId = req.user.id;

  // Handle ticket images if present
  let images = [];
  if (req.files && req.files.length > 0) {
    // Upload each image to S3
    const uploadPromises = req.files.map(async (file) => {
      return userService.uploadProfileImageS3(userId, file, 'tickets');
    });

    images = await Promise.all(uploadPromises);
  }

  const ticket = await ticketService.createTicket(userId, { subject, precedence, message, images });
  res.status(httpStatus.CREATED).send({
    success: true,
    message: 'Ticket created successfully',
    ticket,
  });
});

/**
 * Get all tickets for a user
 */
const getUserTickets = catchAsync(async (req, res) => {
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const filter = pick(req.query, ['status']);

  // Add date range filters if provided
  const { startDate, endDate } = req.query;
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) {
      filter.createdAt.$gte = new Date(startDate);
    }
    if (endDate) {
      filter.createdAt.$lte = new Date(endDate);
    }
  }

  const result = await ticketService.getTicketsByUserId(req.user.id, options, filter);
  res.status(httpStatus.OK).send({
    success: true,
    message: 'Tickets fetched successfully',
    ...result,
  });
});

/**
 * Get all tickets (admin only)
 */
const getAllTickets = catchAsync(async (req, res) => {
  if (req.user.role !== 'admin') {
    throw new ApiError(httpStatus.FORBIDDEN, 'Only admin can view all tickets');
  }

  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const filter = pick(req.query, ['status', 'precedence']);

  // If userId is provided, filter tickets by that user
  if (req.query.userId) {
    filter.userId = req.query.userId;
  }

  // Add date range filters if provided
  const { startDate, endDate } = req.query;
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) {
      filter.createdAt.$gte = new Date(startDate);
    }
    if (endDate) {
      filter.createdAt.$lte = new Date(endDate);
    }
  }

  const totalData = await Ticket.countDocuments();

  const result = await ticketService.queryTickets(filter, options);

  res.status(httpStatus.OK).send({
    success: true,
    message: 'All tickets fetched successfully',
    results: result,
    limit: options.limit,
    page: options.page,
    totalPages: Math.ceil(totalData / options.limit),
    totalResults: totalData,
  });
});

/**
 * Get a ticket by ID
 */
const getTicketById = catchAsync(async (req, res) => {
  const ticket = await ticketService.getTicketById(req.params.ticketId);
  if (!ticket) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Ticket not found');
  }

  if (ticket.userId._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new ApiError(httpStatus.FORBIDDEN, 'Not authorized to view this ticket');
  }

  res.status(httpStatus.OK).send({
    success: true,
    message: 'Ticket fetched successfully',
    ticket,
  });
});

/**
 * Add a reply to a ticket
 */
const addTicketReply = catchAsync(async (req, res) => {
  const { ticketId } = req.params;
  const { message } = req.body;
  const userId = req.user.id;

  // Handle reply images if present
  let images = [];
  if (req.files && req.files.length > 0) {
    // Upload each image to S3
    const uploadPromises = req.files.map(async (file) => {
      return userService.uploadProfileImageS3(userId, file, 'tickets/replies');
    });

    images = await Promise.all(uploadPromises);
  }

  const ticket = await ticketService.addTicketReply(ticketId, req.user, { message, images });

  res.status(httpStatus.OK).send({
    success: true,
    message: 'Reply added successfully',
    ticket,
  });
});

/**
 * Close a ticket (admin only)
 */
const closeTicket = catchAsync(async (req, res) => {
  const ticket = await ticketService.updateTicketStatus(req.params.ticketId, TICKET_STATUS.CLOSED);

  res.status(httpStatus.OK).send({
    success: true,
    message: 'Ticket closed successfully',
    ticket,
  });
});

module.exports = {
  createTicket,
  getUserTickets,
  getAllTickets,
  getTicketById,
  addTicketReply,
  closeTicket,
};
