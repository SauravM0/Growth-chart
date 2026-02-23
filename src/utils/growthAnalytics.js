import { measurementAgeYears } from '../chart/measurementUtils';
import { computeAgeYears, computeBMI, computeMPH } from './derived';
import {
  calculateBmi,
  calculateBsaMosteller,
  calculateCkdEpi2021Egfr,
  calculateFib4Index,
  calculateSchwartzEgfr,
  classifyEgfr,
  classifyFib4,
} from './clinicalCalculators';

function safeNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function interpolateCurveValue(points, ageYears) {
  if (!Array.isArray(points) || points.length === 0 || typeof ageYears !== 'number') {
    return null;
  }

  if (ageYears <= points[0].age) {
    return points[0].v;
  }

  const last = points[points.length - 1];
  if (ageYears >= last.age) {
    return last.v;
  }

  for (let index = 1; index < points.length; index += 1) {
    const prev = points[index - 1];
    const next = points[index];

    if (ageYears >= prev.age && ageYears <= next.age) {
      if (next.age === prev.age) {
        return next.v;
      }
      const ratio = (ageYears - prev.age) / (next.age - prev.age);
      return prev.v + ratio * (next.v - prev.v);
    }
  }

  return null;
}

function estimateCentile(datasetSection, ageYears, value) {
  if (!datasetSection || typeof ageYears !== 'number' || typeof value !== 'number') {
    return null;
  }

  const centiles = [...(datasetSection.centiles || [])]
    .map((centile) => Number(centile))
    .filter((centile) => Number.isFinite(centile))
    .sort((a, b) => a - b);

  if (centiles.length < 2) {
    return null;
  }

  const pointsByCentile = centiles
    .map((centile) => {
      const interpolated = interpolateCurveValue(datasetSection.curves[String(centile)], ageYears);
      return {
        centile,
        value: safeNumber(interpolated),
      };
    })
    .filter((item) => typeof item.value === 'number');

  if (pointsByCentile.length < 2) {
    return null;
  }

  if (value <= pointsByCentile[0].value) {
    return pointsByCentile[0].centile;
  }

  const highest = pointsByCentile[pointsByCentile.length - 1];
  if (value >= highest.value) {
    return highest.centile;
  }

  for (let index = 1; index < pointsByCentile.length; index += 1) {
    const lower = pointsByCentile[index - 1];
    const upper = pointsByCentile[index];

    if (value >= lower.value && value <= upper.value) {
      if (upper.value === lower.value) {
        return upper.centile;
      }
      const ratio = (value - lower.value) / (upper.value - lower.value);
      return lower.centile + ratio * (upper.centile - lower.centile);
    }
  }

  return null;
}

function centileRisk(centile) {
  if (typeof centile !== 'number') {
    return { label: 'Unknown', level: 'neutral' };
  }

  if (centile < 3 || centile > 97) {
    return { label: 'Outlier', level: 'high' };
  }

  if (centile < 10 || centile > 90) {
    return { label: 'Watch', level: 'watch' };
  }

  return { label: 'Expected range', level: 'ok' };
}

function sortMeasurements(measurements) {
  return [...(measurements || [])].sort(
    (a, b) => a.dateISO.localeCompare(b.dateISO) || (a.createdAt || 0) - (b.createdAt || 0)
  );
}

function ageYearsOnDate(dobISO, dateISO) {
  if (!dobISO || !dateISO) {
    return null;
  }
  return measurementAgeYears(dobISO, dateISO);
}

function ageYearsNow(dobISO) {
  if (!dobISO) {
    return null;
  }
  const now = new Date();
  const todayISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return measurementAgeYears(dobISO, todayISO);
}

function latestWithNumber(sorted, key) {
  for (let index = sorted.length - 1; index >= 0; index -= 1) {
    const row = sorted[index];
    if (typeof row?.[key] === 'number') {
      return row;
    }
  }
  return null;
}

