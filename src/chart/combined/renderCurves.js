import { curveMonotoneX, line } from 'd3-shape';

const LABEL_ORDER = ['97', '90', '75', '50', '25', '10', '3'];

const RIGHT_LABEL_GAP_X = 6;
const HEIGHT_LABEL_MIN_GAP = 26;
const WEIGHT_LABEL_MIN_GAP = 22;
const LABEL_BASELINE_OFFSET = 4;

function mapX(value, spec) {
  const { xMin, xMax } = spec.axis;
  const rect = spec.mainPlot;
  if (xMax <= xMin) {
    return rect.x;
  }
  return rect.x + ((value - xMin) / (xMax - xMin)) * rect.w;
}

function mapY(value, spec) {
  const { yMin, yMax } = spec.axis;
  const rect = spec.mainPlot;
  if (yMax <= yMin) {
    return rect.y + rect.h;
  }
  return rect.y + rect.h - ((value - yMin) / (yMax - yMin)) * rect.h;
}

function normalizeSeries(curves) {
  const map = new Map();
  if (Array.isArray(curves)) {
    for (const row of curves) {
      if (!row || !row.centile || !Array.isArray(row.series)) {
        continue;
      }
      map.set(String(row.centile), row.series);
    }
    return map;
  }

  if (curves && typeof curves === 'object') {
    for (const [centile, series] of Object.entries(curves)) {
      if (!Array.isArray(series)) {
        continue;
      }
      map.set(String(centile), series);
    }
  }
  return map;
}

function splitCurveCollections(curves) {
  if (Array.isArray(curves)) {
    return {
      heightMap: normalizeSeries(curves),
      weightMap: new Map(),
    };
  }

  const heightSource = curves && typeof curves === 'object' && curves.height ? curves.height : [];
  const weightSource = curves && typeof curves === 'object' && curves.weight ? curves.weight : [];

  return {
    heightMap: normalizeSeries(heightSource),
    weightMap: normalizeSeries(weightSource),
  };
}

function curvePath(points, spec) {
  const usable = points
    .filter((point) => Number.isFinite(point.ageYears) && Number.isFinite(point.valueY))
    .map((point) => ({ x: mapX(point.ageYears, spec), y: mapY(point.valueY, spec) }));

  if (usable.length < 2) {
    return '';
  }

  const generator = line()
    .x((d) => d.x)
    .y((d) => d.y)
    .curve(curveMonotoneX);

  return generator(usable) || '';
}

function valueAtAge(points, targetAge) {
  if (!points || points.length === 0) {
    return null;
  }
  if (targetAge <= points[0].ageYears) {
    return points[0].valueY;
  }
  const last = points[points.length - 1];
  if (targetAge >= last.ageYears) {
    return last.valueY;
  }

  for (let index = 0; index < points.length - 1; index += 1) {
    const left = points[index];
    const right = points[index + 1];
    if (targetAge >= left.ageYears && targetAge <= right.ageYears) {
      const span = right.ageYears - left.ageYears;
      if (span <= 0) {
        return left.valueY;
      }
      const t = (targetAge - left.ageYears) / span;
      return left.valueY + t * (right.valueY - left.valueY);
    }
  }
  return null;
}

function densifySeries(points, stepYears = 0.1, minAgeOverride, maxAgeOverride) {
  if (!points || points.length < 2) {
    return points || [];
  }

  const sorted = points
    .filter((point) => Number.isFinite(point?.ageYears) && Number.isFinite(point?.valueY))
    .slice()
    .sort((a, b) => a.ageYears - b.ageYears);

  if (sorted.length < 2) {
    return sorted;
  }

  const minAge = Number.isFinite(minAgeOverride) ? minAgeOverride : sorted[0].ageYears;
  const maxAge = Number.isFinite(maxAgeOverride) ? maxAgeOverride : sorted[sorted.length - 1].ageYears;
  if (maxAge < minAge) {
    return [];
  }

  const out = [];
  for (let age = minAge; age <= maxAge + 1e-9; age += stepYears) {
    const clampedAge = Math.min(age, maxAge);
    const valueY = valueAtAge(sorted, clampedAge);
    if (valueY != null && Number.isFinite(valueY)) {
      out.push({ ageYears: clampedAge, valueY });
    }
  }

  const endValue = valueAtAge(sorted, maxAge);
  if (
    endValue != null &&
    Number.isFinite(endValue) &&
    (out.length === 0 || Math.abs(out[out.length - 1].ageYears - maxAge) > 1e-9)
  ) {
    out.push({ ageYears: maxAge, valueY: endValue });
  }

  return out;
}

