import React from 'react';
import { Badge } from './ui/badge';

function Topbar({ isOnline, offlineReady }) {
  return (
    <header className="no-print mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3">
      <div>
        <p className="text-sm font-semibold text-zinc-900">Pediatric Growth Monitoring</p>
        <p className="text-xs text-zinc-600">Offline-first patient and growth chart workspace</p>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={isOnline ? 'success' : 'warning'}>{isOnline ? 'Online' : 'Offline mode'}</Badge>
        {offlineReady && <Badge variant="success">Offline ready</Badge>}
      </div>
    </header>
  );
}

export default Topbar;
