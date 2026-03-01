import { type GrowthCurve, type GrowthMetric, type GrowthPoint, type GrowthSex } from './schema';

export type BlendWindowConfig = {
  startAgeYears: number;
  endAgeYears: number;
  stepYears: number;
};

export const DEFAULT_BLEND_WINDOW: BlendWindowConfig = {
  startAgeYears: 4.75,
  endAgeYears: 5.25,
  stepYears: 0.05,
};

function curveKey(curve: Pick<GrowthCurve, 'sex' | 'metric' | 'centile'>): string {
  return `${curve.sex}|${curve.metric}|${curve.centile}`;
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

export function valueAtAge(points: GrowthPoint[], targetAgeYears: number): number {
  const sorted = sortedUniquePoints(points);
  if (sorted.length === 0) {
    return Number.NaN;
  }
  if (targetAgeYears <= sorted[0].ageYears) {
    return sorted[0].value;
  }
  const last = sorted[sorted.length - 1];
  if (targetAgeYears >= last.ageYears) {
    return last.value;
  }

  for (let index = 0; index < sorted.length - 1; index += 1) {
    const left = sorted[index];
    const right = sorted[index + 1];
    if (targetAgeYears >= left.ageYears && targetAgeYears <= right.ageYears) {
      const span = right.ageYears - left.ageYears;
      if (span <= 0) {
        return left.value;
      }
      const t = (targetAgeYears - left.ageYears) / span;
      return left.value + t * (right.value - left.value);
    }
  }

  return last.value;
}

function blendWeight(ageYears: number, window: BlendWindowConfig): number {
  const span = window.endAgeYears - window.startAgeYears;
  if (span <= 0) {
    return ageYears >= window.endAgeYears ? 1 : 0;
  }
  const raw = (ageYears - window.startAgeYears) / span;
  return Math.min(1, Math.max(0, raw));
}

function rangeAges(start: number, end: number, step: number): number[] {
  const ages: number[] = [];
  let current = start;
  while (current <= end + 1e-12) {
    ages.push(Number(current.toFixed(10)));
    current += step;
  }
  if (ages.length === 0 || Math.abs(ages[ages.length - 1] - end) > 1e-12) {
    ages.push(Number(end.toFixed(10)));
  }
  return ages;
}

function collectBlendAges(whoPoints: GrowthPoint[], iapPoints: GrowthPoint[], window: BlendWindowConfig): number[] {
  const ageSet = new Set<number>();

  for (const age of rangeAges(window.startAgeYears, window.endAgeYears, window.stepYears)) {
    ageSet.add(age);
  }

  for (const point of whoPoints) {
    if (point.ageYears >= window.startAgeYears - 1e-12 && point.ageYears <= window.endAgeYears + 1e-12) {
      ageSet.add(Number(point.ageYears.toFixed(10)));
    }
  }

  for (const point of iapPoints) {
    if (point.ageYears >= window.startAgeYears - 1e-12 && point.ageYears <= window.endAgeYears + 1e-12) {
      ageSet.add(Number(point.ageYears.toFixed(10)));
    }
  }

  return [...ageSet].sort((a, b) => a - b);
}

function mergeSingleCurve(
  baseCurve: GrowthCurve | undefined,
  whoCurve: GrowthCurve | undefined,
  iapCurve: GrowthCurve | undefined,
  window: BlendWindowConfig,
  fallbackMeta: Pick<GrowthCurve, 'sex' | 'metric' | 'centile'>
): GrowthCurve {
  const basePoints = sortedUniquePoints(baseCurve?.points || []);
  const whoPoints = sortedUniquePoints(whoCurve?.points || []);
  const iapPoints = sortedUniquePoints(iapCurve?.points || []);

  if (!whoPoints.length || !iapPoints.length) {
    return {
      ...fallbackMeta,
      points: basePoints,
    };
  }

  const beforeWindow = whoPoints.filter((point) => point.ageYears < window.startAgeYears - 1e-12);
  const afterWindow = iapPoints.filter((point) => point.ageYears > window.endAgeYears + 1e-12);
  const blendAges = collectBlendAges(whoPoints, iapPoints, window);
  const blendedWindowPoints: GrowthPoint[] = blendAges.map((ageYears) => {
    const whoValue = valueAtAge(whoPoints, ageYears);
    const iapValue = valueAtAge(iapPoints, ageYears);
    const w = blendWeight(ageYears, window);
    return {
      ageYears,
      value: Number(((1 - w) * whoValue + w * iapValue).toFixed(10)),
    };
  });

  const merged = sortedUniquePoints([...beforeWindow, ...blendedWindowPoints, ...afterWindow]);

  return {
    ...fallbackMeta,
    points: merged,
  };
}

export function mergeWhoAndIapCurves(
  baseCurves: GrowthCurve[],
  whoCurves: GrowthCurve[],
  iapCurves: GrowthCurve[],
  window: BlendWindowConfig = DEFAULT_BLEND_WINDOW
): GrowthCurve[] {
  const baseByKey = new Map(baseCurves.map((curve) => [curveKey(curve), curve]));
  const whoByKey = new Map(whoCurves.map((curve) => [curveKey(curve), curve]));
  const iapByKey = new Map(iapCurves.map((curve) => [curveKey(curve), curve]));

  const keySet = new Set<string>([...baseByKey.keys(), ...whoByKey.keys(), ...iapByKey.keys()]);
  const out: GrowthCurve[] = [];

  for (const key of keySet) {
    const baseCurve = baseByKey.get(key);
    const whoCurve = whoByKey.get(key);
    const iapCurve = iapByKey.get(key);

    const meta = baseCurve || whoCurve || iapCurve;
    if (!meta) {
      continue;
    }

    out.push(
      mergeSingleCurve(baseCurve, whoCurve, iapCurve, window, {
        sex: meta.sex as GrowthSex,
        metric: meta.metric as GrowthMetric,
        centile: meta.centile,
      })
    );
  }

  return out;
}
