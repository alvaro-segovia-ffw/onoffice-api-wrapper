'use strict';

const { Router } = require('express');

const {
  createApiKey,
  findApiKeyByIdentifier,
  getApiKeyStats,
  isApiKeyServiceConfigured,
  listApiKeys,
  reactivateApiKey,
  revokeApiKey,
  rotateApiKey,
  updateApiKey,
} = require('../../../lib/api-key-service');
const { isApiKeyScopeValidationError } = require('../../../lib/api-key-scopes');
const { writeAuditLog } = require('../../../lib/audit-service');
const { INTERNAL_PERMISSIONS } = require('../authz/internal-permissions');
const { PublicError } = require('../errors/public-error');
const { requireAdminOperator } = require('../middlewares/require-admin-operator');
const { requireConfiguredAuth } = require('../middlewares/require-configured-auth');
const { requirePermission } = require('../middlewares/require-permission');

function toApiKeyResponse(apiKey) {
  if (!apiKey) return null;
  const { id: _internalId, ...publicApiKey } = apiKey;
  return publicApiKey;
}

function buildApiKeysRouter({ asyncHandler }) {
  const router = Router();

  router.get(
    '/',
    requireConfiguredAuth,
    requireAdminOperator,
    requirePermission(INTERNAL_PERMISSIONS.API_KEYS_READ),
    asyncHandler(async (_req, res) => {
      if (!isApiKeyServiceConfigured()) {
        throw new PublicError({
          statusCode: 503,
          code: 'API_KEY_SERVICE_NOT_CONFIGURED',
          message: 'API key service requires DATABASE_URL.',
        });
      }

      const apiKeys = await listApiKeys();
      return res.json({ apiKeys: apiKeys.map(toApiKeyResponse) });
    })
  );

  router.get(
    '/stats',
    requireConfiguredAuth,
    requireAdminOperator,
    requirePermission(INTERNAL_PERMISSIONS.API_KEYS_READ),
    asyncHandler(async (_req, res) => {
      if (!isApiKeyServiceConfigured()) {
        throw new PublicError({
          statusCode: 503,
          code: 'API_KEY_SERVICE_NOT_CONFIGURED',
          message: 'API key service requires DATABASE_URL.',
        });
      }

      const stats = await getApiKeyStats();
      return res.json({ stats });
    })
  );

  router.get(
    '/:id',
    requireConfiguredAuth,
    requireAdminOperator,
    requirePermission(INTERNAL_PERMISSIONS.API_KEYS_READ),
    asyncHandler(async (req, res) => {
      if (!isApiKeyServiceConfigured()) {
        throw new PublicError({
          statusCode: 503,
          code: 'API_KEY_SERVICE_NOT_CONFIGURED',
          message: 'API key service requires DATABASE_URL.',
        });
      }

      const apiKey = await findApiKeyByIdentifier(req.params.id);
      if (!apiKey) {
        throw new PublicError({
          statusCode: 404,
          code: 'NOT_FOUND',
          message: 'API key not found.',
        });
      }
      return res.json({ apiKey: toApiKeyResponse(apiKey) });
    })
  );

  router.post(
    '/',
    requireConfiguredAuth,
    requireAdminOperator,
    requirePermission(INTERNAL_PERMISSIONS.API_KEYS_CREATE),
    asyncHandler(async (req, res) => {
      if (!isApiKeyServiceConfigured()) {
        throw new PublicError({
          statusCode: 503,
          code: 'API_KEY_SERVICE_NOT_CONFIGURED',
          message: 'API key service requires DATABASE_URL.',
        });
      }

      const partnerId = String(req.body?.partnerId || '').trim();
      const name = String(req.body?.name || '').trim();

      if (!partnerId || !name) {
        throw new PublicError({
          statusCode: 400,
          code: 'BAD_REQUEST',
          message: 'partnerId and name are required.',
        });
      }

      let created;
      try {
        created = await createApiKey({
          ownerUserId: req.auth.sub,
          partnerId,
          name,
          environment: req.body?.environment,
          role: req.body?.role,
          scopes: req.body?.scopes,
          notes: req.body?.notes,
          expiresAt: req.body?.expiresAt,
        });
      } catch (err) {
        if (isApiKeyScopeValidationError(err)) {
          throw new PublicError({
            statusCode: 400,
            code: 'INVALID_SCOPES',
            message: 'Invalid API key scopes.',
          });
        }
        throw err;
      }

      await writeAuditLog({
        actorUserId: req.auth.sub,
        action: 'api_key_created',
        resourceType: 'api_key',
        resourceId: created.apiKey.id,
        ip: req.ip,
        userAgent: req.header('user-agent'),
        metadata: {
          partnerId: created.apiKey.partnerId,
          keyPrefix: created.apiKey.keyPrefix,
          role: created.apiKey.role,
        },
      });

      return res.status(201).json({
        apiKey: toApiKeyResponse(created.apiKey),
        secret: created.secret,
      });
    })
  );

  router.post(
    '/:id/revoke',
    requireConfiguredAuth,
    requireAdminOperator,
    requirePermission(INTERNAL_PERMISSIONS.API_KEYS_REVOKE),
    asyncHandler(async (req, res) => {
      if (!isApiKeyServiceConfigured()) {
        throw new PublicError({
          statusCode: 503,
          code: 'API_KEY_SERVICE_NOT_CONFIGURED',
          message: 'API key service requires DATABASE_URL.',
        });
      }

      const existing = await findApiKeyByIdentifier(req.params.id);
      if (!existing) {
        throw new PublicError({
          statusCode: 404,
          code: 'NOT_FOUND',
          message: 'API key not found.',
        });
      }

      const revoked = await revokeApiKey(req.params.id);
      await writeAuditLog({
        actorUserId: req.auth.sub,
        action: 'api_key_revoked',
        resourceType: 'api_key',
        resourceId: revoked.id,
        ip: req.ip,
        userAgent: req.header('user-agent'),
        metadata: {
          partnerId: revoked.partnerId,
          keyPrefix: revoked.keyPrefix,
        },
      });

      return res.json({ apiKey: toApiKeyResponse(revoked) });
    })
  );

  router.post(
    '/:id/reactivate',
    requireConfiguredAuth,
    requireAdminOperator,
    requirePermission(INTERNAL_PERMISSIONS.API_KEYS_UPDATE),
    asyncHandler(async (req, res) => {
      if (!isApiKeyServiceConfigured()) {
        throw new PublicError({
          statusCode: 503,
          code: 'API_KEY_SERVICE_NOT_CONFIGURED',
          message: 'API key service requires DATABASE_URL.',
        });
      }

      const existing = await findApiKeyByIdentifier(req.params.id);
      if (!existing) {
        throw new PublicError({
          statusCode: 404,
          code: 'NOT_FOUND',
          message: 'API key not found.',
        });
      }

      const apiKey = await reactivateApiKey(req.params.id);
      await writeAuditLog({
        actorUserId: req.auth.sub,
        action: 'api_key_reactivated',
        resourceType: 'api_key',
        resourceId: apiKey.id,
        ip: req.ip,
        userAgent: req.header('user-agent'),
        metadata: {
          partnerId: apiKey.partnerId,
          keyPrefix: apiKey.keyPrefix,
        },
      });

      return res.json({ apiKey: toApiKeyResponse(apiKey) });
    })
  );

  router.post(
    '/:id/rotate',
    requireConfiguredAuth,
    requireAdminOperator,
    requirePermission(INTERNAL_PERMISSIONS.API_KEYS_ROTATE),
    asyncHandler(async (req, res) => {
      if (!isApiKeyServiceConfigured()) {
        throw new PublicError({
          statusCode: 503,
          code: 'API_KEY_SERVICE_NOT_CONFIGURED',
          message: 'API key service requires DATABASE_URL.',
        });
      }

      const rotated = await rotateApiKey(req.params.id);
      if (!rotated) {
        throw new PublicError({
          statusCode: 404,
          code: 'NOT_FOUND',
          message: 'API key not found.',
        });
      }

      await writeAuditLog({
        actorUserId: req.auth.sub,
        action: 'api_key_rotated',
        resourceType: 'api_key',
        resourceId: rotated.apiKey.id,
        ip: req.ip,
        userAgent: req.header('user-agent'),
        metadata: {
          previousApiKeyId: rotated.previousApiKeyId,
          partnerId: rotated.apiKey.partnerId,
          keyPrefix: rotated.apiKey.keyPrefix,
        },
      });

      return res.json({
        previousApiKeyId: rotated.previousApiKeyId,
        apiKey: toApiKeyResponse(rotated.apiKey),
        secret: rotated.secret,
      });
    })
  );

  router.patch(
    '/:id',
    requireConfiguredAuth,
    requireAdminOperator,
    requirePermission(INTERNAL_PERMISSIONS.API_KEYS_UPDATE),
    asyncHandler(async (req, res) => {
      if (!isApiKeyServiceConfigured()) {
        throw new PublicError({
          statusCode: 503,
          code: 'API_KEY_SERVICE_NOT_CONFIGURED',
          message: 'API key service requires DATABASE_URL.',
        });
      }

      const existing = await findApiKeyByIdentifier(req.params.id);
      if (!existing) {
        throw new PublicError({
          statusCode: 404,
          code: 'NOT_FOUND',
          message: 'API key not found.',
        });
      }

      let apiKey;
      try {
        apiKey = await updateApiKey(req.params.id, {
          name: req.body?.name,
          role: req.body?.role,
          scopes: req.body?.scopes,
          notes: req.body?.notes,
          expiresAt: req.body?.expiresAt,
          isActive: req.body?.isActive,
        });
      } catch (err) {
        if (isApiKeyScopeValidationError(err)) {
          throw new PublicError({
            statusCode: 400,
            code: 'INVALID_SCOPES',
            message: 'Invalid API key scopes.',
          });
        }
        throw err;
      }

      await writeAuditLog({
        actorUserId: req.auth.sub,
        action: 'api_key_updated',
        resourceType: 'api_key',
        resourceId: apiKey.id,
        ip: req.ip,
        userAgent: req.header('user-agent'),
        metadata: {
          partnerId: apiKey.partnerId,
          keyPrefix: apiKey.keyPrefix,
        },
      });

      return res.json({ apiKey: toApiKeyResponse(apiKey) });
    })
  );

  return router;
}

module.exports = { buildApiKeysRouter };
