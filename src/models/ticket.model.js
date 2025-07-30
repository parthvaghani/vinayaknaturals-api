const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');
const config = require('../config/config');
const { TICKET_PRECEDENCE, TICKET_STATUS } = require('../utils/constants');

const replySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    images: [
      {
        type: String,
        get: (v) => {
          return config.aws.baseUrl + v;
        },
      },
    ],
    createdAt: {
      type: Date,
      default: Date.now,
    },
  }
);

const ticketSchema = new mongoose.Schema(
  {
    ticketId: {
      type: String,
      required: true,
      unique: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    subject: {
      type: String,
      required: true,
    },
    precedence: {
      type: String,
      enum: Object.values(TICKET_PRECEDENCE),
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    images: [
      {
        type: String,
        get: (v) => {
          return config.aws.baseUrl + v;
        },
      },
    ],
    status: {
      type: String,
      enum: Object.values(TICKET_STATUS),
      default: TICKET_STATUS.OPEN,
      required: true,
    },
    replies: [replySchema],
  },
  { timestamps: true }
);

ticketSchema.plugin(toJSON);
replySchema.plugin(toJSON);
replySchema.set('toJSON', { getters: true });
ticketSchema.plugin(paginate);
ticketSchema.set('toJSON', { getters: true });

const Ticket = mongoose.model('Ticket', ticketSchema);

module.exports = Ticket;
