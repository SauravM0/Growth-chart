import React, { useState } from 'react';
import { disablePin, isPinSet, setPin, verifyPin } from '../utils/crypto';

function PinSettingsPanel({ onPinChanged }) {
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const handleSetOrChange = async (event) => {
    event.preventDefault();
    setError('');
    setStatus('');

    const hasPin = await isPinSet();
    if (hasPin) {
      const ok = await verifyPin(currentPin);
      if (!ok) {
        setError('Current PIN is incorrect.');
        return;
      }
    }

    if (!newPin || newPin.length < 4) {
      setError('New PIN must be at least 4 digits.');
      return;
    }

    await setPin(newPin);
    setCurrentPin('');
    setNewPin('');
    setStatus('PIN saved.');
    onPinChanged();
  };

  const handleDisable = async () => {
    setError('');
    setStatus('');

    const hasPin = await isPinSet();
    if (!hasPin) {
      setStatus('PIN is already disabled.');
      return;
    }

    const ok = await verifyPin(currentPin);
    if (!ok) {
      setError('Current PIN is incorrect.');
      return;
    }

    await disablePin();
    setCurrentPin('');
    setNewPin('');
    setStatus('PIN disabled.');
    onPinChanged();
  };

  return (
    <div className="space-y-4 rounded-lg border border-zinc-300 bg-zinc-50 p-4">
      <h3 className="text-base font-semibold text-zinc-900">PIN Settings</h3>
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {status && <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{status}</p>}

      <form onSubmit={handleSetOrChange} className="grid gap-3 md:grid-cols-2">
        <label className="text-sm text-zinc-700">
          Current PIN
          <input
            type="password"
            inputMode="numeric"
            value={currentPin}
            onChange={(event) => setCurrentPin(event.target.value)}
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 focus:border-black focus:ring-2 focus:ring-emerald-700/20"
            placeholder="Required to change/disable"
          />
        </label>

        <label className="text-sm text-zinc-700">
          New PIN
          <input
            type="password"
            inputMode="numeric"
            value={newPin}
            onChange={(event) => setNewPin(event.target.value)}
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 focus:border-black focus:ring-2 focus:ring-emerald-700/20"
            placeholder="At least 4 digits"
          />
        </label>

        <div className="md:col-span-2 flex flex-wrap gap-2">
          <button type="submit" className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-zinc-900">
            Set / Change PIN
          </button>
          <button
            type="button"
            onClick={handleDisable}
            className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700"
          >
            Disable PIN
          </button>
        </div>
      </form>
    </div>
  );
}

export default PinSettingsPanel;
