import { calculateMphCm } from './mph';

describe('calculateMphCm', () => {
  test('calculates MPH for girls', () => {
    expect(calculateMphCm('F', 160, 174)).toBe(160.5);
  });

  test('calculates MPH for boys', () => {
    expect(calculateMphCm('M', 160, 174)).toBe(173.5);
  });

  test('returns null when parent heights missing', () => {
    expect(calculateMphCm('F', null, 170)).toBeNull();
  });
});
