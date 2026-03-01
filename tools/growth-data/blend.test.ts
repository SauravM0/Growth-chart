import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { CENTILES, type GrowthCurve } from './schema';
import { DEFAULT_BLEND_WINDOW, mergeWhoAndIapCurves, valueAtAge } from './blend';
import { loadWho2006Curves } from './who2006';
import { loadIap2015Curves } from './iap2015';

const repoRoot = path.resolve(__dirname, '..', '..');
const whoDir = path.resolve(repoRoot, 'tools/growth-data/sources/who2006');
const iapDir = path.resolve(repoRoot, 'tools/growth-data/sources/iap2015');

function curveMap(curves: GrowthCurve[]): Map<string, GrowthCurve> {
  return new Map(curves.map((curve) => [`${curve.sex}|${curve.metric}|${curve.centile}`, curve]));
}

test('blend window is continuous at boundaries and deterministic', () => {
  const whoCurves = loadWho2006Curves(whoDir);
  const iapCurves = loadIap2015Curves(iapDir);
  const merged = mergeWhoAndIapCurves([], whoCurves, iapCurves, DEFAULT_BLEND_WINDOW);

  const whoByKey = curveMap(whoCurves);
  const iapByKey = curveMap(iapCurves);

  for (const curve of merged) {
    const key = `${curve.sex}|${curve.metric}|${curve.centile}`;
    const whoCurve = whoByKey.get(key);
    const iapCurve = iapByKey.get(key);
    assert.ok(whoCurve, `missing WHO curve for ${key}`);
    assert.ok(iapCurve, `missing IAP curve for ${key}`);

    const start = DEFAULT_BLEND_WINDOW.startAgeYears;
    const end = DEFAULT_BLEND_WINDOW.endAgeYears;

    const atStart = curve.points.find((point) => Math.abs(point.ageYears - start) < 1e-12);
    const atEnd = curve.points.find((point) => Math.abs(point.ageYears - end) < 1e-12);

    assert.ok(atStart, `missing start boundary point for ${key}`);
    assert.ok(atEnd, `missing end boundary point for ${key}`);

    const expectedAtStart = valueAtAge(whoCurve!.points, start);
    const expectedAtEnd = valueAtAge(iapCurve!.points, end);

    assert.ok(Math.abs(atStart!.value - expectedAtStart) < 1e-9, `start mismatch for ${key}`);
    assert.ok(Math.abs(atEnd!.value - expectedAtEnd) < 1e-9, `end mismatch for ${key}`);

    const prevBeforeStart = [...curve.points]
      .filter((point) => point.ageYears < start)
      .sort((a, b) => b.ageYears - a.ageYears)[0];
    const nextAfterEnd = [...curve.points]
      .filter((point) => point.ageYears > end)
      .sort((a, b) => a.ageYears - b.ageYears)[0];

    const epsilon = curve.metric === 'height_cm' ? 2.0 : 2.0;
    assert.ok(Math.abs(atStart!.value - prevBeforeStart.value) <= epsilon, `jump before start for ${key}`);
    assert.ok(Math.abs(nextAfterEnd.value - atEnd!.value) <= epsilon, `jump after end for ${key}`);
  }
});

test('centile ordering is preserved in blend window', () => {
  const whoCurves = loadWho2006Curves(whoDir);
  const iapCurves = loadIap2015Curves(iapDir);
  const merged = mergeWhoAndIapCurves([], whoCurves, iapCurves, DEFAULT_BLEND_WINDOW);
  const mergedByKey = curveMap(merged);

  for (const sex of ['boys', 'girls'] as const) {
    for (const metric of ['height_cm', 'weight_kg'] as const) {
      for (
        let age = DEFAULT_BLEND_WINDOW.startAgeYears;
        age <= DEFAULT_BLEND_WINDOW.endAgeYears + 1e-12;
        age = Number((age + 0.01).toFixed(10))
      ) {
        let previous = Number.NEGATIVE_INFINITY;
        for (const centile of CENTILES) {
          const curve = mergedByKey.get(`${sex}|${metric}|${centile}`);
          assert.ok(curve, `missing merged curve ${sex}|${metric}|${centile}`);
          const value = valueAtAge(curve!.points, age);
          assert.ok(value >= previous - 1e-9, `centile crossing at ${sex}/${metric} age=${age}`);
          previous = value;
        }
      }
    }
  }
});
