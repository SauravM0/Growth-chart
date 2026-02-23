import { getDb } from '../db/db';
import { computeWarnings } from '../utils/derived';
import { generateUuid } from '../utils/uuid';
import { validateMeasurementInput } from '../utils/validate';

function normalizeMeasurement(row) {
  const now = Date.now();
  return {
    id: row.id || generateUuid(),
    patientId: row.patientId,
    dateISO: row.dateISO || '',
    heightCm: typeof row.heightCm === 'number' ? row.heightCm : null,
    weightKg: typeof row.weightKg === 'number' ? row.weightKg : null,
    astUPerL: typeof row.astUPerL === 'number' ? row.astUPerL : null,
    altUPerL: typeof row.altUPerL === 'number' ? row.altUPerL : null,
    platelets10e9PerL: typeof row.platelets10e9PerL === 'number' ? row.platelets10e9PerL : null,
    creatinineMgDl: typeof row.creatinineMgDl === 'number' ? row.creatinineMgDl : null,
    notes: typeof row.notes === 'string' ? row.notes : '',
    tags: Array.isArray(row.tags) ? row.tags : [],
    createdAt: row.createdAt || now,
    updatedAt: row.updatedAt || row.createdAt || now,
    deletedAt: row.deletedAt ?? null,
  };
}

function sortMeasurements(rows) {
  return [...rows].sort((a, b) => {
    if (a.dateISO === b.dateISO) {
      return a.updatedAt - b.updatedAt;
    }
    return a.dateISO.localeCompare(b.dateISO);
  });
}

