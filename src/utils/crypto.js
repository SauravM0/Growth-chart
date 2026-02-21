import { deleteAppSetting, getAppSetting, setAppSetting } from '../services/settingsService';

const PIN_KEY = 'security.pin';

function toBase64(uint8Array) {
  let binary = '';
  uint8Array.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function fromBase64(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function sha256Base64(text) {
  const encoded = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return toBase64(new Uint8Array(digest));
}

async function hashPinWithSalt(pin, saltBase64) {
  return sha256Base64(`${saltBase64}:${pin}`);
}

export async function isPinSet() {
  const config = await getAppSetting(PIN_KEY, null);
  return Boolean(config?.salt && config?.hash);
}

export async function setPin(pin) {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  const saltBase64 = toBase64(salt);
  const hash = await hashPinWithSalt(pin, saltBase64);
  await setAppSetting(PIN_KEY, { salt: saltBase64, hash });
}

export async function verifyPin(pin) {
  const config = await getAppSetting(PIN_KEY, null);
  if (!config?.salt || !config?.hash) {
    return false;
  }

  const recomputed = await hashPinWithSalt(pin, config.salt);
  const a = fromBase64(recomputed);
  const b = fromBase64(config.hash);

  if (a.length !== b.length) {
    return false;
  }

  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a[i] ^ b[i];
  }
  return mismatch === 0;
}

export async function disablePin() {
  await deleteAppSetting(PIN_KEY);
}
