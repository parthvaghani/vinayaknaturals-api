const catchAsync = require('../utils/catchAsync');
/**
 * Export data to Excel (all types)
 */
const exportExcel = catchAsync(async (req, res) => {
  // const { dataType, filters } = req.body;
  // const user = req.user;
  // filters.userId = user?._id;
  // filters.bankId = user?.assignedBank._id;

  // // Validate data type
  // const validDataTypes = ['transactions', 'topups', 'payouts', 'bulkPayments', 'bankStatements'];
  // if (!validDataTypes.includes(dataType)) {
  //   throw new ApiError(httpStatus.BAD_REQUEST, `Invalid data type. Must be one of: ${validDataTypes.join(', ')}`);
  // }

  // // Get data and fileName from service (data is array of objects, fileName is string)
  // const { data, fileName } = await excelService.generateExcelData(dataType, filters, user);

  // // Create a new workbook and worksheet
  // const workbook = new ExcelJS.Workbook();
  // const worksheet = workbook.addWorksheet(dataType.charAt(0).toUpperCase() + dataType.slice(1));

  // // Add headers and data
  // if (data.length > 0) {
  //   // Get the headers from the first data item's keys
  //   const headers = Object.keys(data[0]);

  //   // Add headers row
  //   worksheet.addRow(headers);

  //   // Make the header row bold and size 14
  //   worksheet.getRow(1).font = {
  //     bold: true,
  //     size: 14
  //   };

  //   // Add data rows
  //   data.forEach(item => {
  //     const rowData = headers.map(header => item[header]);
  //     worksheet.addRow(rowData);
  //   });

  //   // Auto-size columns based on content
  //   worksheet.columns.forEach(column => {
  //     let maxLength = 0;
  //     column.eachCell({ includeEmpty: true }, cell => {
  //       const columnLength = cell.value ? cell.value.toString().length : 10;
  //       if (columnLength > maxLength) {
  //         maxLength = columnLength;
  //       }
  //     });
  //     column.width = maxLength < 10 ? 10 : maxLength + 2;
  //   });
  // }

  // try {
  //   // CRITICAL FIX: Generate buffer instead of streaming
  //   const buffer = await workbook.xlsx.writeBuffer();

  //   // Set response headers for file download
  //   res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  //   res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  //   res.setHeader('Content-Length', buffer.length);

  //   // For serverless environments, you might need to handle binary data differently
  //   // Check if we're in a serverless environment (Lambda)

  //     // Regular Express server
  //     res.send(buffer);

  // } catch (error) {
  //   console.error('Error generating Excel file:', error);
  //   throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to generate Excel file');
  // }
  res.send('Hello World');
});

module.exports = {
  exportExcel,
};