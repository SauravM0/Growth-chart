import { type GrowthCurve, type GrowthPoint } from './schema';

export type ResampleConfig = {
  minAgeYears: number;
  maxAgeYears: number;
  stepYears: number;
};

export const DEFAULT_RESAMPLE_CONFIG: ResampleConfig = {
  minAgeYears: 0,
  maxAgeYears: 18,
  stepYears: 0.1,
};

function isStrictlyIncreasing(values: number[]): boolean {
  for (let index = 1; index < values.length; index += 1) {
    if (!(values[index] > values[index - 1])) {
      return false;
    }
  }
  return true;
}

function sortedUniquePoints(points: GrowthPoint[]): GrowthPoint[] {
  const sorted = [...points].sort((a, b) => a.ageYears - b.ageYears);
  const out: GrowthPoint[] = [];
  for (const point of sorted) {
    if (out.length === 0 || point.ageYears > out[out.length - 1].ageYears + 1e-12) {
      out.push(point);
    }
  }
  return out;
}

function safeLinearInterpolate(x0: number, y0: number, x1: number, y1: number, x: number): number {
  const span = x1 - x0;
  if (span <= 0) {
    return y0;
  }
  const t = (x - x0) / span;
  return y0 + t * (y1 - y0);
}

function computePchipDerivatives(x: number[], y: number[]): number[] {
  const n = x.length;
  if (n === 2) {
    const slope = (y[1] - y[0]) / (x[1] - x[0]);
    return [slope, slope];
  }

  const h = new Array(n - 1);
  const delta = new Array(n - 1);
  for (let i = 0; i < n - 1; i += 1) {
    h[i] = x[i + 1] - x[i];
    delta[i] = (y[i + 1] - y[i]) / h[i];
  }

  const d = new Array(n).fill(0);

  for (let i = 1; i <= n - 2; i += 1) {
    if (delta[i - 1] === 0 || delta[i] === 0 || delta[i - 1] * delta[i] < 0) {
      d[i] = 0;
      continue;
    }

    const w1 = 2 * h[i] + h[i - 1];
    const w2 = h[i] + 2 * h[i - 1];
    d[i] = (w1 + w2) / (w1 / delta[i - 1] + w2 / delta[i]);
  }

  const d0 = ((2 * h[0] + h[1]) * delta[0] - h[0] * delta[1]) / (h[0] + h[1]);
  if (Math.sign(d0) !== Math.sign(delta[0])) {
    d[0] = 0;
  } else if (Math.sign(delta[0]) !== Math.sign(delta[1]) && Math.abs(d0) > Math.abs(3 * delta[0])) {
    d[0] = 3 * delta[0];
  } else {
    d[0] = d0;
  }

  const dn = ((2 * h[n - 2] + h[n - 3]) * delta[n - 2] - h[n - 2] * delta[n - 3]) / (h[n - 2] + h[n - 3]);
  if (Math.sign(dn) !== Math.sign(delta[n - 2])) {
    d[n - 1] = 0;
  } else if (Math.sign(delta[n - 2]) !== Math.sign(delta[n - 3]) && Math.abs(dn) > Math.abs(3 * delta[n - 2])) {
    d[n - 1] = 3 * delta[n - 2];
  } else {
    d[n - 1] = dn;
  }

  return d;
}

function evaluatePchipSegment(x0: number, x1: number, y0: number, y1: number, d0: number, d1: number, x: number): number {
  const h = x1 - x0;
  if (h <= 0) {
    return y0;
  }

  const t = (x - x0) / h;
  const t2 = t * t;
  const t3 = t2 * t;

  const h00 = 2 * t3 - 3 * t2 + 1;
  const h10 = t3 - 2 * t2 + t;
  const h01 = -2 * t3 + 3 * t2;
  const h11 = t3 - t2;

  return h00 * y0 + h10 * h * d0 + h01 * y1 + h11 * h * d1;
}

