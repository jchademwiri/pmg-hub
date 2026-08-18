// @vitest-environment jsdom

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { refreshMock, toastMock } = vi.hoisted(() => ({
  refreshMock: vi.fn(),
  toastMock: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(() => 'toast-id'),
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: refreshMock, push: vi.fn() }),
}));

vi.mock('sonner', () => ({
  toast: toastMock,
}));

import { LunoSyncButton } from './luno-sync-button';

const fetchMock = vi.fn();

describe('LunoSyncButton', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    refreshMock.mockReset();
    toastMock.success.mockReset();
    toastMock.error.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders a Refresh button by default', () => {
    render(<LunoSyncButton />);
    expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
  });

  it('renders a Sync now button when syncNow is set', () => {
    render(<LunoSyncButton syncNow />);
    expect(screen.getByRole('button', { name: /sync now/i })).toBeInTheDocument();
  });

  it('POSTs to the sync route, toasts, and refreshes on click', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ synced: 2 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    render(<LunoSyncButton />);
    await userEvent.click(screen.getByRole('button', { name: /refresh/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/luno/sync',
        expect.objectContaining({ method: 'POST' }),
      );
    });
    await waitFor(() => {
      expect(toastMock.success).toHaveBeenCalledWith('Synced 2 Luno account(s).');
      expect(refreshMock).toHaveBeenCalled();
    });
  });

  it('auto-syncs silently once on mount when stale', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ synced: 1 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    render(<LunoSyncButton autoSyncIfStale />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(refreshMock).toHaveBeenCalled();
    });
    // Auto-sync must not toast.
    expect(toastMock.success).not.toHaveBeenCalled();
  });

  it('does not auto-sync when not stale', () => {
    render(<LunoSyncButton autoSyncIfStale={false} />);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shows the error inline and in a toast when the sync fails on click', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: 'Upstream timeout' }), {
        status: 504,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    render(<LunoSyncButton />);
    await userEvent.click(screen.getByRole('button', { name: /refresh/i }));

    expect(await screen.findByText('Upstream timeout')).toBeInTheDocument();
    expect(toastMock.error).toHaveBeenCalledWith('Upstream timeout');
    expect(refreshMock).not.toHaveBeenCalled();
  });
});
