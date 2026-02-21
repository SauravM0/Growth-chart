import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';

function AppShell() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineReady, setOfflineReady] = useState(Boolean(navigator.serviceWorker?.controller));

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    const onOfflineReady = () => setOfflineReady(true);

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    window.addEventListener('sw-offline-ready', onOfflineReady);

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('sw-offline-ready', onOfflineReady);
    };
  }, []);

  return (
    <div className="app-shell min-h-screen bg-zinc-100 text-zinc-900">
      <div className="mx-auto grid min-h-screen max-w-[1320px] grid-cols-1 xl:grid-cols-[20rem_1fr]">
        <div className="no-print xl:sticky xl:top-0 xl:h-screen">
          <Sidebar />
        </div>
        <main className="p-4 md:p-6">
          <Topbar isOnline={isOnline} offlineReady={offlineReady} />
          <div className="print-main rounded-xl border border-zinc-200 bg-white p-4 shadow-sm md:p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

export default AppShell;
