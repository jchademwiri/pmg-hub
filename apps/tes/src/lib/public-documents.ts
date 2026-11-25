import {
  getDb,
  publicDocuments,
  eq,
  and,
  ne,
  asc,
  desc,
  bridgeDatabaseEnv,
  PUBLIC_DOCUMENT_CATEGORY_META,
  type PublicDocument,
  type PublicDocumentCategory,
} from '@pmg/db';

export const LEGACY_STATIC_SLUGS = new Set(['sbd-4', 'sbd-6-1', 'sbd-8', 'sbd-9']);

export function hasLegacyStaticMirror(slug: string): boolean {
  return LEGACY_STATIC_SLUGS.has(slug);
}

export const FALLBACK_DOCUMENTS: PublicDocument[] = [
  {
    id: 'fallback-sbd-4',
    slug: 'sbd-4',
    code: 'SBD 4',
    title: 'Declaration of Interest',
    subtitle: 'Mandatory bidder disclosure of state employment and relationships',
    category: 'sbd_form',
    seoTitle: 'Download SBD 4 Form (Declaration of Interest PDF) | TenderEdge Solutions',
    seoDescription:
      'Download the official SBD 4 form required for all South African government tenders to declare relationships or conflicts of interest.',
    keywords: ['sbd 4', 'sbd 4 form download', 'declaration of interest pdf'],
    content:
      '<p>The <strong>SBD 4 form (Declaration of Interest)</strong> is a mandatory document for all South African government tenders. It requires bidders to declare if they are employed by the state, or if they have any relationship with persons involved in the evaluation or adjudication of the bid. Failing to accurately complete the SBD 4 form will result in immediate disqualification.</p>',
    commonMistakes: [
      'Failing to declare family members who work for the government.',
      "Leaving sections blank instead of writing 'N/A'.",
      'Listing directors that do not match your latest CIPC and CSD registration records.',
    ],
    s3Key: 'sbd-forms/sbd-4.pdf',
    fileName: 'sbd-4.pdf',
    fileSize: null,
    mimeType: 'application/pdf',
    isPublished: true,
    sortOrder: 10,
    downloadCount: 0,
    lastDownloadedAt: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  },
  {
    id: 'fallback-sbd-6-1',
    slug: 'sbd-6-1',
    code: 'SBD 6.1',
    title: 'Preference Points Claim Form',
    subtitle: 'Claim 80/20 or 90/10 preference points for B-BBEE & specific goals',
    category: 'sbd_form',
    seoTitle: 'Download SBD 6.1 Form (Preference Points Claim PDF) | TenderEdge Solutions',
    seoDescription:
      'Download the SBD 6.1 form to claim preference points based on your B-BBEE status and specific goals.',
    keywords: ['sbd 6.1', 'sbd 6.1 form download', 'preference points claim form pdf'],
    content:
      '<p>The <strong>SBD 6.1 form</strong> is used to claim preference points in terms of the Preferential Procurement Regulations. It calculates your score based on price (80 or 90 points) and your B-BBEE Status Level of Contribution or specific goals (20 or 10 points).</p>',
    commonMistakes: [
      'Claiming points without a valid B-BBEE certificate or sworn affidavit.',
      'Incorrectly calculating the preference points.',
      'Using an outdated version of the form.',
    ],
    s3Key: 'sbd-forms/sbd-6-1.pdf',
    fileName: 'sbd-6.1.pdf',
    fileSize: null,
    mimeType: 'application/pdf',
    isPublished: true,
    sortOrder: 20,
    downloadCount: 0,
    lastDownloadedAt: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  },
  {
    id: 'fallback-sbd-8',
    slug: 'sbd-8',
    code: 'SBD 8',
    title: 'Declaration of Bidder’s Past SCM Practices',
    subtitle: 'Declaration of past supply chain management compliance',
    category: 'sbd_form',
    seoTitle: 'Download SBD 8 Form (Past SCM Practices PDF) | TenderEdge Solutions',
    seoDescription:
      "Download the SBD 8 form to declare your company's past supply chain management practices.",
    keywords: ['sbd 8', 'sbd 8 form download', 'past supply chain management practices'],
    content:
      "<p>The <strong>SBD 8 form</strong> serves as a declaration that the bidder has not abused the institution's supply chain management system, committed fraud, or failed to perform on any government contracts.</p>",
    commonMistakes: [
      'Failing to disclose past contract terminations.',
      'Not checking the National Treasury Register for Tender Defaulters before signing.',
    ],
    s3Key: 'sbd-forms/sbd-8.pdf',
    fileName: 'sbd-8.pdf',
    fileSize: null,
    mimeType: 'application/pdf',
    isPublished: true,
    sortOrder: 30,
    downloadCount: 0,
    lastDownloadedAt: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  },
  {
    id: 'fallback-sbd-9',
    slug: 'sbd-9',
    code: 'SBD 9',
    title: 'Certificate of Independent Bid Determination',
    subtitle: 'Certify that your tender bid was prepared independently',
    category: 'sbd_form',
    seoTitle: 'Download SBD 9 Form (Independent Bid Determination PDF) | TenderEdge Solutions',
    seoDescription:
      'Download the SBD 9 form to certify that your bid was determined independently without collusion.',
    keywords: ['sbd 9', 'sbd 9 form download', 'independent bid determination pdf'],
    content:
      '<p>The <strong>SBD 9 form</strong> is a certificate of declaration that ensures the bid was arrived at independently, without consultation, communication, or agreement with any competitor. This prevents bid-rigging and collusive practices.</p>',
    commonMistakes: [
      'Submitting identical bids as a subsidiary or sister company.',
      'Discussing pricing strategies with competitors before submitting the bid.',
    ],
    s3Key: 'sbd-forms/sbd-9.pdf',
    fileName: 'sbd-9.pdf',
    fileSize: null,
    mimeType: 'application/pdf',
    isPublished: true,
    sortOrder: 40,
    downloadCount: 0,
    lastDownloadedAt: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  },
];

