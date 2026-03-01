import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { parseWho2006Csv, whoRowsToCanonicalCurves, loadWho2006Curves } from './who2006';
import { validateCanonicalCurves } from './validation';

const repoRoot = path.resolve(__dirname, '..', '..');
const whoDir = path.resolve(repoRoot, 'tools/growth-data/sources/who2006');

function readCsv(fileName: string): string {
  return fs.readFileSync(path.resolve(whoDir, fileName), 'utf8');
}

test('WHO parser preserves known boys height sample values', () => {
  const rows = parseWho2006Csv(readCsv('boys_height_0_5.csv'));
  const at0 = rows.find((row) => row.ageMonths === 0);
  const at24 = rows.find((row) => row.ageMonths === 24);
  const at60 = rows.find((row) => row.ageMonths === 60);

  assert.ok(at0);
  assert.ok(at24);
  assert.ok(at60);

  assert.equal(at0.centile50, 50);
  assert.equal(at24.centile3, 83);
  assert.equal(at60.centile97, 115);
});

test('WHO converter maps ageMonths to high-precision ageYears and exact values', () => {
  const rows = parseWho2006Csv(readCsv('girls_weight_0_5.csv'));
  const curves = whoRowsToCanonicalCurves(rows, 'girls', 'weight_kg');
  const p50 = curves.find((curve) => curve.centile === 50);

  assert.ok(p50);
  const age1Month = p50.points.find((point) => Math.abs(point.ageYears - 0.0833333333) < 1e-12);
  const age5Years = p50.points.find((point) => Math.abs(point.ageYears - 5) < 1e-12);

  assert.ok(age1Month);
  assert.ok(age5Years);
  assert.equal(age1Month.value, 4.0333);
  assert.equal(age5Years.value, 16);
});

test('WHO source curves are non-crossing and schema-valid', () => {
  const curves = loadWho2006Curves(whoDir);
  const errors = validateCanonicalCurves(curves);
  assert.deepEqual(errors, []);
});
