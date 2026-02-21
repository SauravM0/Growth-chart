import { line, curveMonotoneX } from 'd3-shape';

export function getCurvePath(points, xScale, yScale) {
  const lineGenerator = line()
    .x((point) => xScale(point.age))
    .y((point) => yScale(point.v))
    .curve(curveMonotoneX);

  return lineGenerator(points) || '';
}

export function getCentileStyle(centile) {
  if (centile === 50) {
    return { strokeWidth: 2.3, opacity: 0.95, dashArray: undefined };
  }

  if (centile === 3) {
    return { strokeWidth: 2.0, opacity: 0.9, dashArray: '5 3' };
  }

  return { strokeWidth: 1.2, opacity: 0.85, dashArray: undefined };
}