function densifyAdaptive(points) {
  if (!points || points.length < 2) {
    return points || [];
  }

  const sorted = points.slice().sort((a, b) => a.ageYears - b.ageYears);
  const minAge = sorted[0].ageYears;
  const maxAge = sorted[sorted.length - 1].ageYears;
  if (!Number.isFinite(minAge) || !Number.isFinite(maxAge) || maxAge <= minAge) {
    return sorted;
  }

  const infancyEnd = Math.min(2, maxAge);
  const early = densifySeries(sorted, 0.05, minAge, infancyEnd);
  if (maxAge <= 2) {
    return early;
  }

  const later = densifySeries(sorted, 0.1, Math.max(2, minAge), maxAge);
  if (!early.length) {
    return later;
  }
  if (!later.length) {
    return early;
  }
  if (Math.abs(early[early.length - 1].ageYears - later[0].ageYears) < 1e-9) {
    later.shift();
  }
  return early.concat(later);
}

function getSeriesEndpoint(points) {
  const usable = (points || []).filter(
    (point) => Number.isFinite(point?.ageYears) && Number.isFinite(point?.valueY)
  );
  if (!usable.length) {
    return null;
  }

  let end = usable[0];
  for (const point of usable) {
    if (point.ageYears > end.ageYears) {
      end = point;
    }
  }
  return end;
}

function resolveLabelCollisions(labels, minGap, spec) {
  if (!Array.isArray(labels) || labels.length < 2) {
    return labels || [];
  }

  const top = spec.mainPlot.y + 12;
  const bottom = spec.mainPlot.y + spec.mainPlot.h - 8;
  const sorted = labels
    .map((label, index) => ({ ...label, _index: index }))
    .sort((a, b) => a.y - b.y);

  sorted[0].y = Math.max(sorted[0].y, top);
  for (let index = 1; index < sorted.length; index += 1) {
    sorted[index].y = Math.max(sorted[index].y, sorted[index - 1].y + minGap);
  }

  sorted[sorted.length - 1].y = Math.min(sorted[sorted.length - 1].y, bottom);
  for (let index = sorted.length - 2; index >= 0; index -= 1) {
    sorted[index].y = Math.min(sorted[index].y, sorted[index + 1].y - minGap);
  }

  sorted[0].y = Math.max(sorted[0].y, top);

  const restored = new Array(sorted.length);
  for (const label of sorted) {
    const { _index, ...clean } = label;
    restored[_index] = clean;
  }
  return restored;
}

export function buildCurvesModel(spec, curves, _sex = 'F') {
  const { heightMap, weightMap } = splitCurveCollections(curves);

  const strokes = [];
  for (const centile of LABEL_ORDER.slice().reverse()) {
    const heightPoints = heightMap.get(centile) || [];
    const denseHeight = densifyAdaptive(heightPoints);
    const heightPath = curvePath(denseHeight, spec);
    if (heightPath) {
      strokes.push({
        id: `height-${centile}`,
        centile,
        color: centile === '3' ? '#d63b44' : '#141414',
        strokeWidth: centile === '3' ? 4.2 : 2.2,
        path: heightPath,
      });
    }

    const weightPoints = weightMap.get(centile) || [];
    const denseWeight = densifyAdaptive(weightPoints);
    const weightPath = curvePath(denseWeight, spec);
    if (weightPath) {
      strokes.push({
        id: `weight-${centile}`,
        centile,
        color: '#141414',
        strokeWidth: 2.0,
        path: weightPath,
      });
    }
  }

  const fallbackLabelX = spec.mainPlot.x + spec.mainPlot.w + 8;

  const heightLabelsRaw = LABEL_ORDER.map((centile) => {
    const points = heightMap.get(centile) || [];
    const endpoint = getSeriesEndpoint(points);
    const yValue = endpoint ? endpoint.valueY : valueAtAge(points, spec.axis.xMax);
    return {
      centile,
      x: endpoint ? mapX(endpoint.ageYears, spec) + RIGHT_LABEL_GAP_X : fallbackLabelX,
      y: yValue === null ? spec.mainPlot.y + 30 : mapY(yValue, spec) + LABEL_BASELINE_OFFSET,
    };
  });

  const weightLabelsRaw = LABEL_ORDER.map((centile) => {
    const points = weightMap.get(centile) || [];
    const endpoint = getSeriesEndpoint(points);
    const yValue = endpoint ? endpoint.valueY : valueAtAge(points, spec.axis.xMax);
    return {
      centile,
      x: endpoint ? mapX(endpoint.ageYears, spec) + RIGHT_LABEL_GAP_X : fallbackLabelX,
      y:
        yValue === null
          ? spec.mainPlot.y + spec.mainPlot.h - 20
          : mapY(yValue, spec) + LABEL_BASELINE_OFFSET,
    };
  });

  const heightLabels = resolveLabelCollisions(heightLabelsRaw, HEIGHT_LABEL_MIN_GAP, spec);
  const weightLabels = resolveLabelCollisions(weightLabelsRaw, WEIGHT_LABEL_MIN_GAP, spec);

  const redHeight = heightLabels.find((row) => row.centile === '3') || null;
  const shortLineCallout = redHeight
    ? {
        x: redHeight.x + 22,
        y: redHeight.y - 2,
        text: '3(Short below this line)',
      }
    : null;

  return {
    strokes,
    heightLabels,
    weightLabels,
    shortLineCallout,
  };
}