function csvEscape(value) {
  const text = value === null || value === undefined ? '' : String(value);
  if (!/[",\n]/.test(text)) {
    return text;
  }
  return `"${text.replace(/"/g, '""')}"`;
}

function pushUniqueWarning(target, message) {
  if (!message || target.includes(message)) {
    return;
  }
  target.push(message);
}

function buildMeasurementFieldSummary(input, warnings = []) {
  const fields = [
    ['dateISO', input?.dateISO],
    ['heightCm', input?.heightCm],
    ['weightKg', input?.weightKg],
    ['astUPerL', input?.astUPerL],
    ['altUPerL', input?.altUPerL],
    ['platelets10e9PerL', input?.platelets10e9PerL],
    ['creatinineMgDl', input?.creatinineMgDl],
  ];

  const filled = fields.filter(([, value]) => {
    if (typeof value === 'string') {
      return value.trim() !== '';
    }
    return value !== null && value !== undefined;
  }).length;

  return {
    detected: fields.length,
    filled,
    needsReview: Array.isArray(warnings) ? warnings.length : 0,
  };
}

async function findByPatientAndDate(patientId, dateISO) {
  const db = await getDb();
  const rows = await db.getAllFromIndex('measurements', 'patientIdDate', [patientId, dateISO]);
  return rows.map(normalizeMeasurement);
}

export async function listMeasurementsByPatient(patientId, options = {}) {
  const { includeDeleted = false } = options;
  const db = await getDb();
  const rows = await db.getAllFromIndex('measurements', 'patientId', patientId);
  const normalized = rows.map(normalizeMeasurement);
  const filtered = includeDeleted ? normalized : normalized.filter((row) => !row.deletedAt);
  const deduped = Array.from(new Map(filtered.map((row) => [row.id, row])).values());
  return sortMeasurements(deduped);
}

export async function createMeasurement(patientId, payload, patientDobISO) {
  const db = await getDb();
  const now = Date.now();
  const input = {
    dateISO: payload.dateISO,
    heightCm: payload.heightCm ?? null,
    weightKg: payload.weightKg ?? null,
    astUPerL: payload.astUPerL ?? null,
    altUPerL: payload.altUPerL ?? null,
    platelets10e9PerL: payload.platelets10e9PerL ?? null,
    creatinineMgDl: payload.creatinineMgDl ?? null,
  };
  const validation = validateMeasurementInput(input, patientDobISO);
  if (validation.errors.length) {
    const error = new Error(validation.errors.join(' '));
    error.validation = validation;
    throw error;
  }

  const duplicates = await findByPatientAndDate(patientId, input.dateISO);
  const duplicateExists = duplicates.some((row) => !row.deletedAt);
  if (duplicateExists) {
    validation.warnings.push('Duplicate date entry exists for this patient.');
  }
  const patientRows = await listMeasurementsByPatient(patientId);

  const row = normalizeMeasurement({
    id: payload.id || generateUuid(),
    patientId,
    ...input,
    notes: payload.notes,
    tags: payload.tags,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  });

  await db.put('measurements', row);
  const patientWarnings = computeWarnings({ dobISO: patientDobISO }, [...patientRows, row])
    .filter((item) => item.measurementIds.includes(row.id))
    .map((item) => item.message);
  patientWarnings.forEach((message) => pushUniqueWarning(validation.warnings, message));

  return {
    measurement: row,
    warnings: validation.warnings,
    fieldSummary: buildMeasurementFieldSummary(input, validation.warnings),
  };
}

export async function updateMeasurementById(id, patch, patientDobISO) {
  const db = await getDb();
  const existing = await db.get('measurements', id);
  if (!existing) {
    return null;
  }

  const merged = normalizeMeasurement({
    ...existing,
    ...patch,
    id,
    updatedAt: Date.now(),
  });

  const validation = validateMeasurementInput(
    {
      dateISO: merged.dateISO,
      heightCm: merged.heightCm,
      weightKg: merged.weightKg,
      astUPerL: merged.astUPerL,
      altUPerL: merged.altUPerL,
      platelets10e9PerL: merged.platelets10e9PerL,
      creatinineMgDl: merged.creatinineMgDl,
    },
    patientDobISO
  );

  if (validation.errors.length) {
    const error = new Error(validation.errors.join(' '));
    error.validation = validation;
    throw error;
  }

  const duplicates = await findByPatientAndDate(merged.patientId, merged.dateISO);
  const duplicateExists = duplicates.some((row) => row.id !== id && !row.deletedAt);
  if (duplicateExists) {
    validation.warnings.push('Duplicate date entry exists for this patient.');
  }

  const patientRows = await listMeasurementsByPatient(merged.patientId);
  const nextRows = patientRows.some((row) => row.id === id)
    ? patientRows.map((row) => (row.id === id ? merged : row))
    : [...patientRows, merged];
  const patientWarnings = computeWarnings({ dobISO: patientDobISO }, nextRows)
    .filter((item) => item.measurementIds.includes(id))
    .map((item) => item.message);
  patientWarnings.forEach((message) => pushUniqueWarning(validation.warnings, message));

  await db.put('measurements', merged);
  return {
    measurement: merged,
    warnings: validation.warnings,
    fieldSummary: buildMeasurementFieldSummary(
      {
        dateISO: merged.dateISO,
        heightCm: merged.heightCm,
        weightKg: merged.weightKg,
        astUPerL: merged.astUPerL,
        altUPerL: merged.altUPerL,
        platelets10e9PerL: merged.platelets10e9PerL,
        creatinineMgDl: merged.creatinineMgDl,
      },
      validation.warnings
    ),
  };
}

export async function deleteMeasurementById(id, options = {}) {
  const { softDelete = false } = options;
  const db = await getDb();
  if (!softDelete) {
    await db.delete('measurements', id);
    return;
  }
  const existing = await db.get('measurements', id);
  if (!existing) {
    return;
  }
  await db.put('measurements', {
    ...normalizeMeasurement(existing),
    deletedAt: Date.now(),
    updatedAt: Date.now(),
  });
}

export async function exportMeasurementsCsv(patientId, options = {}) {
  const rows = await listMeasurementsByPatient(patientId, options);
  const header = [
    'id',
    'patientId',
    'dateISO',
    'heightCm',
    'weightKg',
    'astUPerL',
    'altUPerL',
    'platelets10e9PerL',
    'creatinineMgDl',
    'notes',
    'tags',
    'createdAt',
    'updatedAt',
  ];
  const lines = rows.map((row) =>
    [
      row.id,
      row.patientId,
      row.dateISO,
      row.heightCm ?? '',
      row.weightKg ?? '',
      row.astUPerL ?? '',
      row.altUPerL ?? '',
      row.platelets10e9PerL ?? '',
      row.creatinineMgDl ?? '',
      row.notes || '',
      JSON.stringify(row.tags || []),
      row.createdAt,
      row.updatedAt,
    ]
      .map(csvEscape)
      .join(',')
  );
  return [header.join(','), ...lines].join('\n');
}
