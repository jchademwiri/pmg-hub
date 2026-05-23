import { db } from '../client';
import { leads, divisions } from '../schema/index';
import { sql, eq, desc, asc, and } from 'drizzle-orm';

export type LeadRow = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  message: string | null;
  source: string | null;
  serviceInterest: string | null;
  status: string;
  divisionId: string | null;
  divisionName: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date | null;
};

/**
 * Returns all lead rows LEFT JOINed to divisions,
 * with optional filters for status, divisionId, and source,
 * sorted by createdAt DESC.
 */
export async function getAllLeads(filters?: {
  status?: string;
  divisionId?: string;
  source?: string;
}): Promise<LeadRow[]> {
  const conditions = [];
  if (filters?.status) {
    conditions.push(eq(leads.status, filters.status as 'new' | 'contacted' | 'converted' | 'lost'));
  }
  if (filters?.divisionId) {
    conditions.push(eq(leads.divisionId, filters.divisionId));
  }
  if (filters?.source) {
    conditions.push(eq(leads.source, filters.source));
  }

  const query = db
    .select({
      id: leads.id,
      name: leads.name,
      email: leads.email,
      phone: leads.phone,
      message: leads.message,
      source: leads.source,
      serviceInterest: leads.serviceInterest,
      status: leads.status,
      divisionId: leads.divisionId,
      divisionName: divisions.name,
      notes: leads.notes,
      createdAt: leads.createdAt,
      updatedAt: leads.updatedAt,
    })
    .from(leads)
    .leftJoin(divisions, eq(leads.divisionId, divisions.id))
    .orderBy(desc(leads.createdAt));

  if (conditions.length > 0) {
    return query.where(and(...conditions));
  }
  return query;
}

/**
 * Returns a single lead row by id (LEFT JOINed to divisions),
 * or null if no row with that id exists.
 */
export async function getLeadById(id: string): Promise<LeadRow | null> {
  const result = await db
    .select({
      id: leads.id,
      name: leads.name,
      email: leads.email,
      phone: leads.phone,
      message: leads.message,
      source: leads.source,
      serviceInterest: leads.serviceInterest,
      status: leads.status,
      divisionId: leads.divisionId,
      divisionName: divisions.name,
      notes: leads.notes,
      createdAt: leads.createdAt,
      updatedAt: leads.updatedAt,
    })
    .from(leads)
    .leftJoin(divisions, eq(leads.divisionId, divisions.id))
    .where(eq(leads.id, id));

  return result[0] ?? null;
}

/**
 * Returns lead counts grouped by status in a single round-trip using
 * conditional aggregation (CASE WHEN).
 */
export async function getLeadCountsByStatus(): Promise<{
  all: number;
  new: number;
  contacted: number;
  converted: number;
  lost: number;
}> {
  const result = await db.execute(sql`
    SELECT
      COUNT(*)                                              AS all,
      COUNT(*) FILTER (WHERE status = 'new')               AS new,
      COUNT(*) FILTER (WHERE status = 'contacted')         AS contacted,
      COUNT(*) FILTER (WHERE status = 'converted')         AS converted,
      COUNT(*) FILTER (WHERE status = 'lost')              AS lost
    FROM leads
  `);
  const row = result.rows[0] as {
    all: string;
    new: string;
    contacted: string;
    converted: string;
    lost: string;
  };
  return {
    all: Number(row.all),
    new: Number(row.new),
    contacted: Number(row.contacted),
    converted: Number(row.converted),
    lost: Number(row.lost),
  };
}

/**
 * Returns distinct non-null source strings from the leads table,
 * sorted alphabetically ascending.
 */
export async function getDistinctLeadSources(): Promise<string[]> {
  const result = await db
    .selectDistinct({ source: leads.source })
    .from(leads)
    .where(sql`${leads.source} IS NOT NULL`)
    .orderBy(asc(leads.source));

  return result.map((r) => r.source as string);
}
