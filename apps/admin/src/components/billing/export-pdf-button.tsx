'use client';

import React, { useState } from 'react';
import { FileDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ExportPdfButtonProps {
  fileName?: string;
  label?: string;
}

export function ExportPdfButton({ fileName = 'document.pdf', label = 'Export PDF' }: ExportPdfButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  async function handleExport() {
    setIsExporting(true);
    const toastId = toast.loading('Generating high-quality PDF...');

    try {
      // 1. Dynamically import html2canvas-pro and jsPDF to keep initial load lightweight
      const html2canvas = (await import('html2canvas-pro')).default;
      const { jsPDF } = await import('jspdf');

      const element = document.querySelector('.print-document') as HTMLElement;
      if (!element) {
        toast.error('Document preview element not found.', { id: toastId });
        setIsExporting(false);
        return;
      }

      // 2. Capture canvas with high resolution scale
      const canvas = await html2canvas(element, {
        scale: 2, // 2x scale for print quality sharpness
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');

      // 3. Create A4 PDF (210mm x 297mm)
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
      });

      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      let imgHeight = (canvas.height * imgWidth) / canvas.width;

      // If the captured height is slightly larger than A4 (e.g., within 18mm overflow),
      // we scale it down slightly so it fits perfectly on a single page instead of spawning a blank page.
      if (imgHeight > pageHeight && imgHeight < 315) {
        imgHeight = pageHeight;
      }
      
      let heightLeft = imgHeight;
      let position = 0;

      // First page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pageHeight;

      // Multi-page splitting if height exceeds A4 height with a 10mm safety threshold
      while (heightLeft > 10) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pageHeight;
      }

      // 4. Download PDF
      pdf.save(fileName);
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
