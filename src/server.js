const app = require('./app');
const config = require('./config');
const renderer = require('./services/renderer');

/**
 * Start the server:
 * 1. Initialize browser pool
 * 2. Listen on configured port
 * 3. Handle graceful shutdown
 */
async function start() {
  try {
    // Initialize Playwright browser pool
    await renderer.init();

    // Start HTTP server
    const server = app.listen(config.port, () => {
      console.log(`[Server] Thumbnail Generator API running on port ${config.port}`);
      console.log(`[Server] API docs: http://localhost:${config.port}/docs`);
      console.log(`[Server] Health:   http://localhost:${config.port}/health`);
    });

    // Graceful shutdown handlers
    const gracefulShutdown = async (signal) => {
      console.log(`\n[Server] Received ${signal}. Shutting down gracefully...`);

      server.close(async () => {
        await renderer.shutdown();
        console.log('[Server] Server closed.');
        process.exit(0);
      });

      // Force exit after 10s if graceful shutdown fails
      setTimeout(() => {
        console.error('[Server] Forced shutdown after timeout.');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (err) {
    console.error('[Server] Failed to start:', err);
    process.exit(1);
  }
}

start();
