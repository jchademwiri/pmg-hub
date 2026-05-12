'use client';

import { Printer, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PrintButtonProps {
  label?: string;
  icon?: 'printer' | 'pdf';
  documentTitle?: string;
}

export function PrintButton({ label = 'Print / PDF', icon = 'printer', documentTitle }: PrintButtonProps) {
  function handlePrint() {
    const originalTitle = document.title;
    
    // Temporarily force the document title so "Microsoft Print to PDF" picks it up as the filename
    if (documentTitle) {
      document.title = documentTitle;
    }
    
    window.print();
    
    // Restore the original title immediately after the print dialog is opened/closed
    if (documentTitle) {
      document.title = originalTitle;
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handlePrint}
      className="print:hidden"
    >
      {icon === 'pdf' ? <FileDown className="size-4 mr-2" /> : <Printer className="size-4 mr-2" />}
      {label}
    </Button>
  );
}