function ensureEnvBridged() {
  const env = import.meta.env as Record<string, string | undefined>;
  bridgeDatabaseEnv(env);
}

export async function getPublishedDocuments(): Promise<PublicDocument[]> {
  try {
    ensureEnvBridged();
    const db = getDb();
    const docs = await db
      .select()
      .from(publicDocuments)
      .where(eq(publicDocuments.isPublished, true))
      .orderBy(asc(publicDocuments.sortOrder), desc(publicDocuments.downloadCount));

    if (docs.length > 0) return docs;
    return FALLBACK_DOCUMENTS;
  } catch (err) {
    console.warn('Failed to fetch published public_documents, using fallback:', err);
    return FALLBACK_DOCUMENTS;
  }
}

export async function getPublishedDocumentsByCategory(
  category: PublicDocumentCategory,
): Promise<PublicDocument[]> {
  try {
    ensureEnvBridged();
    const db = getDb();
    const docs = await db
      .select()
      .from(publicDocuments)
      .where(and(eq(publicDocuments.isPublished, true), eq(publicDocuments.category, category)))
      .orderBy(asc(publicDocuments.sortOrder), desc(publicDocuments.downloadCount));

    if (docs.length > 0) return docs;
    return FALLBACK_DOCUMENTS.filter((d) => d.category === category);
  } catch (err) {
    console.warn(`Failed to fetch public_documents for category ${category}:`, err);
    return FALLBACK_DOCUMENTS.filter((d) => d.category === category);
  }
}

export async function getPublishedDocumentBySlug(slug: string): Promise<PublicDocument | null> {
  try {
    ensureEnvBridged();
    const db = getDb();
    const [doc] = await db
      .select()
      .from(publicDocuments)
      .where(and(eq(publicDocuments.slug, slug), eq(publicDocuments.isPublished, true)))
      .limit(1);

    if (doc) return doc;
    return FALLBACK_DOCUMENTS.find((d) => d.slug === slug) ?? null;
  } catch (err) {
    console.warn(`Failed to fetch public_document "${slug}", checking fallback:`, err);
    return FALLBACK_DOCUMENTS.find((d) => d.slug === slug) ?? null;
  }
}

export async function getRelatedDocuments(
  currentSlug: string,
  category: PublicDocumentCategory,
  limit = 3,
): Promise<PublicDocument[]> {
  try {
    ensureEnvBridged();
    const db = getDb();
    const docs = await db
      .select()
      .from(publicDocuments)
      .where(and(eq(publicDocuments.isPublished, true), ne(publicDocuments.slug, currentSlug)))
      .orderBy(asc(publicDocuments.sortOrder), desc(publicDocuments.downloadCount))
      .limit(12);

    const sameCategory = docs.filter((d) => d.category === category);
    const otherCategory = docs.filter((d) => d.category !== category);
    const combined = [...sameCategory, ...otherCategory].slice(0, limit);
    if (combined.length > 0) return combined;
  } catch (err) {
    console.warn('Failed to fetch related documents:', err);
  }

  return FALLBACK_DOCUMENTS.filter((d) => d.slug !== currentSlug).slice(0, limit);
}

export function formatFileMeta(
  mimeType?: string | null,
  fileSize?: number | null,
  fileName?: string | null,
): { shortLabel: string; label: string; sizeLabel: string | null; ext: string } {
  const mime = (mimeType || '').toLowerCase();
  const name = (fileName || '').toLowerCase();

  let shortLabel = 'PDF';
  let label = 'PDF Document';
  let ext = 'pdf';

  if (mime.includes('wordprocessingml') || name.endsWith('.docx')) {
    shortLabel = 'DOCX';
    label = 'Word (.docx)';
    ext = 'docx';
  } else if (mime.includes('spreadsheetml') || name.endsWith('.xlsx')) {
    shortLabel = 'XLSX';
    label = 'Excel (.xlsx)';
    ext = 'xlsx';
  }

  let sizeLabel: string | null = null;
  if (fileSize && fileSize > 0) {
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(fileSize) / Math.log(k));
    sizeLabel = `${parseFloat((fileSize / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }

  return { shortLabel, label, sizeLabel, ext };
}

export function formatDocumentContentHtml(content: string | null | undefined): string {
  const trimmed = (content || '').trim();
  if (!trimmed) return '';
  // If already HTML (from Tiptap), return directly
  if (/<[a-z][\s\S]*>/i.test(trimmed)) {
    return trimmed;
  }
  // Plain text fallback: escape and wrap paragraphs
  const escaped = trimmed.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return escaped
    .split(/\n{2,}/)
    .map((p) => `<p>${p.replace(/\n/g, '<br />')}</p>`)
    .join('');
}

export function getActiveCategoryList(docs: PublicDocument[]) {
  const counts = new Map<PublicDocumentCategory, number>();
  for (const doc of docs) {
    const cat = (
      doc.category in PUBLIC_DOCUMENT_CATEGORY_META ? doc.category : 'other'
    ) as PublicDocumentCategory;
    counts.set(cat, (counts.get(cat) || 0) + 1);
  }

  return Object.values(PUBLIC_DOCUMENT_CATEGORY_META)
    .filter((meta) => (counts.get(meta.key) || 0) > 0)
    .map((meta) => ({
      ...meta,
      count: counts.get(meta.key) || 0,
    }));
}
