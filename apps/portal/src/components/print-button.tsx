'use client';

import * as React from 'react';
import { Printer, Download } from 'lucide-react';

interface DocumentActionsProps {
  type: 'invoice' | 'quote' | 'statement';
  id: string;
  label?: string;
}

export function DocumentActions({ type, id }: Omit<DocumentActionsProps, 'label'>) {
  const handleDownload = () => {
    if (typeof window !== 'undefined') {
      window.location.href = `/api/billing/pdf/${type}/${id}`;
    }
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Download PDF Button */}
      <button
        type="button"
        onClick={handleDownload}
        className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
      >
        <Download className="size-3.5" />
        <span>Download PDF</span>
      </button>

      {/* Print Button */}
      <button
        type="button"
        onClick={handlePrint}
        className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all active:scale-[0.98]"
      >
        <Printer className="size-3.5" />
        <span>Print</span>
      </button>
    </div>
  );
}

export function PrintButton({ type, id, label }: DocumentActionsProps) {
  if (label) {
    return (
      <button
        type="button"
        onClick={() => typeof window !== 'undefined' && window.print()}
        className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-md transition-all active:scale-[0.98]"
      >
        <Printer className="size-3.5" />
        <span>{label}</span>
      </button>
    );
  }

  return <DocumentActions type={type} id={id} />;
}
