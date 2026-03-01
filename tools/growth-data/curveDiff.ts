import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { CENTILES } from './schema';

type RenderPoint = { ageYears: number; valueY: number };
type RenderDataset = {
  height: Record<string, RenderPoint[]>;
  weight: Record<string, RenderPoint[]>;
};
type LegacySeriesRow = { centile: string; series: RenderPoint[] };

type DiffStats = {
  maxAbsDeviation: number;
  atAgeYears: number | null;
  baselineValue: number | null;
  currentValue: number | null;
};

const repoRoot = path.resolve(__dirname, '..', '..');
const filesBySex = {
  boys: 'src/data/combined/boys_combined_curves.json',
  girls: 'src/data/combined/girls_combined_curves.json',
} as const;

function parseArgs(argv: string[]): { threshold: number; allowOverThreshold: boolean } {
  let threshold = Number(process.env.CURVE_DIFF_THRESHOLD ?? '0.15');
  let allowOverThreshold = process.env.CURVE_DIFF_APPROVED === '1';

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--threshold' && argv[index + 1]) {
      threshold = Number(argv[index + 1]);
      index += 1;
    } else if (arg === '--allow-over-threshold') {
      allowOverThreshold = true;
    }
  }

  if (!Number.isFinite(threshold) || threshold < 0) {
    throw new Error(`Invalid threshold '${String(threshold)}'. Use a non-negative number.`);
  }

  return { threshold, allowOverThreshold };
}

function readJson(filePath: string): RenderDataset {
  return normalizeDataset(JSON.parse(fs.readFileSync(filePath, 'utf8')));
}

function readHeadVersion(filePath: string): RenderDataset | null {
  try {
    const content = execSync(`git show HEAD:${filePath}`, {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return normalizeDataset(JSON.parse(content));
  } catch {
    return null;
  }
}

function normalizeSeriesMap(input: unknown): Record<string, RenderPoint[]> {
  if (Array.isArray(input)) {
    const map: Record<string, RenderPoint[]> = {};
    for (const row of input as LegacySeriesRow[]) {
      if (!row || typeof row.centile !== 'string' || !Array.isArray(row.series)) {
        continue;
      }
      map[row.centile] = row.series;
    }
    return map;
  }
  if (input && typeof input === 'object') {
    return input as Record<string, RenderPoint[]>;
  }
  return {};
}

function normalizeDataset(input: unknown): RenderDataset {
  if (Array.isArray(input)) {
    return {
      height: normalizeSeriesMap(input),
      weight: {},
    };
  }

  if (input && typeof input === 'object') {
    const obj = input as Record<string, unknown>;
    return {
      height: normalizeSeriesMap(obj.height),
      weight: normalizeSeriesMap(obj.weight),
    };
  }

  return { height: {}, weight: {} };
}

function sortedUnique(points: RenderPoint[]): RenderPoint[] {
  const sorted = [...points].sort((a, b) => a.ageYears - b.ageYears);
  const out: RenderPoint[] = [];
  for (const point of sorted) {
    if (out.length === 0 || point.ageYears > out[out.length - 1].ageYears + 1e-12) {
      out.push(point);
    }
  }
  return out;
}

function valueAtAge(points: RenderPoint[], ageYears: number): number {
  const curve = sortedUnique(points);
  if (curve.length === 0) {
    return Number.NaN;
  }
  if (ageYears <= curve[0].ageYears) {
    return curve[0].valueY;
  }
  const last = curve[curve.length - 1];
  if (ageYears >= last.ageYears) {
    return last.valueY;
  }

  for (let index = 0; index < curve.length - 1; index += 1) {
    const left = curve[index];
    const right = curve[index + 1];
    if (ageYears >= left.ageYears && ageYears <= right.ageYears) {
      const span = right.ageYears - left.ageYears;
      if (span <= 0) {
        return left.valueY;
      }
      const t = (ageYears - left.ageYears) / span;
      return left.valueY + t * (right.valueY - left.valueY);
    }
  }

  return last.valueY;
}

function computeCurveDiff(current: RenderPoint[], baseline: RenderPoint[]): DiffStats {
  const ages = new Set<number>();
  for (const point of current) ages.add(point.ageYears);
  for (const point of baseline) ages.add(point.ageYears);

  let maxAbsDeviation = 0;
  let atAgeYears: number | null = null;
  let baselineValue: number | null = null;
  let currentValue: number | null = null;

  for (const age of [...ages].sort((a, b) => a - b)) {
    const currentAtAge = valueAtAge(current, age);
    const baselineAtAge = valueAtAge(baseline, age);
    const diff = Math.abs(currentAtAge - baselineAtAge);
    if (diff > maxAbsDeviation) {
      maxAbsDeviation = diff;
      atAgeYears = age;
      baselineValue = baselineAtAge;
      currentValue = currentAtAge;
    }
  }

  return { maxAbsDeviation, atAgeYears, baselineValue, currentValue };
}

function run(): void {
  const { threshold, allowOverThreshold } = parseArgs(process.argv.slice(2));
  const failures: string[] = [];

  console.log(`[curve-diff] threshold=${threshold} allowOverThreshold=${allowOverThreshold}`);

  for (const sex of ['boys', 'girls'] as const) {
    const relPath = filesBySex[sex];
    const absPath = path.resolve(repoRoot, relPath);
    const current = readJson(absPath);
    const baseline = readHeadVersion(relPath);

    if (!baseline) {
      console.log(`[curve-diff] ${sex}: no HEAD baseline found for ${relPath}; skipping.`);
      continue;
    }

    for (const metric of ['height', 'weight'] as const) {
      for (const centile of CENTILES) {
        const key = String(centile);
        const currentSeries = current[metric][key] || [];
        const baselineSeries = baseline[metric][key] || [];
        const stats = computeCurveDiff(currentSeries, baselineSeries);

        const where = stats.atAgeYears == null ? 'n/a' : `${stats.atAgeYears.toFixed(4)}y`;
        console.log(
          `[curve-diff] ${sex}/${metric}/C${centile}: maxAbs=${stats.maxAbsDeviation.toFixed(6)} at ${where}`
        );

        if (stats.maxAbsDeviation > threshold) {
          failures.push(
            `${sex}/${metric}/C${centile} maxAbs=${stats.maxAbsDeviation.toFixed(6)} > threshold=${threshold} at age=${where} (baseline=${stats.baselineValue}, current=${stats.currentValue})`
          );
        }
      }
    }
  }

  if (failures.length > 0) {
    const message = ['[curve-diff] Threshold exceeded:', ...failures.map((item) => `- ${item}`)].join('\n');
    if (allowOverThreshold) {
      console.warn(message);
      console.warn('[curve-diff] Over-threshold diff explicitly approved; continuing.');
      return;
    }
    throw new Error(message);
  }

  console.log('[curve-diff] All curve deviations are within threshold.');
}

run();
