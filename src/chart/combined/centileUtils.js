const DEFAULT_CENTILES = [3, 10, 25, 50, 75, 90, 97];

function asFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function normalizeSeriesPoint(point) {
  if (!point || typeof point !== 'object') {
    return null;
  }

  const ageYears = asFiniteNumber(point.ageYears ?? point.age);
  const value = asFiniteNumber(point.valueY ?? point.value ?? point.v);

  if (ageYears == null || value == null) {
    return null;
  }

  return { ageYears, value };
}

function normalizeSeries(series) {
  if (!Array.isArray(series)) {
    return [];
  }

  return series
    .map(normalizeSeriesPoint)
    .filter(Boolean)
    .sort((left, right) => left.ageYears - right.ageYears);
}

function interpolateSeriesValueAtAge(series, ageYears) {
  if (!Number.isFinite(ageYears)) {
    return null;
  }

  const points = normalizeSeries(series);
  if (points.length === 0) {
    return null;
  }

  if (ageYears <= points[0].ageYears) {
    return points[0].value;
  }

  const last = points[points.length - 1];
  if (ageYears >= last.ageYears) {
    return last.value;
  }

  for (let index = 1; index < points.length; index += 1) {
    const left = points[index - 1];
    const right = points[index];
    if (ageYears < left.ageYears || ageYears > right.ageYears) {
      continue;
    }
    const span = right.ageYears - left.ageYears;
    if (span <= 0) {
      return left.value;
    }
    const t = (ageYears - left.ageYears) / span;
    return left.value + t * (right.value - left.value);
  }

  return null;
}

function normalizeMetricCurves(metricCurves) {
  if (Array.isArray(metricCurves)) {
    const map = {};
    for (const row of metricCurves) {
      if (!row || row.centile == null || !Array.isArray(row.series)) {
        continue;
      }
      map[String(row.centile)] = row.series;
    }
    return map;
  }
  if (metricCurves && typeof metricCurves === 'object') {
    return metricCurves;
  }
  return {};
}

function buildSamplesAtAge(metricCurves, ageYears) {
  const normalized = normalizeMetricCurves(metricCurves);
  return DEFAULT_CENTILES
    .map((centile) => {
      const value = interpolateSeriesValueAtAge(normalized[String(centile)], ageYears);
      return value == null ? null : { centile, value };
    })
    .filter(Boolean);
}

function estimateCentile(samples, value) {
  if (!Number.isFinite(value) || !Array.isArray(samples) || samples.length < 2) {
    return null;
  }

  const sorted = samples.slice().sort((left, right) => left.centile - right.centile);
  const lowest = sorted[0];
  const highest = sorted[sorted.length - 1];

  if (value <= lowest.value) {
    return {
      nearestCentile: lowest.centile,
      nearestCentileBand: `<${lowest.centile}`,
      interpolatedCentile: lowest.centile,
      isApproxCentile: true,
    };
  }

  if (value >= highest.value) {
    return {
      nearestCentile: highest.centile,
      nearestCentileBand: `>${highest.centile}`,
      interpolatedCentile: highest.centile,
      isApproxCentile: true,
    };
  }

  for (let index = 1; index < sorted.length; index += 1) {
    const lower = sorted[index - 1];
    const upper = sorted[index];
    if (value < lower.value || value > upper.value) {
      continue;
    }

    if (upper.value === lower.value) {
      return {
        nearestCentile: lower.centile,
        nearestCentileBand: `${lower.centile}-${upper.centile}`,
        interpolatedCentile: lower.centile,
        isApproxCentile: true,
      };
    }

    const ratio = (value - lower.value) / (upper.value - lower.value);
    const interpolatedCentile = lower.centile + ratio * (upper.centile - lower.centile);
    const nearestCentile =
      Math.abs(value - lower.value) <= Math.abs(value - upper.value) ? lower.centile : upper.centile;

    return {
      nearestCentile,
      nearestCentileBand: `${lower.centile}-${upper.centile}`,
      interpolatedCentile,
      isApproxCentile: true,
    };
  }

  return null;
}

function calculateZScoreFromLms(value, l, m, s) {
  if (!Number.isFinite(value) || !Number.isFinite(l) || !Number.isFinite(m) || !Number.isFinite(s)) {
    return null;
  }
  if (value <= 0 || m <= 0 || s <= 0) {
    return null;
  }
  if (Math.abs(l) < 1e-12) {
    return Math.log(value / m) / s;
  }
  return (Math.pow(value / m, l) - 1) / (l * s);
}

function resolveLmsAtAge(lms, ageYears) {
  if (!lms || ageYears == null) {
    return null;
  }

  if (Array.isArray(lms)) {
    return {
      l: interpolateSeriesValueAtAge(lms.map((row) => ({ ageYears: row.ageYears ?? row.age, value: row.L ?? row.l })), ageYears),
      m: interpolateSeriesValueAtAge(lms.map((row) => ({ ageYears: row.ageYears ?? row.age, value: row.M ?? row.m })), ageYears),
      s: interpolateSeriesValueAtAge(lms.map((row) => ({ ageYears: row.ageYears ?? row.age, value: row.S ?? row.s })), ageYears),
    };
  }

  const l = interpolateSeriesValueAtAge(lms.L || lms.l, ageYears);
  const m = interpolateSeriesValueAtAge(lms.M || lms.m, ageYears);
  const s = interpolateSeriesValueAtAge(lms.S || lms.s, ageYears);
  if (l == null || m == null || s == null) {
    return null;
  }
  return { l, m, s };
}

export function evaluateMeasurementAgainstCurves({
  ageYears,
  value,
  metricCurves,
  lms = null,
}) {
  if (!Number.isFinite(ageYears) || !Number.isFinite(value)) {
    return {
      nearestCentile: null,
      nearestCentileBand: null,
      interpolatedCentile: null,
      zScore: null,
      isApproxCentile: false,
    };
  }

  const samples = buildSamplesAtAge(metricCurves, ageYears);
  const centileEstimate = estimateCentile(samples, value);
  const lmsAtAge = resolveLmsAtAge(lms, ageYears);
  const zScore = lmsAtAge ? calculateZScoreFromLms(value, lmsAtAge.l, lmsAtAge.m, lmsAtAge.s) : null;

  return {
    nearestCentile: centileEstimate?.nearestCentile ?? null,
    nearestCentileBand: centileEstimate?.nearestCentileBand ?? null,
    interpolatedCentile: centileEstimate?.interpolatedCentile ?? null,
    zScore,
    isApproxCentile: centileEstimate?.isApproxCentile ?? false,
  };
}
