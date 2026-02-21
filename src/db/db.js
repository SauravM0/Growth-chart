import { openDB } from 'idb';

const DB_NAME = 'growth_app';
const DB_VERSION = 2;

let dbPromise;

export function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, _oldVersion, _newVersion, transaction) {
        if (!db.objectStoreNames.contains('patients')) {
          const patientsStore = db.createObjectStore('patients', { keyPath: 'id' });
          patientsStore.createIndex('nameLower', 'nameLower');
        } else {
          const patientsStore = transaction.objectStore('patients');
          if (!patientsStore.indexNames.contains('nameLower')) {
            patientsStore.createIndex('nameLower', 'nameLower');
          }
        }

        if (!db.objectStoreNames.contains('measurements')) {
          const measurementsStore = db.createObjectStore('measurements', { keyPath: 'id' });
          measurementsStore.createIndex('patientId', 'patientId');
          measurementsStore.createIndex('patientIdDate', ['patientId', 'dateISO']);
        } else {
          const measurementsStore = transaction.objectStore('measurements');
          if (!measurementsStore.indexNames.contains('patientId')) {
            measurementsStore.createIndex('patientId', 'patientId');
          }
          if (!measurementsStore.indexNames.contains('patientIdDate')) {
            measurementsStore.createIndex('patientIdDate', ['patientId', 'dateISO']);
          }
        }

        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      },
    });
  }

  return dbPromise;
}

export async function resetDbForTests() {
  if (dbPromise) {
    const db = await dbPromise;
    db.close();
  }
  dbPromise = undefined;
}
