import {
  CENTILES,
  type GrowthCentile,
  type GrowthCurve,
  type GrowthMetric,
  type GrowthPoint,
  type GrowthSex,
  isGrowthCentile,
  isGrowthMetric,
  isGrowthSex,
} from './schema';

type GroupedCurves = Map<GrowthSex, Map<GrowthMetric, Map<GrowthCentile, GrowthCurve>>>;

const PLAUSIBLE_BOUNDS: Record<GrowthMetric, { min: number; max: number }> = {
  height_cm: { min: 30, max: 250 },
  weight_kg: { min: 1, max: 250 },
};

function isStrictlyIncreasing(points: GrowthPoint[]): boolean {
  for (let index = 1; index < points.length; index += 1) {
    if (!(points[index].ageYears > points[index - 1].ageYears)) {
      return false;
    }
  }
  return true;
}

function valueAtAge(points: GrowthPoint[], targetAge: number): number | null {
  if (points.length === 0) {
    return null;
  }
  if (targetAge < points[0].ageYears || targetAge > points[points.length - 1].ageYears) {
    return null;
  }
  if (targetAge === points[0].ageYears) {
    return points[0].value;
  }

  for (let index = 0; index < points.length - 1; index += 1) {
    const left = points[index];
    const right = points[index + 1];
    if (targetAge === left.ageYears) {
      return left.value;
    }
    if (targetAge >= left.ageYears && targetAge <= right.ageYears) {
      const span = right.ageYears - left.ageYears;
      if (span <= 0) {
        return left.value;
      }
      const t = (targetAge - left.ageYears) / span;
      return left.value + t * (right.value - left.value);
    }
  }

  return points[points.length - 1].value;
}

function groupCurves(curves: GrowthCurve[]): GroupedCurves {
  const grouped: GroupedCurves = new Map();

  for (const curve of curves) {
    if (!grouped.has(curve.sex)) {
      grouped.set(curve.sex, new Map());
    }
    const byMetric = grouped.get(curve.sex)!;
    if (!byMetric.has(curve.metric)) {
      byMetric.set(curve.metric, new Map());
    }
    byMetric.get(curve.metric)!.set(curve.centile, curve);
  }

  return grouped;
}

function validateCurveShape(curve: GrowthCurve, index: number, errors: string[]): void {
  if (!isGrowthSex(curve.sex)) {
    errors.push(`Curve #${index}: invalid sex '${String(curve.sex)}'.`);
  }
  if (!isGrowthMetric(curve.metric)) {
    errors.push(`Curve #${index}: invalid metric '${String(curve.metric)}'.`);
  }
  if (!isGrowthCentile(curve.centile)) {
    errors.push(`Curve #${index}: invalid centile '${String(curve.centile)}'.`);
  }
  if (!Array.isArray(curve.points) || curve.points.length < 2) {
    errors.push(`Curve #${index}: points must contain at least two points.`);
    return;
  }

  for (const point of curve.points) {
    if (!Number.isFinite(point.ageYears) || !Number.isFinite(point.value)) {
      errors.push(`Curve #${index}: point has non-finite age/value.`);
      break;
    }
  }

  if (!isStrictlyIncreasing(curve.points)) {
    errors.push(`Curve #${index}: ages are not strictly increasing.`);
  }

  const bounds = PLAUSIBLE_BOUNDS[curve.metric as GrowthMetric];
  if (bounds) {
    for (const point of curve.points) {
      if (point.value < bounds.min || point.value > bounds.max) {
        errors.push(
          `Curve #${index}: value ${point.value} outside plausible ${curve.metric} range (${bounds.min}-${bounds.max}).`
        );
        break;
      }
    }
  }
}

function validateCentileCoverage(grouped: GroupedCurves, errors: string[]): void {
  for (const sex of grouped.keys()) {
    const byMetric = grouped.get(sex)!;
    for (const metric of byMetric.keys()) {
      const byCentile = byMetric.get(metric)!;
      const found = Array.from(byCentile.keys()).sort((a, b) => a - b);
      const expected = [...CENTILES];

      if (found.length !== expected.length || found.some((centile, index) => centile !== expected[index])) {
        errors.push(
          `${sex}/${metric}: centiles must exactly match ${expected.join(', ')}; found ${found.join(', ')}.`
        );
      }
    }
  }
}

function validateNonCrossing(grouped: GroupedCurves, errors: string[]): void {
  for (const [sex, byMetric] of grouped.entries()) {
    for (const [metric, byCentile] of byMetric.entries()) {
      if (CENTILES.some((centile) => !byCentile.has(centile))) {
        continue;
      }

      const centileCurves = CENTILES.map((centile) => byCentile.get(centile)!);
      const ageSet = new Set<number>();
      for (const curve of centileCurves) {
        for (const point of curve.points) {
          ageSet.add(point.ageYears);
        }
      }

      const ages = [...ageSet].sort((a, b) => a - b);
      for (const age of ages) {
        let previousValue = Number.NEGATIVE_INFINITY;
        for (const curve of centileCurves) {
          const interpolated = valueAtAge(curve.points, age);
          if (interpolated == null) {
            previousValue = Number.NEGATIVE_INFINITY;
            continue;
          }
          if (interpolated < previousValue - 1e-9) {
            errors.push(
              `${sex}/${metric}: centile crossing near age ${age.toFixed(4)} (centile ${curve.centile} below previous centile).`
            );
            break;
          }
          previousValue = interpolated;
        }
      }
    }
  }
}

export function validateCanonicalCurves(curves: GrowthCurve[]): string[] {
  const errors: string[] = [];

  if (!Array.isArray(curves) || curves.length === 0) {
    return ['Dataset must contain at least one curve.'];
  }

  curves.forEach((curve, index) => validateCurveShape(curve, index, errors));

  const grouped = groupCurves(curves);
  validateCentileCoverage(grouped, errors);
  validateNonCrossing(grouped, errors);

  return errors;
}

export function assertValidCanonicalCurves(curves: GrowthCurve[]): void {
  const errors = validateCanonicalCurves(curves);
  if (errors.length > 0) {
    const message = ['Growth data validation failed:', ...errors.map((error) => `- ${error}`)].join('\n');
    throw new Error(message);
  }
}
