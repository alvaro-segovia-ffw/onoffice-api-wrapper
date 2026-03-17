'use strict';

const { Router } = require('express');

const { listAuditLogs } = require('../../../lib/audit-service');
const { isApiKeyServiceConfigured } = require('../../../lib/api-key-service');
const { INTERNAL_PERMISSIONS } = require('../authz/internal-permissions');
const { PublicError } = require('../errors/public-error');
const { requireAdminOperator } = require('../middlewares/require-admin-operator');
const { requireConfiguredAuth } = require('../middlewares/require-configured-auth');
const { requirePermission } = require('../middlewares/require-permission');

function buildAuditRouter({ asyncHandler }) {
  const router = Router();

  router.get(
    '/',
    requireConfiguredAuth,
    requireAdminOperator,
    requirePermission(INTERNAL_PERMISSIONS.AUDIT_LOGS_READ),
    asyncHandler(async (req, res) => {
      if (!isApiKeyServiceConfigured()) {
        throw new PublicError({
          statusCode: 503,
          code: 'AUDIT_SERVICE_NOT_CONFIGURED',
          message: 'Audit service requires DATABASE_URL.',
        });
      }

      const logs = await listAuditLogs({
        action: req.query.action,
        resourceType: req.query.resourceType,
        resourceId: req.query.resourceId,
        actorUserId: req.query.actorUserId,
        actorApiKeyId: req.query.actorApiKeyId,
        partnerId: req.query.partnerId,
        limit: req.query.limit,
      });
      return res.json({ logs });
    })
  );

  return router;
}

module.exports = { buildAuditRouter };
