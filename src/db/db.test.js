import 'fake-indexeddb/auto';
import { deleteDB } from 'idb';
import { resetDbForTests } from './db';
import { createPatient, deletePatient, getPatient, listPatients, updatePatient } from './patients';
import { addMeasurement, listMeasurements } from './measurements';

const DB_NAME = 'growth_app';

if (typeof global.structuredClone === 'undefined') {
  global.structuredClone = (value) => JSON.parse(JSON.stringify(value));
}

describe('IndexedDB CRUD', () => {
  beforeEach(async () => {
    await resetDbForTests();
    await deleteDB(DB_NAME);
    await resetDbForTests();
  });

  test('create/list/update patient', async () => {
    const patient = await createPatient({
      name: 'Ava',
      sex: 'F',
      dobISO: '2020-05-01',
      motherHeightCm: 162,
      fatherHeightCm: 175,
    });

    const listed = await listPatients();
    expect(listed).toHaveLength(1);
    expect(listed[0].id).toBe(patient.id);

    await updatePatient(patient.id, { name: 'Ava Updated' });
    const updated = await getPatient(patient.id);
    expect(updated.name).toBe('Ava Updated');
  });

  test('add/list measurements sorted ascending by date', async () => {
    const patient = await createPatient({
      name: 'Noah',
      sex: 'M',
      dobISO: '2021-01-01',
      motherHeightCm: null,
      fatherHeightCm: null,
    });

    await addMeasurement({
      patientId: patient.id,
      dateISO: '2022-03-01',
      heightCm: 80,
      weightKg: 10,
    });

    await addMeasurement({
      patientId: patient.id,
      dateISO: '2021-12-01',
      heightCm: 70,
      weightKg: 9,
    });

    const rows = await listMeasurements(patient.id);
    expect(rows).toHaveLength(2);
    expect(rows[0].dateISO).toBe('2021-12-01');
    expect(rows[1].dateISO).toBe('2022-03-01');
  });

  test('delete patient cascades measurements', async () => {
    const patient = await createPatient({
      name: 'Mia',
      sex: 'F',
      dobISO: '2020-01-01',
      motherHeightCm: null,
      fatherHeightCm: null,
    });

    await addMeasurement({
      patientId: patient.id,
      dateISO: '2021-01-01',
      heightCm: 60,
      weightKg: 7,
    });

    await deletePatient(patient.id);

    const removedPatient = await getPatient(patient.id);
    const measurements = await listMeasurements(patient.id);

    expect(removedPatient).toBeUndefined();
    expect(measurements).toHaveLength(0);
  });
});
