import { db } from '../client';
import { complianceDocuments } from '../schema/compliance';
import { eq, and, asc, lte, gte } from 'drizzle-orm';
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';

export type ComplianceDocument = InferSelectModel<typeof complianceDocuments>;
export type NewComplianceDocument = InferInsertModel<typeof complianceDocuments>;

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

export async function getComplianceRecordsByClient(clientId: string): Promise<ComplianceDocument[]> {
  return db
    .select()
    .from(complianceDocuments)
    .where(eq(complianceDocuments.clientId, clientId))
    .orderBy(asc(complianceDocuments.expiryDate));
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
