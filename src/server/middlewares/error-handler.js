'use strict';

const { PublicError } = require('../errors/public-error');

function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  if (err instanceof PublicError) {
    if (err.statusCode >= 500) {
      console.error('Public request error', {
        method: req.method,
        path: req.originalUrl || req.url,
        error: err,
      });
    }

    return res.status(err.statusCode).json({
      status: 'error',
      code: err.code,
      message: err.publicMessage,
    });
  }

  console.error('Unhandled request error', {
    method: req.method,
    path: req.originalUrl || req.url,
    error: err,
  });

  return res.status(500).json({
    status: 'error',
    code: 'INTERNAL_ERROR',
    message: 'Internal server error',
  });
}

module.exports = { errorHandler };
