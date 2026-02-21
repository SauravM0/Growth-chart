import React, { useCallback, useEffect, useState } from 'react';
import { RouterProvider } from 'react-router-dom';
import router from './app/routes';
import PinLockScreen from './components/PinLockScreen';
import { isPinSet, verifyPin } from './utils/crypto';

function App() {
  const [checkingPin, setCheckingPin] = useState(true);
  const [pinRequired, setPinRequired] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);

  const refreshPinState = useCallback(async () => {
    const hasPin = await isPinSet();
    setPinRequired(hasPin);
    setCheckingPin(false);
    if (!hasPin) {
      setIsUnlocked(true);
    } else if (!isUnlocked) {
      setIsUnlocked(false);
    }
  }, [isUnlocked]);

  useEffect(() => {
    refreshPinState();

    const onPinUpdated = () => {
      refreshPinState();
    };
    const onPinLock = () => {
      if (pinRequired) {
        setIsUnlocked(false);
      }
    };

    window.addEventListener('pin-updated', onPinUpdated);
    window.addEventListener('pin-lock', onPinLock);
    return () => {
      window.removeEventListener('pin-updated', onPinUpdated);
      window.removeEventListener('pin-lock', onPinLock);
    };
  }, [refreshPinState, pinRequired]);

  const handleUnlock = async (pin) => {
    const ok = await verifyPin(pin);
    if (ok) {
      setIsUnlocked(true);
    }
    return ok;
  };

  if (checkingPin) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-zinc-600">Loading...</div>;
  }

  if (pinRequired && !isUnlocked) {
    return <PinLockScreen onUnlock={handleUnlock} />;
  }

  return <RouterProvider router={router} />;
}

export default App;
