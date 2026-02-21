import { validateMeasurementInput, validatePatientInput } from './utils/validate';

describe('validation helpers', () => {
  test('rejects patient DOB in the future', () => {
    const result = validatePatientInput({ dobISO: '2999-01-01' });
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('rejects measurement date before DOB', () => {
    const result = validateMeasurementInput(
      { dateISO: '2020-01-01', heightCm: 100, weightKg: 20 },
      '2021-01-01'
    );
    expect(result.errors).toContain('Measurement date cannot be before date of birth.');
  });

  test('emits warning for implausible but possible values', () => {
    const result = validateMeasurementInput(
      { dateISO: '2023-01-01', heightCm: 250, weightKg: 250 },
      '2021-01-01'
    );

    expect(result.errors).toHaveLength(0);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});
