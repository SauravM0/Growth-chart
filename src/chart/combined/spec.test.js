import { computeAutoExtendedAxisYMax } from './spec';

describe('computeAutoExtendedAxisYMax', () => {
  test('keeps default yMax when measurements fit chart', () => {
    const yMax = computeAutoExtendedAxisYMax(
      { yMax: 195, yMajorStep: 5 },
      [{ heightCm: 180, weightKg: 70 }]
    );

    expect(yMax).toBe(195);
  });

  test('extends yMax with padding and rounds to major step', () => {
    const yMax = computeAutoExtendedAxisYMax(
      { yMax: 195, yMajorStep: 5 },
      [{ heightCm: 202, weightKg: 65 }]
    );

    expect(yMax).toBe(210);
  });

  test('extends using the highest of height or weight', () => {
    const yMax = computeAutoExtendedAxisYMax(
      { yMax: 175, yMajorStep: 5 },
      [{ heightCm: 170, weightKg: 181 }]
    );

    expect(yMax).toBe(190);
  });
});
