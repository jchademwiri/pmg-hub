'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

interface LunoSyncButtonProps {
  /** Renders a "Sync now" affordance instead of "Refresh" (used when the snapshot is empty). */
  syncNow?: boolean;
  /** When the snapshot is stale, silently run one sync on mount and refresh. */
  autoSyncIfStale?: boolean;
}

export function LunoSyncButton({ syncNow = false, autoSyncIfStale = false }: LunoSyncButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const autoRanRef = useRef(false);

  const runSync = useCallback(
    (opts: { silent: boolean }) => {
      setError(null);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15_000);

      startTransition(async () => {
        try {
          const res = await fetch('/api/luno/sync', {
            method: 'POST',
            signal: controller.signal,
          });
          const body = (await res.json().catch(() => null)) as {
            synced?: number;
            error?: string;
          } | null;

          if (!res.ok) {
            const message = body?.error ?? 'Failed to sync Luno data.';
            setError(message);
            if (!opts.silent) toast.error(message);
            return;
          }

          if (!opts.silent) {
            toast.success(`Synced ${body?.synced ?? 0} Luno account(s).`);
          }
          router.refresh();
        } catch {
          const message = 'Failed to sync Luno data.';
          setError(message);
          if (!opts.silent) toast.error(message);
        } finally {
          clearTimeout(timeoutId);
        }
      });
    },
    [router],
  );

  useEffect(() => {
    if (autoSyncIfStale && !autoRanRef.current) {
      autoRanRef.current = true;
      runSync({ silent: true });
    }
  }, [autoSyncIfStale, runSync]);

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-xs text-destructive">{error}</span>}
      <Button
        variant="outline"
        size="sm"
        onClick={() => runSync({ silent: false })}
        disabled={isPending}
      >
        <RefreshCw className={`size-3.5 mr-1.5 ${isPending ? 'animate-spin' : ''}`} />
        {isPending ? 'Syncing…' : syncNow ? 'Sync now' : 'Refresh'}
      </Button>
    </div>
  );
}
