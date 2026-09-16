import { AppError } from '../utils/errors.js';

export function errorHandler(err, _req, res, _next) {
  if (err.code === 'EAUTH' || err.responseCode === 534) {
    console.error('✗ SMTP authentication failed:', err.message);
    return res.status(503).json({
      success: false,
      message: 'Email delivery is temporarily unavailable. Please check the SMTP App Password configuration.',
      errorCode: 'EMAIL_SERVICE_UNAVAILABLE',
    });
  }

  const statusCode = err.statusCode || 500;
  const errorCode = err.errorCode || 'INTERNAL_ERROR';
  const message = err.isOperational ? err.message : 'Something went wrong';

  if (statusCode === 500) {
    console.error('✗ Unhandled error:', err);
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: err.message,
      errorCode: 'VALIDATION_ERROR',
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format',
      errorCode: 'INVALID_ID',
    });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(409).json({
      success: false,
      message: `${field} already exists`,
      errorCode: 'DUPLICATE_KEY',
    });
  }

  res.status(statusCode).json({
    success: false,
    message,
    errorCode,
  });
}

export function notFoundHandler(_req, res) {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    errorCode: 'ROUTE_NOT_FOUND',
  });
}
