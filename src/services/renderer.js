const { chromium } = require('playwright');
const config = require('../config');

/**
 * Browser Pool - Persistent browser instance for thumbnail rendering.
 *
 * Instead of launching a new browser per request (like the Python version),
 * we keep a single browser instance and create new BrowserContexts per request.
 * This saves ~1-2s per request.
 */
let browser = null;

/**
 * Initialize the browser instance. Call once at startup.
 */
async function init() {
  if (browser) return;

  browser = await chromium.launch({
    headless: config.browserHeadless,
  });

  console.log('[Renderer] Browser pool initialized');
}

/**
 * Render HTML content to a PNG buffer using Playwright.
 *
 * @param {string} htmlContent - Full HTML string to render
 * @returns {Promise<Buffer>} PNG image as a Buffer
 */
async function renderThumbnail(htmlContent) {
  if (!browser) {
    throw new Error('Browser not initialized. Call renderer.init() first.');
  }

  const context = await browser.newContext({
    viewport: config.viewport,
  });

  try {
    const page = await context.newPage();

    // Load HTML content directly
    await page.setContent(htmlContent);

    // Wait for Google Fonts and all images to load
    await page.waitForLoadState('networkidle');

    // Extra wait to ensure font rendering is complete
    await page.waitForTimeout(config.fontLoadWait);

    // Screenshot only the #thumbnail element
    const thumbnailElement = await page.$('#thumbnail');

    let buffer;
    if (thumbnailElement) {
      buffer = await thumbnailElement.screenshot({ type: 'png' });
    } else {
      // Fallback: screenshot with clip
      buffer = await page.screenshot({
        type: 'png',
        clip: { x: 0, y: 0, ...config.viewport },
      });
    }

    return buffer;
  } finally {
    await context.close();
  }
}

/**
 * Check if the browser is alive and responsive.
 * @returns {Promise<boolean>}
 */
async function isHealthy() {
  if (!browser) return false;
  try {
    // Try creating and closing a context to verify browser is responsive
    const ctx = await browser.newContext();
    await ctx.close();
    return true;
  } catch {
    return false;
  }
}

/**
 * Gracefully shut down the browser. Call on process exit.
 */
async function shutdown() {
  if (browser) {
    await browser.close();
    browser = null;
    console.log('[Renderer] Browser pool shut down');
  }
}

module.exports = { init, renderThumbnail, isHealthy, shutdown };
