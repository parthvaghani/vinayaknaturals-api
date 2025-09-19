const nodemailer = require('nodemailer');
const moment = require('moment');
const config = require('../config/config');
const logger = require('../config/logger');

const SELLER_RECIPIENTS = config.sellerRecipients;

/* ---------- Transporter ---------- */
const buildTransporter = () => {
  const { host, port, auth } = config.email.smtp || {};
  if (!host || !port) throw new Error('SMTP config missing host/port');

  return nodemailer.createTransport({
    host,
    port: Number(port),
    secure: String(port) === '465',
    auth: auth?.user && auth?.pass ? { user: auth.user, pass: auth.pass } : undefined,
  });
};

const sendMail = async (options) => {
  const transporter = buildTransporter();
  const from = config.email.from || 'no-reply@aavkar.com';
  await transporter.sendMail({ from, ...options });
};

/* ---------- Helpers ---------- */
const formatMoney = (val) => `₹${val}`;
const formatDate = (date) => (date ? moment(date).utcOffset(330).format('DD/MM/YYYY, hh:mm:ss A') : '');
const joinAddress = (a = {}) =>
  [a.addressLine1, a.addressLine2, a.city, `${a.state}${a.zip ? ` ${a.zip}` : ''}`, a.country].filter(Boolean).join('<br/>');

/* ---------- Order Summary (plain text) ---------- */
const formatOrderSummary = (order) =>
  (order?.productsDetails || [])
    .map((item) => {
      const weight = item.weightVariant && item.weight ? `${item.weight}${item.weightVariant}` : '';
      return `- Product: ${String(item.productId)} | Qty: ${item.totalUnit} | Weight: ${weight} | Price: ${item.pricePerUnit || 0} | Discount: ${item.discount || 0}`;
    })
    .join('\n');

/* ---------- Table Builder ---------- */
const buildProductRows = (order, trackTotals = { subtotal: 0, discount: 0 }) =>
  (order?.productsDetails || [])
    .map((item) => {
      const qty = item.totalUnit || 0;
      const price = +item.pricePerUnit || 0;
      const discount = +item.discount || 0;
      const lineTotal = (price - discount) * qty;

      trackTotals.subtotal += price * qty;
      trackTotals.discount += discount * qty;

      return `
      <tr>
        <td style="padding:10px;border:1px solid #e5e7eb;">${item?.productId?.name || item.productId}</td>
        <td style="padding:10px;border:1px solid #e5e7eb;">${item.weight ? `${item.weight}${item.weightVariant || ''}` : ''}</td>
        <td style="padding:10px;border:1px solid #e5e7eb;text-align:center;">${qty}</td>
        <td style="padding:10px;border:1px solid #e5e7eb;">${formatMoney(price)}</td>
        <td style="padding:10px;border:1px solid #e5e7eb;">${formatMoney(discount)}</td>
        <td style="padding:10px;border:1px solid #e5e7eb;">${formatMoney(lineTotal)}</td>
      </tr>`;
    })
    .join('');

/* ---------- Common Layout Wrapper ---------- */
const wrapMail = (content) => `
  <div style="font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111827;background:#d9ead3;padding:20px;">
    <div style="max-width:600px;margin:auto;background:#F5FFF6;padding:24px;border-radius:12px;box-shadow:0 2px 6px rgba(0,0,0,0.1);">
      <div style="text-align:center;margin-bottom:20px;">
        <img src="https://aavkarmukhwas.github.io/images/aavkar-logo/logo.png" alt="Aavkar Mukhwas" style="height:60px;display:block;margin:0 auto 8px;"/>
        <div style="font-size:1.25rem;font-weight:700;color:#257112;">Aavkar Mukhwas</div>
      </div>
      ${content}
    </div>
  </div>`;

/* ---------- Buyer HTML ---------- */
const buildBuyerOrderHtml = (order, buyerName) => {
  const totals = { subtotal: 0, discount: 0 };
  const productRows = buildProductRows(order, totals);
  const total = totals.subtotal - totals.discount;

  return wrapMail(`
    <h2 style="text-align:center;">Your order has been placed successfully</h2>
    <p>Hi ${buyerName || 'Customer'},</p>
    <p>Thanks for your purchase! Your order has been placed successfully.</p>
    <p><strong>Order ID:</strong> ${order?._id || ''}<br/>
    <strong>Order Date:</strong> ${formatDate(order?.createdAt)}</p>

    <h3>Delivery Address</h3>
    <p>${joinAddress(order?.address)}</p>

    <h3>Order Summary</h3>
    ${buildOrderTable(productRows, totals, total)}

    <p style="text-align:center;font-size:12px;color:#6b7280;margin-top:20px;">
  Thank you for shopping with <strong>Aavkar Mukhwas</strong>.<br>
  © ${new Date().getFullYear()} Aavkar Mukhwas. All rights reserved.
</p>
  `);
};

