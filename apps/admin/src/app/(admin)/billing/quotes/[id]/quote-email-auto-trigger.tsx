'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { UniversalEmailDialog } from '@/components/billing/universal-email-dialog';

interface QuoteEmailAutoTriggerProps {
  documentId: string;
  documentNumber: string;
  clientEmail: string;
  pdfUrl: string;
}

/**
 * Rendered only when ?action=send is in the URL (i.e. navigated here via
 * "Save & Send").  On first mount it programmatically opens the email dialog,
 * then cleans up the URL so a refresh doesn't re-open it.
 */
export function QuoteEmailAutoTrigger({
  documentId,
  documentNumber,
  clientEmail,
  pdfUrl,
}: QuoteEmailAutoTriggerProps) {
  const router = useRouter();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;

    // Small delay lets the page fully paint before the dialog opens
    const t = window.setTimeout(() => {
      triggerRef.current?.click();
      // Remove ?action=send from the URL without triggering a navigation
      const url = new URL(window.location.href);
      url.searchParams.delete('action');
      window.history.replaceState(null, '', url.toString());
    }, 150);

    return () => window.clearTimeout(t);
  }, []);

  return (
    <UniversalEmailDialog
      documentId={documentId}
      documentNumber={documentNumber}
      documentType="quote"
      defaultRecipientEmail={clientEmail}
      pdfUrl={pdfUrl}
      trigger={
        // Hidden button used as a programmatic trigger — the visible "Email Quote"
        // button in the toolbar is a separate instance of UniversalEmailDialog.
        <button ref={triggerRef} className="sr-only" aria-hidden tabIndex={-1}>
          Open email dialog
        </button>
      }
    />
  );
}
