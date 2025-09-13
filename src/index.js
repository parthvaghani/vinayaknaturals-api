/* eslint-disable no-undef */
const mongoose = require('mongoose');
const { app } = require('./app');
const config = require('./config/config');
const logger = require('./config/logger');
const serverless = require('serverless-http');

if (!config.isServerless) {
  // Express server mode
  let server;
  mongoose.connect(config.mongoose.url, config.mongoose.options).then(() => {
    logger.info('Connected to MongoDB');
    server = app.listen(config.port, () => {
      logger.info(`Listening to port ${config.port}`);
    });
  });

  const exitHandler = () => {
    if (server) {
      server.close(() => {
        logger.info('Server closed');
        process.exit(1);
      });
    } else {
      process.exit(1);
    }
  };

  const unexpectedErrorHandler = (error) => {
    logger.error(error);
    exitHandler();
  };

  process.on('uncaughtException', unexpectedErrorHandler);
  process.on('unhandledRejection', unexpectedErrorHandler);

  process.on('SIGTERM', () => {
    logger.info('SIGTERM received');
    if (server) {
      server.close();
    }
  });

  module.exports = { handler: serverless(app) };
} else {
  // Serverless mode
  let isConnected = false;

  const mongooseOptions = {
    ...config.mongoose.options,
    connectTimeoutMS: 10000, // 10 seconds
    socketTimeoutMS: 30000, // 30 seconds
    serverSelectionTimeoutMS: 5000, // 5 seconds
    maxPoolSize: 10,
    retryWrites: true,
    bufferCommands: false, // Disable mongoose buffering
  };

  const connectToDatabase = async () => {
    if (isConnected) {
      logger.info('Using existing database connection');
      return;
    }

    try {
      logger.info('Connecting to MongoDB...');
      await mongoose.connect(config.mongoose.url, mongooseOptions);
      isConnected = true;
      logger.info('Connected to MongoDB');
    } catch (error) {
      logger.error('MongoDB connection error:', error);
      throw error;
    }
  };

  const handler = async (event, context) => {
    // Set Lambda context to not wait for empty event loop
    context.callbackWaitsForEmptyEventLoop = false;

    try {
      // Ensure database connection
      await connectToDatabase();

      // Handle the request with serverless-http
      const serverlessHandler = serverless(app);
      return await serverlessHandler(event, context);
    } catch (error) {
      logger.error('Lambda handler error:', error);

      // Return proper error response
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          error: 'Internal server error',
          message: error.message,
        }),
      };
    }
  };

  module.exports = { handler };
}
