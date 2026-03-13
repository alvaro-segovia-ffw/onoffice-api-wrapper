'use strict';

const { isDatabaseConfigured, query } = require('./db');

async function writeAuditLog(entry) {
  if (!isDatabaseConfigured()) return null;

  const sql = `
    insert into audit_logs (
      actor_user_id,
      actor_api_key_id,
      action,
      resource_type,
      resource_id,
      ip,
      user_agent,
      metadata
    )
    values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
    returning id, created_at
  `;

  const params = [
    entry.actorUserId || null,
    entry.actorApiKeyId || null,
    String(entry.action || '').trim(),
    entry.resourceType ? String(entry.resourceType) : null,
    entry.resourceId ? String(entry.resourceId) : null,
    entry.ip ? String(entry.ip) : null,
    entry.userAgent ? String(entry.userAgent) : null,
    JSON.stringify(entry.metadata || {}),
  ];

  if (!params[2]) {
    throw new Error('Audit action is required.');
  }

  const result = await query(sql, params);
  return result.rows[0] || null;
}

async function listAuditLogs(filters = {}) {
  if (!isDatabaseConfigured()) {
    throw new Error('Audit service is not configured. Missing DATABASE_URL.');
  }

  const where = [];
  const params = [];
  let index = 1;

  if (filters.action) {
    where.push(`action = $${index++}`);
    params.push(String(filters.action));
  }

  if (filters.resourceType) {
    where.push(`resource_type = $${index++}`);
    params.push(String(filters.resourceType));
  }

  if (filters.resourceId) {
    where.push(`resource_id = $${index++}`);
    params.push(String(filters.resourceId));
  }

  if (filters.actorUserId) {
    where.push(`actor_user_id = $${index++}`);
    params.push(String(filters.actorUserId));
  }

  if (filters.actorApiKeyId) {
    where.push(`actor_api_key_id = $${index++}`);
    params.push(String(filters.actorApiKeyId));
  }

  if (filters.partnerId) {
    where.push(`metadata->>'partnerId' = $${index++}`);
    params.push(String(filters.partnerId));
  }

  const limit = Math.min(Math.max(Number(filters.limit) || 50, 1), 200);
  params.push(limit);

  const sql = `
    select
      id,
      actor_user_id,
      actor_api_key_id,
      action,
      resource_type,
      resource_id,
      ip,
      user_agent,
      metadata,
      created_at
    from audit_logs
    ${where.length ? `where ${where.join(' and ')}` : ''}
    order by created_at desc
    limit $${index}
  `;

  const result = await query(sql, params);
  return result.rows.map((row) => ({
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
  }));
}

module.exports = {
  listAuditLogs,
  writeAuditLog,
};
