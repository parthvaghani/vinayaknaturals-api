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
  const from = config.email.from || 'venturedigitalindia@gmail.com';
  await transporter.sendMail({ from, ...options });
};

/* ---------- Helpers ---------- */
const formatMoney = (val) => `₹${val}`;
const formatDate = (date) => (date ? moment(date).utcOffset(330).format('DD/MM/YYYY, hh:mm:ss A') : '');
const joinAddress = (a = {}) =>
  [a.addressLine1, a.addressLine2, a.city, `${a.state}${a.zip ? ` ${a.zip}` : ''}`, a.country].filter(Boolean).join('<br/>');

/* ---------- Order Summary (plain text) ---------- */
const formatOrderSummary = (order, couponDiscount) => {
  const summary = (order?.productsDetails || [])
    .map((item) => {
      const weight = item.weightVariant && item.weight ? `${item.weight}${item.weightVariant}` : '';
      return `- Product: ${String(item.productId)} | Qty: ${item.totalUnit} | Weight: ${weight} | Price: ${item.pricePerUnit || 0} | Discount: ${item.discount || 0}`;
    })
    .join('\n');

  return couponDiscount ? `${summary}\nCoupon Discount: ${couponDiscount}` : summary;
};


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
  <div style="font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111827;background:#F2E4D8;padding:20px;">
    <div style="max-width:600px;margin:auto;background:#FFF;padding:24px;border-radius:12px;box-shadow:0 2px 6px rgba(0,0,0,0.1);">
      <div style="text-align:center;margin-bottom:20px;">
        <img src="https://venturedigitalindia.github.io/images/vinayak-logo/logo.png" alt="Vinayak Naturals" style="height:60px;display:block;margin:0 auto 8px;"/>
        <!-- <div style="font-size:1.25rem;font-weight:700;color:#8A4B23;">Vinayak Naturals</div> -->
      </div>
      ${content}
    </div>
  </div>`;


/* ---------- Buyer HTML ---------- */
const buildBuyerOrderHtml = (order, buyerName, couponDiscount, isNewAccount = false, buyerEmail = '', resetToken = '') => {
  const totals = { subtotal: 0, discount: 0 };
  const productRows = buildProductRows(order, totals);
  const total = totals.subtotal - totals.discount;

  // New account welcome section
  const newAccountSection = isNewAccount && resetToken ? `
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin-bottom:20px;">
      <h3 style="color:#16a34a;margin:0 0 12px 0;">🎉 Welcome to Vinayak Naturals!</h3>
      <p style="margin:0 0 12px 0;">An account has been created for you to make future orders easier.</p>
      <p style="margin:0 0 12px 0;">To set your password and access your account, click the button below:</p>
      <div style="text-align:center;">
        <a href="${config.frontEndBaseUrl}/auth/reset-password?token=${resetToken}"
           style="display:inline-block;background:#16a34a;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:600;">
          Set Your Password
        </a>
      </div>
      <p style="margin:12px 0 0 0;font-size:12px;color:#6b7280;">Or copy this link: ${config.frontEndBaseUrl}/auth/reset-password?token=${resetToken}</p>
      <p style="margin:12px 0 0 0;font-size:12px;color:#dc2626;"><strong>⚠️ Note:</strong> This link will expire in 10 minutes for security purposes.</p>
    </div>
  ` : '';

  return wrapMail(`
    <h2 style="text-align:center;">${isNewAccount && resetToken ? '🎉 Welcome & Order Confirmation' : 'Your order has been placed successfully'}</h2>
    <p>Hi ${buyerName || 'Customer'},</p>
    <p>Thanks for your purchase! Your order has been placed successfully.</p>
    ${newAccountSection}
    <p><strong>Order ID:</strong> ${order?._id || ''}<br/>
    <strong>Order Date:</strong> ${formatDate(order?.createdAt)}</p>

    <h3>Delivery Address</h3>
    <p>${joinAddress(order?.address)}</p>

    <h3>Order Summary</h3>
    ${buildOrderTable(productRows, totals, total, couponDiscount)}

    <p style="text-align:center;font-size:12px;color:#6b7280;margin-top:20px;">
  Thank you for shopping with <strong>Vinayak Naturals</strong>.<br>
  © ${new Date().getFullYear()} Vinayak Naturals. All rights reserved.
</p>
  `);
};


/* ---------- Seller HTML ---------- */
const buildSellerOrderHtml = (buyerEmail, order, buyerName, couponDiscount) => {
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
    ${buildOrderTable(productRows, totals, total, couponDiscount)}
  `);
};


