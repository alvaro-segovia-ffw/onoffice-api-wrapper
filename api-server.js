'use strict';

const crypto = require('crypto');
const express = require('express');
const path = require('path');
const { loadDotEnv } = require('./lib/load-dotenv');
const { fetchApartmentsLive } = require('./lib/apartment-export');

loadDotEnv(path.join(process.cwd(), '.env'));

const PORT = Number(process.env.EXPORT_API_PORT || 3000);
const MAX_TIME_SKEW_SEC = Number(process.env.EXPORT_API_TIME_SKEW_SEC || 300);

let isLiveRequestRunning = false;

function parseUsers(raw) {
  if (!raw) {
    throw new Error('Missing EXPORT_API_USERS env var. Provide a JSON array of users.');
  }

  let users;
  try {
    users = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Invalid EXPORT_API_USERS JSON: ${err.message}`);
  }

  if (!Array.isArray(users) || users.length === 0) {
    throw new Error('EXPORT_API_USERS must be a non-empty JSON array.');
  }

  const byToken = new Map();
  for (const entry of users) {
    const id = String(entry?.id || '');
    const token = String(entry?.token || '');
    const secret = String(entry?.secret || '');

    if (!id || !token || !secret) {
      throw new Error('Each EXPORT_API_USERS item requires id, token and secret.');
    }
    if (byToken.has(token)) {
      throw new Error(`Duplicated token in EXPORT_API_USERS: ${token}`);
    }
    byToken.set(token, { id, token, secret });
  }

  return byToken;
}

const usersByToken = parseUsers(process.env.EXPORT_API_USERS);

function safeCompare(a, b) {
  const aBuf = Buffer.from(a, 'utf8');
  const bBuf = Buffer.from(b, 'utf8');
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

function buildRequestSignature({ secret, timestamp, method, pathName, rawBody }) {
  const base = `${timestamp}.${method.toUpperCase()}.${pathName}.${rawBody || ''}`;
  return crypto.createHmac('sha256', secret).update(base, 'utf8').digest('hex');
}

function authMiddleware(req, res, next) {
  const token = String(req.header('x-api-token') || '').trim();
  const timestampRaw = String(req.header('x-api-timestamp') || '').trim();
  const signature = String(req.header('x-api-signature') || '').trim();

  if (!token || !timestampRaw || !signature) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing x-api-token, x-api-timestamp or x-api-signature headers.',
    });
  }

  const user = usersByToken.get(token);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Invalid token.' });
  }

  const ts = Number(timestampRaw);
  if (!Number.isFinite(ts)) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Invalid timestamp.' });
  }

  const nowSec = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSec - ts) > MAX_TIME_SKEW_SEC) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: `Timestamp outside allowed window (${MAX_TIME_SKEW_SEC}s).`,
    });
  }

  const expectedSignature = buildRequestSignature({
    secret: user.secret,
    timestamp: timestampRaw,
    method: req.method,
    pathName: req.path,
    rawBody: '',
  });

  if (!safeCompare(expectedSignature, signature)) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Invalid signature.' });
  }

  req.authUser = { id: user.id, token: user.token };
  return next();
}

const app = express();
const playgroundDir = path.join(process.cwd(), 'playground', 'web');

app.use('/playground', express.static(playgroundDir));
app.get('/playground', (_req, res) => {
  res.sendFile(path.join(playgroundDir, 'index.html'));
});

app.get('/apartments', authMiddleware, async (req, res) => {
  if (isLiveRequestRunning) {
    return res.status(409).json({
      error: 'Conflict',
      message: 'Another live onOffice sync is already running.',
    });
  }

  isLiveRequestRunning = true;
  const startedAt = new Date();

  try {
    const apartments = await fetchApartmentsLive();
    const finishedAt = new Date();

    res.setHeader('x-data-source', 'live-onoffice');
    return res.json({
      apartments,
      meta: {
        requestedBy: req.authUser.id,
        count: apartments.length,
        startedAt: startedAt.toISOString(),
        finishedAt: finishedAt.toISOString(),
        durationMs: finishedAt.getTime() - startedAt.getTime(),
      },
    });
  } catch (err) {
    return res.status(500).json({
      error: 'LiveFetchFailed',
      message: err.message || 'Unknown error',
    });
  } finally {
    isLiveRequestRunning = false;
  }
});

app.listen(PORT, () => {
  console.log(`Export API listening on http://localhost:${PORT}`);
});
