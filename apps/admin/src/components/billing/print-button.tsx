'use client';

import { Printer, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PrintButtonProps {
  label?: string;
  icon?: 'printer' | 'pdf';
}

export function PrintButton({ label = 'Print / PDF', icon = 'printer' }: PrintButtonProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => window.print()}
      className="print:hidden"
    >
      {icon === 'pdf' ? <FileDown className="size-4 mr-2" /> : <Printer className="size-4 mr-2" />}
      {label}
    </Button>
  );
}
