/**
 * Client-safe Public Tender Template categories & SEO metadata.
 * Pure constants & helpers with zero database dependencies — safe for both
 * Next.js 'use client' components and Astro SSR pages.
 */

export const PUBLIC_DOCUMENT_CATEGORIES = [
  'sbd_form',
  'bbbee_affidavit',
  'mbd_form',
  'compliance_checklist',
  'company_template',
  'other',
] as const;

export type PublicDocumentCategory = (typeof PUBLIC_DOCUMENT_CATEGORIES)[number];

export interface PublicDocumentCategoryMeta {
  key: PublicDocumentCategory;
  label: string;
  urlSlug: string;
  seoTitle: string;
  seoDescription: string;
  heroTitle: string;
  heroAccent: string;
  intro: string;
}

export const PUBLIC_DOCUMENT_CATEGORY_META: Record<
  PublicDocumentCategory,
  PublicDocumentCategoryMeta
> = {
  sbd_form: {
    key: 'sbd_form',
    label: 'SBD Forms',
    urlSlug: 'sbd-forms',
    seoTitle: 'Download Official SBD Forms (SBD 4, 6.1, 8, 9) | TenderEdge Solutions',
    seoDescription:
      'Download free official South African Standard Bidding Documents (SBD 4, SBD 6.1, SBD 8, SBD 9) in PDF with step-by-step completion guides.',
    heroTitle: 'STANDARD BIDDING',
    heroAccent: 'DOCUMENTS (SBD).',
    intro:
      'Download the latest National Treasury Standard Bidding Documents required for South African government and SOE tenders, with guides to avoid disqualification.',
  },
  bbbee_affidavit: {
    key: 'bbbee_affidavit',
    label: 'B-BBEE Affidavits',
    urlSlug: 'bbbee-affidavits',
    seoTitle: 'Download B-BBEE Sworn Affidavit Templates (EME & QSE) | TenderEdge Solutions',
    seoDescription:
      'Free downloadable B-BBEE Sworn Affidavit templates for EME (≤ R10M) and QSE (≤ R50M) businesses in South Africa. Ready to print, sign, and commission.',
    heroTitle: 'B-BBEE SWORN',
    heroAccent: 'AFFIDAVITS.',
    intro:
      'Download compliant B-BBEE EME and QSE sworn affidavit templates for South African tenders, including guidance on commissioning and common rejection mistakes.',
  },
  mbd_form: {
    key: 'mbd_form',
    label: 'MBD Forms',
    urlSlug: 'mbd-forms',
    seoTitle: 'Download Municipal Bidding Documents (MBD Forms) | TenderEdge Solutions',
    seoDescription:
      'Download South African Municipal Bidding Documents (MBD 1, MBD 4, MBD 6.1, MBD 8, MBD 9) required for local government and municipal tenders.',
    heroTitle: 'MUNICIPAL BIDDING',
    heroAccent: 'DOCUMENTS (MBD).',
    intro:
      'Download official Municipal Bidding Documents required when tendering with South African municipalities and metros.',
  },
  compliance_checklist: {
    key: 'compliance_checklist',
    label: 'Compliance Checklists',
    urlSlug: 'compliance-checklists',
    seoTitle: 'Tender Compliance Checklists & Returnable Guides | TenderEdge Solutions',
    seoDescription:
      'Download practical tender returnables checklists for Eskom, Transnet, and government bids to verify every mandatory compliance document before submission.',
    heroTitle: 'COMPLIANCE',
    heroAccent: 'CHECKLISTS.',
    intro:
      'Use our tender returnables checklists and compliance guides to make sure your bid pack never misses a mandatory document.',
  },
  company_template: {
    key: 'company_template',
    label: 'Company Templates',
    urlSlug: 'company-templates',
    seoTitle: 'Tender Company Templates (Profiles, JV & Policies) | TenderEdge Solutions',
    seoDescription:
      'Download editable Word and Excel tender templates including company profiles, joint venture agreements, and pricing schedules.',
    heroTitle: 'TENDER COMPANY',
    heroAccent: 'TEMPLATES.',
    intro:
      'Editable Word and Excel templates for supporting tender documents such as capability statements, JV agreements, and compliance policies.',
  },
  other: {
    key: 'other',
    label: 'Other Resources',
    urlSlug: 'other',
    seoTitle: 'Additional Tender Resources & Forms | TenderEdge Solutions',
    seoDescription:
      'Download additional South African tender forms, declarations, and supporting compliance templates.',
    heroTitle: 'TENDER',
    heroAccent: 'RESOURCES.',
    intro: 'Additional forms, declarations, and templates to support your tender submissions.',
  },
};

export function getPublicDocumentCategoryByUrlSlug(
  urlSlug: string,
): PublicDocumentCategoryMeta | undefined {
  const normalized = urlSlug.trim().toLowerCase();
  return Object.values(PUBLIC_DOCUMENT_CATEGORY_META).find((c) => c.urlSlug === normalized);
}

export function isPublicDocumentCategory(value: string): value is PublicDocumentCategory {
  return (PUBLIC_DOCUMENT_CATEGORIES as readonly string[]).includes(value);
}
