import { curveMonotoneX, line } from 'd3-shape';
import type { CombinedIapSpec } from './spec';

type CurvePoint = {
  ageYears: number;
  valueY: number;
};

type CurveSeries = {
  centile: string;
  series: CurvePoint[];
};

type CurveSeriesMap = Record<string, CurvePoint[]>;

type CombinedCurvesDataset = {
  height?: CurveSeries[] | CurveSeriesMap;
  weight?: CurveSeries[] | CurveSeriesMap;
} | CurveSeries[];

type CurveStroke = {
  id: string;
  centile: string;
  color: string;
  strokeWidth: number;
  path: string;
};

type CurveLabel = {
  centile: string;
  x: number;
  y: number;
};

export type CurvesModel = {
  strokes: CurveStroke[];
  heightLabels: CurveLabel[];
  weightLabels: CurveLabel[];
  shortLineCallout: {
    x: number;
    y: number;
    text: string;
  } | null;
};

const LABEL_ORDER = ['97', '90', '75', '50', '25', '10', '3'];

function mapX(value: number, spec: CombinedIapSpec): number {
  const { xMin, xMax } = spec.axis;
  const rect = spec.mainPlot;
  if (xMax <= xMin) {
    return rect.x;
  }
  return rect.x + ((value - xMin) / (xMax - xMin)) * rect.w;
}

function mapY(value: number, spec: CombinedIapSpec): number {
  const { yMin, yMax } = spec.axis;
  const rect = spec.mainPlot;
  if (yMax <= yMin) {
    return rect.y + rect.h;
  }
  return rect.y + rect.h - ((value - yMin) / (yMax - yMin)) * rect.h;
}

function normalizeSeries(curves: CurveSeries[] | CurveSeriesMap): Map<string, CurvePoint[]> {
  const map = new Map<string, CurvePoint[]>();
  if (Array.isArray(curves)) {
    for (const row of curves || []) {
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

function splitCurveCollections(curves: CombinedCurvesDataset): { heightMap: Map<string, CurvePoint[]>; weightMap: Map<string, CurvePoint[]> } {
  if (Array.isArray(curves)) {
    return {
      heightMap: normalizeSeries(curves),
      weightMap: new Map<string, CurvePoint[]>(),
    };
  }

  const heightSource = curves?.height || [];
  const weightSource = curves?.weight || [];
  return {
    heightMap: normalizeSeries(heightSource),
    weightMap: normalizeSeries(weightSource),
  };
}

function curvePath(points: CurvePoint[], spec: CombinedIapSpec): string {
  const usable = points
    .filter((point) => Number.isFinite(point.ageYears) && Number.isFinite(point.valueY))
    .map((point) => ({ x: mapX(point.ageYears, spec), y: mapY(point.valueY, spec) }));

  if (usable.length < 2) {
    return '';
  }

  const generator = line<{ x: number; y: number }>()
    .x((d) => d.x)
    .y((d) => d.y)
    .curve(curveMonotoneX);

  return generator(usable) || '';
}

function valueAtAge(points: CurvePoint[], targetAge: number): number | null {
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

export function buildCurvesModel(spec: CombinedIapSpec, curves: CombinedCurvesDataset, _sex = 'F'): CurvesModel {
  const { heightMap, weightMap } = splitCurveCollections(curves);

  const strokes: CurveStroke[] = [];
  for (const centile of LABEL_ORDER.slice().reverse()) {
    const heightPoints = heightMap.get(centile) || [];
    const heightPath = curvePath(heightPoints, spec);
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
    const weightPath = curvePath(weightPoints, spec);
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

  const labelAge = spec.axis.xMax;
  const labelX = spec.mainPlot.x + spec.mainPlot.w + 10;

  const heightLabels = LABEL_ORDER.map((centile) => {
    const points = heightMap.get(centile) || [];
    const yValue = valueAtAge(points, labelAge);
    return {
      centile,
      x: labelX,
      y: yValue === null ? spec.mainPlot.y + 30 : mapY(yValue, spec) + 4,
    };
  });

  const weightLabels = LABEL_ORDER.map((centile) => {
    const points = weightMap.get(centile) || [];
    const yValue = valueAtAge(points, labelAge);
    return {
      centile,
      x: labelX,
      y: yValue === null ? spec.mainPlot.y + spec.mainPlot.h - 20 : mapY(yValue, spec) + 4,
    };
  });

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
