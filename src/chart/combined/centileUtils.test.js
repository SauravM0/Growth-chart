import { evaluateMeasurementAgainstCurves } from './centileUtils';

const metricCurves = {
  '3': [{ ageYears: 5, valueY: 100 }],
  '10': [{ ageYears: 5, valueY: 102 }],
  '25': [{ ageYears: 5, valueY: 104 }],
  '50': [{ ageYears: 5, valueY: 108 }],
  '75': [{ ageYears: 5, valueY: 112 }],
  '90': [{ ageYears: 5, valueY: 115 }],
  '97': [{ ageYears: 5, valueY: 118 }],
};

describe('evaluateMeasurementAgainstCurves', () => {
  test('returns interpolated centile and nearest band', () => {
    const result = evaluateMeasurementAgainstCurves({
      ageYears: 5,
      value: 106,
      metricCurves,
    });

    expect(result.nearestCentileBand).toBe('25-50');
    expect(result.nearestCentile).toBe(25);
    expect(result.interpolatedCentile).toBeCloseTo(37.5, 5);
    expect(result.isApproxCentile).toBe(true);
    expect(result.zScore).toBeNull();
  });

  test('clamps below and above chart centiles', () => {
    const below = evaluateMeasurementAgainstCurves({
      ageYears: 5,
      value: 80,
      metricCurves,
    });
    const above = evaluateMeasurementAgainstCurves({
      ageYears: 5,
      value: 130,
      metricCurves,
    });

    expect(below.nearestCentileBand).toBe('<3');
    expect(below.interpolatedCentile).toBe(3);
    expect(above.nearestCentileBand).toBe('>97');
    expect(above.interpolatedCentile).toBe(97);
  });

  test('computes z-score when LMS data is provided', () => {
    const lmsRows = [
      { ageYears: 4, L: 1, M: 100, S: 0.1 },
      { ageYears: 6, L: 1, M: 100, S: 0.1 },
    ];

    const result = evaluateMeasurementAgainstCurves({
      ageYears: 5,
      value: 110,
      metricCurves,
      lms: lmsRows,
    });

    expect(result.zScore).toBeCloseTo(1, 5);
  });
});
