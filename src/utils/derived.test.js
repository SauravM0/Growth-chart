import {
  computeAgeYears,
  computeBMI,
  computeBSA,
  computeMPH,
  computeVelocity,
  computeWarnings,
} from './derived';

describe('derived helpers', () => {
  test('computes core formulas', () => {
    expect(computeAgeYears('2020-01-01', '2021-01-01')).toBeCloseTo(1, 2);
    expect(computeBMI(100, 16)).toBeCloseTo(16, 5);
    expect(computeBSA(100, 16)).toBeCloseTo(0.6667, 3);
    expect(computeMPH('F', 160, 175)).toBeCloseTo(161, 5);
    expect(computeMPH('M', 160, 175)).toBeCloseTo(174, 5);
  });

  test('computes height velocity between sequential rows', () => {
    const prev = { dateISO: '2024-01-01', heightCm: 100 };
    const next = { dateISO: '2025-01-01', heightCm: 108 };
    expect(computeVelocity(prev, next)).toBeCloseTo(8, 1);
  });

  test('returns verify-measurement warnings for suspicious patterns', () => {
    const warnings = computeWarnings(
      { dobISO: '2020-01-01' },
      [
        { id: 'a', dateISO: '2021-01-01', heightCm: 120, weightKg: 20, createdAt: 1 },
        { id: 'b', dateISO: '2021-01-20', heightCm: 115, weightKg: 26, createdAt: 2 },
      ]
    );
    const messages = warnings.map((item) => item.message).join(' | ');
    expect(messages).toContain('Verify measurement:');
    expect(messages).toContain('height dropped');
    expect(messages).toContain('weight changed');
  });
});
