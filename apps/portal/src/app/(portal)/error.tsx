'use client';

import { AlertTriangle, RotateCcw } from 'lucide-react';

export default function PortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center rounded-xl border border-white/5 bg-[#0a0f1d] p-8 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-red-500/10 text-red-400">
        <AlertTriangle className="size-6" />
      </div>
      <h2 className="text-lg font-bold text-white">Something went wrong</h2>
      <p className="mt-1 max-w-md text-xs text-muted-foreground">
        {error.message || 'We could not load this portal page right now. Please try again.'}
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-500 cursor-pointer"
      >
        <RotateCcw className="size-3.5" />
        Try Again
      </button>
    </div>
  );
}
