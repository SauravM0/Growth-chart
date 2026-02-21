function finiteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function calculateBmi(weightKg, heightCm) {
  if (typeof weightKg !== 'number' || typeof heightCm !== 'number' || heightCm <= 0) {
    return null;
  }
  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}

export function calculateBsaMosteller(heightCm, weightKg) {
  if (typeof heightCm !== 'number' || typeof weightKg !== 'number' || heightCm <= 0 || weightKg <= 0) {
    return null;
  }
  return Math.sqrt((heightCm * weightKg) / 3600);
}

export function calculateFib4Index(ageYears, astUPerL, altUPerL, platelets10e9PerL) {
  if (
    typeof ageYears !== 'number' ||
    typeof astUPerL !== 'number' ||
    typeof altUPerL !== 'number' ||
    typeof platelets10e9PerL !== 'number' ||
    ageYears <= 0 ||
    astUPerL <= 0 ||
    altUPerL <= 0 ||
    platelets10e9PerL <= 0
  ) {
    return null;
  }

  const denominator = platelets10e9PerL * Math.sqrt(altUPerL);
  if (denominator <= 0) {
    return null;
  }

  return (ageYears * astUPerL) / denominator;
}

export function classifyFib4(fib4) {
  if (typeof fib4 !== 'number') {
    return { label: 'Not available', level: 'neutral' };
  }
  if (fib4 < 1.3) {
    return { label: 'Lower risk', level: 'ok' };
  }
  if (fib4 <= 2.67) {
    return { label: 'Intermediate risk', level: 'watch' };
  }
  return { label: 'Higher risk', level: 'high' };
}

export function calculateCkdEpi2021Egfr(ageYears, sex, serumCreatinineMgDl) {
  if (
    typeof ageYears !== 'number' ||
    ageYears < 18 ||
    typeof serumCreatinineMgDl !== 'number' ||
    serumCreatinineMgDl <= 0
  ) {
    return null;
  }

  const isFemale = sex === 'F';
  const k = isFemale ? 0.7 : 0.9;
  const alpha = isFemale ? -0.241 : -0.302;
  const scrByK = serumCreatinineMgDl / k;

  const minTerm = Math.min(scrByK, 1);
  const maxTerm = Math.max(scrByK, 1);

  const femaleFactor = isFemale ? 1.012 : 1;

  return 142 * Math.pow(minTerm, alpha) * Math.pow(maxTerm, -1.2) * Math.pow(0.9938, ageYears) * femaleFactor;
}

export function calculateSchwartzEgfr(ageYears, heightCm, serumCreatinineMgDl) {
  if (
    typeof ageYears !== 'number' ||
    ageYears <= 0 ||
    ageYears >= 18 ||
    typeof heightCm !== 'number' ||
    heightCm <= 0 ||
    typeof serumCreatinineMgDl !== 'number' ||
    serumCreatinineMgDl <= 0
  ) {
    return null;
  }

  // Bedside Schwartz equation for pediatric eGFR.
  return (0.413 * heightCm) / serumCreatinineMgDl;
}

export function classifyEgfr(egfr) {
  if (typeof egfr !== 'number') {
    return { label: 'Not available', level: 'neutral' };
  }
  if (egfr >= 90) {
    return { label: 'G1 (normal/high)', level: 'ok' };
  }
  if (egfr >= 60) {
    return { label: 'G2 (mildly reduced)', level: 'watch' };
  }
  if (egfr >= 45) {
    return { label: 'G3a (mild-moderate)', level: 'watch' };
  }
  if (egfr >= 30) {
    return { label: 'G3b (moderate-severe)', level: 'high' };
  }
  if (egfr >= 15) {
    return { label: 'G4 (severely reduced)', level: 'high' };
  }
  return { label: 'G5 (kidney failure)', level: 'high' };
}

export function roundIfNumber(value, decimals = 2) {
  const num = finiteNumber(value);
  if (num === null) {
    return null;
  }
  const factor = 10 ** decimals;
  return Math.round(num * factor) / factor;
}
