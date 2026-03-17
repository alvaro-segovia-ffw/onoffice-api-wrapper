'use strict';

const { isDatabaseConfigured } = require('./db');
const { createAuditLog, listAuditLogRecords } = require('./repositories/audit-repository');

function normalizeAuditEntry(entry) {
  return {
    actorUserId: entry.actorUserId || null,
    actorApiKeyId: entry.actorApiKeyId || null,
    action: String(entry.action || '').trim(),
    resourceType: entry.resourceType ? String(entry.resourceType) : null,
    resourceId: entry.resourceId ? String(entry.resourceId) : null,
    ip: entry.ip ? String(entry.ip) : null,
    userAgent: entry.userAgent ? String(entry.userAgent) : null,
    metadata: entry.metadata || {},
  };
}

function mapAuditLogRow(row) {
  return {
    id: row.id,
    actorUserId: row.actor_user_id,
    actorApiKeyId: row.actor_api_key_id,
    action: row.action,
    resourceType: row.resource_type,
    resourceId: row.resource_id,
    ip: row.ip,
    userAgent: row.user_agent,
    metadata: row.metadata || {},
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
  };
}

async function writeAuditLog(entry) {
  if (!isDatabaseConfigured()) return null;

  const normalizedEntry = normalizeAuditEntry(entry);
  if (!normalizedEntry.action) {
    throw new Error('Audit action is required.');
  }

  return createAuditLog(normalizedEntry);
}

async function listAuditLogs(filters = {}) {
  if (!isDatabaseConfigured()) {
    throw new Error('Audit service is not configured. Missing DATABASE_URL.');
  }

  const rows = await listAuditLogRecords(filters);
  return rows.map(mapAuditLogRow);
}

module.exports = {
  listAuditLogs,
  writeAuditLog,
};
