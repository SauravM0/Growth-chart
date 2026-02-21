/**
 * @typedef {{ errors: string[], warnings: string[] }} ValidationResult
 */

function isFutureDate(dateISO) {
  const today = new Date();
  const todayISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
    today.getDate()
  ).padStart(2, '0')}`;
  return dateISO > todayISO;
}

/**
 * @param {{dobISO?: string}} input
 * @returns {ValidationResult}
 */
export function validatePatientInput(input) {
  const errors = [];

  if (!input.dobISO) {
    errors.push('Date of birth is required.');
  } else if (isFutureDate(input.dobISO)) {
    errors.push('Date of birth cannot be in the future.');
  }

  return { errors, warnings: [] };
}

/**
 * @param {{dateISO?: string, heightCm?: number|null, weightKg?: number|null, astUPerL?: number|null, altUPerL?: number|null, platelets10e9PerL?: number|null, creatinineMgDl?: number|null}} input
 * @param {string} patientDobISO
 * @returns {ValidationResult}
 */
export function validateMeasurementInput(input, patientDobISO) {
  const errors = [];
  const warnings = [];

  if (!input.dateISO) {
    errors.push('Measurement date is required.');
  }

  if (input.dateISO && patientDobISO && input.dateISO < patientDobISO) {
    errors.push('Measurement date cannot be before date of birth.');
  }

  if (typeof input.heightCm === 'number' && (input.heightCm < 30 || input.heightCm > 220)) {
    warnings.push('Verify measurement: height is outside plausible range (30-220 cm).');
  }

  if (typeof input.weightKg === 'number' && (input.weightKg < 1 || input.weightKg > 250)) {
    warnings.push('Verify measurement: weight is outside plausible range (1-250 kg).');
  }

  if (typeof input.astUPerL === 'number' && (input.astUPerL < 5 || input.astUPerL > 1000)) {
    warnings.push('AST looks outside plausible range (5-1000 U/L).');
  }

  if (typeof input.altUPerL === 'number' && (input.altUPerL < 5 || input.altUPerL > 1000)) {
    warnings.push('ALT looks outside plausible range (5-1000 U/L).');
  }

  if (typeof input.platelets10e9PerL === 'number' && (input.platelets10e9PerL < 20 || input.platelets10e9PerL > 1200)) {
    warnings.push('Platelets look outside plausible range (20-1200 x10^9/L).');
  }

  if (typeof input.creatinineMgDl === 'number' && (input.creatinineMgDl < 0.1 || input.creatinineMgDl > 15)) {
    warnings.push('Creatinine looks outside plausible range (0.1-15 mg/dL).');
  }

  return { errors, warnings };
}
