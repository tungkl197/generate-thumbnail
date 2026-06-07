const path = require('path');
require('dotenv').config();

const config = {
  // Server
  port: parseInt(process.env.PORT, 10) || 4526,

  // Paths
  templateDir: path.join(__dirname, '..', 'templates'),
  backgroundPath: path.join(__dirname, '..', 'background.png'),

  // Timeouts (ms)
  downloadTimeout: parseInt(process.env.DOWNLOAD_TIMEOUT, 10) || 30000,
  uploadTimeout: parseInt(process.env.UPLOAD_TIMEOUT, 10) || 60000,

  // Playwright
  browserHeadless: process.env.BROWSER_HEADLESS !== 'false',
  fontLoadWait: parseInt(process.env.FONT_LOAD_WAIT, 10) || 1000,

  // Thumbnail dimensions
  viewport: {
    width: 1920,
    height: 1080,
  },
};

module.exports = config;