/* ---------- Order Table Generator ---------- */
const buildOrderTable = (rows, totals, total, couponDiscount) => {
  const couponAmount = +couponDiscount || 0;
  const grandTotal = total - couponAmount;

  // Conditionally render coupon discount row
  const couponRow = couponAmount > 0 ? `
    <tr>
      <td colspan="5" style="padding:10px;text-align:right;font-weight:bold;border:1px solid #e5e7eb;color:#16a34a;">Coupon Discount:</td>
      <td style="padding:10px;border:1px solid #e5e7eb;color:#8A4B23;">- ${formatMoney(couponAmount)}</td>
    </tr>` : '';

  return `
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
        <td style="padding:10px;border:1px solid #e5e7eb;">${formatMoney(totals.subtotal - totals.discount)}</td>
      </tr>
      <tr>
        <td colspan="5" style="padding:10px;text-align:right;font-weight:bold;border:1px solid #e5e7eb;">Discount:</td>
        <td style="padding:10px;border:1px solid #e5e7eb;">- ${formatMoney(totals.discount)}</td>
      </tr>
      ${couponRow}
      <tr style="background:#f9fafb;">
        <td colspan="5" style="padding:12px;text-align:right;font-weight:bold;border:1px solid #e5e7eb;">Grand Total:</td>
        <td style="padding:12px;border:1px solid #e5e7eb;font-weight:bold;">${formatMoney(grandTotal)}</td>
      </tr>
    </tfoot>
    </table>
  </div>`;
};


const sendOrderPlacedEmailForBuyer = async (buyerEmail, order, buyerName, couponDiscount, invoicePDFBuffer, isNewAccount = false, resetToken = '') => {
  if (!buyerEmail) return;
  try {
    const mailOptions = {
      to: buyerEmail,
      subject: isNewAccount ? 'Welcome to Vinayak Naturals - Order Confirmation' : 'Your order has been placed successfully',
      text: formatOrderSummary(order, couponDiscount),
      html: buildBuyerOrderHtml(order, buyerName, couponDiscount, isNewAccount, buyerEmail, resetToken),
    };

    // Add PDF attachment if provided
    if (invoicePDFBuffer) {
      mailOptions.attachments = [{
        filename: `invoice-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.pdf`,
        content: invoicePDFBuffer,
        contentType: 'application/pdf'
      }];
    }

    await sendMail(mailOptions);
  } catch (err) {
    logger.error('Failed to send order email to buyer', err);
  }
};


