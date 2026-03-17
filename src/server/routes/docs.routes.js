'use strict';

const { Router } = require('express');

const { requireConfiguredAuth } = require('../middlewares/require-configured-auth');
const { requireDocsAccess } = require('../middlewares/docs-access');

function buildDocsRouter({
  buildOpenApiPayload,
  openApiSpec,
  publicOpenApiSpec,
  publicSwaggerUiPath,
  swaggerUiPath,
}) {
  const router = Router();

  router.get('/openapi.json', requireConfiguredAuth, requireDocsAccess, (req, res) => {
    res.type('application/json');
    return res.send(buildOpenApiPayload(openApiSpec, req, process.env.OPENAPI_SERVER_URL));
  });

  router.get('/openapi.public.json', (req, res) => {
    res.type('application/json');
    return res.send(
      buildOpenApiPayload(publicOpenApiSpec, req, process.env.OPENAPI_PUBLIC_SERVER_URL)
    );
  });

  router.get('/docs', requireConfiguredAuth, requireDocsAccess, (_req, res) => {
    return res.sendFile(swaggerUiPath);
  });

  router.get('/docs/public', (_req, res) => {
    return res.sendFile(publicSwaggerUiPath);
  });

  return router;
}

module.exports = { buildDocsRouter };
