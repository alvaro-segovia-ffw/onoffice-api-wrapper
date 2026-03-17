'use strict';

const loginPath = '/admin/login';

const els = {
  loginStatus: document.getElementById('loginStatus'),
  sessionSummary: document.getElementById('sessionSummary'),
  btnLoad: document.getElementById('btnLoad'),
  statsStatus: document.getElementById('statsStatus'),
  statsGrid: document.getElementById('statsGrid'),
  createStatus: document.getElementById('createStatus'),
  createForm: document.getElementById('createForm'),
  createOutput: document.getElementById('createOutput'),
  keysStatus: document.getElementById('keysStatus'),
  btnRefreshKeys: document.getElementById('btnRefreshKeys'),
  keysTable: document.getElementById('keysTable'),
  keyActionOutput: document.getElementById('keyActionOutput'),
  auditStatus: document.getElementById('auditStatus'),
  auditForm: document.getElementById('auditForm'),
  auditOutput: document.getElementById('auditOutput'),
};

function setStatus(el, label, ok) {
  el.textContent = label;
  el.classList.remove('ok', 'err');
  if (ok === true) el.classList.add('ok');
  if (ok === false) el.classList.add('err');
}

function normalizedBaseUrl() {
  return window.location.origin;
}

function redirectToLogin() {
  window.location.href = loginPath;
}

function writeJson(el, payload) {
  el.textContent = typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2);
}

async function parseJsonResponse(res) {
  return res.json().catch(() => ({}));
}

