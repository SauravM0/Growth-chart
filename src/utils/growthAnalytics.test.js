import { buildPatientSnapshot } from './growthAnalytics';

const mockDataset = {
  sex: 'M',
  height: {
    centiles: [3, 50, 97],
    curves: {
      '3': [{ age: 5, v: 100 }],
      '50': [{ age: 5, v: 110 }],
      '97': [{ age: 5, v: 120 }],
    },
  },
  weight: {
    centiles: [3, 50, 97],
    curves: {
      '3': [{ age: 5, v: 14 }],
      '50': [{ age: 5, v: 18 }],
      '97': [{ age: 5, v: 24 }],
    },
  },
  bmi: {
    centiles: [3, 50, 97],
    curves: {
      '3': [{ age: 5, v: 13 }],
      '50': [{ age: 5, v: 15 }],
      '97': [{ age: 5, v: 18 }],
    },
  },
};

describe('buildPatientSnapshot', () => {
  test('builds snapshot with age, bmi, mph range and estimated centiles', () => {
    const snapshot = buildPatientSnapshot(
      {
        sex: 'M',
        dobISO: '2020-01-01',
        motherHeightCm: 160,
        fatherHeightCm: 175,
      },
      [{ id: 'm1', dateISO: '2025-01-01', heightCm: 110, weightKg: 18 }],
      mockDataset
    );

    expect(snapshot.latestMeasurement?.id).toBe('m1');
    expect(snapshot.ageYears).toBeGreaterThan(4.9);
    expect(snapshot.ageYears).toBeLessThan(5.1);
    expect(snapshot.bmi).toBeCloseTo(14.88, 2);
    expect(snapshot.mph).toBeCloseTo(174, 5);
    expect(snapshot.targetRange).toEqual({ minCm: 165.5, maxCm: 182.5 });
    expect(snapshot.estimatedCentiles.height).toBeCloseTo(50, 5);
    expect(snapshot.estimatedCentiles.weight).toBeCloseTo(50, 5);
    expect(snapshot.estimatedCentiles.bmi).toBeGreaterThan(3);
    expect(snapshot.alerts).toEqual([]);
  });

  test('handles partial inputs without NaN and returns helpful alerts', () => {
    const snapshot = buildPatientSnapshot(
      { sex: 'F', dobISO: '' },
      [{ id: 'm1', dateISO: '2025-01-01', heightCm: 108, weightKg: null }],
      { height: mockDataset.height, weight: mockDataset.weight }
    );

    expect(snapshot.ageYears).toBeNull();
    expect(snapshot.bmi).toBeNull();
    expect(snapshot.mph).toBeNull();
    expect(snapshot.targetRange).toBeNull();
    expect(snapshot.estimatedCentiles.height).toBeNull();
    expect(snapshot.estimatedCentiles.weight).toBeNull();
    expect(snapshot.estimatedCentiles.bmi).toBeNull();
    expect(snapshot.alerts).toContain('Add DOB to compute age and centiles');
    expect(snapshot.alerts).toContain('Add height/weight to compute BMI');
    expect(snapshot.alerts).toContain('Add mother and father heights to compute MPH range');
    expect(snapshot.alerts).toContain('BMI centile curves unavailable in dataset');
  });
});