/* ---------- Seller HTML ---------- */
const buildSellerOrderHtml = (buyerEmail, order, buyerName) => {
  const totals = { subtotal: 0, discount: 0 };
  const productRows = buildProductRows(order, totals);
  const total = totals.subtotal - totals.discount;

  return wrapMail(`
    <h2 style="text-align:center;">📦 New Order Received</h2>
    <p><strong>Order ID:</strong> ${order?._id}<br/>
    <strong>Order Date:</strong> ${formatDate(order?.createdAt)}<br/>
    <strong>Buyer:</strong> ${buyerName || ''} (${buyerEmail || ''})<br/>
    <strong>Phone:</strong> ${order?.phoneNumber || ''}</p>

    <h3>Delivery Address</h3>
    <p>${joinAddress(order?.address)}</p>

    <h3>Order Items</h3>
    ${buildOrderTable(productRows, totals, total)}
  `);
};

/* ---------- Order Table Generator ---------- */
const buildOrderTable = (rows, totals, total) => `
  <div style="overflow-x:auto;">
    <table style="border-collapse:collapse;width:100%;font-size:14px;">
      <thead>
        <tr style="background:#f3f4f6;">
          <th style="padding:10px;border:1px solid #e5e7eb;">Product</th>
          <th style="padding:10px;border:1px solid #e5e7eb;">Weight</th>
          <th style="padding:10px;border:1px solid #e5e7eb;">Qty</th>
          <th style="padding:10px;border:1px solid #e5e7eb;">Price</th>
          <th style="padding:10px;border:1px solid #e5e7eb;">Discount</th>
          <th style="padding:10px;border:1px solid #e5e7eb;">Total</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot>
      <tr>
        <td colspan="5" style="padding:10px;text-align:right;font-weight:bold;border:1px solid #e5e7eb;">Subtotal:</td>
        <td style="padding:10px;border:1px solid #e5e7eb;">${formatMoney(totals.subtotal)}</td>
      </tr>
      <tr>
        <td colspan="5" style="padding:10px;text-align:right;font-weight:bold;border:1px solid #e5e7eb;">Discount:</td>
        <td style="padding:10px;border:1px solid #e5e7eb;">- ${formatMoney(totals.discount)}</td>
      </tr>
      <tr style="background:#f9fafb;">
        <td colspan="5" style="padding:12px;text-align:right;font-weight:bold;border:1px solid #e5e7eb;">Grand Total:</td>
        <td style="padding:12px;border:1px solid #e5e7eb;font-weight:bold;">${formatMoney(total)}</td>
      </tr>
    </tfoot>
    </table>
  </div>`;

/* ---------- Public APIs ---------- */
const sendVerificationEmail = async (to, token) => {
  try {
    const url = `${config.frontEndBaseUrl || ''}/verify-email?token=${encodeURIComponent(token)}`;
    await sendMail({
      to,
      subject: 'Verify your email',
      text: `Please verify your email by clicking: ${url}`,
      html: `<p>Please verify your email by clicking the link below:</p><p><a href="${url}">Verify Email</a></p>`,
    });
  } catch (err) {
    logger.error('Failed to send verification email', err);
    throw err;
  }
};

