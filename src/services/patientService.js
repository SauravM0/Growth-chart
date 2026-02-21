import { getDb } from '../db/db';
import { generateUuid } from '../utils/uuid';
import { validatePatientInput } from '../utils/validate';
import {
  createMeasurement,
  deleteMeasurementById,
  listMeasurementsByPatient,
  updateMeasurementById,
} from './measurementService';
import { exportSettingsJson, importSettingsJson } from './settingsService';

function normalizePatient(row) {
  const now = Date.now();
  const name = typeof row.name === 'string' ? row.name.trim() : '';
  return {
    id: row.id || generateUuid(),
    name,
    nameLower: typeof row.nameLower === 'string' ? row.nameLower : name.toLowerCase(),
    sex: row.sex || 'F',
    dobISO: row.dobISO || '',
    heightCm: typeof row.heightCm === 'number' ? row.heightCm : null,
    weightKg: typeof row.weightKg === 'number' ? row.weightKg : null,
    motherHeightCm: typeof row.motherHeightCm === 'number' ? row.motherHeightCm : null,
    fatherHeightCm: typeof row.fatherHeightCm === 'number' ? row.fatherHeightCm : null,
    notes: typeof row.notes === 'string' ? row.notes : '',
    tags: Array.isArray(row.tags) ? row.tags : [],
    createdAt: row.createdAt || now,
    updatedAt: row.updatedAt || row.createdAt || now,
    deletedAt: row.deletedAt ?? null,
  };
}

function sortPatients(rows) {
  return [...rows].sort((a, b) => b.updatedAt - a.updatedAt || a.name.localeCompare(b.name));
}

function calcAgeYears(dobISO) {
  if (!dobISO) {
    return null;
  }
  const dob = new Date(`${dobISO}T00:00:00`);
  if (Number.isNaN(dob.getTime())) {
    return null;
  }
  return (Date.now() - dob.getTime()) / (365.25 * 24 * 3600 * 1000);
}

function matchesFilters(patient, options = {}) {
  const { searchQuery = '', sex = 'all', ageGroup = 'all' } = options;
  if (sex !== 'all' && patient.sex !== sex) {
    return false;
  }

  if (ageGroup !== 'all') {
    const ageYears = calcAgeYears(patient.dobISO);
    if (typeof ageYears !== 'number') {
      return false;
    }
    if (ageGroup === '0-2' && !(ageYears < 2)) {
      return false;
    }
    if (ageGroup === '2-5' && !(ageYears >= 2 && ageYears < 5)) {
      return false;
    }
    if (ageGroup === '5-10' && !(ageYears >= 5 && ageYears < 10)) {
      return false;
    }
    if (ageGroup === '10-18' && !(ageYears >= 10 && ageYears <= 18)) {
      return false;
    }
  }

  const query = searchQuery.trim().toLowerCase();
  if (!query) {
    return true;
  }
  return patient.nameLower.includes(query);
}

export async function listPatients(options = {}) {
  const { includeDeleted = false } = options;
  const db = await getDb();
  const rows = await db.getAll('patients');
  const normalized = rows.map(normalizePatient);
  const filteredDeleted = includeDeleted ? normalized : normalized.filter((row) => !row.deletedAt);
  const filtered = filteredDeleted.filter((row) => matchesFilters(row, options));
  const deduped = Array.from(new Map(filtered.map((row) => [row.id, row])).values());
  return sortPatients(deduped);
}

export async function getPatientById(id, options = {}) {
  const { includeDeleted = false } = options;
  const db = await getDb();
  const row = await db.get('patients', id);
  if (!row) {
    return null;
  }
  const normalized = normalizePatient(row);
  if (!includeDeleted && normalized.deletedAt) {
    return null;
  }
  return normalized;
}

export async function createPatient(payload) {
  const validation = validatePatientInput(payload);
  if (validation.errors.length) {
    const error = new Error(validation.errors.join(' '));
    error.validation = validation;
    throw error;
  }

  const db = await getDb();
  const now = Date.now();
  const row = normalizePatient({
    id: payload.id || generateUuid(),
    ...payload,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  });
  await db.put('patients', row);
  return row;
}

export async function updatePatientById(id, patch) {
  const db = await getDb();
  const existing = await db.get('patients', id);
  if (!existing) {
    return null;
  }

  const merged = normalizePatient({
    ...existing,
    ...patch,
    id,
    updatedAt: Date.now(),
  });

  const validation = validatePatientInput(merged);
  if (validation.errors.length) {
    const error = new Error(validation.errors.join(' '));
    error.validation = validation;
    throw error;
  }

  await db.put('patients', merged);
  return merged;
}

export async function deletePatientById(id, options = {}) {
  const { softDelete = false } = options;
  const db = await getDb();
  const existingPatient = await db.get('patients', id);

  if (!existingPatient) {
    return;
  }

  const measurements = await listMeasurementsByPatient(id, { includeDeleted: true });
  if (softDelete) {
    await db.put('patients', {
      ...normalizePatient(existingPatient),
      deletedAt: Date.now(),
      updatedAt: Date.now(),
    });
    for (const measurement of measurements) {
      await deleteMeasurementById(measurement.id, { softDelete: true });
    }
    return;
  }

  const tx = db.transaction(['patients', 'measurements'], 'readwrite');
  await tx.objectStore('patients').delete(id);
  for (const measurement of measurements) {
    await tx.objectStore('measurements').delete(measurement.id);
  }
  await tx.done;
}

export async function exportPatientBackup(patientId) {
  const patient = await getPatientById(patientId, { includeDeleted: true });
  const measurements = await listMeasurementsByPatient(patientId, { includeDeleted: true });
  return {
    schemaVersion: 2,
    exportedAt: new Date().toISOString(),
    patient,
    measurements,
  };
}

export async function exportFullBackup() {
  const patients = await listPatients({ includeDeleted: true });
  const measurementsByPatient = await Promise.all(
    patients.map(async (patient) => listMeasurementsByPatient(patient.id, { includeDeleted: true }))
  );
  const measurements = measurementsByPatient.flat();
  const settings = await exportSettingsJson();
  return {
    schemaVersion: 2,
    exportedAt: new Date().toISOString(),
    patients,
    measurements,
    settings,
  };
}

export async function importBackupJson(payload) {
  const data = typeof payload === 'string' ? JSON.parse(payload) : payload;
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid import payload.');
  }

  if (data.patient) {
    const patient = await getPatientById(data.patient.id, { includeDeleted: true });
    if (!patient) {
      await createPatient(data.patient);
    } else {
      await updatePatientById(data.patient.id, data.patient);
    }
  }

  if (Array.isArray(data.patients)) {
    for (const patient of data.patients) {
      if (!patient?.id) {
        continue;
      }
      const existing = await getPatientById(patient.id, { includeDeleted: true });
      if (!existing) {
        await createPatient(patient);
      } else {
        await updatePatientById(patient.id, patient);
      }
    }
  }

  const incomingMeasurements = Array.isArray(data.measurements) ? data.measurements : [];
  for (const measurement of incomingMeasurements) {
    if (!measurement?.id || !measurement?.patientId) {
      continue;
    }
    const patient = await getPatientById(measurement.patientId, { includeDeleted: true });
    if (!patient) {
      continue;
    }
    const db = await getDb();
    const existingMeasurement = await db.get('measurements', measurement.id);
    if (!existingMeasurement) {
      await createMeasurement(measurement.patientId, measurement, patient.dobISO);
    } else {
      await updateMeasurementById(measurement.id, measurement, patient.dobISO);
    }
  }

  if (Array.isArray(data.settings)) {
    await importSettingsJson(data.settings);
  }
}
