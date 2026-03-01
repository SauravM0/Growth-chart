import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { CENTILES, type GrowthCurve, type GrowthMetric, type GrowthPoint, type GrowthSex } from './schema';
import { assertValidCanonicalCurves } from './validation';
import { loadWho2006Curves } from './who2006';
import { loadIap2015Curves } from './iap2015';
import { DEFAULT_BLEND_WINDOW, mergeWhoAndIapCurves, type BlendWindowConfig } from './blend';
import { DEFAULT_RESAMPLE_CONFIG, resampleCurves, validateResampledEnvelope } from './resample';

type CombinedRenderablePoint = {
  ageYears: number;
  valueY: number;
};

type CombinedRenderableMetric = Record<string, CombinedRenderablePoint[]>;

type CombinedRenderableDataset = {
  metadata?: {
    whoVersion: string;
    iapVersion: string;
    generatedAtUtc: string;
    gitCommitHash: string;
  };
  height: CombinedRenderableMetric;
  weight: CombinedRenderableMetric;
};

type LegacySeriesRow = {
  centile: string;
  series: CombinedRenderablePoint[];
};

type SourceManifest = {
  version: number;
  description?: string;
  references?: {
    whoVersion?: string;
    iapVersion?: string;
  };
  inputs: Record<GrowthSex, string>;
  blendWindow?: Partial<BlendWindowConfig>;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const sourcesDir = path.resolve(__dirname, 'sources');
const sourceManifestPath = path.resolve(sourcesDir, 'manifest.json');
const who2006SourceDir = path.resolve(sourcesDir, 'who2006');
const iap2015SourceDir = path.resolve(sourcesDir, 'iap2015');

const outputPaths: Record<GrowthSex, string[]> = {
  boys: [
    path.resolve(repoRoot, 'src/data/combined/boys_combined_curves.json'),
    path.resolve(repoRoot, 'src/data/boys_combined_curves.json'),
  ],
  girls: [
    path.resolve(repoRoot, 'src/data/combined/girls_combined_curves.json'),
    path.resolve(repoRoot, 'src/data/girls_combined_curves.json'),
  ],
};

function readJson(filePath: string): unknown {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function getMetricCollection(raw: unknown, metric: GrowthMetric): Record<string, CombinedRenderablePoint[]> {
  const metricKey = metric === 'height_cm' ? 'height' : 'weight';

  if (Array.isArray(raw)) {
    const asLegacy = raw as LegacySeriesRow[];
    const map: Record<string, CombinedRenderablePoint[]> = {};
    for (const row of asLegacy) {
      if (!row || typeof row.centile !== 'string' || !Array.isArray(row.series)) {
        continue;
      }
      map[row.centile] = row.series;
    }
    if (metric === 'weight_kg') {
      return {};
    }
    return map;
  }

  if (raw && typeof raw === 'object') {
    const metricValue = (raw as Record<string, unknown>)[metricKey];
    if (metricValue && typeof metricValue === 'object' && !Array.isArray(metricValue)) {
      return metricValue as Record<string, CombinedRenderablePoint[]>;
    }
  }

  return {};
}

function toCanonicalCurvesFromSource(source: unknown, sex: GrowthSex): GrowthCurve[] {
  const curves: GrowthCurve[] = [];

  for (const metric of ['height_cm', 'weight_kg'] as const) {
    const metricCollection = getMetricCollection(source, metric);

    for (const centile of CENTILES) {
      const series = metricCollection[String(centile)];
      if (!Array.isArray(series)) {
        continue;
      }

      const points: GrowthPoint[] = series.map((point) => ({
        ageYears: Number(point.ageYears),
        value: Number(point.valueY),
      }));

      curves.push({
        sex,
        metric,
        centile,
        points,
      });
    }
  }

  return curves;
}

function buildRenderableDataset(
  curves: GrowthCurve[],
  sex: GrowthSex,
  metadata: CombinedRenderableDataset['metadata']
): CombinedRenderableDataset {
  const byMetric: Record<GrowthMetric, CombinedRenderableMetric> = {
    height_cm: {},
    weight_kg: {},
  };

  for (const metric of ['height_cm', 'weight_kg'] as const) {
    const metricCurves = curves
      .filter((curve) => curve.sex === sex && curve.metric === metric)
      .sort((a, b) => a.centile - b.centile);

    const map: CombinedRenderableMetric = {};
    for (const centile of CENTILES) {
      const curve = metricCurves.find((item) => item.centile === centile);
      if (!curve) {
        continue;
      }
      map[String(centile)] = curve.points.map((point) => ({
        ageYears: point.ageYears,
        valueY: point.value,
      }));
    }

    byMetric[metric] = map;
  }

  return {
    metadata,
    height: byMetric.height_cm,
    weight: byMetric.weight_kg,
  };
}

function writeJson(filePath: string, data: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

function loadManifest(): SourceManifest {
  console.log(`[growth-data] Reading source manifest: ${sourceManifestPath}`);
  const raw = readJson(sourceManifestPath);
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid source manifest format.');
  }

  const manifest = raw as SourceManifest;
  if (!manifest.inputs?.boys || !manifest.inputs?.girls) {
    throw new Error('Source manifest must define inputs.boys and inputs.girls.');
  }

  return manifest;
}

function resolveBlendWindow(manifest: SourceManifest): BlendWindowConfig {
  const startAgeYears = Number(manifest.blendWindow?.startAgeYears ?? DEFAULT_BLEND_WINDOW.startAgeYears);
  const endAgeYears = Number(manifest.blendWindow?.endAgeYears ?? DEFAULT_BLEND_WINDOW.endAgeYears);
  const stepYears = Number(manifest.blendWindow?.stepYears ?? DEFAULT_BLEND_WINDOW.stepYears);

  if (!Number.isFinite(startAgeYears) || !Number.isFinite(endAgeYears) || !Number.isFinite(stepYears)) {
    throw new Error('blendWindow values must be finite numbers.');
  }
  if (stepYears <= 0) {
    throw new Error('blendWindow.stepYears must be > 0.');
  }
  if (endAgeYears <= startAgeYears) {
    throw new Error('blendWindow.endAgeYears must be > startAgeYears.');
  }

  return {
    startAgeYears,
    endAgeYears,
    stepYears,
  };
}

function resolveGitCommitHash(): string {
  try {
    return execSync('git rev-parse HEAD', { cwd: repoRoot, stdio: ['ignore', 'pipe', 'ignore'] })
      .toString('utf8')
      .trim();
  } catch {
    return 'unknown';
  }
}

function run(): void {
  console.log('[growth-data] Starting combined curves generator');

  const manifest = loadManifest();
  const datasetMetadata = {
    whoVersion: manifest.references?.whoVersion || 'WHO 2006',
    iapVersion: manifest.references?.iapVersion || 'IAP 2015',
    generatedAtUtc: new Date().toISOString(),
    gitCommitHash: resolveGitCommitHash(),
  };
  console.log(
    `[growth-data] Metadata: who="${datasetMetadata.whoVersion}", iap="${datasetMetadata.iapVersion}", commit=${datasetMetadata.gitCommitHash}`
  );
  const blendWindow = resolveBlendWindow(manifest);
  console.log(
    `[growth-data] Blend window: ${blendWindow.startAgeYears} to ${blendWindow.endAgeYears} years (step ${blendWindow.stepYears})`
  );
  const baseCurves: GrowthCurve[] = [];

  for (const sex of ['boys', 'girls'] as const) {
    const inputPath = path.resolve(repoRoot, manifest.inputs[sex]);
    console.log(`[growth-data] Reading source for ${sex}: ${inputPath}`);

    const source = readJson(inputPath);
    const curves = toCanonicalCurvesFromSource(source, sex);
    baseCurves.push(...curves);

    console.log(
      `[growth-data] Loaded ${curves.length} canonical curves for ${sex} (${curves
        .map((curve) => `${curve.metric}:${curve.centile}`)
        .join(', ')})`
    );
  }

  console.log(`[growth-data] Loading WHO 2006 numeric segment from ${who2006SourceDir}`);
  const whoCurves = loadWho2006Curves(who2006SourceDir);
  console.log(`[growth-data] Loaded ${whoCurves.length} WHO curves (0-5 years)`);

  console.log(`[growth-data] Loading IAP 2015 numeric segment from ${iap2015SourceDir}`);
  const iapCurves = loadIap2015Curves(iap2015SourceDir);
  console.log(`[growth-data] Loaded ${iapCurves.length} IAP curves (5-18 years)`);

  const canonicalCurves = mergeWhoAndIapCurves(baseCurves, whoCurves, iapCurves, blendWindow);

  console.log(
    `[growth-data] Resampling curves to ${DEFAULT_RESAMPLE_CONFIG.minAgeYears}..${DEFAULT_RESAMPLE_CONFIG.maxAgeYears} years at ${DEFAULT_RESAMPLE_CONFIG.stepYears}-year increments`
  );
  const resampledCurves = resampleCurves(canonicalCurves, DEFAULT_RESAMPLE_CONFIG);

  const envelopeErrors: string[] = [];
  for (const rawCurve of canonicalCurves) {
    const resampledCurve = resampledCurves.find(
      (curve) =>
        curve.sex === rawCurve.sex &&
        curve.metric === rawCurve.metric &&
        curve.centile === rawCurve.centile
    );
    if (!resampledCurve) {
      continue;
    }
    envelopeErrors.push(...validateResampledEnvelope(rawCurve, resampledCurve));
  }
  if (envelopeErrors.length > 0) {
    throw new Error(['Resampled envelope validation failed:', ...envelopeErrors.map((error) => `- ${error}`)].join('\n'));
  }

  console.log('[growth-data] Validating canonical curves');
  assertValidCanonicalCurves(resampledCurves);

  for (const sex of ['boys', 'girls'] as const) {
    const renderable = buildRenderableDataset(resampledCurves, sex, datasetMetadata);
    for (const outputPath of outputPaths[sex]) {
      console.log(`[growth-data] Writing ${sex} combined curves: ${outputPath}`);
      writeJson(outputPath, renderable);
    }
  }

  console.log('[growth-data] Generation complete');
}

run();
