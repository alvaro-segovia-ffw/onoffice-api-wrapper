'use strict';

const { Router } = require('express');

const { fetchApartmentsLive } = require('../../../lib/apartment-export');
const { API_KEY_SCOPES } = require('../../../lib/api-key-scopes');
const { PublicError } = require('../errors/public-error');
const { requireApiKey } = require('../middlewares/require-api-key');
const { requireApiKeyScope } = require('../middlewares/require-api-key-scope');

function buildApartmentsRouter({ asyncHandler, liveSyncState, rateLimitMiddleware }) {
  const router = Router();

  router.get(
    '/',
    rateLimitMiddleware,
    requireApiKey,
    requireApiKeyScope(API_KEY_SCOPES.APARTMENTS_READ),
    asyncHandler(async (req, res) => {
      if (liveSyncState.isRunning) {
        throw new PublicError({
          statusCode: 409,
          code: 'CONFLICT',
          message: 'Another live onOffice sync is already running.',
        });
      }

      liveSyncState.isRunning = true;
      const startedAt = new Date();

      try {
        const apartments = await fetchApartmentsLive();
        const finishedAt = new Date();

        res.setHeader('x-data-source', 'live-onoffice');
        return res.json({
          apartments,
          meta: {
            requestedBy: req.authActor.partnerId,
            authType: req.authActor.type,
            count: apartments.length,
            startedAt: startedAt.toISOString(),
            finishedAt: finishedAt.toISOString(),
            durationMs: finishedAt.getTime() - startedAt.getTime(),
          },
        });
      } finally {
        liveSyncState.isRunning = false;
      }
    })
  );

  return router;
}

module.exports = { buildApartmentsRouter };
