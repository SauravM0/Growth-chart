import {
  calculateBmi,
  calculateBsaMosteller,
  calculateCkdEpi2021Egfr,
  calculateFib4Index,
  calculateSchwartzEgfr,
  classifyEgfr,
  classifyFib4,
} from './clinicalCalculators';

describe('clinical calculators', () => {
  test('calculates BMI and BSA', () => {
    expect(calculateBmi(35, 140)).toBeCloseTo(17.86, 2);
    expect(calculateBsaMosteller(140, 35)).toBeCloseTo(1.1667, 3);
  });

  test('calculates FIB-4 and classification', () => {
    const fib4 = calculateFib4Index(45, 80, 60, 200);
    expect(fib4).toBeCloseTo(2.3238, 3);
    expect(classifyFib4(fib4).label).toBe('Intermediate risk');
  });

  test('calculates CKD-EPI 2021 eGFR and classification', () => {
    const femaleEgfr = calculateCkdEpi2021Egfr(30, 'F', 0.8);
    const maleEgfr = calculateCkdEpi2021Egfr(50, 'M', 1.4);

    expect(femaleEgfr).toBeCloseTo(101.5894, 3);
    expect(maleEgfr).toBeCloseTo(61.2316, 3);
    expect(classifyEgfr(femaleEgfr).label).toBe('G1 (normal/high)');
    expect(classifyEgfr(maleEgfr).label).toBe('G2 (mildly reduced)');
  });

  test('returns null for CKD-EPI in children', () => {
    expect(calculateCkdEpi2021Egfr(10, 'F', 0.8)).toBeNull();
  });

  test('calculates Schwartz eGFR for children', () => {
    expect(calculateSchwartzEgfr(10, 140, 0.7)).toBeCloseTo(82.6, 1);
  });
});
