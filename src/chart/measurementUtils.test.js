import { explainMeasurementExclusions } from './measurementUtils';

const AXIS_LIMITS = { yMin: 0, yMax: 195 };

describe('explainMeasurementExclusions', () => {
  test('reports missing DOB', () => {
    const diagnostics = explainMeasurementExclusions(
      [{ id: 'm1', dateISO: '2024-01-01', heightCm: 100, weightKg: 20 }],
      '',
      AXIS_LIMITS
    );

    expect(diagnostics.summary).toEqual({ total: 1, included: 0, excluded: 1 });
    expect(diagnostics.excluded[0].reasons).toEqual(['Missing DOB']);
  });

  test('reports measurement date before DOB', () => {
    const diagnostics = explainMeasurementExclusions(
      [{ id: 'm1', dateISO: '2020-01-01', heightCm: 70, weightKg: 8 }],
      '2020-02-01',
      AXIS_LIMITS
    );

    expect(diagnostics.excluded[0].reasons).toEqual(['Measurement date before DOB']);
  });

  test('reports age above 18 years', () => {
    const diagnostics = explainMeasurementExclusions(
      [{ id: 'm1', dateISO: '2020-01-02', heightCm: 165, weightKg: 55 }],
      '2000-01-01',
      AXIS_LIMITS
    );

    expect(diagnostics.excluded[0].reasons).toEqual(['Age outside 0–18 years']);
  });

  test('reports height outside chart range', () => {
    const diagnostics = explainMeasurementExclusions(
      [{ id: 'm1', dateISO: '2024-01-01', heightCm: 200, weightKg: null }],
      '2010-01-01',
      AXIS_LIMITS
    );

    expect(diagnostics.summary).toEqual({ total: 1, included: 0, excluded: 1 });
    expect(diagnostics.excluded[0].reasons).toEqual(['Height outside chart range']);
  });

  test('reports missing height and weight', () => {
    const diagnostics = explainMeasurementExclusions(
      [{ id: 'm1', dateISO: '2024-01-01', heightCm: null, weightKg: undefined }],
      '2010-01-01',
      AXIS_LIMITS
    );

    expect(diagnostics.excluded[0].reasons).toEqual(['Missing height/weight']);
  });
});
