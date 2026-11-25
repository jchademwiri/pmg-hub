import { db } from '../client';
import { complianceDocuments, complianceDocumentTypes } from '../schema/compliance';
import { eq, and, asc, lte, gte, sql } from 'drizzle-orm';
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';

export type ComplianceDocument = InferSelectModel<typeof complianceDocuments>;
export type NewComplianceDocument = InferInsertModel<typeof complianceDocuments>;

export const DEFAULT_COMPLIANCE_DOCUMENT_TYPES = [
  'SARS Tax Clearance PIN',
  'B-BBEE Affidavit / Certificate',
  'CIPC Annual Returns',
  'COIDA / Letter of Good Standing',
  'CIDB Registration (Annual & 3-Year Renewals)',
  'CSD Registration Report',
  'NHBRC Certificate',
  'PSIRA Certificate',
  'Public Liability Insurance',
  'ISO 9001 Certificate',
  'Municipal Rates Clearance',
] as const;

export type ComplianceDocumentTypeRow = {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Ensures the 11 standard South African compliance document types exist.
 * Idempotent and non-fatal in test mocks or read-only contexts.
 */
export async function ensureDefaultComplianceDocumentTypes(): Promise<void> {
  try {
    for (let i = 0; i < DEFAULT_COMPLIANCE_DOCUMENT_TYPES.length; i++) {
      const name = DEFAULT_COMPLIANCE_DOCUMENT_TYPES[i]!;
      await db
        .insert(complianceDocumentTypes)
        .values({ name, sortOrder: i + 1, isActive: true })
        .onConflictDoNothing({ target: complianceDocumentTypes.name });
    }
  } catch {
    // Non-fatal in unit-test mock environments
  }
}

/**
 * Persists a newly entered custom compliance document name into
 * `compliance_document_types` so admins can reuse, rename, or manage it.
 */
export async function ensureComplianceDocumentType(name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed || trimmed.toUpperCase() === 'CUSTOM') return;

  const [maxRow] = await db
    .select({ maxSort: sql<number>`COALESCE(MAX(${complianceDocumentTypes.sortOrder}), 0)::int` })
    .from(complianceDocumentTypes);
  const nextSort = (maxRow?.maxSort ?? 0) + 1;

  await db
    .insert(complianceDocumentTypes)
    .values({ name: trimmed, sortOrder: nextSort, isActive: true })
    .onConflictDoNothing({ target: complianceDocumentTypes.name });
}

/**
 * Returns predefined compliance document types ordered by sortOrder then name,
 * joined with usage count across `compliance_documents`.
 */
export async function getComplianceDocumentTypes(
  options: { activeOnly?: boolean } = {},
): Promise<ComplianceDocumentTypeRow[]> {
  await ensureDefaultComplianceDocumentTypes();

  const query = db
    .select({
      id: complianceDocumentTypes.id,
      name: complianceDocumentTypes.name,
      sortOrder: complianceDocumentTypes.sortOrder,
      isActive: complianceDocumentTypes.isActive,
      createdAt: complianceDocumentTypes.createdAt,
      updatedAt: complianceDocumentTypes.updatedAt,
      usageCount: sql<number>`CAST(COUNT(${complianceDocuments.id}) AS INTEGER)`,
    })
    .from(complianceDocumentTypes)
    .leftJoin(
      complianceDocuments,
      eq(complianceDocuments.documentType, complianceDocumentTypes.name),
    )
    .groupBy(complianceDocumentTypes.id)
    .orderBy(asc(complianceDocumentTypes.sortOrder), asc(complianceDocumentTypes.name));

  if (options.activeOnly) {
    return query.where(eq(complianceDocumentTypes.isActive, true));
  }
  return query;
}

export async function addComplianceRecord(
  data: NewComplianceDocument,
): Promise<ComplianceDocument> {
  const result = await db.insert(complianceDocuments).values(data).returning();
  if (!result[0]) throw new Error('Failed to create compliance record');
  return result[0];
}

export async function updateComplianceRecord(
  id: string,
  data: Partial<NewComplianceDocument>,
): Promise<ComplianceDocument> {
  const result = await db
    .update(complianceDocuments)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(complianceDocuments.id, id))
    .returning();
  if (!result[0]) throw new Error('Failed to update compliance record');
  return result[0];
}

export async function deleteComplianceRecord(id: string): Promise<void> {
  await db.delete(complianceDocuments).where(eq(complianceDocuments.id, id));
}

export async function getComplianceRecordsByClient(
  clientId: string,
): Promise<ComplianceDocument[]> {
  return db
    .select()
    .from(complianceDocuments)
    .where(eq(complianceDocuments.clientId, clientId))
    .orderBy(asc(complianceDocuments.expiryDate));
}

export async function getAllComplianceRecordsGlobal(): Promise<ComplianceDocument[]> {
  return db.select().from(complianceDocuments).orderBy(asc(complianceDocuments.expiryDate));
}

export async function getUpcomingExpirationsGlobal(): Promise<ComplianceDocument[]> {
  // Return all documents expiring within the next 60 days,
  // as well as any documents that have already expired (so they stay on the admin radar).
  const future = new Date();
  future.setDate(future.getDate() + 60);
  const futureStr = future.toISOString().split('T')[0];

  return db
    .select()
    .from(complianceDocuments)
    .where(lte(complianceDocuments.expiryDate, futureStr as string))
    .orderBy(asc(complianceDocuments.expiryDate));
}

export async function getUpcomingExpirationsForReminders(): Promise<ComplianceDocument[]> {
  const future = new Date();
  future.setDate(future.getDate() + 60);
  const futureStr = future.toISOString().split('T')[0];

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  return db
    .select()
    .from(complianceDocuments)
    .where(
      and(
        gte(complianceDocuments.expiryDate, yesterdayStr as string),
        lte(complianceDocuments.expiryDate, futureStr as string),
      ),
    )
    .orderBy(asc(complianceDocuments.expiryDate));
}
