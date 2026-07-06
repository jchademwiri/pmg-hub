'use client';

import { useState, useEffect } from 'react';
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
 * "Save & Send"). On first mount it programmatically opens the email dialog
 * via controlled open state, then cleans up the URL so a refresh doesn't re-open it.
 */
export function QuoteEmailAutoTrigger({
  documentId,
  documentNumber,
  clientEmail,
  pdfUrl,
}: QuoteEmailAutoTriggerProps) {
  const router = useRouter();
  const [open, setOpen] = useState(true);

  useEffect(() => {
    // Remove ?action=send from the URL without triggering a navigation
    const url = new URL(window.location.href);
    if (url.searchParams.has('action')) {
      url.searchParams.delete('action');
      window.history.replaceState(null, '', url.toString());
    }
  }, []);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
  };

  return (
    <UniversalEmailDialog
      documentId={documentId}
      documentNumber={documentNumber}
      documentType="quote"
      defaultRecipientEmail={clientEmail}
      pdfUrl={pdfUrl}
      open={open}
      onOpenChange={handleOpenChange}
      trigger={null}
    />
  );
}
