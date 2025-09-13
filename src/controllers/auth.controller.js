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
        username: 'Aavkar Backend',
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
        ...(user._doc ? user._doc : user),
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

const login = catchAsync(async (req, res) => {
  const { emailOrUsername, password } = req.body;

  if (!emailOrUsername || !password) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Please provide both email/username and password');
  }

  const result = await authService.loginUserWithEmailAndPassword(emailOrUsername, password);

  if (!result.user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Login failed. Please try again.');
  }

  const tokens = await tokenService.generateAuthTokens(result.user);
  return res.status(httpStatus.OK).send({
    success: true,
    user: result.user,
    tokens,
    message: 'Login successful',
  });
});
const logout = catchAsync(async (req, res) => {
  await authService.logout(req.body.refreshToken);
  res.status(httpStatus.NO_CONTENT).send();
});

const refreshTokens = catchAsync(async (req, res) => {
  const tokens = await authService.refreshAuth(req.body.refreshToken);
  res.send({ ...tokens });
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
  resetPassword,
  sendVerificationEmail,
  verifyEmail,
  registerUser,
  changePassword,
  checkUserController,
};
