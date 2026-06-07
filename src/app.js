const express = require('express');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const thumbnailRoutes = require('./routes/thumbnail');

// ===== Express App Setup =====
const app = express();

// ===== Middleware =====
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ===== Swagger API Docs =====
const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Thumbnail Generator API',
      description: 'Generate thumbnail PNG from R2 image URL + styled text',
      version: '1.1.0',
    },
  },
  apis: ['./src/routes/*.js'],
});

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Thumbnail Generator - API Docs',
}));

// ===== Routes =====
app.use(thumbnailRoutes);

// ===== Global Error Handler =====
app.use((err, req, res, _next) => {
  console.error('[App] Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
