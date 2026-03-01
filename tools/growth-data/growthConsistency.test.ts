import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { parseWho2006Csv } from './who2006';
import { parseIap2015Csv } from './iap2015';
import { CENTILES } from './schema';

type RenderPoint = { ageYears: number; valueY: number };
type RenderDataset = {
  height: Record<string, RenderPoint[]>;
  weight: Record<string, RenderPoint[]>;
};

const repoRoot = path.resolve(__dirname, '..', '..');
const whoDir = path.resolve(repoRoot, 'tools/growth-data/sources/who2006');
const iapDir = path.resolve(repoRoot, 'tools/growth-data/sources/iap2015');
const generatedBySex = {
  boys: path.resolve(repoRoot, 'src/data/combined/boys_combined_curves.json'),
  girls: path.resolve(repoRoot, 'src/data/combined/girls_combined_curves.json'),
} as const;

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function findPoint(points: RenderPoint[], ageYears: number): RenderPoint | undefined {
  return points.find((point) => Math.abs(point.ageYears - ageYears) < 1e-12);
}

function getWhoCell(sex: 'boys' | 'girls', metric: 'height' | 'weight', ageMonths: number, centile: number): number {
  const file = `${sex}_${metric}_0_5.csv`;
  const rows = parseWho2006Csv(fs.readFileSync(path.resolve(whoDir, file), 'utf8'));
  const row = rows.find((item) => item.ageMonths === ageMonths);
  assert.ok(row, `Missing WHO row for ${sex}/${metric} ageMonths=${ageMonths}`);
  return (row as Record<string, number>)[`centile${centile}`];
}

function getIapCell(sex: 'boys' | 'girls', metric: 'height' | 'weight', ageYears: number, centile: number): number {
  const file = `${sex}_${metric}_5_18.csv`;
  const rows = parseIap2015Csv(fs.readFileSync(path.resolve(iapDir, file), 'utf8'));
  const row = rows.find((item) => Math.abs(item.ageYears - ageYears) < 1e-12);
  assert.ok(row, `Missing IAP row for ${sex}/${metric} ageYears=${ageYears}`);
  return (row as Record<string, number>)[`centile${centile}`];
}

test('generated curves match sentinel WHO/IAP source values', () => {
  const sentinelCases = [
    { sex: 'boys', metric: 'height', centile: 50, ageYears: 4.0, expected: getWhoCell('boys', 'height', 48, 50) },
    { sex: 'boys', metric: 'weight', centile: 97, ageYears: 2.0, expected: getWhoCell('boys', 'weight', 24, 97) },
    { sex: 'girls', metric: 'height', centile: 10, ageYears: 3.0, expected: getWhoCell('girls', 'height', 36, 10) },
    { sex: 'girls', metric: 'weight', centile: 25, ageYears: 1.0, expected: getWhoCell('girls', 'weight', 12, 25) },
    { sex: 'boys', metric: 'height', centile: 75, ageYears: 10.0, expected: getIapCell('boys', 'height', 10.0, 75) },
    { sex: 'boys', metric: 'weight', centile: 90, ageYears: 14.0, expected: getIapCell('boys', 'weight', 14.0, 90) },
    { sex: 'girls', metric: 'height', centile: 50, ageYears: 12.0, expected: getIapCell('girls', 'height', 12.0, 50) },
    { sex: 'girls', metric: 'weight', centile: 3, ageYears: 18.0, expected: getIapCell('girls', 'weight', 18.0, 3) },
  ] as const;

  for (const item of sentinelCases) {
    const dataset = readJson<RenderDataset>(generatedBySex[item.sex]);
    const series = dataset[item.metric][String(item.centile)] || [];
    const point = findPoint(series, item.ageYears);
    assert.ok(
      point,
      `Missing generated point for ${item.sex}/${item.metric}/C${item.centile} at age ${item.ageYears}`
    );
    assert.equal(
      point!.valueY,
      item.expected,
      `Sentinel mismatch for ${item.sex}/${item.metric}/C${item.centile} at age ${item.ageYears}: expected ${item.expected}, got ${point!.valueY}`
    );
  }
});

test('generated curves preserve centile ordering at every resampled age', () => {
  for (const sex of ['boys', 'girls'] as const) {
    const dataset = readJson<RenderDataset>(generatedBySex[sex]);
    for (const metric of ['height', 'weight'] as const) {
      const baseSeries = dataset[metric]['50'];
      for (const row of baseSeries) {
        const age = row.ageYears;
        let previous = Number.NEGATIVE_INFINITY;
        for (const centile of CENTILES) {
          const point = findPoint(dataset[metric][String(centile)] || [], age);
          assert.ok(point, `Missing ${sex}/${metric}/C${centile} point at age ${age}`);
          assert.ok(
            point!.valueY >= previous - 1e-9,
            `Centile ordering violation at ${sex}/${metric} age=${age} C${centile}: ${point!.valueY} < ${previous}`
          );
          previous = point!.valueY;
        }
      }
    }
  }
});

test('generated values stay within plausible age/sex-specific bounds', () => {
  function heightBounds(sex: 'boys' | 'girls', ageYears: number): { min: number; max: number } {
    const minBase = sex === 'boys' ? 40 : 39;
    const maxBase = sex === 'boys' ? 95 : 94;
    return {
      min: minBase + 2.0 * ageYears,
      max: maxBase + 6.0 * ageYears,
    };
  }

  function weightBounds(sex: 'boys' | 'girls', ageYears: number): { min: number; max: number } {
    const maxSlope = sex === 'boys' ? 6.0 : 5.5;
    return {
      min: 2.0 + 0.35 * ageYears,
      max: 20 + maxSlope * ageYears,
    };
  }

  for (const sex of ['boys', 'girls'] as const) {
    const dataset = readJson<RenderDataset>(generatedBySex[sex]);
    for (const metric of ['height', 'weight'] as const) {
      for (const centile of CENTILES) {
        for (const point of dataset[metric][String(centile)] || []) {
          const bounds =
            metric === 'height' ? heightBounds(sex, point.ageYears) : weightBounds(sex, point.ageYears);
          assert.ok(
            point.valueY >= bounds.min - 1e-9 && point.valueY <= bounds.max + 1e-9,
            `Plausibility failure at ${sex}/${metric}/C${centile} age=${point.ageYears}: value=${point.valueY}, expected in [${bounds.min.toFixed(3)}, ${bounds.max.toFixed(3)}]`
          );
        }
      }
    }
  }
});
