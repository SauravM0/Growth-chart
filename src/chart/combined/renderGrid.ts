import type { CombinedIapSpec, Rect } from './spec';

type GridLine = {
  value: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

type GridLabel = {
  value: number;
  x: number;
  y: number;
};

export type GridModel = {
  rect: Rect;
  xMajorLines: GridLine[];
  xMinorLines: GridLine[];
  yMajorLines: GridLine[];
  yMinorLines: GridLine[];
  xMajorLabels: GridLabel[];
  yMajorLabels: GridLabel[];
};

function round(value: number, decimals = 4): number {
  const power = 10 ** decimals;
  return Math.round(value * power) / power;
}

function buildRange(start: number, end: number, step: number): number[] {
  const values: number[] = [];
  if (!Number.isFinite(step) || step <= 0) {
    return values;
  }
  const count = Math.floor((end - start) / step + 0.000001);
  for (let index = 0; index <= count; index += 1) {
    values.push(round(start + index * step));
  }
  const last = values[values.length - 1];
  if (values.length === 0 || Math.abs(last - end) > 0.0001) {
    values.push(round(end));
  }
  return values;
}

function isMultiple(value: number, step: number): boolean {
  if (!Number.isFinite(step) || step <= 0) {
    return false;
  }
  const ratio = value / step;
  return Math.abs(ratio - Math.round(ratio)) < 0.0001;
}

function mapX(value: number, rect: Rect, xMin: number, xMax: number): number {
  if (xMax <= xMin) {
    return rect.x;
  }
  return rect.x + ((value - xMin) / (xMax - xMin)) * rect.w;
}

function mapY(value: number, rect: Rect, yMin: number, yMax: number): number {
  if (yMax <= yMin) {
    return rect.y + rect.h;
  }
  return rect.y + rect.h - ((value - yMin) / (yMax - yMin)) * rect.h;
}

export function buildGridModel(spec: CombinedIapSpec): GridModel {
  const { mainPlot: rect, axis } = spec;

  const xMajorValues = buildRange(axis.xMin, axis.xMax, axis.xMajorStepYears);
  const xMinorValues = buildRange(axis.xMin, axis.xMax, axis.xMinorStepYears).filter(
    (value) => !isMultiple(value - axis.xMin, axis.xMajorStepYears)
  );

  const yMajorValues = buildRange(axis.yMin, axis.yMax, axis.yMajorStep);
  const yMinorValues = buildRange(axis.yMin, axis.yMax, axis.yMinorStep).filter(
    (value) => !isMultiple(value - axis.yMin, axis.yMajorStep)
  );

  const xMajorLines: GridLine[] = xMajorValues.map((value) => {
    const x = mapX(value, rect, axis.xMin, axis.xMax);
    return { value, x1: x, y1: rect.y, x2: x, y2: rect.y + rect.h };
  });

  const xMinorLines: GridLine[] = xMinorValues.map((value) => {
    const x = mapX(value, rect, axis.xMin, axis.xMax);
    return { value, x1: x, y1: rect.y, x2: x, y2: rect.y + rect.h };
  });

  const yMajorLines: GridLine[] = yMajorValues.map((value) => {
    const y = mapY(value, rect, axis.yMin, axis.yMax);
    return { value, x1: rect.x, y1: y, x2: rect.x + rect.w, y2: y };
  });

  const yMinorLines: GridLine[] = yMinorValues.map((value) => {
    const y = mapY(value, rect, axis.yMin, axis.yMax);
    return { value, x1: rect.x, y1: y, x2: rect.x + rect.w, y2: y };
  });

  const xMajorLabels: GridLabel[] = xMajorValues.map((value) => ({
    value,
    x: mapX(value, rect, axis.xMin, axis.xMax),
    y: rect.y + rect.h + 40,
  }));

  const yMajorLabels: GridLabel[] = yMajorValues.map((value) => ({
    value,
    x: rect.x - 16,
    y: mapY(value, rect, axis.yMin, axis.yMax) + 6,
  }));

  return {
    rect,
    xMajorLines,
    xMinorLines,
    yMajorLines,
    yMinorLines,
    xMajorLabels,
    yMajorLabels,
  };
}
