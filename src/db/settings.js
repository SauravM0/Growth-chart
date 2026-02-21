import { getDb } from './db';

export async function getSetting(key, defaultValue = null) {
  const db = await getDb();
  const row = await db.get('settings', key);
  if (!row) {
    return defaultValue;
  }
  return row.value;
}

export async function ensureSetting(key, defaultValue = null) {
  const db = await getDb();
  const row = await db.get('settings', key);
  if (!row) {
    await db.put('settings', { key, value: defaultValue, updatedAt: Date.now() });
    return defaultValue;
  }
  return row.value;
}

export async function setSetting(key, value) {
  const db = await getDb();
  await db.put('settings', { key, value, updatedAt: Date.now() });
  return value;
}

export async function deleteSetting(key) {
  const db = await getDb();
  await db.delete('settings', key);
}

export async function listSettings() {
  const db = await getDb();
  return db.getAll('settings');
}
