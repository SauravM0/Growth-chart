import { line, curveMonotoneX } from 'd3-shape';
import { explainMeasurementExclusions, measurementAgeYears, prepareMeasurementPoints } from './measurementUtils';

export { explainMeasurementExclusions, measurementAgeYears, prepareMeasurementPoints };

export function getPointsPath(points, xScale, yScale, valueKey) {
  const filtered = points.filter((point) => Number.isFinite(point[valueKey]));

  if (filtered.length < 2) {
    return '';
  }

  const lineGenerator = line()
    .x((point) => xScale(point.ageYears))
    .y((point) => yScale(point[valueKey]))
    .curve(curveMonotoneX);

  return lineGenerator(filtered) || '';
}
