import React, { useState } from 'react';

function PinLockScreen({ onUnlock }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    const unlocked = await onUnlock(pin);
    if (!unlocked) {
      setError('Incorrect PIN.');
      return;
    }
    setError('');
    setPin('');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-100 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-lg border border-zinc-300 bg-white p-6 shadow-sm">
        <h1 className="mb-2 text-xl font-semibold text-zinc-900">PIN Lock</h1>
        <p className="mb-4 text-sm text-zinc-700">Enter PIN to access the app.</p>
        {error && <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <input
          type="password"
          inputMode="numeric"
          value={pin}
          onChange={(event) => setPin(event.target.value)}
          className="mb-4 w-full rounded-md border border-zinc-300 px-3 py-2 focus:border-black focus:ring-2 focus:ring-emerald-700/20"
          placeholder="PIN"
          required
        />
        <button type="submit" className="w-full rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-zinc-900">
          Unlock
        </button>
      </form>
    </div>
  );
}

export default PinLockScreen;
