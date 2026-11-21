'use client';

export { getBase64ByteSize, MAX_EMAIL_PDF_BYTES } from './pdf-email-size';
import { getBase64ByteSize, MAX_EMAIL_PDF_BYTES } from './pdf-email-size';

export function sanitizePdfFileName(fileName: string) {
  const cleaned = fileName
    .replace(/\.pdf$/i, '')
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return `${cleaned || 'document'}.pdf`;
}

export function assertEmailPdfSize(base64: string, label = 'PDF attachment') {
  const size = getBase64ByteSize(base64);
  if (size > MAX_EMAIL_PDF_BYTES) {
    throw new Error(`${label} is too large to email. Try printing/downloading it instead.`);
  }
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = sanitizePdfFileName(fileName);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function fetchServerPdfBytes(pdfUrl: string): Promise<Uint8Array> {
  const response = await fetch(pdfUrl, { credentials: 'same-origin' });
  if (!response.ok) {
    throw new Error(`PDF generation failed (${response.status}).`);
  }

  return new Uint8Array(await response.arrayBuffer());
}

export async function downloadServerPdf(pdfUrl: string, fileName: string) {
  const response = await fetch(pdfUrl, { credentials: 'same-origin' });
  if (!response.ok) {
    throw new Error(`PDF download failed (${response.status}).`);
  }

  downloadBlob(await response.blob(), fileName);
}

export async function serverPdfUrlToBase64(pdfUrl: string, label?: string) {
  const bytes = await fetchServerPdfBytes(pdfUrl);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]!);
  }

  const base64 = window.btoa(binary);
  if (label) assertEmailPdfSize(base64, label);
  return base64;
}
