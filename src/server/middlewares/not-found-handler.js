'use strict';

const { PublicError } = require('../errors/public-error');

function notFoundHandler(req, _res, next) {
  return next(
    new PublicError({
      statusCode: 404,
      code: 'NOT_FOUND',
      message: 'Not found.',
    })
  );
}

module.exports = { notFoundHandler };
