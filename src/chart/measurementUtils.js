const MS_PER_YEAR = 365.25 * 24 * 3600 * 1000;

function parseDateAtMidnight(dateISO) {
  if (!dateISO) {
    return null;
  }
  const parsed = new Date(`${dateISO}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeMeasurementValue(value) {
  return Number.isFinite(value) ? value : null;
}

function sortMeasurementsStable(measurements) {
  return measurements
    .map((measurement, index) => ({ measurement, index }))
    .sort((a, b) => {
      const aTime = parseDateAtMidnight(a.measurement.dateISO)?.getTime();
      const bTime = parseDateAtMidnight(b.measurement.dateISO)?.getTime();

      // Stable ordering: primary sort by date, secondary by original input order.
      if (!Number.isFinite(aTime) || !Number.isFinite(bTime)) {
        return a.index - b.index;
      }
      if (aTime !== bTime) {
        return aTime - bTime;
      }
      return a.index - b.index;
    })
    .map(({ measurement }) => measurement);
}

function buildPreparedMeasurement(measurement, dobISO) {
  return {
    ...measurement,
    ageYears: measurementAgeYears(dobISO, measurement.dateISO),
    heightCm: normalizeMeasurementValue(measurement.heightCm),
    weightKg: normalizeMeasurementValue(measurement.weightKg),
  };
}

function isWithinAxisRange(value, axisLimits) {
  if (!Number.isFinite(value)) {
    return false;
  }
  const yMin = axisLimits?.yMin;
  const yMax = axisLimits?.yMax;
  if (!Number.isFinite(yMin) || !Number.isFinite(yMax)) {
    return true;
  }
  return value >= yMin && value <= yMax;
}

export function measurementAgeYears(dobISO, dateISO) {
  const dob = new Date(`${dobISO}T00:00:00`);
  const date = new Date(`${dateISO}T00:00:00`);

  if (Number.isNaN(dob.getTime()) || Number.isNaN(date.getTime())) {
    return null;
  }

  return (date.getTime() - dob.getTime()) / MS_PER_YEAR;
}

export function prepareMeasurementPoints(measurements, dobISO) {
  return sortMeasurementsStable(measurements)
    .map((measurement) => buildPreparedMeasurement(measurement, dobISO))
    .filter((measurement) => Number.isFinite(measurement.ageYears) && measurement.ageYears >= 0 && measurement.ageYears <= 18);
}

export function explainMeasurementExclusions(measurements = [], dobISO, axisLimits) {
  const dob = parseDateAtMidnight(dobISO);
  const missingDob = !dob;
  const includedPoints = [];
  const excluded = [];

  for (const measurement of sortMeasurementsStable(measurements)) {
    const reasons = [];
    const measurementDate = parseDateAtMidnight(measurement?.dateISO);

    if (missingDob) {
      reasons.push('Missing DOB');
    }

    if (!measurementDate) {
      reasons.push('Invalid measurement date');
    }

    const prepared = buildPreparedMeasurement(measurement, dobISO);

    if (!missingDob && measurementDate && dob && measurementDate.getTime() < dob.getTime()) {
      reasons.push('Measurement date before DOB');
    } else if (!missingDob && measurementDate) {
      if (!Number.isFinite(prepared.ageYears) || prepared.ageYears < 0 || prepared.ageYears > 18) {
        reasons.push('Age outside 0–18 years');
      }
    }

    if (reasons.length > 0) {
      excluded.push({
        measurementId: measurement?.id ?? null,
        dateISO: measurement?.dateISO ?? null,
        reasons,
      });
      continue;
    }

    const hasHeight = Number.isFinite(prepared.heightCm);
    const hasWeight = Number.isFinite(prepared.weightKg);

    if (!hasHeight && !hasWeight) {
      reasons.push('Missing height/weight');
    }

    const heightInRange = hasHeight && isWithinAxisRange(prepared.heightCm, axisLimits);
    const weightInRange = hasWeight && isWithinAxisRange(prepared.weightKg, axisLimits);

    if (hasHeight && !heightInRange) {
      reasons.push('Height outside chart range');
    }
    if (hasWeight && !weightInRange) {
      reasons.push('Weight outside chart range');
    }

    if (heightInRange || weightInRange) {
      includedPoints.push(prepared);
      continue;
    }

    excluded.push({
      measurementId: measurement?.id ?? null,
      dateISO: measurement?.dateISO ?? null,
      reasons,
    });
  }

  return {
    includedPoints,
    excluded,
    summary: {
      total: Array.isArray(measurements) ? measurements.length : 0,
      included: includedPoints.length,
      excluded: excluded.length,
    },
  };
}
