const MS_PER_DAY = 24 * 3600 * 1000;
const MS_PER_YEAR = 365.25 * MS_PER_DAY;

function toDateMs(dateISO) {
  if (typeof dateISO !== 'string' || !dateISO) {
    return null;
  }
  const date = new Date(`${dateISO}T00:00:00`);
  const time = date.getTime();
  return Number.isNaN(time) ? null : time;
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

export function computeAgeYears(dobISO, dateISO) {
  const dobMs = toDateMs(dobISO);
  const dateMs = toDateMs(dateISO);
  if (!isFiniteNumber(dobMs) || !isFiniteNumber(dateMs)) {
    return null;
  }
  return (dateMs - dobMs) / MS_PER_YEAR;
}

export function computeBMI(heightCm, weightKg) {
  if (!isFiniteNumber(heightCm) || !isFiniteNumber(weightKg) || heightCm <= 0) {
    return null;
  }
  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}

export function computeBSA(heightCm, weightKg) {
  if (!isFiniteNumber(heightCm) || !isFiniteNumber(weightKg) || heightCm <= 0 || weightKg <= 0) {
    return null;
  }
  return Math.sqrt((heightCm * weightKg) / 3600);
}

export function computeMPH(sex, motherHeightCm, fatherHeightCm) {
  if (!isFiniteNumber(motherHeightCm) || !isFiniteNumber(fatherHeightCm)) {
    return null;
  }
  const base = (fatherHeightCm + motherHeightCm) / 2;
  const sexUpper = String(sex || '').trim().toUpperCase();
  if (sexUpper.startsWith('M')) {
    return base + 6.5;
  }
  return base - 6.5;
}

export function computeVelocity(prev, next) {
  if (!prev || !next || !isFiniteNumber(prev.heightCm) || !isFiniteNumber(next.heightCm)) {
    return null;
  }

  const prevTimeYears = isFiniteNumber(prev.ageYears)
    ? prev.ageYears
    : isFiniteNumber(toDateMs(prev.dateISO))
      ? toDateMs(prev.dateISO) / MS_PER_YEAR
      : null;
  const nextTimeYears = isFiniteNumber(next.ageYears)
    ? next.ageYears
    : isFiniteNumber(toDateMs(next.dateISO))
      ? toDateMs(next.dateISO) / MS_PER_YEAR
      : null;

  if (!isFiniteNumber(prevTimeYears) || !isFiniteNumber(nextTimeYears) || nextTimeYears <= prevTimeYears) {
    return null;
  }

  return (next.heightCm - prev.heightCm) / (nextTimeYears - prevTimeYears);
}

export function computeWarnings(patient, measurements = []) {
  const dobISO = patient?.dobISO || '';
  const sorted = [...measurements].sort(
    (a, b) => a.dateISO.localeCompare(b.dateISO) || (a.createdAt || 0) - (b.createdAt || 0)
  );

  const warningMap = new Map();
  const addWarning = (code, message, measurementIds = [], severity = 'warning') => {
    const key = `${code}:${measurementIds.join('|')}:${message}`;
    if (warningMap.has(key)) {
      return;
    }
    warningMap.set(key, {
      code,
      severity,
      message: `Verify measurement: ${message}`,
      measurementIds,
    });
  };

  if (isFiniteNumber(patient?.motherHeightCm) && (patient.motherHeightCm < 120 || patient.motherHeightCm > 220)) {
    addWarning(
      'mother_height_range',
      `mother height ${patient.motherHeightCm.toFixed(1)} cm is outside 120-220 cm.`
    );
  }

  if (isFiniteNumber(patient?.fatherHeightCm) && (patient.fatherHeightCm < 120 || patient.fatherHeightCm > 220)) {
    addWarning(
      'father_height_range',
      `father height ${patient.fatherHeightCm.toFixed(1)} cm is outside 120-220 cm.`
    );
  }

  sorted.forEach((row) => {
    if (!row?.id) {
      return;
    }
    if (dobISO && row.dateISO && row.dateISO < dobISO) {
      addWarning(
        'date_before_dob',
        `${row.dateISO} is before DOB (${dobISO}).`,
        [row.id],
        'error'
      );
    }
    if (isFiniteNumber(row.heightCm) && (row.heightCm < 30 || row.heightCm > 220)) {
      addWarning('height_plausibility', `height ${row.heightCm.toFixed(1)} cm is outside 30-220 cm.`, [row.id]);
    }
    if (isFiniteNumber(row.weightKg) && (row.weightKg < 1 || row.weightKg > 250)) {
      addWarning('weight_plausibility', `weight ${row.weightKg.toFixed(1)} kg is outside 1-250 kg.`, [row.id]);
    }
  });

  for (let index = 1; index < sorted.length; index += 1) {
    const prev = sorted[index - 1];
    const next = sorted[index];
    const prevMs = toDateMs(prev.dateISO);
    const nextMs = toDateMs(next.dateISO);
    const dayDiff = isFiniteNumber(prevMs) && isFiniteNumber(nextMs) ? (nextMs - prevMs) / MS_PER_DAY : null;

    if (isFiniteNumber(prev.heightCm) && isFiniteNumber(next.heightCm)) {
      const heightDelta = next.heightCm - prev.heightCm;
      if (heightDelta < -0.5) {
        addWarning(
          'height_drop',
          `height dropped by ${Math.abs(heightDelta).toFixed(1)} cm (${prev.dateISO} to ${next.dateISO}).`,
          [prev.id, next.id]
        );
      }
      const velocity = computeVelocity(prev, next);
      if (isFiniteNumber(velocity) && (velocity > 20 || velocity < -2)) {
        addWarning(
          'height_velocity',
          `height velocity ${velocity.toFixed(1)} cm/year is outside -2 to 20 cm/year (${prev.dateISO} to ${next.dateISO}).`,
          [prev.id, next.id]
        );
      }
    }

    if (
      isFiniteNumber(prev.weightKg) &&
      isFiniteNumber(next.weightKg) &&
      prev.weightKg > 0 &&
      isFiniteNumber(dayDiff) &&
      dayDiff <= 30 &&
      dayDiff >= 0
    ) {
      const changePercent = (Math.abs(next.weightKg - prev.weightKg) / prev.weightKg) * 100;
      if (changePercent > 20) {
        addWarning(
          'weight_change_30d',
          `weight changed by ${changePercent.toFixed(1)}% within ${Math.round(dayDiff)} days (${prev.dateISO} to ${next.dateISO}).`,
          [prev.id, next.id]
        );
      }
    }
  }

  return Array.from(warningMap.values());
}
