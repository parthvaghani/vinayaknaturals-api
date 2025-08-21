const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  address: {
    addressLine1: {
      type: String,
      required: true,
    },
    addressLine2: {
      type: String,
      required: true,
    },
    city: {
      type: String,
      required: true,
    },
    state: {
      type: String,
      required: true,
    },
    zip: {
      type: String,
      required: true,
    },
    country: {
      type: String,
      default: 'IND',
    }
  },
  productsDetails: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
      },
      weightVariant: {
        type: String,
        required: true
      },
      weight: {
        type: String,
        required: true
      },
      pricePerUnit: {
        type: Number,
        required: true
      },
      discount: {
        type: Number,
        default: 0
      },
      totalUnit: {
        type: Number,
        default: 0
      }
    }
  ],
  phoneNumber: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['placed', 'accepted', 'inprogress', 'completed', 'cancelled', 'delivered'],
    default: 'placed'
  },
  statusHistory: [
    {
      status: {
        type: String,
        enum: ['placed', 'accepted', 'inprogress', 'completed', 'cancelled', 'delivered'],
        required: true
      },
      note: {
        type: String,
        default: null
      },
      updatedBy: {
        type: String,
        enum: ['user', 'admin', 'system'],
        default: 'system'
      },
      date: {
        type: Date,
        default: Date.now
      }
    }
  ],
  cancelDetails: {
    reason: {
      type: String,
      default: null
    },
    canceledBy: {
      type: String,
      enum: ['user', 'admin']
    },
    date: {
      type: Date
    }
  }
}, {
  timestamps: true,
});

module.exports = mongoose.model('Orders', orderSchema);
