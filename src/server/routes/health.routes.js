'use strict';

const { Router } = require('express');

function buildHealthRouter({ buildHealthPayload, healthPagePath }) {
  const router = Router();

  router.get('/health.json', (_req, res) => {
    return res.json(buildHealthPayload());
  });

  router.get('/health', (req, res) => {
    const accepts = String(req.headers.accept || '');
    if (accepts.includes('text/html')) {
      return res.sendFile(healthPagePath);
    }
    return res.json(buildHealthPayload());
  });

  return router;
}

module.exports = { buildHealthRouter };
