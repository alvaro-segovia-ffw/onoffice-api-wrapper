'use strict';

const { Router } = require('express');

const {
  loginWithPassword,
  getUserProfile,
  refreshUserSession,
  revokeRefreshToken,
} = require('../../../lib/auth-service');
const { PublicError } = require('../errors/public-error');
const { requireConfiguredAuth } = require('../middlewares/require-configured-auth');
const { requireAuth } = require('../middlewares/require-auth');

function buildAuthRouter({ asyncHandler, loginRateLimitMiddleware }) {
  const router = Router();

  router.post(
    '/login',
    loginRateLimitMiddleware,
    requireConfiguredAuth,
    asyncHandler(async (req, res) => {
      const email = String(req.body?.email || '').trim();
      const password = String(req.body?.password || '');

      if (!email || !password) {
        throw new PublicError({
          statusCode: 400,
          code: 'BAD_REQUEST',
          message: 'email and password are required.',
        });
      }

      const session = await loginWithPassword(email, password);
      if (!session) {
        throw new PublicError({
          statusCode: 401,
          code: 'UNAUTHORIZED',
          message: 'Invalid email or password.',
        });
      }

      return res.json({
        accessToken: session.accessToken,
        tokenType: 'Bearer',
        expiresIn: session.accessTokenTtl,
        refreshToken: session.refreshToken,
        refreshTokenExpiresAt: session.refreshTokenExpiresAt,
        refreshTokenTtlDays: session.refreshTokenTtlDays,
        user: session.user,
      });
    })
  );

  router.post(
    '/refresh',
    requireConfiguredAuth,
    asyncHandler(async (req, res) => {
      const refreshToken = String(req.body?.refreshToken || '').trim();
      if (!refreshToken) {
        throw new PublicError({
          statusCode: 400,
          code: 'BAD_REQUEST',
          message: 'refreshToken is required.',
        });
      }

      const session = await refreshUserSession(refreshToken);
      if (!session) {
        throw new PublicError({
          statusCode: 401,
          code: 'UNAUTHORIZED',
          message: 'Invalid, expired or revoked refresh token.',
        });
      }

      return res.json({
        accessToken: session.accessToken,
        tokenType: 'Bearer',
        expiresIn: session.accessTokenTtl,
        refreshToken: session.refreshToken,
        refreshTokenExpiresAt: session.refreshTokenExpiresAt,
        refreshTokenTtlDays: session.refreshTokenTtlDays,
        user: session.user,
      });
    })
  );

  router.post(
    '/logout',
    requireConfiguredAuth,
    asyncHandler(async (req, res) => {
      const refreshToken = String(req.body?.refreshToken || '').trim();
      if (!refreshToken) {
        throw new PublicError({
          statusCode: 400,
          code: 'BAD_REQUEST',
          message: 'refreshToken is required.',
        });
      }

      await revokeRefreshToken(refreshToken);
      return res.status(204).end();
    })
  );

  router.get(
    '/me',
    requireConfiguredAuth,
    requireAuth,
    asyncHandler(async (req, res) => {
      const user = await getUserProfile(req.auth.sub);
      if (!user) {
        throw new PublicError({
          statusCode: 404,
          code: 'NOT_FOUND',
          message: 'User not found.',
        });
      }

      return res.json({ user });
    })
  );

  return router;
}

module.exports = { buildAuthRouter };
