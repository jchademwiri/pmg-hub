import { db } from "../client";
import { tenderScheduleEntries } from "../schema/tender-schedule";
import type { TenderScheduleEntry, NewTenderScheduleEntry } from "../schema/tender-schedule";
import { eq, asc, desc, and, or, sql } from "drizzle-orm";
import { addDays } from "../lib/date-utils";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TenderFilterOptions {
  status?: string[];
  priority?: string[];
  clientId?: string;
  divisionId?: string;
}

export interface CurrentWorkload {
  inProgress: TenderScheduleEntry | null;
  planned: TenderScheduleEntry[];
}

export interface TenderScheduleSummary {
  inProgress: number;
  planned: number;
  upcomingDeadlines: number;
  atRisk: number;
  overdue: number;
}

export interface OverlapWarning {
  tenderA: TenderScheduleEntry;
  tenderB: TenderScheduleEntry;
  overlapDays: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const PRIORITY_ORDER = sql`CASE ${tenderScheduleEntries.priority}
  WHEN 'urgent' THEN 0
  WHEN 'high' THEN 1
  WHEN 'normal' THEN 2
  WHEN 'low' THEN 3
END`;

// Custom sort_order takes priority; nulls fall back to default sort
const SORT_ORDER = sql`${tenderScheduleEntries.sortOrder}`;

const ACTIVE_STATUSES: string[] = ["planned", "in_progress"];

// ── Reorder ───────────────────────────────────────────────────────────────────

export async function reorderTenderQueue(
  orderedIds: string[],
): Promise<void> {
  const dbInstance = db;
  for (let i = 0; i < orderedIds.length; i++) {
    await dbInstance
      .update(tenderScheduleEntries)
      .set({ sortOrder: i + 1, updatedAt: new Date() })
      .where(eq(tenderScheduleEntries.id, orderedIds[i]));
  }
}

// ── Basic CRUD ────────────────────────────────────────────────────────────────

export async function getAllTenderScheduleEntries(
  filters?: TenderFilterOptions,
): Promise<TenderScheduleEntry[]> {
  const conditions = [];

  if (filters?.status?.length) {
    conditions.push(
      sql`${tenderScheduleEntries.status}::text = ANY(ARRAY[${sql.join(
        filters.status.map((s) => sql`${s}`),
        sql`, `,
      )}])`,
    );
  }
  if (filters?.priority?.length) {
    conditions.push(
      sql`${tenderScheduleEntries.priority}::text = ANY(ARRAY[${sql.join(
        filters.priority.map((p) => sql`${p}`),
        sql`, `,
      )}])`,
    );
  }
  if (filters?.clientId) {
    conditions.push(eq(tenderScheduleEntries.clientId, filters.clientId));
  }
  if (filters?.divisionId) {
    conditions.push(eq(tenderScheduleEntries.divisionId, filters.divisionId));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  return db
    .select()
    .from(tenderScheduleEntries)
    .where(where)
    .orderBy(
      asc(SORT_ORDER),
      asc(PRIORITY_ORDER),
      asc(tenderScheduleEntries.closingDate),
    );
}

export async function getActiveTenderScheduleEntries(): Promise<
  TenderScheduleEntry[]
> {
  return db
    .select()
    .from(tenderScheduleEntries)
    .where(
      sql`${tenderScheduleEntries.status}::text = ANY(ARRAY['planned', 'in_progress', 'completed'])`,
    )
    .orderBy(
      asc(SORT_ORDER),
      asc(PRIORITY_ORDER),
      asc(tenderScheduleEntries.closingDate),
    );
}

export async function getTenderScheduleEntryById(
  id: string,
): Promise<TenderScheduleEntry | null> {
  const result = await db
    .select()
    .from(tenderScheduleEntries)
    .where(eq(tenderScheduleEntries.id, id))
    .limit(1);
  return result[0] ?? null;
}

export async function createTenderScheduleEntry(
  data: NewTenderScheduleEntry,
): Promise<TenderScheduleEntry> {
  const result = await db
    .insert(tenderScheduleEntries)
    .values(data)
    .returning();
  return result[0];
}

export async function updateTenderScheduleEntry(
  id: string,
  data: Partial<NewTenderScheduleEntry>,
): Promise<TenderScheduleEntry | null> {
  const result = await db
    .update(tenderScheduleEntries)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(tenderScheduleEntries.id, id))
    .returning();
  return result[0] ?? null;
}

export async function cancelTenderScheduleEntry(
  id: string,
): Promise<TenderScheduleEntry | null> {
  const result = await db
    .update(tenderScheduleEntries)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(eq(tenderScheduleEntries.id, id))
    .returning();
  return result[0] ?? null;
}

export async function transitionTenderStatus(
  id: string,
  newStatus: TenderScheduleEntry["status"],
): Promise<TenderScheduleEntry | null> {
  const now = new Date();
  const updates: Partial<NewTenderScheduleEntry> = {
    status: newStatus,
    updatedAt: now,
  };

  // Auto-set timestamp fields on specific transitions
  if (newStatus === "in_progress") {
    updates.startDate = now.toISOString().split("T")[0];
  }
  if (newStatus === "completed") {
    updates.actualCompletionDate = now.toISOString().split("T")[0];
  }
  if (newStatus === "submitted") {
    updates.submissionDate = now.toISOString().split("T")[0];
  }

  const result = await db
    .update(tenderScheduleEntries)
    .set(updates)
    .where(eq(tenderScheduleEntries.id, id))
    .returning();
  return result[0] ?? null;
}

// ── Workload queries ──────────────────────────────────────────────────────────

export async function getCurrentWorkload(): Promise<CurrentWorkload> {
  const entries = await db
    .select()
    .from(tenderScheduleEntries)
    .where(
      sql`${tenderScheduleEntries.status}::text = ANY(ARRAY['planned', 'in_progress'])`,
    )
    .orderBy(
      asc(SORT_ORDER),
      asc(PRIORITY_ORDER),
      asc(tenderScheduleEntries.closingDate),
    );

  return {
    inProgress: entries.find((e) => e.status === "in_progress") ?? null,
    planned: entries.filter((e) => e.status === "planned"),
  };
}

export async function getTendersAtRisk(): Promise<TenderScheduleEntry[]> {
  const today = new Date().toISOString().split("T")[0];
  return db
    .select()
    .from(tenderScheduleEntries)
    .where(
      and(
        sql`${tenderScheduleEntries.status}::text = ANY(ARRAY['planned', 'in_progress'])`,
        or(
          // Start overdue: today > start_date and still planned
          and(
            eq(tenderScheduleEntries.status, "planned"),
            sql`${tenderScheduleEntries.startDate} < ${today}`,
          ),
          // Past target completion
          sql`${tenderScheduleEntries.targetCompletionDate} < ${today}`,
          // Tight buffer: target completion within 2 days of closing
          sql`${tenderScheduleEntries.targetCompletionDate} >= ${tenderScheduleEntries.closingDate} - INTERVAL '2 days'`,
        ),
      ),
    )
    .orderBy(
      asc(PRIORITY_ORDER),
      asc(tenderScheduleEntries.closingDate),
    );
}

export async function getOverlappingTenders(
  startDate: string,
  endDate: string,
): Promise<TenderScheduleEntry[]> {
  return db
    .select()
    .from(tenderScheduleEntries)
    .where(
      and(
        sql`${tenderScheduleEntries.status}::text = ANY(ARRAY['planned', 'in_progress'])`,
        // Date range overlap: A.start <= B.end AND B.start <= A.end
        sql`${tenderScheduleEntries.startDate} <= ${endDate}`,
        sql`${startDate} <= ${tenderScheduleEntries.targetCompletionDate}`,
      ),
    )
    .orderBy(
      asc(PRIORITY_ORDER),
      asc(tenderScheduleEntries.closingDate),
    );
}

export async function detectOverlaps(): Promise<OverlapWarning[]> {
  const active = await db
    .select()
    .from(tenderScheduleEntries)
    .where(
      sql`${tenderScheduleEntries.status}::text = ANY(ARRAY['planned', 'in_progress'])`,
    )
    .orderBy(asc(tenderScheduleEntries.startDate));

  const warnings: OverlapWarning[] = [];

  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const a = active[i];
      const b = active[j];

      // Check overlap: A.start <= B.target AND B.start <= A.target
      if (a.startDate <= b.targetCompletionDate && b.startDate <= a.targetCompletionDate) {
        // Calculate overlap days
        const overlapStart =
          a.startDate > b.startDate ? a.startDate : b.startDate;
        const overlapEnd =
          a.targetCompletionDate < b.targetCompletionDate
            ? a.targetCompletionDate
            : b.targetCompletionDate;
        const overlapMs =
          new Date(overlapEnd).getTime() - new Date(overlapStart).getTime();
        const overlapDays = Math.max(1, Math.ceil(overlapMs / (1000 * 60 * 60 * 24)));

        warnings.push({ tenderA: a, tenderB: b, overlapDays });
      }
    }
  }

  return warnings;
}

// ── Summary ───────────────────────────────────────────────────────────────────

export async function getTenderScheduleSummary(): Promise<TenderScheduleSummary> {
  const all = await db
    .select()
    .from(tenderScheduleEntries)
    .where(
      sql`${tenderScheduleEntries.status}::text = ANY(ARRAY['planned', 'in_progress', 'completed'])`,
    );

  const today = new Date().toISOString().split("T")[0];

  const inProgress = all.filter((e) => e.status === "in_progress").length;
  const planned = all.filter((e) => e.status === "planned").length;
  const upcomingDeadlines = all.filter(
    (e) =>
      e.status !== "completed" &&
      e.closingDate >= today &&
      new Date(e.closingDate).getTime() - new Date(today).getTime() <=
        7 * 24 * 60 * 60 * 1000, // within 7 days
  ).length;
  const atRisk = all.filter(
    (e) =>
      (e.status === "planned" || e.status === "in_progress") &&
      e.targetCompletionDate < today,
  ).length;
  const overdue = all.filter(
    (e) =>
      e.status !== "submitted" &&
      e.status !== "completed" &&
      e.closingDate < today,
  ).length;

  return { inProgress, planned, upcomingDeadlines, atRisk, overdue };
}