function growthVelocityPerYear(sortedMeasurements, dobISO, valueKey) {
  const rows = sortedMeasurements.filter((row) => typeof row[valueKey] === 'number');
  if (rows.length < 2) {
    return null;
  }

  const latest = rows[rows.length - 1];
  const previous = rows[rows.length - 2];
  const latestAge = measurementAgeYears(dobISO, latest.dateISO);
  const previousAge = measurementAgeYears(dobISO, previous.dateISO);

  if (typeof latestAge !== 'number' || typeof previousAge !== 'number' || latestAge <= previousAge) {
    return null;
  }

  return (latest[valueKey] - previous[valueKey]) / (latestAge - previousAge);
}

function projectAdultHeight(dataset, centileEstimate) {
  if (!dataset || typeof centileEstimate !== 'number') {
    return null;
  }

  const centiles = [...(dataset.height?.centiles || [])].sort((a, b) => a - b);
  if (centiles.length < 2) {
    return null;
  }

  const adults = centiles
    .map((centile) => ({
      centile,
      value: interpolateCurveValue(dataset.height.curves[String(centile)], 18),
    }))
    .filter((row) => typeof row.value === 'number');

  if (adults.length < 2) {
    return null;
  }

  if (centileEstimate <= adults[0].centile) {
    return adults[0].value;
  }

  const highest = adults[adults.length - 1];
  if (centileEstimate >= highest.centile) {
    return highest.value;
  }

  for (let index = 1; index < adults.length; index += 1) {
    const lower = adults[index - 1];
    const upper = adults[index];

    if (centileEstimate >= lower.centile && centileEstimate <= upper.centile) {
      if (upper.centile === lower.centile) {
        return upper.value;
      }
      const ratio = (centileEstimate - lower.centile) / (upper.centile - lower.centile);
      return lower.value + ratio * (upper.value - lower.value);
    }
  }

  return null;
}

export function getPatientAnalytics({ patient, measurements, dataset, mphCm }) {
  const sorted = sortMeasurements(measurements);
  const latest = sorted[sorted.length - 1] || null;
  const latestHeightRow = latestWithNumber(sorted, 'heightCm');
  const latestWeightRow = latestWithNumber(sorted, 'weightKg');
  const latestAstRow = latestWithNumber(sorted, 'astUPerL');
  const latestAltRow = latestWithNumber(sorted, 'altUPerL');
  const latestPlateletRow = latestWithNumber(sorted, 'platelets10e9PerL');
  const latestCreatinineRow = latestWithNumber(sorted, 'creatinineMgDl');

  const latestAgeYears = latest
    ? ageYearsOnDate(patient?.dobISO || '', latest.dateISO)
    : ageYearsNow(patient?.dobISO || '');

  const latestHeightCm = safeNumber(latestHeightRow?.heightCm ?? patient?.heightCm);
  const latestWeightKg = safeNumber(latestWeightRow?.weightKg ?? patient?.weightKg);

  const heightAgeYears = latestHeightRow
    ? ageYearsOnDate(patient?.dobISO || '', latestHeightRow.dateISO)
    : latestAgeYears;
  const weightAgeYears = latestWeightRow
    ? ageYearsOnDate(patient?.dobISO || '', latestWeightRow.dateISO)
    : latestAgeYears;

  const heightCentile = estimateCentile(dataset?.height, heightAgeYears, latestHeightCm);
  const weightCentile = estimateCentile(dataset?.weight, weightAgeYears, latestWeightKg);

  const bmi = calculateBmi(latestWeightKg, latestHeightCm);
  const bsaM2 = calculateBsaMosteller(latestHeightCm, latestWeightKg);
  const heightVelocity = growthVelocityPerYear(sorted, patient?.dobISO || '', 'heightCm');
  const weightVelocity = growthVelocityPerYear(sorted, patient?.dobISO || '', 'weightKg');
  const fib4DateISO = latestAstRow?.dateISO || latestAltRow?.dateISO || latestPlateletRow?.dateISO;
  const fib4AgeYears = ageYearsOnDate(patient?.dobISO || '', fib4DateISO);
  const fib4 = calculateFib4Index(
    fib4AgeYears,
    safeNumber(latestAstRow?.astUPerL),
    safeNumber(latestAltRow?.altUPerL),
    safeNumber(latestPlateletRow?.platelets10e9PerL)
  );

  const renalAgeYears = latestCreatinineRow
    ? ageYearsOnDate(patient?.dobISO || '', latestCreatinineRow.dateISO)
    : latestAgeYears;
  const creatinineMgDl = safeNumber(latestCreatinineRow?.creatinineMgDl);
  const ckdEpiEgfr = calculateCkdEpi2021Egfr(renalAgeYears, patient?.sex, creatinineMgDl);
  const schwartzEgfr = calculateSchwartzEgfr(renalAgeYears, latestHeightCm, creatinineMgDl);
  const egfr = ckdEpiEgfr ?? schwartzEgfr;
  const egfrMethod = ckdEpiEgfr ? 'CKD-EPI 2021' : schwartzEgfr ? 'Schwartz (pediatric)' : null;

  const mphGapCm =
    typeof latestHeightCm === 'number' && typeof mphCm === 'number' ? latestHeightCm - mphCm : null;

  const projectedAdultHeightCm = projectAdultHeight(dataset, heightCentile);

  return {
    latest,
    latestAgeYears,
    latestHeightCm,
    latestWeightKg,
    bmi,
    bsaM2,
    heightCentile,
    weightCentile,
    heightRisk: centileRisk(heightCentile),
    weightRisk: centileRisk(weightCentile),
    heightVelocity,
    weightVelocity,
    mphGapCm,
    projectedAdultHeightCm,
    fib4,
    egfr,
    egfrMethod,
    fib4Risk: classifyFib4(fib4),
    egfrRisk: classifyEgfr(egfr),
  };
}

