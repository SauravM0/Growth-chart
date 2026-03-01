import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { parseIap2015Csv, iapRowsToCanonicalCurves, loadIap2015Curves } from './iap2015';
import { validateCanonicalCurves } from './validation';

const repoRoot = path.resolve(__dirname, '..', '..');
const iapDir = path.resolve(repoRoot, 'tools/growth-data/sources/iap2015');

function readCsv(fileName: string): string {
  return fs.readFileSync(path.resolve(iapDir, fileName), 'utf8');
}

test('IAP parser preserves known boys weight sample values', () => {
  const rows = parseIap2015Csv(readCsv('boys_weight_5_18.csv'));
  const at5 = rows.find((row) => row.ageYears === 5.0);
  const at10 = rows.find((row) => row.ageYears === 10.0);
  const at18 = rows.find((row) => row.ageYears === 18.0);

  assert.ok(at5);
  assert.ok(at10);
  assert.ok(at18);

  assert.equal(at5.centile50, 18.8);
  assert.equal(at10.centile90, 44);
  assert.equal(at18.centile97, 88);
});

test('IAP converter keeps exact ages and values for girls height', () => {
  const rows = parseIap2015Csv(readCsv('girls_height_5_18.csv'));
  const curves = iapRowsToCanonicalCurves(rows, 'girls', 'height_cm');
  const p50 = curves.find((curve) => curve.centile === 50);

  assert.ok(p50);
  const at5 = p50.points.find((point) => Math.abs(point.ageYears - 5) < 1e-12);
  const at55 = p50.points.find((point) => Math.abs(point.ageYears - 5.5) < 1e-12);
  const at18 = p50.points.find((point) => Math.abs(point.ageYears - 18) < 1e-12);

  assert.ok(at5);
  assert.ok(at55);
  assert.ok(at18);
  assert.equal(at5.value, 107);
  assert.equal(at55.value, 110.3131);
  assert.equal(at18.value, 163);
});

test('IAP source curves are non-crossing and schema-valid', () => {
  const curves = loadIap2015Curves(iapDir);
  const errors = validateCanonicalCurves(curves);
  assert.deepEqual(errors, []);
});