const sendResetPasswordEmail = async (to, token, role = 'user') => {
  try {
    const baseUrl = role === 'admin' ? config.frontEndBaseUrlAdmin : config.frontEndBaseUrl;
    const path = role === 'admin' ? '/reset-password' : '/auth/reset-password';
    const url = `${baseUrl}${path}?token=${encodeURIComponent(token)}`;
    const resetPasswordHtml = wrapMail(`
      <h2 style="text-align:center;">🔐 Reset Your Password</h2>
      <p>Hi there,</p>
      <p>We received a request to reset your password for your Aavkar Mukhwas account.</p>
      <p>Click the button below to reset your password:</p>
      <div style="text-align:center;margin:30px 0;">
        <a href="${url}" style="background:#257112;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">Reset Password</a>
      </div>
      <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
      <p style="word-break:break-all;color:#6b7280;font-size:14px;">${url}</p>
      <p><strong>Important:</strong> This link will expire in 10 minutes for security reasons.</p>
      <p>If you didn't request this password reset, please ignore this email. Your password will remain unchanged.</p>
      <p style="text-align:center;font-size:12px;color:#6b7280;margin-top:20px;">
        Thank you for choosing <strong>Aavkar Mukhwas</strong>.<br>
        © ${new Date().getFullYear()} Aavkar Mukhwas. All rights reserved.
      </p>
    `);

    await sendMail({
      to,
      subject: 'Reset Your Password - Aavkar Mukhwas',
      text: `Reset your password by clicking this link: ${url}`,
      html: resetPasswordHtml,
    });
  } catch (err) {
    logger.error('Failed to send reset password email', err);
    throw err;
  }
};

const sendOrderPlacedEmailForBuyer = async (buyerEmail, order, buyerName) => {
  if (!buyerEmail) return;
  try {
    await sendMail({
      to: buyerEmail,
      subject: 'Your order has been placed successfully',
      text: formatOrderSummary(order),
      html: buildBuyerOrderHtml(order, buyerName),
    });
  } catch (err) {
    logger.error('Failed to send order email to buyer', err);
  }
};

const sendOrderPlacedEmailForSeller = async (buyerEmail, order, buyerName) => {
  if (!buyerEmail) return;
  try {
    await sendMail({
      to: SELLER_RECIPIENTS.join(','),
      subject: 'New order received',
      text: formatOrderSummary(order),
      html: buildSellerOrderHtml(buyerEmail, order, buyerName),
    });
  } catch (err) {
    logger.error('Failed to send order email to seller(s)', err);
  }
};

/* ---------- Status Update Email Functions ---------- */
const statusMessages = {
  placed: 'Your order has been placed and is being reviewed.',
  accepted: 'Your order has been accepted and is being prepared.',
  inprogress: 'Your order is now being processed.',
  completed: 'Your order has been completed and is ready for delivery.',
  delivered: 'Your order has been delivered successfully.',
  cancelled: 'Your order has been cancelled.',
};

const statusEmojis = {
  placed: '📋',
  accepted: '✅',
  inprogress: '⏳',
  completed: '🎉',
  delivered: '📦',
  cancelled: '❌',
};
const buildStatusUpdateHtml = (order, newStatus, buyerName, note = '', trackingDetails = {}) => {
  const emoji = statusEmojis[newStatus] || '📋';
  const message = statusMessages[newStatus] || 'Your order status has been updated.';

  return wrapMail(`
    <h2 style="text-align:center;">${emoji} Your Order ${newStatus === 'completed' ? 'Ready to Ship' : newStatus}</h2>
    <p>Hi ${buyerName || 'Customer'},</p>
    <p>${message}</p>

    <div style="background:#f8f9fa;padding:15px;border-radius:8px;margin:15px 0;">
      <p><strong>Order ID:</strong> ${order?._id || ''}</p>
      ${newStatus === 'cancelled' ? `<p><strong>Status:</strong> <span style="color:#ff0000;font-weight:bold;">${newStatus.toUpperCase()}</span></p>` : `<p><strong>Status:</strong> <span style="color:#257112;font-weight:bold;">${newStatus.toUpperCase()}</span></p>`}
      <p><strong>Updated On:</strong> ${formatDate(new Date())}</p>
      ${note ? `<p><strong>Note:</strong> ${note}</p>` : ''}

      ${newStatus === 'completed' && (trackingDetails.trackingNumber || trackingDetails.trackingLink || trackingDetails.courierName || trackingDetails.customMessage) ? `
        <div style="background:#e8f5e8;padding:12px;border-radius:6px;margin-top:10px;border-left:4px solid #257112;">
          <h4 style="margin:0 0 8px 0;color:#257112;">📦 Tracking Information</h4>
          ${trackingDetails.courierName ? `<p style="margin:4px 0;"><strong>Courier:</strong> ${trackingDetails.courierName}</p>` : ''}
          ${trackingDetails.trackingNumber ? `<p style="margin:4px 0;"><strong>Tracking Number:</strong> ${trackingDetails.trackingNumber}</p>` : ''}
          ${trackingDetails.trackingLink ? `<p style="margin:4px 0;"><strong>Track Your Order:</strong> <a href="${trackingDetails.trackingLink}" style="color:#257112;text-decoration:none;">Click here to track</a></p>` : ''}
          ${trackingDetails.customMessage ? `<p style="margin:4px 0;"><strong>Message:</strong> ${trackingDetails.customMessage}</p>` : ''}
        </div>
      ` : ''}
    </div>

    <p style="text-align:center;font-size:12px;color:#6b7280;margin-top:20px;">
      Thank you for shopping with <strong>Aavkar Mukhwas</strong>.<br>
      © ${new Date().getFullYear()} Aavkar Mukhwas. All rights reserved.
    </p>
  `);
};

