/* eslint-disable no-undef */
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const config = require('../config/config');
const path = require('path');

const s3 = new S3Client({
  region: 'ap-south-1',
});

const getFileExtensionFromBase64 = (base64String) => {
  const extType = base64String.split(';')[0].split('/')[1];
  return extType;
};

const uploadS3 = async (data, fileName) => {
  const type = data.split(';')[0].split('/')[1];
  const base64Data = Buffer.from(data.replace(/^data:image\/\w+;base64,/, ''), 'base64');

  const params = {
    Bucket: config.aws.bucketName,
    Key: fileName,
    Body: base64Data,
    ContentLength: base64Data.length,
    ContentType: `image/${type}`,
    ContentEncoding: 'base64',
  };

  try {
    const command = new PutObjectCommand(params);
    const response = await s3.send(command);
    return { status: true, data: response };
  } catch (err) {
    return { status: false, message: err };
  }
};

/**
 * Upload any type of file to S3
 * @param {Buffer|string} data - File data as Buffer or base64 string
 * @param {string} fileName - File name with path in S3
 * @param {string} contentType - Content type of the file (e.g., application/vnd.openxmlformats-officedocument.spreadsheetml.sheet)
 * @returns {Promise<Object>} Upload result
 */
const uploadFileToS3 = async (data, fileName, contentType) => {
  let fileBuffer;
  let fileContentType = contentType;

  // Handle base64 string input
  if (typeof data === 'string' && data.includes('base64')) {
    // Extract content type from base64 string if not provided
    if (!fileContentType) {
      const matches = data.match(/^data:([^;]+);base64,/);
      if (matches && matches.length > 1) {
        fileContentType = matches[1];
      }
    }

    // Remove the base64 header if present
    const base64Data = data.includes('base64,') ? data.split('base64,')[1] : data;

    fileBuffer = Buffer.from(base64Data, 'base64');
  } else if (Buffer.isBuffer(data)) {
    fileBuffer = data;
  } else {
    return { status: false, message: 'Invalid data format. Expected Buffer or base64 string.' };
  }

  if (!fileContentType) {
    const ext = path.extname(fileName).toLowerCase();
    switch (ext) {
      case '.xlsx':
        fileContentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        break;
      case '.xls':
        fileContentType = 'application/vnd.ms-excel';
        break;
      case '.csv':
        fileContentType = 'text/csv';
        break;
      case '.pdf':
        fileContentType = 'application/pdf';
        break;
      case '.doc':
        fileContentType = 'application/msword';
        break;
      case '.docx':
        fileContentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        break;
      case '.txt':
        fileContentType = 'text/plain';
        break;
      default:
        fileContentType = 'application/octet-stream';
    }
  }

  const params = {
    Bucket: config.aws.bucketName,
    Key: fileName,
    Body: fileBuffer,
    ContentLength: fileBuffer.length,
    ContentType: fileContentType,
  };

  try {
    const command = new PutObjectCommand(params);
    const response = await s3.send(command);
    return {
      status: true,
      data: response,
      fileUrl: `${config.aws.baseUrl}/${fileName}`,
    };
  } catch (err) {
    return { status: false, message: err };
  }
};

module.exports = {
  getFileExtensionFromBase64,
  uploadS3,
  uploadFileToS3,
  deleteFileFromS3: async (fileUrlOrKey) => {
    try {
      const baseUrl = config.aws.baseUrl;
      let key = fileUrlOrKey;
      if (typeof fileUrlOrKey === 'string' && baseUrl && fileUrlOrKey.startsWith(`${baseUrl}/`)) {
        key = fileUrlOrKey.substring(baseUrl.length + 1);
      }

      if (!key) {
        return { status: false, message: 'Invalid key or URL' };
      }

      const params = {
        Bucket: config.aws.bucketName,
        Key: key,
      };

      const command = new DeleteObjectCommand(params);
      const response = await s3.send(command);
      return { status: true, data: response };
    } catch (err) {
      return { status: false, message: err };
    }
  },
};
