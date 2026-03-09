'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { _test } = require('../lib/apartment-export');

test('parseBool supports german/english and numeric values', () => {
  assert.equal(_test.parseBool('ja'), true);
  assert.equal(_test.parseBool('yes'), true);
  assert.equal(_test.parseBool('1'), true);
  assert.equal(_test.parseBool('nein'), false);
  assert.equal(_test.parseBool('no'), false);
  assert.equal(_test.parseBool(0), false);
  assert.equal(_test.parseBool('unknown'), null);
});

test('parseNumber parses decimal comma and invalid values', () => {
  assert.equal(_test.parseNumber('12,5'), 12.5);
  assert.equal(_test.parseNumber('10.25'), 10.25);
  assert.equal(_test.parseNumber(''), null);
  assert.equal(_test.parseNumber(null), null);
  assert.equal(_test.parseNumber('foo'), null);
});

test('normalizeDate and toSqFtFromSqm normalize values', () => {
  assert.equal(_test.normalizeDate('2026-03-06'), '2026-03-06');
  assert.equal(_test.normalizeDate('0000-00-00'), null);
  assert.equal(_test.normalizeDate(''), null);
  assert.equal(_test.toSqFtFromSqm('10'), 107.64);
  assert.equal(_test.toSqFtFromSqm('not-a-number'), null);
});

test('mapEstateToExport maps key fields to output contract', () => {
  const mapped = _test.mapEstateToExport({
    elements: {
      Id: 123,
      hausnummer: '5A',
      strasse: 'Teststrasse',
      ort: 'Berlin',
      plz: '10115',
      anzahl_schlafzimmer: '2',
      anzahl_badezimmer: '1',
      anzahl_zimmer: '3',
      wohnflaeche: '50',
      balkon: 'ja',
      moebliert: 'nein',
      warmmiete: '1200',
      kaltmiete: '1000',
      abdatum: '2026-05-01',
      bisdatum: '0000-00-00',
    },
  });

  assert.equal(mapped.id, '123');
  assert.equal(mapped.address.streetName, 'Teststrasse');
  assert.equal(mapped.address.city, 'Berlin');
  assert.equal(mapped.roomsTotal, 3);
  assert.equal(mapped.bedrooms, 2);
  assert.equal(mapped.bathrooms, 1);
  assert.equal(mapped.areaSqft, 538.19);
  assert.equal(mapped.features.balcony, true);
  assert.equal(mapped.features.furnished, false);
  assert.equal(mapped.rent.warmRent, 1200);
  assert.equal(mapped.rent.coldRent, 1000);
  assert.equal(mapped.availability.from, '2026-05-01');
  assert.equal(mapped.availability.until, null);
});

test('buildPicturesMap groups images by estate id', () => {
  const picsMap = _test.buildPicturesMap([
    {
      elements: [
        { estateid: 1, url: 'https://a', type: 'Foto' },
        { estateMainId: 2, url: 'https://b', type: 'Titelbild' },
      ],
    },
    {
      elements: [{ estateid: 1, url: 'https://c', type: 'Grundriss' }],
    },
  ]);

  assert.equal(picsMap.get('1').length, 2);
  assert.equal(picsMap.get('2').length, 1);
});

test('sortPhotos prioritizes Titelbild then Foto then Grundriss and newest modified first', () => {
  const photos = [
    { type: 'Grundriss', modified: 10 },
    { type: 'Foto', modified: 15 },
    { type: 'Titelbild', modified: 1 },
    { type: 'Foto', modified: 20 },
  ];

  photos.sort(_test.sortPhotos);

  assert.deepEqual(
    photos.map((x) => `${x.type}:${x.modified}`),
    ['Titelbild:1', 'Foto:20', 'Foto:15', 'Grundriss:10']
  );
});

test('chunk and extract helpers keep expected behavior', () => {
  assert.deepEqual(_test.chunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
  assert.deepEqual(_test.extractEstateRecords({ data: { records: [1, 2] } }), [1, 2]);
  assert.deepEqual(_test.extractEstateRecords({ data: {} }), []);

  assert.deepEqual(_test.extractPicturesRecords({ data: { records: [9] } }), [9]);
  assert.deepEqual(_test.extractPicturesRecords({ data: [8] }), [8]);
  assert.deepEqual(_test.extractPicturesRecords({ records: [7] }), [7]);
  assert.deepEqual(_test.extractPicturesRecords({ nope: true }), []);
});
