import { deleteSetting, ensureSetting, getSetting, listSettings, setSetting } from '../db/settings';

export async function getAppSetting(key, defaultValue = null) {
  return getSetting(key, defaultValue);
}

export async function ensureAppSetting(key, defaultValue = null) {
  return ensureSetting(key, defaultValue);
}

export async function setAppSetting(key, value) {
  return setSetting(key, value);
}

export async function deleteAppSetting(key) {
  return deleteSetting(key);
}

export async function listAllSettings() {
  const rows = await listSettings();
  return rows.sort((a, b) => a.key.localeCompare(b.key));
}

export async function exportSettingsJson() {
  const settings = await listAllSettings();
  return settings.map((row) => ({
    key: row.key,
    value: row.value,
    updatedAt: row.updatedAt || Date.now(),
  }));
}

export async function importSettingsJson(settingsRows = []) {
  if (!Array.isArray(settingsRows)) {
    return;
  }
  for (const row of settingsRows) {
    if (!row || typeof row.key !== 'string') {
      continue;
    }
    await setSetting(row.key, row.value);
  }
}
