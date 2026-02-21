import { measurementAgeYears, prepareMeasurementPoints } from './measurementUtils';

describe('measurement points', () => {
  test('computes age in years from DOB and measurement date', () => {
    const age = measurementAgeYears('2020-01-01', '2021-01-01');
    expect(age).toBeGreaterThan(0.99);
    expect(age).toBeLessThan(1.01);
  });

  test('sorts points by date and filters impossible ages', () => {
    const points = prepareMeasurementPoints(
      [
        { id: '2', dateISO: '2021-01-01', heightCm: 75, weightKg: 9 },
        { id: '3', dateISO: '2019-01-01', heightCm: 40, weightKg: 2 },
        { id: '1', dateISO: '2020-06-01', heightCm: 65, weightKg: 7 }
      ],
      '2020-01-01'
    );

    expect(points).toHaveLength(2);
    expect(points[0].id).toBe('1');
    expect(points[1].id).toBe('2');
  });

  test('keeps in-range rows but drops invalid numeric values per series', () => {
    const points = prepareMeasurementPoints(
      [
        { id: '1', dateISO: '2020-01-02', heightCm: Number.NaN, weightKg: 3.5 },
        { id: '2', dateISO: '2020-01-03', heightCm: 52, weightKg: Number.NaN }
      ],
      '2020-01-01'
    );

    expect(points).toHaveLength(2);
    expect(points[0].heightCm).toBeNull();
    expect(points[0].weightKg).toBe(3.5);
    expect(points[1].heightCm).toBe(52);
    expect(points[1].weightKg).toBeNull();
  });
});