async function apiFetch(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(`${normalizedBaseUrl()}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  const payload = await parseJsonResponse(res);
  if (res.status === 401 || res.status === 403) {
    throw new Error(payload?.message || 'Session expired or not authorized.');
  }
  if (!res.ok) {
    throw new Error(payload?.message || `HTTP ${res.status}`);
  }
  return payload;
}

function renderSession(user) {
  if (!user) {
    els.sessionSummary.textContent = 'No active session.';
    return;
  }

  const roles = Array.isArray(user.roles) && user.roles.length ? user.roles.join(', ') : 'no roles';
  els.sessionSummary.textContent = `${user.email} (${roles})`;
}

function clearChildren(node) {
  node.replaceChildren();
}

function appendTextElement(parent, tagName, text, className) {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  element.textContent = text;
  parent.appendChild(element);
  return element;
}

function renderStats(stats) {
  const items = [
    ['Total', stats.totalKeys],
    ['Active', stats.activeKeys],
    ['Revoked', stats.revokedKeys],
    ['Expired', stats.expiredKeys],
    ['Used 24h', stats.apiKeyUsed24h],
    ['Auth Failed 24h', stats.apiKeyAuthFailed24h],
  ];

  clearChildren(els.statsGrid);
  for (const [label, value] of items) {
    const stat = document.createElement('div');
    stat.className = 'stat';
    appendTextElement(stat, 'span', label);
    appendTextElement(stat, 'strong', String(value ?? '-'));
    els.statsGrid.appendChild(stat);
  }
}

function statusBadge(apiKey) {
  const badge = document.createElement('span');
  badge.className = 'badge badge-status';

  if (!apiKey.isActive) {
    badge.classList.add('text-bg-danger');
    badge.textContent = 'revoked';
    return badge;
  }

  if (apiKey.expiresAt && new Date(apiKey.expiresAt).getTime() <= Date.now()) {
    badge.classList.add('text-bg-warning');
    badge.textContent = 'expired';
    return badge;
  }

  badge.classList.add('text-bg-success');
  badge.textContent = 'active';
  return badge;
}

function buildKeyActionButton(action, id, label, className) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.dataset.action = action;
  button.dataset.id = id;
  button.textContent = label;
  return button;
}

function keyActionButtons(apiKey) {
  const actions = document.createDocumentFragment();
  actions.appendChild(
    buildKeyActionButton('rotate', apiKey.publicId, 'Rotate', 'btn btn-sm btn-outline-secondary')
  );

  if (apiKey.isActive) {
    actions.appendChild(
      buildKeyActionButton('revoke', apiKey.publicId, 'Revoke', 'btn btn-sm btn-outline-danger danger')
    );
  } else {
    actions.appendChild(
      buildKeyActionButton(
        'reactivate',
        apiKey.publicId,
        'Reactivate',
        'btn btn-sm btn-outline-success ghost'
      )
    );
  }

  return actions;
}

function renderApiKeys(apiKeys) {
  clearChildren(els.keysTable);

  if (!apiKeys.length) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 6;
    cell.className = 'empty';
    cell.textContent = 'No API keys found.';
    row.appendChild(cell);
    els.keysTable.appendChild(row);
    return;
  }

  for (const apiKey of apiKeys) {
    const row = document.createElement('tr');

    appendTextElement(row, 'td', apiKey.partnerId || '-');
    appendTextElement(row, 'td', apiKey.name || '-');

    const keyPrefixCell = document.createElement('td');
    appendTextElement(keyPrefixCell, 'code', apiKey.keyPrefix || '-');
    row.appendChild(keyPrefixCell);

    const statusCell = document.createElement('td');
    statusCell.appendChild(statusBadge(apiKey));
    row.appendChild(statusCell);

    appendTextElement(row, 'td', apiKey.lastUsedAt || '-');

    const actionsCell = document.createElement('td');
    const actionsRow = document.createElement('div');
    actionsRow.className = 'row-actions';
    actionsRow.appendChild(keyActionButtons(apiKey));
    actionsCell.appendChild(actionsRow);
    row.appendChild(actionsCell);

    els.keysTable.appendChild(row);
  }
}

async function loadStats() {
  setStatus(els.statsStatus, 'loading...', null);
  try {
    const payload = await apiFetch('/api-keys/stats');
    renderStats(payload.stats || {});
    setStatus(els.statsStatus, 'loaded', true);
  } catch (err) {
    setStatus(els.statsStatus, 'error', false);
    writeJson(els.keyActionOutput, { error: err.message });
    if (/session|authorized|role/i.test(err.message)) redirectToLogin();
  }
}

async function loadApiKeys() {
  setStatus(els.keysStatus, 'loading...', null);
  try {
    const payload = await apiFetch('/api-keys');
    renderApiKeys(payload.apiKeys || []);
    setStatus(els.keysStatus, 'loaded', true);
  } catch (err) {
    setStatus(els.keysStatus, 'error', false);
    writeJson(els.keyActionOutput, { error: err.message });
    if (/session|authorized|role/i.test(err.message)) redirectToLogin();
  }
}

async function loadAuditLogs(filters = {}) {
  setStatus(els.auditStatus, 'loading...', null);
  try {
    const query = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value).trim()) {
        query.set(key, String(value).trim());
      }
    });
    const suffix = query.toString() ? `?${query.toString()}` : '';
    const payload = await apiFetch(`/audit-logs${suffix}`);
    writeJson(els.auditOutput, payload.logs || []);
    setStatus(els.auditStatus, 'loaded', true);
  } catch (err) {
    setStatus(els.auditStatus, 'error', false);
    writeJson(els.auditOutput, { error: err.message });
    if (/session|authorized|role/i.test(err.message)) redirectToLogin();
  }
}

async function createApiKey(event) {
  event.preventDefault();
  setStatus(els.createStatus, 'creating...', null);

  const form = new FormData(els.createForm);
  const payload = {
    partnerId: form.get('partnerId'),
    name: form.get('name'),
    environment: form.get('environment'),
    role: form.get('role'),
    scopes: String(form.get('scopes') || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
    notes: form.get('notes') || null,
  };

  try {
    const created = await apiFetch('/api-keys', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    writeJson(els.createOutput, created);
    setStatus(els.createStatus, 'created', true);
    await Promise.all([loadApiKeys(), loadStats(), loadAuditLogs({ limit: 20 })]);
  } catch (err) {
    setStatus(els.createStatus, 'error', false);
    writeJson(els.createOutput, { error: err.message });
    if (/session|authorized|role/i.test(err.message)) redirectToLogin();
  }
}

async function handleKeyAction(event) {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  const { action, id } = button.dataset;
  if (!action || !id) return;

  const path =
    action === 'rotate'
      ? `/api-keys/${id}/rotate`
      : action === 'revoke'
        ? `/api-keys/${id}/revoke`
        : `/api-keys/${id}/reactivate`;

  try {
    const payload = await apiFetch(path, { method: 'POST' });
    writeJson(els.keyActionOutput, payload);
    await Promise.all([loadApiKeys(), loadStats(), loadAuditLogs({ limit: 20 })]);
  } catch (err) {
    writeJson(els.keyActionOutput, { error: err.message, action, id });
    if (/session|authorized|role/i.test(err.message)) redirectToLogin();
  }
}

async function fetchCurrentSession() {
  const payload = await apiFetch('/admin/session');
  renderSession(payload.user || null);
  return payload.user || null;
}

async function loadDashboard() {
  await Promise.all([loadStats(), loadApiKeys(), loadAuditLogs({ limit: 20 })]);
}

async function bootstrap() {
  setStatus(els.loginStatus, 'checking session...', null);
  try {
    const user = await fetchCurrentSession();
    if (!user) {
      redirectToLogin();
      return;
    }
    setStatus(els.loginStatus, 'session ready', true);
    await loadDashboard();
  } catch (_err) {
    setStatus(els.loginStatus, 'token invalid', false);
    redirectToLogin();
  }
}

els.btnLoad.addEventListener('click', loadDashboard);
els.createForm.addEventListener('submit', createApiKey);
els.keysTable.addEventListener('click', handleKeyAction);
els.btnRefreshKeys.addEventListener('click', loadApiKeys);
els.auditForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const form = new FormData(els.auditForm);
  loadAuditLogs({
    partnerId: form.get('partnerId'),
    action: form.get('action'),
    limit: form.get('limit'),
  });
});

bootstrap();
