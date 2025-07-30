const objectId = (value, helpers) => {
  if (!value.match(/^[0-9a-fA-F]{24}$/)) {
    return helpers.message('"{{#label}}" must be a valid mongo id');
  }
  return value;
};

const password = (value, helpers) => {
  if (value.length < 8) {
    return helpers.message('Password must be at least 8 characters');
  }
  if (!value.match(/\d/) || !value.match(/[a-zA-Z]/)) {
    return helpers.message('Password must contain at least 1 letter and 1 number');
  }
  return value;
};

const wordCount = (value, helpers) => {
  const words = value.trim().split(/\s+/).length;
  if (words > 50) {
    return helpers.message('Description must have at most 50 words.');
  }
  return value;
};

/**
 * Validates Aadhaar number format according to UIDAI standards
 * @param {string} value - The Aadhaar number to validate
 * @param {object} helpers - Joi validation helpers
 * @returns {string|object} - Returns the value if valid, or a validation error
 *
 * Validation rules:
 * - Must be exactly 12 digits (spaces/hyphens are removed for validation)
 * - Cannot start with 0 or 1
 * - Non-digit characters are removed before validation
 */
const aadhaarNumber = (value, helpers) => {
  // Remove any spaces, hyphens or other non-digit characters for validation
  const cleanedValue = value.replace(/[^0-9]/g, '');

  // Check if it's exactly 12 digits
  if (!/^\d{12}$/.test(cleanedValue)) {
    return helpers.message('Aadhaar number must be 12 digits');
  }

  // Check if it doesn't start with 0 or 1
  if (/^[0-1]/.test(cleanedValue)) {
    return helpers.message('Aadhaar number cannot start with 0 or 1');
  }

  // In a real-world scenario, you might implement the Verhoeff algorithm here
  // to validate the checksum digit

  return value;
};

module.exports = {
  objectId,
  password,
  wordCount,
  aadhaarNumber,
};
