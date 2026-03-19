'use strict';

const { requestWantsHtml, sendErrorPage } = require('../controllers/error-pages.controller');
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

    if (requestWantsHtml(req)) {
      const title =
        err.statusCode === 401
          ? 'Unauthorized'
          : err.statusCode === 403
            ? 'Forbidden'
            : err.statusCode === 404
              ? 'Page Not Found'
              : 'Unexpected Error';

      return sendErrorPage(res, {
        statusCode: err.statusCode,
        title,
        message: err.publicMessage,
        requestPath: req.originalUrl || req.url,
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

  if (requestWantsHtml(req)) {
    return sendErrorPage(res, {
      statusCode: 500,
      title: 'Unexpected Error',
      message: 'Something went wrong while loading this page.',
      requestPath: req.originalUrl || req.url,
    });
  }

  return res.status(500).json({
    status: 'error',
    code: 'INTERNAL_ERROR',
    message: 'Internal server error',
  });
}

module.exports = { errorHandler };
