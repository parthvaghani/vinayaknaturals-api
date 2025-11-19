const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const { toJSON, paginate } = require('./plugins');
const { roles } = require('../config/roles');
const config = require('../config/config');

const userSchema = mongoose.Schema(
  {
    email: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
      validate(value) {
        if (!validator.isEmail(value)) {
          throw new Error('Invalid email');
        }
      },
    },
    phoneNumber: {
      type: String,
      allowNull: true,
      validate: {
        validator: function (v) {
          // Validate international phone number format
          return /^\+[1-9]\d{1,14}$/.test(v);
        },
        message: (props) => `${props.value} is not a valid international phone number!`,
      },
    },
    password: {
      type: String,
      trim: true,
      validate(value) {
        // Allow empty password for guest users
        if (value === '') {
          return true;
        }
        // For non-empty passwords, enforce validation rules
        if (value.length < 8) {
          throw new Error('Password must be at least 8 characters long');
        }
        if (!value.match(/\d/) || !value.match(/[a-zA-Z]/)) {
          throw new Error('Password must contain at least one letter and one number');
        }
      },
      private: true,
    },
    user_details: {
      name: {
        type: String,
        trim: true,
      },
      country: {
        type: String,
        trim: true,
      },
      city: {
        type: String,
        trim: true,
      },
      zip: {
        type: String,
        trim: true,
      },
      address: {
        type: String,
        trim: true,
      },
      avatar: {
        type: String,
        trim: true,
        get: function (v) {
          if (!v) return v;
          if (v.startsWith('http')) return v;
          return `${config.aws.baseUrl}${v}`;
        },
      },
    },
    acceptedTerms: {
      type: Boolean,
      default: false,
    },
    role: {
      type: String,
      enum: roles,
      default: 'user',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    profileCompleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

// Plugins
userSchema.plugin(toJSON);
userSchema.plugin(paginate);
userSchema.set('toJSON', { getters: true });

// Add pre-hooks for find operations to add AWS base URL to avatar
userSchema.pre('find', function () {
  this._addAwsBaseUrl = true;
});

userSchema.pre('findOne', function () {
  this._addAwsBaseUrl = true;
});

// Add post-hooks to transform avatar URL in query results
userSchema.post('find', function (docs) {
  if (this._addAwsBaseUrl && docs && docs.length) {
    docs.forEach((doc) => {
      if (doc.user_details && doc.user_details.avatar && !doc.user_details.avatar.startsWith('http')) {
        doc.user_details.avatar = `${config.aws.baseUrl}${doc.user_details.avatar}`;
      }
    });
  }
});

userSchema.post('findOne', function (doc) {
  if (
    this._addAwsBaseUrl &&
    doc &&
    doc.user_details &&
    doc.user_details.avatar &&
    !doc.user_details.avatar.startsWith('http')
  ) {
    doc.user_details.avatar = `${config.aws.baseUrl}${doc.user_details.avatar}`;
  }
});

// Check if email is taken
userSchema.statics.isEmailTaken = async function (email, excludeUserId) {
  const user = await this.findOne({ email, _id: { $ne: excludeUserId } });
  return !!user;
};

// Check if phone number is taken
userSchema.statics.isPhoneNumberTaken = async function (phoneNumber, excludeUserId) {
  const user = await this.findOne({ phoneNumber, _id: { $ne: excludeUserId } });
  return !!user;
};

// Password match
userSchema.methods.isPasswordMatch = async function (password) {
  if (!password || !this.password) {
    return false;
  }
  return bcrypt.compare(password, this.password);
};

// Encrypt password before saving
userSchema.pre('save', async function (next) {
  if (this.isModified('password') && this.password !== '') {
    // Only hash non-empty passwords (skip for guest users)
    this.password = await bcrypt.hash(this.password, 8);
  }
  next();
});

/**
 * @typedef User
 */
const User = mongoose.model('User', userSchema);
module.exports = User;
