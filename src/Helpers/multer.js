const multer = require('multer');
const path = require('path');
const ApiError = require('../utils/ApiError');
const httpStatus = require('http-status');

const storage = multer.memoryStorage();

const imageFileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExts = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.tiff', '.svg', '.jfif', '.JPG'];

  if (!allowedExts.includes(ext)) {
    cb(new ApiError(httpStatus.BAD_REQUEST, 'Invalid image type.'));
  } else {
    cb(null, true);
  }
};

const excelFileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname);
  if (ext !== '.xlsx' && ext !== '.xls') {
    cb(new ApiError(httpStatus.BAD_REQUEST, 'Only Excel files (.xlsx, .xls) are allowed.'));
  } else {
    cb(null, true);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: imageFileFilter,
  limits: { fileSize: 1024 * 1024 * 5 }, // 5MB limit for image files
});

const uploadTicket = multer({
  storage: storage,
  fileFilter: imageFileFilter,
  limits: { fileSize: 1024 * 1024 * 3 }, // 3MB limit for ticket image files
});

const uploadExcel = multer({
  storage: storage,
  fileFilter: excelFileFilter,
  limits: { fileSize: 1024 * 1024 * 10 }, // 10MB limit for Excel files
});

module.exports = {
  upload,
  uploadTicket,
  uploadExcel,
};
