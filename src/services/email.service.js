/* eslint-disable no-undef */
const nodemailer = require('nodemailer');
const config = require('../config/config');
const logger = require('../config/logger');

const transport = nodemailer.createTransport(
  {
    host: config.email.smtp.host,
    port: config.email.smtp.port,
    secure: config.email.smtp.secure,
    auth: {
      user: config.email.smtp.auth.user,
      pass: config.email.smtp.auth.pass,
    },
    tls: {
      rejectUnauthorized: false,
    },
  }
);
/* istanbul ignore next */
if (config.env !== 'local') {
  transport
    .verify()
    .then(() => logger.info('Connected to email server'))
    .catch(() => logger.warn('Unable to connect to email server. Make sure you have configured the SMTP options in .env'));
}

/**
 * Send an email
 * @param {string} to
 * @param {string} subject
 * @param {string} text
 * @returns {Promise}
 */
const sendEmail = async (to, subject, html) => {
  const msg = { from: config.email.from, to, subject, html };
  await transport.sendMail(msg);
};

/**
 * Send reset password email
 * @param {string} to
 * @param {string} token
 * @returns {Promise}
 */
const sendResetPasswordEmail = async (to, token) => {
  const subject = 'Reset Password';
  const resetPasswordUrl = `${config.frontEndBaseUrl}/auth/reset-password?token=${token}`;

  const html = `
  <div style="font-family: Arial, sans-serif; background-color: #f5f7fa; padding: 20px;">
    <div style="max-width: 600px; margin: auto; background: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
    <img src="https://finflexinfras.com/company-icon.svg" alt="Finflex" style="width: 100px; height: 100px; margin: 0 auto; display: block;">
      <h2 style="color: #36ACA0;">🔐 Reset Your Password</h2>
      <p style="font-size: 16px; color: #555;">Dear user,</p>
      <p style="font-size: 16px; color: #555;">To reset your password, please click the button below:</p>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetPasswordUrl}" target="_blank" style="background-color: #36ACA0; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; font-size: 16px;">Reset Password</a>
      </div>

      <p style="font-size: 16px; color: #e74c3c;"><strong>⚠️ If you did not request this, please ignore this email.</strong></p>

      <hr style="margin-top: 30px; border: none; border-top: 1px solid #eee;" />
      <p style="font-size: 12px; color: #aaa; text-align: center;">© ${new Date().getFullYear()} Finflex. All rights reserved.</p>
    </div>
  </div>
  `;

  await sendEmail(to, subject, html);
};


const sendSetupPasskeyEmail = async (user) => {
  const subject = 'Setup Passkey';
  const html = `
  <div style="font-family: Arial, sans-serif; background-color: #f8f9fa; padding: 20px;">
    <div style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 8px; padding: 30px; box-shadow: 0 0 10px rgba(0,0,0,0.05);">
    <img src="https://finflexinfras.com/company-icon.svg" alt="Finflex" style="width: 100px; height: 100px; margin: 0 auto; display: block;">
      <h2 style="color: #36ACA0; text-align: center;">🔐 Setup Your 2FA Passkey</h2>
      <p style="font-size: 16px; color: #555;">Dear user,</p>
      <p style="font-size: 16px; color: #555;">To set up your passkey and enable 2FA, please follow the steps below:</p>

      <ol style="font-size: 16px; color: #333; padding-left: 20px;">
        <li>Open the <strong>Google Authenticator</strong> app on your phone.</li>
        <li>Tap the <strong>"+"</strong> icon to add a new account.</li>
        <li>Select <strong>"Enter a setup key"</strong>.</li>
        <li>Enter an account name (e.g., Finflex: ${user?.email}).</li>
        <li>Paste the following secret key into the "Key" field:</li>
      </ol>

      <div style="margin: 20px 0; padding: 15px; background-color: #36ACA0; border: 1px dashed #ccc; font-size: 16px; text-align: center; color: #FFF; word-break: break-all;">
        <strong>${user?.twoFASecret}</strong>
      </div>

      <p style="font-size: 16px; color: #555;">Once you save it, the app will begin generating 6-digit codes every 30 seconds. Use these codes to log in securely.</p>

      <p style="font-size: 16px; color: #e74c3c;"><strong>⚠️ If you did not request this, please ignore this email.</strong></p>

      <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;" />
      <p style="text-align: center; font-size: 13px; color: #aaa;">© ${new Date().getFullYear()} Finflex. All rights reserved.</p>
    </div>
  </div>
  `;

  await sendEmail(user?.email, subject, html);
};


/**
 * Send verification email
 * @param {string} to
 * @param {string} token
 * @returns {Promise}
 */
const sendVerificationEmail = async (to, token) => {
  const subject = 'Email Verification';
  // replace this url with the link to the email verification page of your front-end app
  const verificationEmailUrl = `${process.env.FRONT_END_BASE_URL}/verify-email?token=${token}`;
  const text = `Dear user,
To verify your email, click on this link: ${verificationEmailUrl}
If you did not create an account, then ignore this email.`;
  await sendEmail(to, subject, text);
};

module.exports = {
  transport,
  sendEmail,
  sendResetPasswordEmail,
  sendVerificationEmail,
  sendSetupPasskeyEmail
};
