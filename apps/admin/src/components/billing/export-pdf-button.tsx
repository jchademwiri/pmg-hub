'use client';

import React, { useState } from 'react';
import { FileDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { downloadElementPdf, downloadServerPdf } from '@/lib/pdf-export';

interface ExportPdfButtonProps {
  fileName?: string;
  label?: string;
  elementId?: string;
  pdfUrl?: string;
}

export function ExportPdfButton({
  fileName = 'document.pdf',
  label = 'Export PDF',
  elementId = 'printable-area',
  pdfUrl,
}: ExportPdfButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  async function handleExport() {
    setIsExporting(true);
    const toastId = toast.loading('Generating high-quality PDF...');

    try {
      if (pdfUrl) {
        await downloadServerPdf(pdfUrl, fileName);
      } else {
        await downloadElementPdf(elementId, fileName);
      }
      toast.success('PDF downloaded successfully!', { id: toastId });
    } catch (error) {
      console.error('PDF export failed:', error);
      toast.error('Failed to generate PDF. Please try again.', { id: toastId });
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={isExporting}
      className="print:hidden border-amber-200 hover:border-amber-300 dark:border-amber-900/50 hover:bg-amber-50/50 dark:hover:bg-amber-950/20"
    >
      {isExporting ? (
        <Loader2 className="size-4 mr-2 animate-spin text-amber-500" />
      ) : (
        <FileDown className="size-4 mr-2 text-amber-500" />
      )}
      {isExporting ? 'Exporting...' : label}
    </Button>
  );
}
