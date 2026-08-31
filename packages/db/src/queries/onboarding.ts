import { db } from '../client';
import { clientOnboardings, divisions, leads, clients } from '../schema/index';
import { sql, eq, desc, and } from 'drizzle-orm';

export type OnboardingRow = {
  id: string;
  divisionId: string | null;
  divisionName: string | null;
  leadId: string | null;
  contactName: string;
  companyName: string;
  email: string;
  phone: string;
  registrationNumber: string | null;
  notes: string | null;
  status: 'pending' | 'converted' | 'rejected' | 'archived';
  convertedClientId: string | null;
  convertedClientName: string | null;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date | null;
};

/**
 * Returns all client onboarding rows LEFT JOINed to divisions and converted clients,
 * with optional filters for status and divisionId, sorted by createdAt DESC.
 */
export async function getAllOnboardings(filters?: {
  status?: string;
  divisionId?: string;
}): Promise<OnboardingRow[]> {
  const conditions = [];
  if (filters?.status && filters.status !== 'all') {
    conditions.push(
      eq(
        clientOnboardings.status,
        filters.status as 'pending' | 'converted' | 'rejected' | 'archived',
      ),
    );
  }
  if (filters?.divisionId) {
    conditions.push(eq(clientOnboardings.divisionId, filters.divisionId));
  }

  const query = db
    .select({
      id: clientOnboardings.id,
      divisionId: clientOnboardings.divisionId,
      divisionName: divisions.name,
      leadId: clientOnboardings.leadId,
      contactName: clientOnboardings.contactName,
      companyName: clientOnboardings.companyName,
      email: clientOnboardings.email,
      phone: clientOnboardings.phone,
      registrationNumber: clientOnboardings.registrationNumber,
      notes: clientOnboardings.notes,
      status: clientOnboardings.status,
      convertedClientId: clientOnboardings.convertedClientId,
      convertedClientName: clients.name,
      reviewedBy: clientOnboardings.reviewedBy,
      reviewedAt: clientOnboardings.reviewedAt,
      createdAt: clientOnboardings.createdAt,
      updatedAt: clientOnboardings.updatedAt,
    })
    .from(clientOnboardings)
    .leftJoin(divisions, eq(clientOnboardings.divisionId, divisions.id))
    .leftJoin(clients, eq(clientOnboardings.convertedClientId, clients.id))
    .orderBy(desc(clientOnboardings.createdAt));

  if (conditions.length > 0) {
    return query.where(and(...conditions));
  }
  return query;
}

/**
 * Returns a single onboarding row by id (LEFT JOINed to divisions and clients),
 * or null if no row with that id exists.
 */
export async function getOnboardingById(id: string): Promise<OnboardingRow | null> {
  const result = await db
    .select({
      id: clientOnboardings.id,
      divisionId: clientOnboardings.divisionId,
      divisionName: divisions.name,
      leadId: clientOnboardings.leadId,
      contactName: clientOnboardings.contactName,
      companyName: clientOnboardings.companyName,
      email: clientOnboardings.email,
      phone: clientOnboardings.phone,
      registrationNumber: clientOnboardings.registrationNumber,
      notes: clientOnboardings.notes,
      status: clientOnboardings.status,
      convertedClientId: clientOnboardings.convertedClientId,
      convertedClientName: clients.name,
      reviewedBy: clientOnboardings.reviewedBy,
      reviewedAt: clientOnboardings.reviewedAt,
      createdAt: clientOnboardings.createdAt,
      updatedAt: clientOnboardings.updatedAt,
    })
    .from(clientOnboardings)
    .leftJoin(divisions, eq(clientOnboardings.divisionId, divisions.id))
    .leftJoin(clients, eq(clientOnboardings.convertedClientId, clients.id))
    .where(eq(clientOnboardings.id, id));

  return result[0] ?? null;
}

/**
 * Returns onboarding counts grouped by status in a single round-trip.
 */
export async function getOnboardingCountsByStatus(): Promise<{
  all: number;
  pending: number;
  converted: number;
  rejected: number;
  archived: number;
}> {
  const result = await db.execute(sql`
    SELECT
      COUNT(*)                                              AS "all",
      COUNT(*) FILTER (WHERE status = 'pending')           AS pending,
      COUNT(*) FILTER (WHERE status = 'converted')         AS converted,
      COUNT(*) FILTER (WHERE status = 'rejected')          AS rejected,
      COUNT(*) FILTER (WHERE status = 'archived')          AS archived
    FROM client_onboardings
  `);
  const row = (result.rows?.[0] || {}) as Record<string, string | number>;
  return {
    all: Number(row.all || 0),
    pending: Number(row.pending || 0),
    converted: Number(row.converted || 0),
    rejected: Number(row.rejected || 0),
    archived: Number(row.archived || 0),
  };
}
