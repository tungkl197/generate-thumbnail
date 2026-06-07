const express = require('express');
const crypto = require('crypto');
const axios = require('axios');
const FormData = require('form-data');
const nunjucks = require('nunjucks');

const config = require('../config');
const { parseColoredText } = require('../utils/textParser');
const { fileToBase64Uri } = require('../utils/fileHelper');
const { downloadImageAsBase64 } = require('../services/imageLoader');
const renderer = require('../services/renderer');
const { thumbnailValidationRules, handleValidationErrors } = require('../middleware/validator');

const router = express.Router();

// ===== Pre-load background image as base64 =====
const BACKGROUND_BASE64 = fileToBase64Uri(config.backgroundPath);

// ===== Nunjucks template setup =====
const nunjucksEnv = nunjucks.configure(config.templateDir, {
  autoescape: false, // We handle escaping in textParser
});

/**
 * @swagger
 * /api/generate-thumbnail:
 *   post:
 *     summary: Generate a thumbnail PNG image and upload it
 *     description: >
 *       Downloads a girl image from URL, combines it with background and styled text,
 *       renders to PNG via Playwright, and uploads to an external service.
 *     requestBody:
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             type: object
 *             required:
 *               - r2_url
 *               - text
 *               - upload_url
 *               - api_key
 *             properties:
 *               r2_url:
 *                 type: string
 *                 description: Public URL to the girl image (R2, S3, or any HTTP URL)
 *               text:
 *                 type: string
 *                 description: 'Text with color tags, e.g.: Tôi đòi <green>nghỉ việc</green>'
 *               upload_url:
 *                 type: string
 *                 description: Upload API base URL (e.g. https://your-domain)
 *               api_key:
 *                 type: string
 *                 description: API key for upload authentication
 *     responses:
 *       200:
 *         description: Upload API response
 *       400:
 *         description: Failed to download image
 *       422:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 *       502:
 *         description: Upload API error
 */
router.post(
  '/api/generate-thumbnail',
  thumbnailValidationRules,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { r2_url, text, upload_url, api_key } = req.body;

      // 1. Download girl image from URL → base64 data URI
      const girlBase64 = await downloadImageAsBase64(r2_url);

      // 2. Parse colored text (with HTML sanitization)
      const textHtml = parseColoredText(text);

      // 3. Render HTML template with Nunjucks
      const htmlContent = nunjucksEnv.render('index.html', {
        girl_image: girlBase64,
        background_image: BACKGROUND_BASE64,
        text_html: textHtml,
      });

      // 4. Screenshot with Playwright → PNG Buffer
      const pngBuffer = await renderer.renderThumbnail(htmlContent);

      // 5. Upload thumbnail to external API
      const uploadEndpoint = `${upload_url.replace(/\/+$/, '')}/api/public/v1/upload`;
      const form = new FormData();
      form.append('file', pngBuffer, {
        filename: `${crypto.randomUUID()}.png`,
        contentType: 'image/png',
      });

      const uploadResponse = await axios.post(uploadEndpoint, form, {
        headers: {
          ...form.getHeaders(),
          Authorization: api_key,
        },
        timeout: config.uploadTimeout,
      });

      // 6. Return upload API response
      return res.status(uploadResponse.status).json(uploadResponse.data);

    } catch (err) {
      // Distinguish between download errors, upload errors, and others
      if (axios.isAxiosError(err) && err.response) {
        const requestUrl = err.config?.url || '';

        if (requestUrl.includes('/api/public/v1/upload')) {
          return res.status(502).json({
            error: `Upload API returned error: ${err.response.status}`,
            detail: err.response.data,
          });
        }

        return res.status(400).json({
          error: `Failed to download image from R2: ${err.response.status}`,
        });
      }

      if (axios.isAxiosError(err)) {
        return res.status(400).json({
          error: `Request failed: ${err.message}`,
        });
      }

      console.error('[Thumbnail] Unexpected error:', err);
      return res.status(500).json({ error: err.message });
    }
  }
);

/**
 * @swagger
 * /:
 *   get:
 *     summary: API info
 *     responses:
 *       200:
 *         description: API usage information
 */
router.get('/', (req, res) => {
  res.json({
    message: 'Thumbnail Generator API',
    usage: 'POST /api/generate-thumbnail with r2_url, text, upload_url, api_key',
    docs: '/docs',
    params: {
      r2_url: 'Public URL to the girl image',
      text: 'Text with color tags like <green>...</green>, <red>...</red>',
      upload_url: 'Upload API base URL (e.g. https://your-domain)',
      api_key: 'API key for upload Authorization header',
    },
  });
});

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check
 *     responses:
 *       200:
 *         description: Service is healthy
 *       503:
 *         description: Service is unhealthy
 */
router.get('/health', async (req, res) => {
  const browserOk = await renderer.isHealthy();

  if (browserOk) {
    return res.json({ status: 'ok', browser: 'connected' });
  }

  return res.status(503).json({ status: 'unhealthy', browser: 'disconnected' });
});

module.exports = router;
