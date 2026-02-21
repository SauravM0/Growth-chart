import { getDb } from './db';
import { generateUuid } from '../utils/uuid';

export async function addMeasurement(measurement) {
  const db = await getDb();
  const now = Date.now();

  const newMeasurement = {
    id: measurement.id || generateUuid(),
    patientId: measurement.patientId,
    dateISO: measurement.dateISO,
    heightCm: measurement.heightCm ?? null,
    weightKg: measurement.weightKg ?? null,
    astUPerL: measurement.astUPerL ?? null,
    altUPerL: measurement.altUPerL ?? null,
    platelets10e9PerL: measurement.platelets10e9PerL ?? null,
    creatinineMgDl: measurement.creatinineMgDl ?? null,
    notes: typeof measurement.notes === 'string' ? measurement.notes : '',
    tags: Array.isArray(measurement.tags) ? measurement.tags : [],
    deletedAt: measurement.deletedAt ?? null,
    createdAt: now,
    updatedAt: now,
  };

  await db.put('measurements', newMeasurement);
  return newMeasurement;
}

export async function updateMeasurement(id, patch) {
  const db = await getDb();
  const existing = await db.get('measurements', id);

  if (!existing) {
    return null;
  }

  const updated = {
    ...existing,
    ...patch,
    id,
    updatedAt: Date.now(),
  };

  await db.put('measurements', updated);
  return updated;
}

export async function listMeasurements(patientId) {
  const db = await getDb();
  const rows = await db.getAllFromIndex('measurements', 'patientId', patientId);

  return rows.sort((a, b) => {
    if (a.dateISO === b.dateISO) {
      return a.createdAt - b.createdAt;
    }
    return a.dateISO.localeCompare(b.dateISO);
  });
}

export async function deleteMeasurement(id) {
  const db = await getDb();
  await db.delete('measurements', id);
}
