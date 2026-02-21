import { getDb } from './db';
import { generateUuid } from '../utils/uuid';

export async function createPatient(patient) {
  const db = await getDb();
  const now = Date.now();

  const newPatient = {
    id: patient.id || generateUuid(),
    name: patient.name || '',
    nameLower: (patient.name || '').trim().toLowerCase(),
    sex: patient.sex || 'F',
    dobISO: patient.dobISO,
    motherHeightCm: patient.motherHeightCm ?? null,
    fatherHeightCm: patient.fatherHeightCm ?? null,
    notes: typeof patient.notes === 'string' ? patient.notes : '',
    tags: Array.isArray(patient.tags) ? patient.tags : [],
    deletedAt: patient.deletedAt ?? null,
    createdAt: now,
    updatedAt: now,
  };

  await db.put('patients', newPatient);
  return newPatient;
}

export async function listPatients() {
  const db = await getDb();
  const rows = await db.getAll('patients');
  return rows.sort((a, b) => b.updatedAt - a.updatedAt || a.name.localeCompare(b.name));
}

export async function getPatient(id) {
  const db = await getDb();
  return db.get('patients', id);
}

export async function updatePatient(id, patch) {
  const db = await getDb();
  const existing = await db.get('patients', id);

  if (!existing) {
    return null;
  }

  const updated = {
    ...existing,
    ...patch,
    id,
    nameLower: typeof patch.name === 'string' ? patch.name.trim().toLowerCase() : existing.nameLower || '',
    updatedAt: Date.now(),
  };

  await db.put('patients', updated);
  return updated;
}

export async function deletePatient(id) {
  const db = await getDb();
  const tx = db.transaction(['patients', 'measurements'], 'readwrite');
  const patientsStore = tx.objectStore('patients');
  const measurementsStore = tx.objectStore('measurements');
  const byPatientIdx = measurementsStore.index('patientId');

  const measurementIds = await byPatientIdx.getAllKeys(id);
  for (const measurementId of measurementIds) {
    await measurementsStore.delete(measurementId);
  }

  await patientsStore.delete(id);
  await tx.done;
}