function buildTargetRange(mph) {
  if (typeof mph !== 'number') {
    return null;
  }
  return {
    minCm: mph - 8.5,
    maxCm: mph + 8.5,
  };
}

export function buildPatientSnapshot(patient, measurements, datasetForSex) {
  const sorted = sortMeasurements(measurements);
  const latestMeasurement = sorted[sorted.length - 1] || null;
  const dobISO = patient?.dobISO || '';
  const ageYears = latestMeasurement?.dateISO ? computeAgeYears(dobISO, latestMeasurement.dateISO) : null;

  const latestHeightCm = safeNumber(latestMeasurement?.heightCm);
  const latestWeightKg = safeNumber(latestMeasurement?.weightKg);
  const bmi = computeBMI(latestHeightCm, latestWeightKg);

  const mph = computeMPH(patient?.sex, patient?.motherHeightCm, patient?.fatherHeightCm);
  const targetRange = buildTargetRange(mph);

  const estimatedCentiles = {
    height: estimateCentile(datasetForSex?.height, ageYears, latestHeightCm),
    weight: estimateCentile(datasetForSex?.weight, ageYears, latestWeightKg),
    bmi: estimateCentile(datasetForSex?.bmi, ageYears, bmi),
  };

  const alerts = [];
  if (!dobISO) {
    alerts.push('Add DOB to compute age and centiles');
  }
  if (!latestMeasurement) {
    alerts.push('Add a measurement to compute age, BMI, and centiles');
  }
  if (latestMeasurement && (typeof latestHeightCm !== 'number' || typeof latestWeightKg !== 'number')) {
    alerts.push('Add height/weight to compute BMI');
  }
  if (typeof safeNumber(patient?.motherHeightCm) !== 'number' || typeof safeNumber(patient?.fatherHeightCm) !== 'number') {
    alerts.push('Add mother and father heights to compute MPH range');
  }
  if (!datasetForSex) {
    alerts.push('Dataset unavailable for selected sex');
  } else {
    if (!datasetForSex.height) {
      alerts.push('Height centile curves unavailable in dataset');
    }
    if (!datasetForSex.weight) {
      alerts.push('Weight centile curves unavailable in dataset');
    }
    if (!datasetForSex.bmi) {
      alerts.push('BMI centile curves unavailable in dataset');
    }
  }

  return {
    latestMeasurement,
    ageYears,
    bmi,
    mph,
    targetRange,
    estimatedCentiles,
    alerts,
  };
}

export function formatRiskClass(level) {
  if (level === 'high') {
    return 'text-red-700';
  }
  if (level === 'watch') {
    return 'text-red-600';
  }
  if (level === 'ok') {
    return 'text-emerald-700';
  }
  return 'text-zinc-700';
}
