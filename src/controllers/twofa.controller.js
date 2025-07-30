const { authenticator } = require('otplib');
const qrcode = require('qrcode');
const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { User } = require('../models');
const { tokenService, userService } = require('../services');
const validator = require('validator');

const setup2FA = catchAsync(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) throw new ApiError(httpStatus.NOT_FOUND, 'User not found');

  
  if (user.twoFAEnabled) {
    throw new ApiError(httpStatus.BAD_REQUEST, '2FA is already enabled for this account');
  }


  const secret = authenticator.generateSecret();
  const expiresAt = new Date(Date.now() + (10 * 60 * 1000));

  
  const otpauth = authenticator.keyuri(user.email, 'Finflex', secret);
  const qr = await qrcode.toDataURL(otpauth);

  
  user.twoFASecret = secret;
  user.twoFAExpiresAt = expiresAt;
  await user.save();

  res.status(httpStatus.OK).json({
    success: true,
    qr,
    secret,
    expiresAt,
    message: 'Scan the QR code or use the secret in your authenticator app.'
  });
});


const verify2FA = catchAsync(async (req, res) => {
  const { code } = req.body;
  const user = req.user;
  if (!user) throw new ApiError(httpStatus.NOT_FOUND, 'User not found');

  if (!user.twoFASecret || !user.twoFAExpiresAt) {
    throw new ApiError(httpStatus.BAD_REQUEST, '2FA setup not initiated');
  }
  if (user.twoFAEnabled) {
    throw new ApiError(httpStatus.BAD_REQUEST, '2FA is already enabled');
  }
  if (new Date() > user.twoFAExpiresAt) {
    throw new ApiError(httpStatus.BAD_REQUEST, '2FA setup expired. Please setup again.');
  }

  
  const isValid = authenticator.check(code, user.twoFASecret);
  if (!isValid) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid 2FA code');
  }

  user.twoFAEnabled = true;
  user.twoFAExpiresAt = null;
  await user.save();

  res.status(httpStatus.OK).json({
    success: true,
    message: '2FA enabled successfully.'
  });
});

const verifyLogin2FA = catchAsync(async (req, res) => {
  const { code, emailOrUsername, password } = req.body;
  if (!code || !emailOrUsername || !password) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Both 2FA code, email/username/name and password are required');
  }

  const isEmail = validator.isEmail(emailOrUsername);
  let user;
  if (isEmail) {

    user = await userService.getUserByEmail(emailOrUsername);
  } else {
   
    user = await User.findOne({
      $or: [{ businessName: emailOrUsername }, { 'user_details.name': emailOrUsername }],
    });
  }

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  if (!user.isActive) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Your account has been deactivated. Please contact support.');
  }

  if (!(await user.isPasswordMatch(password))) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Incorrect email/username/name or password');
  }

  if (!user.twoFAEnabled || !user.twoFASecret) {
    throw new ApiError(httpStatus.BAD_REQUEST, '2FA is not enabled for this account');
  } 

  const isValid = authenticator.check(code, user.twoFASecret);    
  if (!isValid) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid 2FA code');
  }

 
  const tokens = await tokenService.generateAuthTokens(user);

  res.status(httpStatus.OK).json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      emailOrUsername: user.emailOrUsername,
      password: password,
      twoFARequired: true
    },
    tokens,
    message: '2FA verification successful'
  });
});

module.exports = {
  setup2FA,
  verify2FA,
  verifyLogin2FA,
}; 