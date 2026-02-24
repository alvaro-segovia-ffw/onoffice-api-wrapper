'use strict';

/*
  Setup
  1) npm i node-fetch
  2) Crea un .env o exporta variables en tu shell

  Required env vars
  - ONOFFICE_URL        Ejemplo: https://api.onoffice.de/api/stable/api.php
  - ONOFFICE_TOKEN      Tu token
  - ONOFFICE_SECRET     Tu secret
  - ONOFFICE_RESOURCEID Opcional si tu integración lo usa

  Usage
  node fetch-onoffice-apartments.js

  Output
  apartments_with_images.json
*/

const fs = require('fs/promises');
const fsSync = require('fs');
const crypto = require('crypto');
const path = require('path');

function loadDotEnv(filePath) {
  if (!fsSync.existsSync(filePath)) return;
  const content = fsSync.readFileSync(filePath, 'utf8');
  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;

    const key = match[1];
    let value = match[2].trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadDotEnv(path.join(process.cwd(), '.env'));

const API_URL = process.env.ONOFFICE_URL || 'https://api.onoffice.de/api/stable/api.php';
const TOKEN = process.env.ONOFFICE_TOKEN;
const SECRET = process.env.ONOFFICE_SECRET;

const LIST_LIMIT = 100;
const LIST_OFFSET = 0;
const PICS_BATCH_SIZE = 100;

if (!API_URL || !TOKEN || !SECRET) {
  console.error('Faltan ONOFFICE_TOKEN y ONOFFICE_SECRET en variables de entorno (.env)');
  process.exit(1);
}

function unixTs() {
  return Math.floor(Date.now() / 1000);
}

function buildExportFileName(prefix = 'export') {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const yyyy = now.getFullYear();
  const mm = pad(now.getMonth() + 1);
  const dd = pad(now.getDate());
  const hh = pad(now.getHours());
  const min = pad(now.getMinutes());
  const ss = pad(now.getSeconds());
  return `${prefix}_${yyyy}-${mm}-${dd}_${hh}-${min}-${ss}.json`;
}

/**
 * HMAC v2:
 * base = timestamp + token + resourcetype + actionid
 */
function buildHmacV2({ secret, token, timestamp, actionid, resourcetype }) {
  const base = `${timestamp}${token}${resourcetype}${actionid}`;
  return crypto.createHmac('sha256', secret).update(base, 'utf8').digest('base64');
}

async function postSmart(actions) {
  const body = { token: TOKEN, request: { actions } };

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}. ${txt}`);
  }

  const json = await res.json();
  if (json?.status?.code !== 200) {
    throw new Error(`API status != 200: ${JSON.stringify(json?.status)}`);
  }
  return json;
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function extractEstateRecords(result) {
  const records = result?.data?.records;
  return Array.isArray(records) ? records : [];
}

function extractPicturesRecords(result) {
  const r1 = result?.data?.records;
  const r2 = result?.data;
  const r3 = result?.records;
  if (Array.isArray(r1)) return r1;
  if (Array.isArray(r2)) return r2;
  if (Array.isArray(r3)) return r3;
  return [];
}

function buildPicturesMap(picturesRecords) {
  const map = new Map();
  for (const rec of picturesRecords) {
    const elements = Array.isArray(rec?.elements) ? rec.elements : [];
    for (const el of elements) {
      const estateId = String(el?.estateid ?? el?.estateMainId ?? '');
      const url = el?.url;
      if (!estateId || !url) continue;

      if (!map.has(estateId)) map.set(estateId, []);
      map.get(estateId).push({
        url,
        type: el?.type ?? null,
        title: el?.title ?? null,
        originalname: el?.originalname ?? null,
        modified: el?.modified ?? null,
      });
    }
  }
  return map;
}

function toSqFtFromSqm(val) {
  const n = parseNumber(val);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 10.7639 * 100) / 100;
}

function parseBool(v) {
  if (v === true || v === 1 || v === '1') return true;
  if (v === false || v === 0 || v === '0') return false;

  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    if (s === 'ja' || s === 'yes' || s === 'true') return true;
    if (s === 'nein' || s === 'no' || s === 'false') return false;
  }
  return null;
}

function parseNumber(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s) return null;
  const n = Number(s.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function normalizeElevator(v) {
  if (Array.isArray(v)) return v;
  if (typeof v === 'string' && v.length) return [v];
  return [];
}

function normalizeDate(v) {
  if (!v) return null;
  const s = String(v).trim();
  if (!s || s === '0000-00-00') return null;
  return s;
}

function mapEstateToExport(record) {
  const e = record?.elements || {};
  const id = String(e?.Id ?? record?.id ?? '');

  // totals
  const bedrooms = parseNumber(e?.anzahl_schlafzimmer);
  const bathrooms = parseNumber(e?.anzahl_badezimmer);

  // rooms total: fallback ordenado
  // 1) anzahl_zimmer
  // 2) anzahl_raeume (a veces existe en algunas cuentas)
  // 3) si no existe usar bedrooms como aproximación
  const roomsTotal =
    parseNumber(e?.anzahl_zimmer) ??
    parseNumber(e?.anzahl_raeume) ??
    (bedrooms ?? null);

  const address = {
    buildingNumber: e?.hausnummer || null,
    streetName: e?.strasse || null,
    neighborhood: Array.isArray(e?.regionaler_zusatz) && e.regionaler_zusatz.length ? e.regionaler_zusatz : null,
    city: e?.ort || null,
    zipCode: e?.plz || null,
  };

  const features = {
    elevator: normalizeElevator(e?.fahrstuhl),
    balcony: parseBool(e?.balkon) ?? false,
    furnished: parseBool(e?.moebliert), // ahora boolean o null
  };

  const availability = {
    from: normalizeDate(e?.abdatum),
    until: normalizeDate(e?.bisdatum),
  };

  const rent = {
    warmRent: parseNumber(e?.warmmiete),
    coldRent: parseNumber(e?.kaltmiete),
    currency: 'EUR',
  };

  return {
    id,
    address,
    roomsTotal,     
    bedrooms: bedrooms ?? null,
    bathrooms: bathrooms ?? null,
    areaSqft: toSqFtFromSqm(e?.wohnflaeche),
    photos: [],
    features,
    description: e?.objektbeschreibung || null,
    locationDescription: e?.lage || null,
    equipmentDescription: e?.ausstatt_beschr || null,
    availability,
    rent,
    deposit: e?.kaution || null,
    floorLevel: e?.etage || null,
  };
}

function sortPhotos(a, b) {
  const order = { Titelbild: 0, Foto: 1, Grundriss: 2 };
  const oa = order[a.type] ?? 99;
  const ob = order[b.type] ?? 99;
  if (oa !== ob) return oa - ob;
  const ma = Number(a.modified ?? 0);
  const mb = Number(b.modified ?? 0);
  return mb - ma;
}

async function fetchEstates() {
  const ts = unixTs();

  const parameters = {
    data: [
    "Id",
    "strasse",
    "hausnummer",
    "plz",
    "ort",
    "anzahl_schlafzimmer",
    "anzahl_badezimmer",
    "anzahl_zimmer",
    "wohnflaeche",
    "objektbeschreibung",
    "lage",
    "ausstatt_beschr",
    "abdatum",
    "bisdatum",
    "warmmiete",
    "kaltmiete",
    "kaution",
    "etage",
    "fahrstuhl",
    "balkon",
    "moebliert",
    "objektart",
    "objekttyp"
    ],
    filter: {
      status: [{ op: '=', val: '1' }],
      veroeffentlichen: [{ op: '=', val: '1' }],
      nutzungsart: [{ op: '=', val: 'waz' }],
      objektart: [{ op: '=', val: 'wohnung' }],
    },
    listlimit: LIST_LIMIT,
    listoffset: LIST_OFFSET,
    sortby: { kaufpreis: 'ASC', warmmiete: 'ASC' },
  };

  const action = {
    actionid: 'urn:onoffice-de-ns:smart:2.5:smartml:action:read',
    identifier: 'estates_list',
    resourceid: '',
    resourcetype: 'estate',
    timestamp: ts,
    hmac_version: 2,
    parameters,
  };

  action.hmac = buildHmacV2({
    secret: SECRET,
    token: TOKEN,
    timestamp: action.timestamp,
    actionid: action.actionid,
    resourcetype: action.resourcetype,
  });

  const json = await postSmart([action]);
  const result = json?.response?.results?.[0];

  if (result?.status?.errorcode) {
    throw new Error(`estate read error: ${result.status.errorcode} ${result.status.message}`);
  }

  return extractEstateRecords(result);
}

async function fetchPicturesForEstateIds(estateIds) {
  const allRecords = [];

  for (const batch of chunk(estateIds, PICS_BATCH_SIZE)) {
    const ts = unixTs();

    const parameters = {
      categories: ['Titelbild', 'Foto', 'Grundriss'],
      estateids: batch.map((x) => Number(x)),
      language: 'DEU',
      size: 'original',
    };

    const action = {
      actionid: 'urn:onoffice-de-ns:smart:2.5:smartml:action:get',
      identifier: `pics_${batch[0]}_${batch[batch.length - 1]}`,
      resourceid: '',
      resourcetype: 'estatepictures',
      timestamp: ts,
      hmac_version: 2,
      parameters,
    };

    action.hmac = buildHmacV2({
      secret: SECRET,
      token: TOKEN,
      timestamp: action.timestamp,
      actionid: action.actionid,
      resourcetype: action.resourcetype,
    });

    const json = await postSmart([action]);
    const result = json?.response?.results?.[0];

    if (result?.status?.errorcode) {
      throw new Error(`estatepictures get error: ${result.status.errorcode} ${result.status.message}`);
    }

    const records = extractPicturesRecords(result);
    allRecords.push(...records);
  }

  return allRecords;
}

async function main() {
  const estateRecords = await fetchEstates();
  const exports = estateRecords.map(mapEstateToExport);

  const estateIds = exports.map((x) => x.id).filter(Boolean);
  const picturesRecords = await fetchPicturesForEstateIds(estateIds);
  const picsMap = buildPicturesMap(picturesRecords);

  for (const item of exports) {
    const pics = picsMap.get(String(item.id)) || [];
    pics.sort(sortPhotos);
    // single export: cada apartamento incluye todas sus imagenes con metadatos
    item.photos = pics;
  }

  const outputDir = path.join(process.cwd(), 'exports');
  await fs.mkdir(outputDir, { recursive: true });

  const outputFileName = buildExportFileName('export');
  const outputFilePath = path.join(outputDir, outputFileName);
  await fs.writeFile(outputFilePath, JSON.stringify(exports, null, 2), 'utf8');
  console.log(`OK: ${outputFilePath} generado con apartamentos e imagenes. Apartments: ${exports.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
