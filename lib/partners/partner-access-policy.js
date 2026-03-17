'use strict';

const { API_KEY_SCOPES } = require('../api-key-scopes');

function normalizeFieldAllowlist(input) {
  if (!Array.isArray(input)) return [];

  return Array.from(
    new Set(
      input
        .map((fieldPath) => String(fieldPath || '').trim())
        .filter(Boolean)
    )
  );
}

function resolveApartmentFieldAllowlist(actor) {
  if (Array.isArray(actor?.apartmentFieldAllowlist)) {
    return actor.apartmentFieldAllowlist;
  }

  if (Array.isArray(actor?.accessPolicy?.apartments?.fields)) {
    return actor.accessPolicy.apartments.fields;
  }

  return [];
}

function buildPartnerApartmentAccessPolicy(actor) {
  const scopes = Array.isArray(actor?.scopes)
    ? actor.scopes.map((scope) => String(scope || '').trim()).filter(Boolean)
    : [];
  const apartmentFieldAllowlist = normalizeFieldAllowlist(resolveApartmentFieldAllowlist(actor));

  return {
    actorType: actor?.type || null,
    actorId: actor?.id || null,
    partnerId: String(actor?.partnerId || '').trim() || null,
    scopes,
    canReadApartments: scopes.includes(API_KEY_SCOPES.APARTMENTS_READ),
    apartmentFieldAllowlist,
    projectionMode: apartmentFieldAllowlist.length > 0 ? 'allowlist' : 'full',
  };
}

module.exports = {
  buildPartnerApartmentAccessPolicy,
};
