const express = require('express');
const helmet = require('helmet');
const xss = require('xss-clean');
const mongoSanitize = require('express-mongo-sanitize');
const compression = require('compression');
const cors = require('cors');
const httpStatus = require('http-status');
const config = require('./config/config');
const morgan = require('./config/morgan');
const { authLimiter } = require('./middlewares/rateLimiter');
const routes = require('./routes/v1');
const { errorConverter, errorHandler } = require('./middlewares/error');
const bodyParser = require('body-parser');

const app = express();

if (config.env !== 'local') {
  app.use(morgan.successHandler);
  app.use(morgan.errorHandler);
}

// set security HTTP headers
app.use(helmet());

// parse json request body
app.use(express.json());

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

// parse application/json
app.use(bodyParser.json());

// parse urlencoded request body
app.use(express.urlencoded({ extended: true }));

// sanitize request data
app.use(xss());
app.use(mongoSanitize());

// gzip compression
app.use(compression());

// enable cors
app.use(cors());
app.options('*', cors());

if (config.env === 'development') {
  app.use('/v1/auth', authLimiter);
}

// v1 api routes
app.use('/v1', routes);

app.get('/', (req, res) => {
  res.status(httpStatus.OK).send({ status: 'Health Check :) Server is up and running' });
});

// convert error to ApiError, if needed
app.use(errorConverter);

// handle error
app.use(errorHandler);

// send back a 404 error for any unknown api request
app.use((req, res) => {
  res.status(httpStatus.NOT_FOUND).json({
    code: httpStatus.NOT_FOUND,
    message: 'Not found',
  });
});

module.exports = { app };
