'use strict';

const { Router } = require('express');

const { API_KEY_SCOPES } = require('../../../lib/api-key-scopes');
const {
  findPartnerApartmentLiveById,
  listPartnerApartmentsLive,
  listPartnerApartmentsLiveByCity,
} = require('../../../lib/apartments/partner-apartment-service');
const { PublicError } = require('../errors/public-error');
const { requireApiKey } = require('../middlewares/require-api-key');
const { requireApiKeyScope } = require('../middlewares/require-api-key-scope');

function buildApartmentsMeta(req, startedAt, finishedAt, count, extra = {}) {
  return {
    requestedBy: req.authActor.partnerId,
    authType: req.authActor.type,
    count,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: finishedAt.getTime() - startedAt.getTime(),
    ...extra,
  };
}

function buildApartmentsRouter({ asyncHandler, liveSyncState, rateLimitMiddleware }) {
  const router = Router();

  const apartmentReadGuards = [
    rateLimitMiddleware,
    requireApiKey,
    requireApiKeyScope(API_KEY_SCOPES.APARTMENTS_READ),
  ];

  router.get(
    '/',
    ...apartmentReadGuards,
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
        const result = await listPartnerApartmentsLive(req.authActor);
        const finishedAt = new Date();

        res.setHeader('x-data-source', result.dataSource);
        return res.json({
          apartments: result.apartments,
          meta: buildApartmentsMeta(req, startedAt, finishedAt, result.apartments.length),
        });
      } finally {
        liveSyncState.isRunning = false;
      }
    })
  );

  router.get(
    '/city/:city',
    ...apartmentReadGuards,
    asyncHandler(async (req, res) => {
      const requestedCity = String(req.params.city || '').trim();
      if (!requestedCity) {
        throw new PublicError({
          statusCode: 400,
          code: 'BAD_REQUEST',
          message: 'city is required.',
        });
      }

      const startedAt = new Date();
      const result = await listPartnerApartmentsLiveByCity(req.authActor, requestedCity);
      const finishedAt = new Date();

      res.setHeader('x-data-source', result.dataSource);
      return res.json({
        apartments: result.apartments,
        meta: buildApartmentsMeta(req, startedAt, finishedAt, result.apartments.length, {
          city: requestedCity,
        }),
      });
    })
  );

  router.get(
    '/:id',
    ...apartmentReadGuards,
    asyncHandler(async (req, res) => {
      const apartmentId = String(req.params.id || '').trim();
      if (!apartmentId) {
        throw new PublicError({
          statusCode: 400,
          code: 'BAD_REQUEST',
          message: 'id is required.',
        });
      }

      const startedAt = new Date();
      const result = await findPartnerApartmentLiveById(req.authActor, apartmentId);
      const finishedAt = new Date();

      if (!result.apartment) {
        throw new PublicError({
          statusCode: 404,
          code: 'NOT_FOUND',
          message: 'Apartment not found.',
        });
      }

      res.setHeader('x-data-source', result.dataSource);
      return res.json({
        apartment: result.apartment,
        meta: buildApartmentsMeta(req, startedAt, finishedAt, 1, {
          apartmentId,
        }),
      });
    })
  );

  return router;
}

module.exports = { buildApartmentsRouter };
