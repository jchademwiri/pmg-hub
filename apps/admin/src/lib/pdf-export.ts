'use client';

import type { jsPDF as JsPdfConstructor } from 'jspdf';

export const PDF_A4 = {
  widthMm: 210,
  heightMm: 297,
  minorOverflowHeightMm: 315,
  trailingPageThresholdMm: 10,
  canvasScale: 2,
  backgroundColor: '#ffffff',
} as const;

export const MAX_EMAIL_PDF_BYTES = 8 * 1024 * 1024;

type JsPdfInstance = InstanceType<typeof JsPdfConstructor>;

export function getPrintableElementById(elementId: string): HTMLElement {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Printable element '#${elementId}' not found.`);
  }

  return element;
}

export function sanitizePdfFileName(fileName: string) {
  const cleaned = fileName
    .replace(/\.pdf$/i, '')
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return `${cleaned || 'document'}.pdf`;
}

export function extractPdfBase64(dataUri: string) {
  const base64 = dataUri.split(',')[1];
  if (!base64) throw new Error('PDF base64 conversion failed.');
  return base64;
}

export function getBase64ByteSize(base64: string) {
  const normalized = base64.replace(/\s/g, '');
  const padding = normalized.endsWith('==') ? 2 : normalized.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.ceil((normalized.length * 3) / 4) - padding);
}

export function assertEmailPdfSize(base64: string, label = 'PDF attachment') {
  const size = getBase64ByteSize(base64);
  if (size > MAX_EMAIL_PDF_BYTES) {
    throw new Error(`${label} is too large to email. Try printing/downloading it instead.`);
  }
}

function addCanvasImageToPdf(pdf: JsPdfInstance, canvas: HTMLCanvasElement) {
  const imgData = canvas.toDataURL('image/png');
  let imgHeight = (canvas.height * PDF_A4.widthMm) / canvas.width;

  if (imgHeight > PDF_A4.heightMm && imgHeight < PDF_A4.minorOverflowHeightMm) {
    imgHeight = PDF_A4.heightMm;
  }

  let heightLeft = imgHeight;
  let position = 0;

  pdf.addImage(imgData, 'PNG', 0, position, PDF_A4.widthMm, imgHeight, undefined, 'FAST');
  heightLeft -= PDF_A4.heightMm;

  while (heightLeft > PDF_A4.trailingPageThresholdMm) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', 0, position, PDF_A4.widthMm, imgHeight, undefined, 'FAST');
    heightLeft -= PDF_A4.heightMm;
  }
}

export async function renderElementToPdf(elementId: string): Promise<JsPdfInstance> {
  const [{ jsPDF }, html2canvasModule] = await Promise.all([
    import('jspdf'),
    import('html2canvas-pro'),
  ]);
  const element = getPrintableElementById(elementId);
  const canvas = await html2canvasModule.default(element, {
    scale: PDF_A4.canvasScale,
    useCORS: true,
    logging: false,
    backgroundColor: PDF_A4.backgroundColor,
  });
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  addCanvasImageToPdf(pdf, canvas);
  return pdf;
}

export async function appendElementToPdf(
  pdf: JsPdfInstance,
  elementId: string,
  shouldAddPage: boolean,
) {
  const html2canvas = (await import('html2canvas-pro')).default;
  const element = getPrintableElementById(elementId);
  const canvas = await html2canvas(element, {
    scale: PDF_A4.canvasScale,
    useCORS: true,
    logging: false,
    backgroundColor: PDF_A4.backgroundColor,
  });

  if (shouldAddPage) pdf.addPage();
  addCanvasImageToPdf(pdf, canvas);
}

export async function downloadElementPdf(elementId: string, fileName: string) {
  const pdf = await renderElementToPdf(elementId);
  pdf.save(sanitizePdfFileName(fileName));
}

export async function elementToPdfBase64(elementId: string, label?: string) {
  const pdf = await renderElementToPdf(elementId);
  const base64 = extractPdfBase64(pdf.output('datauristring'));
  if (label) assertEmailPdfSize(base64, label);
  return base64;
}
