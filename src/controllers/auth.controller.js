const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { authService, userService, tokenService, emailService } = require('../services');
const config = require('../config/config');
const ApiError = require('../utils/ApiError');

const { default: axios } = require('axios');
const logger = require('../config/logger');

const register = catchAsync(async (req, res) => {
  try {
    const user = await userService.createNewUser(req.body);


    try {
      const slackPayload = {
        channel: config.slack_channel,
        username: 'Finflex-Backend',
        text: `New user registered => ${JSON.stringify(user)}`,
        icon_emoji: 'ghost',
      };
      await axios.post(config.slack_webhook_url, slackPayload, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      logger.error('Slack notification failed:', error);
      // Don't throw error for slack notification failure
    }
    const tokens = await tokenService.generateAuthTokens(user);
    let userObj = user;
    if (user.role === 'admin') {
      userObj = {
        ...user._doc ? user._doc : user,
        userType: user.userType || null,
        permissions: user.permissions || [],
      };
    }
    res.status(httpStatus.CREATED).send({ success: true, user: userObj, tokens, message: 'User registered successfully' });
  } catch (error) {
    if (error instanceof AggregateError) {
      // Handle multiple errors
      const errorMessages = error.errors.map((err) => err.message).join(', ');
      throw new ApiError(httpStatus.BAD_REQUEST, errorMessages);
    }

    throw error;
  }
});

const registerUser = catchAsync(async (req, res) => {
  const user = await userService.createUser(req.body);
  const tokens = await tokenService.generateAuthTokens(user);
  res.status(httpStatus.CREATED).send({
    success: true,
    user,
    tokens,
    message: 'User registered successfully',
  });
});

const checkUserController = catchAsync(async (req, res) => {
  const { email, phoneNumber } = req.body;

  const result = await authService.checkUser({ email, phoneNumber });
  res.status(httpStatus.OK).send(result);
});

const requestOTP = catchAsync(async (req, res) => {
  try {
    const { phoneNumber, development = false } = req.body;
    const boolDev = development === true || development === 'true' ? true : false;
    const otp = await authService.generateOTP(phoneNumber, boolDev);
    const result = await userService.sendOTP(phoneNumber, otp);
    const response = {
      success: true,
      expireAt: result.expireAt,
      message: 'OTP sent successfully',
    };

    if (boolDev) {
      response.otp = result.otp;
    }
    res.status(httpStatus.CREATED).send(response);
  } catch (error) {
    if (error instanceof AggregateError) {
      const errorMessages = error.errors.map((err) => err.message).join(', ');
      throw new ApiError(httpStatus.BAD_REQUEST, errorMessages);
    }
    throw error;
  }
});

const verifyOTP = catchAsync(async (req, res) => {
  try {
    const { phoneNumber, otp, userDeviceToken } = req.body;
    const data = await authService.verifyOTPByPhone(phoneNumber, otp, userDeviceToken);
    res.status(httpStatus.CREATED).send({ success: true, data, message: 'OTP verified!' });
  } catch (error) {
    if (error instanceof AggregateError) {
      const errorMessages = error.errors.map((err) => err.message).join(', ');
      throw new ApiError(httpStatus.BAD_REQUEST, errorMessages);
    }
    throw error;
  }
});

const login = catchAsync(async (req, res) => {
  try {
    const { emailOrUsername, password } = req.body;
    if (!emailOrUsername || !password) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Please provide both email/username and password');
    }

    const result = await authService.loginUserWithEmailAndPassword(emailOrUsername, password);
    let user = result.user;
    // Ensure userType and permissions are always present for admin
    if (user.role === 'admin') {
      user = {
        ...user._doc ? user._doc : user,
        userType: user.userType || null,
        permissions: user.permissions || [],
      };
    }
    if (user?.twoFAEnabled) {
      return res.status(httpStatus.OK).send({
        success: true,
        twoFARequired: true,
        emailOrUsername: result.user.emailOrUsername,
        password: password,
        email: result.user.email,
        message: '2FA verification required to complete login'
      });
    }
    else {
      return res.send({ success: true, user, tokens: result.tokens });
    }
  } catch (error) {
    if (error instanceof AggregateError) {
      const errorMessages = error.errors.map((err) => err.message).join(', ');
      throw new ApiError(httpStatus.BAD_REQUEST, errorMessages);
    }
    throw error;
  }
});

const logout = catchAsync(async (req, res) => {
  await authService.logout(req.body.refreshToken);
  res.status(httpStatus.NO_CONTENT).send();
});

const refreshTokens = catchAsync(async (req, res) => {
  const tokens = await authService.refreshAuth(req.body.refreshToken);
  res.send({ ...tokens });
});

const senEmailForRecover = catchAsync(async (req, res) => {
  if (req.body.type === 'forgot-password') {
    const resetPasswordToken = await tokenService.generateResetPasswordToken(req.body.email);
    await emailService.sendResetPasswordEmail(req.body.email, resetPasswordToken);
    return res.status(httpStatus.NO_CONTENT).send();
  }
  else {
    const user = await userService.getUserByEmail(req.body.email);
    if (!user) {
      throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
    }
    if (!user.twoFAEnabled) {
      throw new ApiError(httpStatus.NOT_FOUND, 'This Email have not enabled 2FA');
    }
    await emailService.sendSetupPasskeyEmail(user);
    return res.status(httpStatus.NO_CONTENT).send();
  }
});

const resetPassword = catchAsync(async (req, res) => {
  await authService.resetPassword(req.query.token, req.body.password);
  res.status(httpStatus.NO_CONTENT).send();
});

const sendVerificationEmail = catchAsync(async (req, res) => {
  const verifyEmailToken = await tokenService.generateVerifyEmailToken(req.user);
  await emailService.sendVerificationEmail(req.user.email, verifyEmailToken);
  res.status(httpStatus.NO_CONTENT).send();
});

const verifyEmail = catchAsync(async (req, res) => {
  await authService.verifyEmail(req.query.token);
  res.status(httpStatus.NO_CONTENT).send();
});

const changePassword = catchAsync(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const result = await authService.changePassword(req.user.id, oldPassword, newPassword);
  res.status(httpStatus.OK).send(result);
});

module.exports = {
  register,
  login,
  logout,
  refreshTokens,
  senEmailForRecover,
  resetPassword,
  sendVerificationEmail,
  verifyEmail,
  requestOTP,
  verifyOTP,
  registerUser,
  changePassword,
  checkUserController
};
