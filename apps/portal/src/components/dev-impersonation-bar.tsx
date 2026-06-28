'use client';

import * as React from 'react';

interface ClientOption {
  id: string;
  name: string;
  businessName: string | null;
}

interface DevImpersonationBarProps {
  clients: ClientOption[];
  currentClientId: string;
}

export function DevImpersonationBar({ clients, currentClientId }: DevImpersonationBarProps) {
  const [selectedId, setSelectedId] = React.useState(currentClientId);

  function handleImpersonate(clientId: string) {
    setSelectedId(clientId);
    // Set the impersonation cookie
    document.cookie = `dev_impersonate_client_id=${clientId}; path=/; max-age=86400; SameSite=Lax`;
    
    // Redirect to dashboard if currently viewing a specific document detail page
    const pathname = window.location.pathname;
    const segments = pathname.split('/').filter(Boolean);
    const isDetailPage = segments.length > 1 && ['invoices', 'quotes'].includes(segments[0]);
    
    if (isDetailPage) {
      window.location.href = '/dashboard';
    } else {
      window.location.reload();
    }
  }

  function handleClear() {
    // Delete the cookie by setting max-age to 0
    document.cookie = 'dev_impersonate_client_id=; path=/; max-age=0; SameSite=Lax';
    
    const pathname = window.location.pathname;
    const segments = pathname.split('/').filter(Boolean);
    const isDetailPage = segments.length > 1 && ['invoices', 'quotes'].includes(segments[0]);
    
    if (isDetailPage) {
      window.location.href = '/dashboard';
    } else {
      window.location.reload();
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-xl border border-blue-500/30 bg-[#0a0f1d]/95 p-3.5 shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-5 duration-300 text-xs text-white print:hidden">
      <div className="flex items-center gap-2">
        <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
        <span className="font-semibold text-blue-400">Dev Impersonation</span>
      </div>

      <select
        value={selectedId}
        onChange={(e) => handleImpersonate(e.target.value)}
        className="h-8 rounded-lg border border-white/10 bg-white/[0.05] px-2.5 text-xs text-white outline-none focus:border-blue-500/50"
      >
        {clients.map((c) => (
          <option key={c.id} value={c.id} className="bg-[#0a0f1d] text-white text-xs">
            {c.businessName || c.name}
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={handleClear}
        className="h-8 rounded-lg bg-red-500/15 border border-red-500/20 px-3 hover:bg-red-500/25 text-red-400 transition-all font-medium"
      >
        Reset
      </button>
    </div>
  );
}
