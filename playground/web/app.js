/* global crypto */
'use strict';

const els = {
  baseUrl: document.getElementById('baseUrl'),
  token: document.getElementById('token'),
  secret: document.getElementById('secret'),
  status: document.getElementById('status'),
  output: document.getElementById('output'),
  btnFetch: document.getElementById('btnFetch'),
};

function setStatus(label, ok) {
  els.status.textContent = label;
  els.status.classList.remove('ok', 'err');
  if (ok === true) els.status.classList.add('ok');
  if (ok === false) els.status.classList.add('err');
}

function writeOutput(data) {
  if (typeof data === 'string') {
    els.output.textContent = data;
    return;
  }
  els.output.textContent = JSON.stringify(data, null, 2);
}

function normalizedBaseUrl() {
  return (els.baseUrl.value || 'http://localhost:3000').replace(/\/+$/, '');
}

function requireAuth() {
  const token = els.token.value.trim();
  const secret = els.secret.value.trim();
  if (!token || !secret) {
    throw new Error('Token and secret are required.');
  }
  return { token, secret };
}

async function hmacHex(secret, message) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function fetchApartments() {
  setStatus('loading...', null);
  try {
    const { token, secret } = requireAuth();
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const method = 'GET';
    const pathName = '/apartments';
    const body = '';
    const base = `${timestamp}.${method}.${pathName}.${body}`;
    const signature = await hmacHex(secret, base);

    const res = await fetch(`${normalizedBaseUrl()}${pathName}`, {
      method,
      headers: {
        'x-api-token': token,
        'x-api-timestamp': timestamp,
        'x-api-signature': signature,
      },
    });

    const payload = await res.json().catch(() => ({}));
    writeOutput(payload);
    setStatus(`HTTP ${res.status}`, res.ok);
  } catch (err) {
    writeOutput({ error: err.message });
    setStatus('error', false);
  }
}

els.btnFetch.addEventListener('click', fetchApartments);
