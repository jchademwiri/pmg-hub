import 'server-only';

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

import { jsPDF } from 'jspdf';

export const PAGE = {
  width: 210,
  height: 297,
  margin: 14,
  bottom: 280,
};

export function split(doc: jsPDF, text: string | undefined | null, width: number): string[] {
  return doc.splitTextToSize(text || '', width) as string[];
}

export function ensurePage(doc: jsPDF, y: number, needed = 16): number {
  if (y + needed <= PAGE.bottom) return y;
  doc.addPage();
  return PAGE.margin;
}

export function getLogoPath(orgName: string): string | null {
  const normalized = orgName.toLowerCase();
  const fileName = /tender edge|tes/.test(normalized)
    ? 'tes-logo.png'
    : /apex|aws/.test(normalized)
    ? 'aws-logo.png'
    : 'pmg-logo.png';

  const fullPath = join(process.cwd(), 'public', 'logo', fileName);
  return existsSync(fullPath) ? fullPath : null;
}

export function drawCenteredLogo(doc: jsPDF, orgName: string): void {
  const logoPath = getLogoPath(orgName);
  if (!logoPath) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(39, 39, 42);
    doc.text(split(doc, orgName, 42), PAGE.width / 2, 18, { align: 'center' });
    return;
  }

  const logoData = `data:image/png;base64,${readFileSync(logoPath).toString('base64')}`;
  const normalized = orgName.toLowerCase();
  const size = /tender edge|tes/.test(normalized) ? 22 : 20;
  doc.addImage(logoData, 'PNG', PAGE.width / 2 - size / 2, 10, size, size, undefined, 'FAST');
}

export interface PdfOrgHeader {
  name: string;
  divisionOf?: string;
  registrationNumber?: string;
  vatNumber?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  salesRep?: string;
}

export interface DrawShellHeaderOptions {
  org: PdfOrgHeader;
  title: string;
  number: string;
  status: string;
  /** Optional highlighted line drawn below the status badge (e.g. billing statements' "Total Due"). */
  highlight?: { label: string; value: string; color?: [number, number, number] };
}

export function drawShellHeader(doc: jsPDF, opts: DrawShellHeaderOptions): void {
  doc.setFillColor(29, 78, 216);
  doc.rect(0, 0, PAGE.width, 3, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(24, 24, 27);
  doc.text(opts.org.name, PAGE.margin, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(82, 82, 91);
  const orgLines = [
    opts.org.divisionOf ? `A division of ${opts.org.divisionOf}` : undefined,
    opts.org.registrationNumber ? `Reg: ${opts.org.registrationNumber}` : undefined,
    opts.org.vatNumber ? `VAT: ${opts.org.vatNumber}` : undefined,
    opts.org.email,
    opts.org.phone,
    opts.org.website,
    opts.org.address,
    opts.org.salesRep ? `Rep: ${opts.org.salesRep}` : undefined,
  ].filter(Boolean) as string[];
  orgLines.slice(0, 8).forEach((line, index) => doc.text(line, PAGE.margin, 24 + index * 4));

  drawCenteredLogo(doc, opts.org.name);

  doc.setFontSize(20);
  doc.setTextColor(161, 161, 170);
  doc.text(opts.title.toUpperCase(), PAGE.width - PAGE.margin, 18, { align: 'right' });
  doc.setFontSize(10);
  doc.setTextColor(63, 63, 70);
  doc.text(`#${opts.number}`, PAGE.width - PAGE.margin, 25, { align: 'right' });
  doc.setFontSize(8);
  doc.text(opts.status, PAGE.width - PAGE.margin, 31, { align: 'right' });

  if (opts.highlight) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    const [r, g, b] = opts.highlight.color ?? [220, 38, 38];
    doc.setTextColor(r, g, b);
    doc.text(`${opts.highlight.label}: ${opts.highlight.value}`, PAGE.width - PAGE.margin, 37, { align: 'right' });
    doc.setFont('helvetica', 'normal');
  }

  doc.setDrawColor(229, 231, 235);
  doc.line(PAGE.margin, 60, PAGE.width - PAGE.margin, 60);
}

export interface DrawShellFooterOptions {
  divisionOf?: string;
  /**
   * Called once per page (1-indexed), after `doc.setPage(i)` but before the
   * base footer line/page-number are drawn, for document-type-specific
   * extras (e.g. billing statements' repeating ageing-summary table).
   */
  onPage?: (doc: jsPDF, pageIndex: number, pageCount: number) => void;
}

export function drawShellFooter(doc: jsPDF, opts: DrawShellFooterOptions): void {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    opts.onPage?.(doc, i, pageCount);

    doc.setDrawColor(229, 231, 235);
    doc.line(PAGE.margin, 282, PAGE.width - PAGE.margin, 282);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(113, 113, 122);
    doc.text(opts.divisionOf ? `A division of ${opts.divisionOf}` : 'Thank you for your business.', PAGE.margin, 288);
    doc.text(`Page ${i} of ${pageCount}`, PAGE.width - PAGE.margin, 288, { align: 'right' });
  }
}
