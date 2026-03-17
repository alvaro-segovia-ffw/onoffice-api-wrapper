'use strict';

const { PublicError } = require('../errors/public-error');

function parseOrigin(value) {
  const normalized = String(value || '').trim();
  if (!normalized) return null;

  try {
    return new URL(normalized);
  } catch (_err) {
    return null;
  }
}

function parseRefererOrigin(value) {
  const normalized = String(value || '').trim();
  if (!normalized) return null;

  try {
    return new URL(new URL(normalized).origin);
  } catch (_err) {
    return null;
  }
}

function getSourceOrigin(req) {
  return parseOrigin(req.header('origin')) || parseRefererOrigin(req.header('referer'));
}

function isSameOriginRequest(req) {
  const sourceOrigin = getSourceOrigin(req);
  const expectedHost = String(req.header('host') || '').trim().toLowerCase();
  if (!sourceOrigin || !expectedHost) return false;
  return sourceOrigin.host.toLowerCase() === expectedHost;
}

function buildCrossOriginError() {
  return new PublicError({
    statusCode: 403,
    code: 'FORBIDDEN',
    message: 'Cross-origin request blocked.',
  });
}

function requireSameOrigin(req, _res, next) {
  if (!isSameOriginRequest(req)) {
    return next(buildCrossOriginError());
  }

  return next();
}

function requireSameOriginForCookieAuth(req, res, next) {
  if (req.adminAuth?.authMethod !== 'cookie') {
    return next();
  }

  return requireSameOrigin(req, res, next);
}

module.exports = {
  getSourceOrigin,
  requireSameOrigin,
  requireSameOriginForCookieAuth,
};
