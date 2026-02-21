export function calculateMphCm(sex, motherHeightCm, fatherHeightCm) {
  if (typeof motherHeightCm !== 'number' || typeof fatherHeightCm !== 'number') {
    return null;
  }

  const base = (fatherHeightCm + motherHeightCm) / 2;
  if (sex === 'M') {
    return base + 6.5;
  }

  return base - 6.5;
}

export function calculateTargetHeightRangeCm(mphCm) {
  if (typeof mphCm !== 'number') {
    return null;
  }
  return {
    lowCm: mphCm - 8.5,
    highCm: mphCm + 8.5,
  };
}
