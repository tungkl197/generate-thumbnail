const { body, validationResult } = require('express-validator');

/**
 * Validation rules for POST /api/generate-thumbnail
 */
const thumbnailValidationRules = [
  body('r2_url')
    .trim()
    .notEmpty().withMessage('r2_url is required')
    .isURL({ protocols: ['http', 'https'] }).withMessage('r2_url must be a valid HTTP(S) URL'),

  body('text')
    .trim()
    .notEmpty().withMessage('text is required'),

  body('upload_url')
    .trim()
    .notEmpty().withMessage('upload_url is required')
    .isURL({ protocols: ['http', 'https'] }).withMessage('upload_url must be a valid HTTP(S) URL'),

  body('api_key')
    .trim()
    .notEmpty().withMessage('api_key is required'),
];

/**
 * Middleware to check validation results and return 422 if invalid.
 */
function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      error: 'Validation failed',
      details: errors.array().map((e) => ({
        field: e.path,
        message: e.msg,
      })),
    });
  }
  next();
}

module.exports = { thumbnailValidationRules, handleValidationErrors };
