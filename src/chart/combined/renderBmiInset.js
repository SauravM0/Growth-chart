import { curveMonotoneX, line } from 'd3-shape';

const X_MIN = 110;
const X_MAX = 190;
const Y_MIN = 20;
const Y_MAX = 120;

const CURVES = [
  {
    key: 'OB',
    color: '#dc2626',
    strokeWidth: 3.4,
    points: [
      { x: 118, y: 72 },
      { x: 130, y: 80 },
      { x: 142, y: 89 },
      { x: 154, y: 98 },
      { x: 166, y: 107 },
      { x: 178, y: 116 },
    ],
  },
  {
    key: 'OW',
    color: '#eab308',
    strokeWidth: 3,
    points: [
      { x: 118, y: 58 },
      { x: 130, y: 66 },
      { x: 142, y: 74 },
      { x: 154, y: 82 },
      { x: 166, y: 91 },
      { x: 178, y: 100 },
    ],
  },
  {
    key: 'UW',
    color: '#111111',
    strokeWidth: 2.8,
    points: [
      { x: 118, y: 33 },
      { x: 130, y: 38 },
      { x: 142, y: 44 },
      { x: 154, y: 51 },
      { x: 166, y: 60 },
      { x: 178, y: 70 },
    ],
  },
];

function mapX(value, rect) {
  return rect.x + ((value - X_MIN) / (X_MAX - X_MIN)) * rect.w;
}

function mapY(value, rect) {
  return rect.y + rect.h - ((value - Y_MIN) / (Y_MAX - Y_MIN)) * rect.h;
}

function toPath(points, plotRect) {
  const usable = (points || [])
    .filter((point) => Number.isFinite(point?.x) && Number.isFinite(point?.y))
    .map((point) => ({
      x: mapX(point.x, plotRect),
      y: mapY(point.y, plotRect),
    }));

  if (usable.length < 2) {
    return '';
  }

  const generator = line()
    .x((d) => d.x)
    .y((d) => d.y)
    .curve(curveMonotoneX);

  return generator(usable) || '';
}

export function buildBmiInsetModel(spec, sex) {
  const frameRect = {
    x: spec.bmiInset.x,
    y: spec.bmiInset.y,
    w: spec.bmiInset.w,
    h: spec.bmiInset.h,
  };

  const plotRect = {
    x: frameRect.x + 68,
    y: frameRect.y + 84,
    w: frameRect.w - 98,
    h: frameRect.h - 144,
  };

  const xTicks = [120, 140, 160, 180].map((value) => ({ value, x: mapX(value, plotRect) }));
  const yTicks = [20, 40, 60, 80, 100, 120].map((value) => ({ value, y: mapY(value, plotRect) }));

  const curves = CURVES.map((curve) => {
    const path = toPath(curve.points, plotRect);
    const endPoint = curve.points[curve.points.length - 1];
    return {
      key: curve.key,
      color: curve.color,
      strokeWidth: curve.strokeWidth,
      path,
      labelX: mapX(endPoint.x, plotRect) + 8,
      labelY: mapY(endPoint.y, plotRect) + 6,
    };
  });

  return {
    frameRect,
    plotRect,
    title: sex === 'M' ? 'Boys BMI quick Assessment Tool 8-18 Years' : 'Girls BMI quick Assessment Tool 8-18 Years',
    xLabel: 'Height in CM',
    yLabel: 'Weight in KG',
    xTicks,
    yTicks,
    curves,
    legend: ['OB-Obese', 'OW-Overweight', 'UW-Underweight'],
  };
}