const buildSellerStatusUpdateHtml = (order, newStatus, buyerEmail, buyerName, note = '', trackingDetails = {}) => {
  const emoji = statusEmojis[newStatus] || '📋';

  return wrapMail(`
    <h2 style="text-align:center;">${emoji} ${buyerName || 'Buyer'}'s Order ${newStatus === 'completed' ? 'Ready to Ship' : newStatus}</h2>
    <p><strong>Order ID:</strong> ${order?._id}</p>
    <p><strong>Buyer:</strong> ${buyerName || ''} (${buyerEmail || ''})</p>
    ${newStatus === 'cancelled' ? `<p><strong>Status:</strong> <span style="color:#ff0000;font-weight:bold;">${newStatus.toUpperCase()}</span></p>` : `<p><strong>Status:</strong> <span style="color:#257112;font-weight:bold;">${newStatus.toUpperCase()}</span></p>`}
    <p><strong>Updated On:</strong> ${formatDate(new Date())}</p>
    ${note ? `<p><strong>Note:</strong> ${note}</p>` : ''}

    ${newStatus === 'completed' && (trackingDetails.trackingNumber || trackingDetails.trackingLink || trackingDetails.courierName || trackingDetails.customMessage) ? `
      <div style="background:#e8f5e8;padding:12px;border-radius:6px;margin-top:10px;border-left:4px solid #257112;">
        <h4 style="margin:0 0 8px 0;color:#257112;">📦 Tracking Information</h4>
        ${trackingDetails.courierName ? `<p style="margin:4px 0;"><strong>Courier:</strong> ${trackingDetails.courierName}</p>` : ''}
        ${trackingDetails.trackingNumber ? `<p style="margin:4px 0;"><strong>Tracking Number:</strong> ${trackingDetails.trackingNumber}</p>` : ''}
        ${trackingDetails.trackingLink ? `<p style="margin:4px 0;"><strong>Tracking Link:</strong> <a href="${trackingDetails.trackingLink}" style="color:#257112;text-decoration:none;">${trackingDetails.trackingLink}</a></p>` : ''}
        ${trackingDetails.customMessage ? `<p style="margin:4px 0;"><strong>Message:</strong> ${trackingDetails.customMessage}</p>` : ''}
      </div>
    ` : ''}
  `);
};

const sendOrderStatusUpdateEmailForBuyer = async (buyerEmail, order, newStatus, buyerName, note = '', trackingDetails = {}) => {
  if (!buyerEmail) return;
  try {
    await sendMail({
      to: buyerEmail,
      subject: `Order Status Updated - ${newStatus.toUpperCase()}`,
      text: `Your order ${order?._id} status has been updated to ${newStatus}.`,
      html: buildStatusUpdateHtml(order, newStatus, buyerName, note, trackingDetails),
    });
  } catch (err) {
    logger.error('Failed to send status update email to buyer', err);
  }
};

const sendOrderStatusUpdateEmailForSeller = async (order, newStatus, buyerEmail, buyerName, note = '', trackingDetails = {}) => {
  try {
    await sendMail({
      to: SELLER_RECIPIENTS.join(','),
      subject: `Order Status Updated - ${newStatus.toUpperCase()}`,
      text: `Order ${order?._id} status has been updated to ${newStatus}.`,
      html: buildSellerStatusUpdateHtml(order, newStatus, buyerEmail, buyerName, note, trackingDetails),
    });
  } catch (err) {
    logger.error('Failed to send status update email to seller(s)', err);
  }
};

module.exports = {
  sendVerificationEmail,
  sendResetPasswordEmail,
  sendOrderPlacedEmailForBuyer,
  sendOrderPlacedEmailForSeller,
  sendOrderStatusUpdateEmailForBuyer,
  sendOrderStatusUpdateEmailForSeller,
};
