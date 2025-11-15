const { jsPDF } = require('jspdf');
const Order = require('../models/order.model');
const moment = require('moment');
const logger = require('../config/logger');
const { logoBase64Image } = require('../config/constants');

/**
 * Generate the next sequential invoice number
 * @returns {Promise<string>} Next invoice number (e.g., INV-00001)
 */
const generateInvoiceNumber = async () => {
  try {
    // Find the latest order with an invoice number
    const latestOrder = await Order.findOne({ invoiceNumber: { $exists: true } })
      .sort({ invoiceNumber: -1 })
      .select('invoiceNumber')
      .lean();

    let nextNumber = 1;
    if (latestOrder && latestOrder.invoiceNumber) {
      // Extract number from latest invoice (e.g., "INV-00001" -> 1)
      const match = latestOrder.invoiceNumber.match(/INV-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }

    // Format with leading zeros (5 digits)
    return `INV-${nextNumber.toString().padStart(5, '0')}`;
  } catch (error) {
    throw new Error(`Failed to generate invoice number: ${error.message}`);
  }
};

/**
 * Format money values for display
 * @param {number} value - Amount to format
 * @returns {string} Formatted amount
 */
const formatMoney = (value) => {
  const numValue = parseFloat(value) || 0;
  // Use Unicode escape for rupee symbol to avoid jsPDF encoding issues
  return `Rs. ${numValue.toFixed(2)}`;
};

/**
 * Format date for display
 * @param {Date} date - Date to format
 * @returns {string} Formatted date
 */
const formatDate = (date) => (date ? moment(date).utcOffset(330).format('DD/MM/YYYY') : '');

/**
 * Join address components
 * @param {Object} address - Address object
 * @returns {string} Formatted address
 */
const joinAddress = (address = {}) => {
  const parts = [
    address.addressLine1,
    address.addressLine2,
    address.city,
    address.state,
    address.zip,
    address.country,
  ].filter(Boolean);
  return parts.join(', ');
};

/**
 * Generate PDF invoice for an order
 * @param {Object} order - Order object with populated product details
 * @param {string} buyerName - Customer name
 * @returns {Buffer} PDF buffer
 */
const generateInvoicePDF = async (order, buyerName, buyerEmail) => {
  try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // App theme color palette - matching your Tailwind theme
    const primaryBrown = [138, 75, 35]; // #8A4B23 - Primary Copper Brown
    const foregroundBrown = [97, 53, 26]; // #61351A - Darker foreground brown
    const lightMutedBeige = [242, 228, 216]; // #F2E4D8 - Light muted beige
    const successGreen = [62, 143, 72]; // #3E8F48 - Success green
    const textGray = [75, 79, 85]; // #4B4F55 - Neutral gray
    const borderBeige = [229, 212, 192]; // #E5D4C0 - Border beige


    // Set default font
    doc.setFont('helvetica');

    // Margins
    const leftMargin = 10;
    const rightMargin = 10;

    const logoWidth = 0;
    // try {
    //   doc.addImage(logoBase64Image, 'PNG', leftMargin, 15, 22, 22);
    //   logoWidth = 27;
    // } catch (err) {
    //   logger.error('Failed to fetch logo from URL:', err.message);
    // }
    // logoWidth = 27;

    // Company name and tagline (top left, after logo) - aligned with invoice details
    doc.setTextColor(...primaryBrown);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('Vinayak Naturals', leftMargin + logoWidth, 25);

    doc.setTextColor(...foregroundBrown);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Premium hygienic mukhwas', leftMargin + logoWidth, 32);

    doc.setTextColor(...textGray);
    doc.setFontSize(9);
    doc.text('Delivering Quality & Taste', leftMargin + logoWidth, 38);

    // Invoice details (top right) - aligned horizontally with branding
    doc.setTextColor(...primaryBrown);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('INVOICE', pageWidth - rightMargin, 25, { align: 'right' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...foregroundBrown);
    doc.text(`Invoice #: ${order.invoiceNumber || 'N/A'}`, pageWidth - rightMargin, 32, { align: 'right' });
    doc.text(`Date: ${formatDate(order.createdAt)}`, pageWidth - rightMargin, 37, { align: 'right' });
    doc.setTextColor(...successGreen);
    // doc.setFont('helvetica', 'bold');
    // doc.text(`Status: ${order.orderStatus?.toUpperCase() || 'PLACED'}`, pageWidth - rightMargin, 42, { align: 'right' });
    doc.setTextColor(...foregroundBrown);
    doc.setFont('helvetica', 'normal');
    doc.text(`Payment: ${order.paymentMethod?.toUpperCase() || 'UNPAID'}`, pageWidth - rightMargin, 42, { align: 'right' });

    // Separator line with theme color
    doc.setDrawColor(...primaryBrown);
    doc.setLineWidth(0.8);
    doc.line(leftMargin, 52, pageWidth - rightMargin, 52);

    // Customer Information & Shipping Address (two columns)
    let yPos = 68;

    // Customer Information (left column)
    doc.setTextColor(...primaryBrown);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Customer Information', leftMargin, yPos);

    doc.setTextColor(...foregroundBrown);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    yPos += 8;
    doc.text(`Name: ${buyerName || 'N/A'}`, leftMargin, yPos);
    yPos += 5;
    doc.text(`Email: ${buyerEmail || 'N/A'}`, leftMargin, yPos);
    yPos += 5;
    doc.text(`Phone: ${order.phoneNumber || 'N/A'}`, leftMargin, yPos);

    // Shipping Address (right column - aligned to right)
    yPos = 68;
    doc.setTextColor(...primaryBrown);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Shipping Address', pageWidth - rightMargin, yPos, { align: 'right' });

    doc.setTextColor(...foregroundBrown);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    yPos += 8;

    const addr = order.address || {};
    const addressLines = [
      addr.addressLine1,
      addr.addressLine2,
      addr.city,
      `${addr.state || ''}${addr.zip ? `, ${addr.zip}` : ''}`,
      addr.country
    ].filter(Boolean);

    addressLines.forEach(line => {
      doc.text(line, pageWidth - rightMargin, yPos, { align: 'right' });
      yPos += 5;
    });

    // Helper function to add table header
    const addTableHeader = (currentY) => {
      doc.setFillColor(...lightMutedBeige);
      doc.rect(leftMargin, currentY, pageWidth - leftMargin - rightMargin, 8, 'F');

      doc.setTextColor(...foregroundBrown);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('Product', leftMargin + 5, currentY + 5);
      doc.text('Weight', 90, currentY + 5);
      doc.text('Unit Price', 120, currentY + 5);
      doc.text('Discount', 150, currentY + 5);
      doc.text('Qty', 175, currentY + 5);
      doc.text('Total', pageWidth - rightMargin - 5, currentY + 5, { align: 'right' });

      return currentY + 12; // Return yPos after header
    };

    // Helper function to add full footer (only for last page)
    const addFooter = () => {
      doc.setTextColor(...textGray);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text('Thank you for shopping with Vinayak Naturals!', pageWidth / 2, pageHeight - 25, { align: 'center' });
      doc.text('Plot No 26, Swastik Raw House, Near Shivdhara Circle, D Mart Road, Mota Varachha, Surat 394101 Gujarat', pageWidth / 2, pageHeight - 20, { align: 'center' });
      doc.text('Phone: +91 81288 26764 | Email: venturedigitalindia@gmail.com', pageWidth / 2, pageHeight - 15, { align: 'center' });
      doc.setTextColor(...primaryBrown);
      doc.setFontSize(7);
      doc.text('\u00A9 Vinayak Naturals. All rights reserved.', pageWidth / 2, pageHeight - 10, { align: 'center' });
    };

    // Product Table - Starting position
    yPos = 108;
    const rowHeight = 7;
    const footerHeight = 35; // Space needed for footer branding

    // Add initial table header
    yPos = addTableHeader(yPos);

    // Table rows - render products without aggressive pagination
    let subtotal = 0;
    let totalDiscount = 0;
    let rowIndex = 0;

    (order.productsDetails || []).forEach((item, index) => {
      const qty = parseFloat(item.totalUnit) || 0;
      const price = parseFloat(item.pricePerUnit) || 0;
      const discount = parseFloat(item.discount) || 0;
      const lineTotal = (price - discount) * qty;

      subtotal += price * qty;
      totalDiscount += discount * qty;

      // Only paginate if we're VERY close to the bottom (leave ~20 for summary + footer)
      if (yPos + rowHeight > pageHeight - 20) {
        // Add new page without footer
        doc.addPage();

        // Reset yPos and add header on new page
        yPos = 20;
        yPos = addTableHeader(yPos);
        rowIndex = 0; // Reset row index for alternating colors
      }

      // Alternate row background
      if (rowIndex % 2 === 0) {
        doc.setFillColor(250, 250, 250);
        doc.rect(leftMargin, yPos - 4, pageWidth - leftMargin - rightMargin, rowHeight, 'F');
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...foregroundBrown);

      // Product name - truncated if too long
      const productName = item?.productId?.name || item.productId || 'N/A';
      const truncatedName = productName.length > 30 ? `${productName.substring(0, 27)}...` : productName;
      doc.text(truncatedName, leftMargin + 5, yPos);

      // Weight
      const weight = item.weight ? `${item.weight}${item.weightVariant || ''}` : '-';
      doc.text(weight, 90, yPos);

      // Price
      doc.text(formatMoney(price), 120, yPos);

      // Discount (in green if > 0)
      if (discount > 0) {
        doc.setTextColor(...successGreen);
        doc.text(`- ${formatMoney(discount)}`, 150, yPos);
        doc.setTextColor(...foregroundBrown);
      } else {
        doc.text('-', 150, yPos);
      }

      // Quantity
      doc.text(qty.toString(), 175, yPos);

      // Total
      doc.setFont('helvetica', 'bold');
      doc.text(formatMoney(lineTotal), pageWidth - rightMargin - 5, yPos, { align: 'right' });

      yPos += rowHeight;
      rowIndex++;
    });

    // Calculate final totals and summary height
    const couponDiscount = parseFloat(order.applyCoupon?.discountAmount) || 0;
    const shippingCharge = parseFloat(order.shippingCharge) || 0;
    const totalSavings = totalDiscount + couponDiscount;
    const grandTotal = subtotal - totalSavings + shippingCharge;

    // Estimate summary section height
    let summaryHeight = 5 + 8; // Initial spacing + first line
    summaryHeight += 6; // Subtotal
    if (totalDiscount > 0) summaryHeight += 6; // Product Discount
    if (couponDiscount > 0) summaryHeight += 6; // Coupon Discount
    summaryHeight += 6; // Shipping Charge
    if (totalSavings > 0) summaryHeight += 8; // Total Savings
    summaryHeight += 12; // Grand Total with line

    // Check if summary + footer fits on current page
    if (yPos + summaryHeight + footerHeight > pageHeight - 5) {
      // Add new page for summary
      doc.addPage();
      yPos = 20;
    }

    // Summary section
    yPos += 5;
    doc.setDrawColor(...borderBeige);
    doc.setLineWidth(0.5);
    doc.line(pageWidth / 2, yPos, pageWidth - rightMargin, yPos);
    yPos += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...foregroundBrown);

    const summaryLabelX = (pageWidth / 2) + 10;
    const summaryValueX = pageWidth - rightMargin - 5;

    // Subtotal
    doc.text('Subtotal:', summaryLabelX, yPos);
    doc.text(formatMoney(subtotal), summaryValueX, yPos, { align: 'right' });
    yPos += 6;

    // Product Discount
    if (totalDiscount > 0) {
      doc.setTextColor(...successGreen);
      doc.text('Product Discount:', summaryLabelX, yPos);
      doc.text(`- ${formatMoney(totalDiscount)}`, summaryValueX, yPos, { align: 'right' });
      doc.setTextColor(...foregroundBrown);
      yPos += 6;
    }

    // Coupon Discount
    if (couponDiscount > 0) {
      doc.setTextColor(...successGreen);
      doc.text('Coupon Discount:', summaryLabelX, yPos);
      doc.text(`- ${formatMoney(couponDiscount)}`, summaryValueX, yPos, { align: 'right' });
      doc.setTextColor(...foregroundBrown);
      yPos += 6;
    }

    // Shipping Charge
    doc.text('Shipping Charge:', summaryLabelX, yPos);
    doc.text(formatMoney(shippingCharge), summaryValueX, yPos, { align: 'right' });
    yPos += 6;

    // Total Savings
    if (totalSavings > 0) {
      doc.setTextColor(...successGreen);
      doc.text('Total Savings:', summaryLabelX, yPos);
      doc.text(formatMoney(totalSavings), summaryValueX, yPos, { align: 'right' });
      yPos += 8;
    }

    // Grand Total with theme color
    doc.setDrawColor(...primaryBrown);
    doc.setLineWidth(0.8);
    doc.line(pageWidth / 2, yPos - 2, pageWidth - rightMargin, yPos - 2);

    doc.setTextColor(...primaryBrown);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Total Amount:', summaryLabelX, yPos + 4);
    doc.text(formatMoney(grandTotal), summaryValueX, yPos + 4, { align: 'right' });

    // Add footer branding only to the last page
    addFooter();

    // Convert to buffer
    // eslint-disable-next-line no-undef
    return Buffer.from(doc.output('arraybuffer'));
  } catch (error) {
    throw new Error(`Failed to generate invoice PDF: ${error.message}`);
  }
};

module.exports = {
  generateInvoiceNumber,
  generateInvoicePDF,
};
