const { jsPDF } = require('jspdf');
const moment = require('moment');

const formatDate = (date) => (date ? moment(date).utcOffset(330).format('DD/MM/YYYY') : '');

const generateBulkOrderSummaryPDF = async (bulkOrder) => {
  try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    const primaryGreen = [37, 113, 18];
    const foregroundGreen = [29, 47, 34];
    const textGray = [75, 85, 99];
    const lightMutedGreen = [232, 243, 220];

    doc.setFont('helvetica');
    const leftMargin = 10;
    const rightMargin = 10;

    // Company branding
    doc.setTextColor(...primaryGreen);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('Vinayak Naturals', leftMargin, 25);

    doc.setTextColor(...foregroundGreen);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Premium hygienic mukhwas', leftMargin, 32);

    // Order summary title
    doc.setTextColor(...primaryGreen);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('BULK ORDER SUMMARY', pageWidth - rightMargin, 25, { align: 'right' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...foregroundGreen);
    doc.text(`Order ID: ${bulkOrder._id}`, pageWidth - rightMargin, 32, { align: 'right' });
    doc.text(`Date: ${formatDate(bulkOrder.createdAt)}`, pageWidth - rightMargin, 37, { align: 'right' });

    // Separator
    doc.setDrawColor(...primaryGreen);
    doc.setLineWidth(0.8);
    doc.line(leftMargin, 47, pageWidth - rightMargin, 47);

    // Customer info
    let yPos = 60;
    doc.setTextColor(...primaryGreen);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Customer Information', leftMargin, yPos);

    doc.setTextColor(...foregroundGreen);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    yPos += 8;
    doc.text(`Name: ${bulkOrder.fullName}`, leftMargin, yPos);
    yPos += 5;
    doc.text(`Email: ${bulkOrder.emailAddress}`, leftMargin, yPos);
    yPos += 5;
    doc.text(`Phone: ${bulkOrder.phoneNumber}`, leftMargin, yPos);
    yPos += 5;
    doc.text(`Delivery Address: ${bulkOrder.deliveryAddress}`, leftMargin, yPos);

    // Products section
    yPos += 15;
    doc.setTextColor(...primaryGreen);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`Selected Products (${bulkOrder.products.length})`, leftMargin, yPos);

    yPos += 8;
    doc.setFillColor(...lightMutedGreen);
    doc.rect(leftMargin, yPos, pageWidth - leftMargin - rightMargin, 8, 'F');

    doc.setTextColor(...foregroundGreen);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('#', leftMargin + 5, yPos + 5);
    doc.text('Product Name', leftMargin + 15, yPos + 5);

    yPos += 12;
    doc.setFont('helvetica', 'normal');

    bulkOrder.products.forEach((product, index) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }

      if (index % 2 === 0) {
        doc.setFillColor(250, 250, 250);
        doc.rect(leftMargin, yPos - 4, pageWidth - leftMargin - rightMargin, 7, 'F');
      }

      doc.setTextColor(...foregroundGreen);
      doc.text(`${index + 1}`, leftMargin + 5, yPos);
      const productName = product?.name || 'N/A';
      const truncatedName = productName.length > 60 ? `${productName.substring(0, 57)}...` : productName;
      doc.text(truncatedName, leftMargin + 15, yPos);
      yPos += 7;
    });

    // Footer
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setTextColor(...textGray);
    doc.setFontSize(8);
    doc.text('This is a bulk order inquiry. Our team will contact you with pricing details.', pageWidth / 2, pageHeight - 25, { align: 'center' });
    doc.text('Plot No 26, Swastik Raw House, Near Shivdhara Circle, D Mart Road, Mota Varachha, Surat 394101 Gujarat', pageWidth / 2, pageHeight - 20, { align: 'center' });
    doc.text('Phone: +91 81288 26764 | Email: venturedigitalindia@gmail.com', pageWidth / 2, pageHeight - 15, { align: 'center' });

    // eslint-disable-next-line no-undef
    return Buffer.from(doc.output('arraybuffer'));
  } catch (error) {
    throw new Error(`Failed to generate bulk order summary PDF: ${error.message}`);
  }
};

module.exports = { generateBulkOrderSummaryPDF };
