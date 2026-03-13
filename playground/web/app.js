'use strict';

const els = {
  baseUrl: document.getElementById('baseUrl'),
  apiKey: document.getElementById('apiKey'),
  status: document.getElementById('status'),
  apartmentCount: document.getElementById('apartmentCount'),
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

function setApartmentCount(payload) {
  const apartments = Array.isArray(payload?.apartments)
    ? payload.apartments
    : Array.isArray(payload)
      ? payload
      : null;

  if (!apartments) {
    els.apartmentCount.textContent = 'Apartments: -';
    return;
  }

  const ids = new Set(
    apartments
      .map((item) => String(item?.id ?? '').trim())
      .filter((id) => id.length > 0)
  );

  const count = ids.size > 0 ? ids.size : apartments.length;
  els.apartmentCount.textContent = `Apartments: ${count}`;
}

function normalizedBaseUrl() {
  return (els.baseUrl.value || 'http://localhost:3000').replace(/\/+$/, '');
}

function requireAuth() {
  const apiKey = els.apiKey.value.trim();
  if (!apiKey) {
    throw new Error('X-API-Key is required.');
  }
  return { apiKey };
}

async function fetchApartments() {
  setStatus('loading...', null);
  setApartmentCount(null);
  try {
    const { apiKey } = requireAuth();
    const pathName = '/apartments';

    const res = await fetch(`${normalizedBaseUrl()}${pathName}`, {
      method: 'GET',
      headers: {
        'X-API-Key': apiKey,
      },
    });

    const payload = await res.json().catch(() => ({}));
    writeOutput(payload);
    setApartmentCount(payload);
    setStatus(`HTTP ${res.status}`, res.ok);
  } catch (err) {
    writeOutput({ error: err.message });
    setApartmentCount(null);
    setStatus('error', false);
  }
}

els.btnFetch.addEventListener('click', fetchApartments);
