'use client';

import * as React from 'react';

/**
 * Opens a creation dialog automatically when navigated to with `?new=1`,
 * then strips `new` from the URL so a page refresh doesn't re-open it.
 */
export function useOpenOnNewParam(onOpen: (open: boolean) => void, enabled = true) {
  React.useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('new') !== '1') return;

    onOpen(true);
    params.delete('new');
    const query = params.toString();
    const nextUrl = query ? `${window.location.pathname}?${query}` : window.location.pathname;
    window.history.replaceState(null, '', nextUrl);
  }, [enabled, onOpen]);
}