const sendOrderPlacedEmailForSeller = async (buyerEmail, order, buyerName, couponDiscount, invoicePDFBuffer) => {
  if (!buyerEmail) return;
  try {
    const mailOptions = {
      to: SELLER_RECIPIENTS.join(','),
      subject: 'New order received',
      text: formatOrderSummary(order, couponDiscount),
      html: buildSellerOrderHtml(buyerEmail, order, buyerName, couponDiscount),
    };

    // Add PDF attachment if provided
    if (invoicePDFBuffer) {
      mailOptions.attachments = [{
        filename: `invoice-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.pdf`,
        content: invoicePDFBuffer,
        contentType: 'application/pdf'
      }];
    }

    await sendMail(mailOptions);
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
      Thank you for shopping with <strong>Vinayak Naturals</strong>.<br>
      © ${new Date().getFullYear()} Vinayak Naturals. All rights reserved.
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

/* ---------- Partnership Request Email Functions ---------- */
const buildPartnershipRequestHtml = (partnershipRequest) => {
  return wrapMail(`
    <h2 style="text-align:center;">🤝 New Partnership Request</h2>
    <p>A new partnership request has been submitted through the website.</p>

    <div style="background:#f8f9fa;padding:15px;border-radius:8px;margin:15px 0;">
      <h3 style="margin-top:0;color:#257112;">Request Details</h3>
      <p><strong>Full Name:</strong> ${partnershipRequest.fullName || ''}</p>
      <p><strong>Email Address:</strong> ${partnershipRequest.emailAddress || ''}</p>
      <p><strong>Phone Number:</strong> ${partnershipRequest.phoneNumber || ''}</p>
      <p><strong>Submitted On:</strong> ${formatDate(partnershipRequest.createdAt)}</p>
      ${partnershipRequest.additionalInformation ? `
        <p><strong>Additional Information:</strong></p>
        <div style="background:#e8f5e8;padding:12px;border-radius:6px;border-left:4px solid #257112;">
          <p style="margin:0;white-space:pre-wrap;">${partnershipRequest.additionalInformation}</p>
        </div>
      ` : ''}
    </div>

    <p style="text-align:center;font-size:12px;color:#6b7280;margin-top:20px;">
      This is an automated notification from <strong>Vinayak Naturals</strong>.<br>
      © ${new Date().getFullYear()} Vinayak Naturals. All rights reserved.
    </p>
  `);
};

const sendPartnershipRequestEmailForSeller = async (partnershipRequest) => {
  try {
    await sendMail({
      to: SELLER_RECIPIENTS.join(','),
      subject: `New Partnership Request - ${  partnershipRequest.fullName}`,
      text: `New partnership request from ${partnershipRequest.fullName} (${partnershipRequest.emailAddress})`,
      html: buildPartnershipRequestHtml(partnershipRequest),
    });
  } catch (err) {
    logger.error('Failed to send partnership request email to seller(s)', err);
  }
};

/* ---------- Bulk Order Email Functions ---------- */
const buildBulkOrderHtml = (bulkOrder) => {
  const productList = bulkOrder.products?.map(product =>
    `<li><strong>${product.name}</strong> - ${product.description || 'No description'}</li>`
  ).join('') || '<li>No products specified</li>';

  return wrapMail(`
    <h2 style="text-align:center;">📦 New Bulk Order Request</h2>
    <p>A new bulk order has been submitted through the website.</p>

    <div style="background:#f8f9fa;padding:15px;border-radius:8px;margin:15px 0;">
      <h3 style="margin-top:0;color:#257112;">Order Details</h3>
      <p><strong>Full Name:</strong> ${bulkOrder.fullName || ''}</p>
      <p><strong>Email Address:</strong> ${bulkOrder.emailAddress || ''}</p>
      <p><strong>Phone Number:</strong> ${bulkOrder.phoneNumber || ''}</p>
      <p><strong>Delivery Address:</strong> ${bulkOrder.deliveryAddress || ''}</p>
      <p><strong>Submitted On:</strong> ${formatDate(bulkOrder.createdAt)}</p>

      <h4 style="color:#257112;margin-top:20px;">Selected Products:</h4>
      <ul style="background:#e8f5e8;padding:12px;border-radius:6px;border-left:4px solid #257112;">
        ${productList}
      </ul>
    </div>

    <p style="text-align:center;font-size:12px;color:#6b7280;margin-top:20px;">
      This is an automated notification from <strong>Vinayak Naturals</strong>.<br>
      © ${new Date().getFullYear()} Vinayak Naturals. All rights reserved.
    </p>
  `);
};

const sendBulkOrderEmailForSeller = async (bulkOrder) => {
  try {
    await sendMail({
      to: SELLER_RECIPIENTS.join(','),
      subject: `New Bulk Order Request - ${bulkOrder.fullName}`,
      text: `New bulk order from ${bulkOrder.fullName} (${bulkOrder.emailAddress}) for ${bulkOrder.products?.length || 0} products`,
      html: buildBulkOrderHtml(bulkOrder),
    });
  } catch (err) {
    logger.error('Failed to send bulk order email to seller(s)', err);
  }
};

/* ---------- Reset Password Email ---------- */
const buildResetPasswordHtml = (resetLink) => {
  return wrapMail(`
    <h2 style="text-align:center;">🔒 Reset Your Password</h2>
    <p>Hi there,</p>
    <p>You recently requested to reset your password for your Vinayak Naturals account. Click the button below to reset it.</p>

    <div style="text-align:center;margin:30px 0;">
      <a href="${resetLink}"
         style="display:inline-block;background:#8A4B23;color:#fff;padding:14px 32px;text-decoration:none;border-radius:8px;font-weight:600;font-size:16px;">
        Reset Password
      </a>
    </div>

    <p style="font-size:14px;color:#6b7280;">Or copy and paste this link into your browser:</p>
    <p style="font-size:14px;word-break:break-all;background:#f3f4f6;padding:12px;border-radius:6px;">
      ${resetLink}
    </p>

    <div style="background:#fff3cd;border:1px solid #ffc107;border-radius:8px;padding:15px;margin:20px 0;">
      <p style="margin:0;font-size:14px;color:#856404;">
        <strong>⚠️ Security Notice:</strong> This password reset link will expire in 10 minutes. If you didn't request this, you can safely ignore this email.
      </p>
    </div>

    <p style="text-align:center;font-size:12px;color:#6b7280;margin-top:20px;">
      Thank you for choosing <strong>Vinayak Naturals</strong>.<br>
      © ${new Date().getFullYear()} Vinayak Naturals. All rights reserved.
    </p>
  `);
};

const sendResetPasswordEmail = async (email, token, role = 'user') => {
  try {
    // Determine the correct frontend URL based on role
    const baseUrl = role === 'admin' ? config.frontEndBaseUrlAdmin : config.frontEndBaseUrl;
    const resetLink = `${baseUrl}/auth/reset-password?token=${token}`;

    await sendMail({
      to: email,
      subject: 'Reset Your Vinayak Naturals Password',
      text: `Reset your password by visiting: ${resetLink}\n\nThis link will expire in 10 minutes. If you didn't request this, you can safely ignore this email.`,
      html: buildResetPasswordHtml(resetLink),
    });
  } catch (err) {
    logger.error('Failed to send reset password email', err);
    throw err;
  }
};

module.exports = {
  sendOrderPlacedEmailForBuyer,
  sendOrderPlacedEmailForSeller,
  sendOrderStatusUpdateEmailForBuyer,
  sendOrderStatusUpdateEmailForSeller,
  sendPartnershipRequestEmailForSeller,
  sendBulkOrderEmailForSeller,
  sendResetPasswordEmail,
};
