const state = {
  apiKeys: [],
  selectedApiKeyId: null,
  auditLogs: [],
  selectedAuditLogId: null,
};

export function getApiKeys() {
  return state.apiKeys;
}

export function setApiKeys(apiKeys) {
  state.apiKeys = Array.isArray(apiKeys) ? apiKeys : [];
}

export function getSelectedApiKeyId() {
  return state.selectedApiKeyId;
}

export function setSelectedApiKeyId(apiKeyId) {
  state.selectedApiKeyId = apiKeyId || null;
}

export function findSelectedApiKey() {
  return state.apiKeys.find((apiKey) => apiKey.publicId === state.selectedApiKeyId) || null;
}

export function ensureSelectedApiKey() {
  if (!findSelectedApiKey()) {
    state.selectedApiKeyId = state.apiKeys[0]?.publicId || null;
  }
}

export function getAuditLogs() {
  return state.auditLogs;
}

export function setAuditLogs(auditLogs) {
  state.auditLogs = Array.isArray(auditLogs) ? auditLogs : [];
}

export function getSelectedAuditLogId() {
  return state.selectedAuditLogId;
}

export function setSelectedAuditLogId(auditLogId) {
  state.selectedAuditLogId = auditLogId || null;
}

export function findSelectedAuditLog() {
  return state.auditLogs.find((log) => log.id === state.selectedAuditLogId) || null;
}

export function ensureSelectedAuditLog() {
  if (!findSelectedAuditLog()) {
    state.selectedAuditLogId = state.auditLogs[0]?.id || null;
  }
}
