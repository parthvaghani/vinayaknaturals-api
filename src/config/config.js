/* eslint-disable no-undef */
const dotenv = require('dotenv');
const path = require('path');
const Joi = require('joi');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const envVarsSchema = Joi.object()
  .keys({
    NODE_ENV: Joi.string().valid('production', 'development').required(),
    PORT: Joi.number().default(3000),
    MONGODB_URL: Joi.string().required().description('Mongo DB url'),
    JWT_SECRET: Joi.string().required().description('JWT secret key'),
    JWT_ACCESS_EXPIRATION_MINUTES: Joi.number().default(30).description('minutes after which access tokens expire'),
    JWT_REFRESH_EXPIRATION_DAYS: Joi.number().default(30).description('days after which refresh tokens expire'),
    JWT_RESET_PASSWORD_EXPIRATION_MINUTES: Joi.number()
      .default(10)
      .description('minutes after which reset password token expires'),
    JWT_VERIFY_EMAIL_EXPIRATION_MINUTES: Joi.number()
      .default(10)
      .description('minutes after which verify email token expires'),
    SMTP_HOST: Joi.string().description('server that will send the emails'),
    SMTP_PORT: Joi.number().description('port to connect to the email server'),
    SMTP_USERNAME: Joi.string().description('username for email server'),
    SMTP_PASSWORD: Joi.string().description('password for email server'),
    EMAIL_FROM: Joi.string().description('the from field in the emails sent by the app'),
    FRONT_END_BASE_URL: Joi.string().description('the from field in the emails sent by the app'),
    AWS_ACCESS_KEY_ID: Joi.string().description('aws access key'),
    AWS_SECRET_ACCESS_KEY: Joi.string().description('aws secret access key'),
    AWS_S3_BUCKET_NAME: Joi.string().description('aws s3 bucket name'),
    AWS_S3_BASE_URL: Joi.string().description('aws s3 images base url'),
    IS_SERVERLESS: Joi.boolean().default(false).description('Whether to run in serverless mode'),
  })
  .unknown();

const { value: envVars, error } = envVarsSchema.prefs({ errors: { label: 'key' } }).validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

module.exports = {
  env: envVars.NODE_ENV,
  baseUrl: envVars.BASE_URL,
  port: envVars.PORT,
  mongoose: {
    url: `${envVars.MONGODB_URL}aavkar-development`,
    options: {},
  },
  jwt: {
    secret: envVars.JWT_SECRET,
    accessExpirationMinutes: envVars.JWT_ACCESS_EXPIRATION_MINUTES,
    refreshExpirationDays: envVars.JWT_REFRESH_EXPIRATION_DAYS,
    resetPasswordExpirationMinutes: envVars.JWT_RESET_PASSWORD_EXPIRATION_MINUTES,
    verifyEmailExpirationMinutes: envVars.JWT_VERIFY_EMAIL_EXPIRATION_MINUTES,
  },
  aws: {
    accessKeyId: envVars.AWS_ACCESS_KEY_ID,
    secretKey: envVars.AWS_SECRET_ACCESS_KEY,
    bucketName: envVars.AWS_S3_BUCKET_NAME,
    baseUrl: envVars.AWS_S3_BASE_URL,
  },
  email: {
    smtp: {
      host: envVars.SMTP_HOST,
      port: envVars.SMTP_PORT,
      auth: {
        user: envVars.SMTP_USERNAME,
        pass: envVars.SMTP_PASSWORD,
      },
    },
    from: envVars.EMAIL_FROM,
  },
  isServerless: envVars.IS_SERVERLESS,
  frontEndBaseUrl: envVars.FRONT_END_BASE_URL,
  sellerRecipients: envVars.SELLER_RECIPIENTS ? envVars.SELLER_RECIPIENTS.split(',').map((email) => email.trim()) : [],
};
