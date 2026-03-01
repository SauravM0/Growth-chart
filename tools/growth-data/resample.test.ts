import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { mergeWhoAndIapCurves, DEFAULT_BLEND_WINDOW } from './blend';
import { loadWho2006Curves } from './who2006';
import { loadIap2015Curves } from './iap2015';
import { CENTILES, type GrowthCurve } from './schema';
import { validateCanonicalCurves } from './validation';
import {
  DEFAULT_RESAMPLE_CONFIG,
  interpolateShapePreserving,
  resampleCurves,
  resampleCurveToGrid,
  validateResampledEnvelope,
} from './resample';

const repoRoot = path.resolve(__dirname, '..', '..');
const whoDir = path.resolve(repoRoot, 'tools/growth-data/sources/who2006');
const iapDir = path.resolve(repoRoot, 'tools/growth-data/sources/iap2015');

test('resampleCurveToGrid creates exact 0.1y grid from 0 to 18', () => {
  const curve: GrowthCurve = {
    sex: 'boys',
    metric: 'height_cm',
    centile: 50,
    points: [
      { ageYears: 0, value: 50 },
      { ageYears: 9, value: 120 },
      { ageYears: 18, value: 180 },
    ],
  };

  const out = resampleCurveToGrid(curve, DEFAULT_RESAMPLE_CONFIG);
  assert.equal(out.points.length, 181);
  assert.equal(out.points[0].ageYears, 0);
  assert.equal(out.points[out.points.length - 1].ageYears, 18);
  assert.equal(out.points[1].ageYears, 0.1);
  assert.equal(out.points[100].ageYears, 10);
});

test('shape-preserving interpolation falls inside local envelope', () => {
  const curve: GrowthCurve = {
    sex: 'girls',
    metric: 'weight_kg',
    centile: 50,
    points: [
      { ageYears: 5, value: 16 },
      { ageYears: 6, value: 18.2 },
      { ageYears: 7, value: 20.4 },
      { ageYears: 8, value: 22.6 },
    ],
  };

  const resampled = resampleCurveToGrid(curve, {
    minAgeYears: 5,
    maxAgeYears: 8,
    stepYears: 0.1,
  });

  const envelopeErrors = validateResampledEnvelope(curve, resampled);
  assert.deepEqual(envelopeErrors, []);

  const at65 = interpolateShapePreserving(curve.points, 6.5);
  assert.ok(at65 >= 18.2 && at65 <= 20.4);
});

test('resampled blended curves keep centile order and remain valid', () => {
  const whoCurves = loadWho2006Curves(whoDir);
  const iapCurves = loadIap2015Curves(iapDir);
  const merged = mergeWhoAndIapCurves([], whoCurves, iapCurves, DEFAULT_BLEND_WINDOW);
  const resampled = resampleCurves(merged, DEFAULT_RESAMPLE_CONFIG);

  const errors = validateCanonicalCurves(resampled);
  assert.deepEqual(errors, []);

  const map = new Map(resampled.map((curve) => [`${curve.sex}|${curve.metric}|${curve.centile}`, curve]));

  for (const sex of ['boys', 'girls'] as const) {
    for (const metric of ['height_cm', 'weight_kg'] as const) {
      for (let age = 0; age <= 18 + 1e-12; age = Number((age + 0.1).toFixed(10))) {
        let previous = Number.NEGATIVE_INFINITY;
        for (const centile of CENTILES) {
          const curve = map.get(`${sex}|${metric}|${centile}`)!;
          const point = curve.points.find((row) => Math.abs(row.ageYears - age) < 1e-12);
          assert.ok(point, `Missing point at age ${age} for ${sex}/${metric}/C${centile}`);
          assert.ok(point!.value >= previous - 1e-9, `Crossing at age ${age} for ${sex}/${metric}`);
          previous = point!.value;
        }
      }
    }
  }
});
