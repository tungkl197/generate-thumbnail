const axios = require('axios');
const config = require('../config');
const { bufferToBase64Uri } = require('../utils/fileHelper');

/**
 * Download an image from a URL and convert it to a base64 data URI.
 *
 * @param {string} url - Public URL of the image (R2, S3, or any HTTP URL)
 * @returns {Promise<string>} Base64 data URI string
 * @throws {Error} If download fails
 */
async function downloadImageAsBase64(url) {
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: config.downloadTimeout,
  });

  const buffer = Buffer.from(response.data);
  const mimeType = response.headers['content-type'] || 'image/jpeg';

  return bufferToBase64Uri(buffer, mimeType);
}

module.exports = { downloadImageAsBase64 };
