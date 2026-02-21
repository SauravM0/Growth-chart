const MS_PER_YEAR = 365.25 * 24 * 3600 * 1000;

export function measurementAgeYears(dobISO, dateISO) {
  const dob = new Date(`${dobISO}T00:00:00`);
  const date = new Date(`${dateISO}T00:00:00`);

  if (Number.isNaN(dob.getTime()) || Number.isNaN(date.getTime())) {
    return null;
  }

  return (date.getTime() - dob.getTime()) / MS_PER_YEAR;
}

export function prepareMeasurementPoints(measurements, dobISO) {
  return measurements
    .map((measurement, index) => ({ measurement, index }))
    .sort((a, b) => {
      const aTime = new Date(`${a.measurement.dateISO}T00:00:00`).getTime();
      const bTime = new Date(`${b.measurement.dateISO}T00:00:00`).getTime();

      // Stable ordering: primary sort by date, secondary by original input order.
      if (Number.isNaN(aTime) || Number.isNaN(bTime)) {
        return a.index - b.index;
      }
      if (aTime !== bTime) {
        return aTime - bTime;
      }
      return a.index - b.index;
    })
    .map(({ measurement }) => measurement)
    .map((measurement) => ({
      ...measurement,
      ageYears: measurementAgeYears(dobISO, measurement.dateISO),
      heightCm: Number.isFinite(measurement.heightCm) ? measurement.heightCm : null,
      weightKg: Number.isFinite(measurement.weightKg) ? measurement.weightKg : null,
    }))
    .filter((measurement) => Number.isFinite(measurement.ageYears) && measurement.ageYears >= 0 && measurement.ageYears <= 18);
}
