function round(value, decimals = 4) {
  const power = 10 ** decimals;
  return Math.round(value * power) / power;
}

function buildRange(start, end, step) {
  const values = [];
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

function isMultiple(value, step) {
  if (!Number.isFinite(step) || step <= 0) {
    return false;
  }
  const ratio = value / step;
  return Math.abs(ratio - Math.round(ratio)) < 0.0001;
}

function mapX(value, rect, xMin, xMax) {
  if (xMax <= xMin) {
    return rect.x;
  }
  return rect.x + ((value - xMin) / (xMax - xMin)) * rect.w;
}

function mapY(value, rect, yMin, yMax) {
  if (yMax <= yMin) {
    return rect.y + rect.h;
  }
  return rect.y + rect.h - ((value - yMin) / (yMax - yMin)) * rect.h;
}

function formatTick(value) {
  if (!Number.isFinite(value)) {
    return '';
  }
  if (Math.abs(value - Math.round(value)) < 0.0001) {
    return String(Math.round(value));
  }
  return String(round(value, 1));
}

export function buildGridModel(spec) {
  const { mainPlot: rect, axis } = spec;

  const xMajorValues = buildRange(axis.xMin, axis.xMax, axis.xMajorStepYears);
  const xMinorValues = buildRange(axis.xMin, axis.xMax, axis.xMinorStepYears).filter(
    (value) => !isMultiple(value - axis.xMin, axis.xMajorStepYears)
  );

  const yMajorValues = buildRange(axis.yMin, axis.yMax, axis.yMajorStep);
  const yMinorValues = buildRange(axis.yMin, axis.yMax, axis.yMinorStep).filter(
    (value) => !isMultiple(value - axis.yMin, axis.yMajorStep)
  );

  const xMajorLines = xMajorValues.map((value) => {
    const x = mapX(value, rect, axis.xMin, axis.xMax);
    return { value, x1: x, y1: rect.y, x2: x, y2: rect.y + rect.h };
  });

  const xMinorLines = xMinorValues.map((value) => {
    const x = mapX(value, rect, axis.xMin, axis.xMax);
    return { value, x1: x, y1: rect.y, x2: x, y2: rect.y + rect.h };
  });

  const yMajorLines = yMajorValues.map((value) => {
    const y = mapY(value, rect, axis.yMin, axis.yMax);
    return { value, x1: rect.x, y1: y, x2: rect.x + rect.w, y2: y };
  });

  const yMinorLines = yMinorValues.map((value) => {
    const y = mapY(value, rect, axis.yMin, axis.yMax);
    return { value, x1: rect.x, y1: y, x2: rect.x + rect.w, y2: y };
  });

  const xMajorLabels = xMajorValues.map((value) => ({
    value: formatTick(value),
    x: mapX(value, rect, axis.xMin, axis.xMax),
    y: rect.y + rect.h + 34,
  }));

  const yMajorLabels = yMajorValues.map((value) => ({
    value: formatTick(value),
    x: rect.x - 14,
    y: mapY(value, rect, axis.yMin, axis.yMax) + 5,
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