export function interpolateShapePreserving(points: GrowthPoint[], ageYears: number): number {
  const sorted = sortedUniquePoints(points);
  if (sorted.length === 0) {
    return Number.NaN;
  }
  if (sorted.length === 1) {
    return sorted[0].value;
  }

  const x = sorted.map((point) => point.ageYears);
  const y = sorted.map((point) => point.value);

  if (!isStrictlyIncreasing(x)) {
    return Number.NaN;
  }

  if (ageYears <= x[0]) {
    return y[0];
  }
  if (ageYears >= x[x.length - 1]) {
    return y[y.length - 1];
  }

  let index = 0;
  while (index < x.length - 2 && ageYears > x[index + 1]) {
    index += 1;
  }

  const x0 = x[index];
  const x1 = x[index + 1];
  const y0 = y[index];
  const y1 = y[index + 1];

  const linearValue = safeLinearInterpolate(x0, y0, x1, y1, ageYears);

  const derivatives = computePchipDerivatives(x, y);
  const pchipValue = evaluatePchipSegment(x0, x1, y0, y1, derivatives[index], derivatives[index + 1], ageYears);

  const lo = Math.min(y0, y1) - 1e-12;
  const hi = Math.max(y0, y1) + 1e-12;

  if (pchipValue < lo || pchipValue > hi || !Number.isFinite(pchipValue)) {
    return linearValue;
  }

  return pchipValue;
}

function buildAgeGrid(config: ResampleConfig): number[] {
  if (config.stepYears <= 0) {
    throw new Error('Resample stepYears must be > 0.');
  }
  if (config.maxAgeYears < config.minAgeYears) {
    throw new Error('Resample maxAgeYears must be >= minAgeYears.');
  }

  const ages: number[] = [];
  let current = config.minAgeYears;
  while (current <= config.maxAgeYears + 1e-12) {
    ages.push(Number(current.toFixed(10)));
    current += config.stepYears;
  }

  if (Math.abs(ages[ages.length - 1] - config.maxAgeYears) > 1e-12) {
    ages.push(Number(config.maxAgeYears.toFixed(10)));
  }

  return ages;
}

export function resampleCurveToGrid(curve: GrowthCurve, config: ResampleConfig = DEFAULT_RESAMPLE_CONFIG): GrowthCurve {
  const ages = buildAgeGrid(config);
  const points = sortedUniquePoints(curve.points);

  const resampled: GrowthPoint[] = ages.map((ageYears) => ({
    ageYears,
    value: Number(interpolateShapePreserving(points, ageYears).toFixed(10)),
  }));

  return {
    ...curve,
    points: resampled,
  };
}

export function resampleCurves(curves: GrowthCurve[], config: ResampleConfig = DEFAULT_RESAMPLE_CONFIG): GrowthCurve[] {
  return curves.map((curve) => resampleCurveToGrid(curve, config));
}

export function validateResampledEnvelope(rawCurve: GrowthCurve, resampledCurve: GrowthCurve): string[] {
  const errors: string[] = [];
  const raw = sortedUniquePoints(rawCurve.points);

  if (raw.length < 2) {
    return errors;
  }

  for (const point of resampledCurve.points) {
    const x = point.ageYears;
    if (x < raw[0].ageYears - 1e-12 || x > raw[raw.length - 1].ageYears + 1e-12) {
      continue;
    }

    for (let i = 0; i < raw.length - 1; i += 1) {
      const left = raw[i];
      const right = raw[i + 1];
      if (x >= left.ageYears - 1e-12 && x <= right.ageYears + 1e-12) {
        const lo = Math.min(left.value, right.value) - 1e-9;
        const hi = Math.max(left.value, right.value) + 1e-9;
        if (point.value < lo || point.value > hi) {
          errors.push(
            `${rawCurve.sex}/${rawCurve.metric}/C${rawCurve.centile} age=${x.toFixed(4)} outside segment envelope [${lo.toFixed(4)}, ${hi.toFixed(4)}]`
          );
        }
        break;
      }
    }
  }

  return errors;
}
