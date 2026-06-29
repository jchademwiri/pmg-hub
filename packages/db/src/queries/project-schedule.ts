import { db } from '../client';
import { projectScheduleEntries, projectProgressSections, projectProgressItems } from '../schema/project-schedule';
import type { ProjectScheduleEntry, NewProjectScheduleEntry, ProjectProgressSection, ProjectProgressItem } from '../schema/project-schedule';
import { eq, asc, and, or, sql } from 'drizzle-orm';
import { addDays, today as getToday } from '../lib/date-utils';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ProjectFilterOptions {
  status?: string[];
  priority?: string[];
  clientId?: string;
  divisionId?: string;
}

export interface CurrentWorkload {
  inProgress: ProjectScheduleEntry | null;
  planned: ProjectScheduleEntry[];
}

export interface ProjectScheduleSummary {
  inProgress: number;
  planned: number;
  upcomingDeadlines: number;
  atRisk: number;
  overdue: number;
}

export interface OverlapWarning {
  tenderA: ProjectScheduleEntry;
  tenderB: ProjectScheduleEntry;
  overlapDays: number;
}

export interface ProjectWaterfallUpdate {
  id: string;
  sortOrder: number;
  startDate: string;
  targetCompletionDate: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const PRIORITY_ORDER = sql`CASE ${projectScheduleEntries.priority}
  WHEN 'urgent' THEN 0
  ELSE 1
END`;

// Custom sort_order takes priority; nulls fall back to default sort
const SORT_ORDER = sql`${projectScheduleEntries.sortOrder}`;

function compareWaterfallEntries(a: ProjectScheduleEntry, b: ProjectScheduleEntry): number {
  const urgentA = a.priority === 'urgent' ? 0 : 1;
  const urgentB = b.priority === 'urgent' ? 0 : 1;
  if (urgentA !== urgentB) return urgentA - urgentB;

  const closing = a.closingDate.localeCompare(b.closingDate);
  if (closing !== 0) return closing;

  const createdA = a.createdAt?.getTime?.() ?? 0;
  const createdB = b.createdAt?.getTime?.() ?? 0;
  if (createdA !== createdB) return createdA - createdB;

  return a.id.localeCompare(b.id);
}

export function calculateProjectWaterfallUpdates(
  entries: ProjectScheduleEntry[],
): ProjectWaterfallUpdate[] {
  // in_progress entry keeps its actual startDate (it has already started).
  // planned entries chain sequentially: each starts the day after the previous
  // entry's targetCompletionDate. The first planned entry anchors to today.
  // bufferDays is a warning threshold only — it does NOT affect scheduling.
  const inProgress = entries
    .filter((entry) => entry.status === 'in_progress')
    .sort(compareWaterfallEntries);
  const planned = entries
    .filter((entry) => entry.status === 'planned')
    .sort(compareWaterfallEntries);
  const ordered = [...inProgress, ...planned];

  // cursor = targetCompletionDate of the last processed entry.
  // null = nothing scheduled yet; next planned entry starts today.
  let cursor: string | null = null;

  return ordered.map((entry, index) => {
    let startDate: string;

    if (entry.status === 'in_progress') {
      // Already started — preserve the real start date
      startDate = entry.startDate;
    } else if (cursor === null) {
      // First planned entry: start today (no backdate, no float)
      startDate = getToday();
    } else {
      // Each subsequent planned entry starts the day after the previous ends
      startDate = addDays(cursor, 1);
    }

    const targetCompletionDate = addDays(startDate, entry.effortDays);
    cursor = targetCompletionDate;

    return {
      id: entry.id,
      sortOrder: index + 1,
      startDate,
      targetCompletionDate,
    };
  });
}

// ── Reorder ───────────────────────────────────────────────────────────────────

export async function reorderProjectQueue(orderedIds: string[]): Promise<void> {
  const dbInstance = db;
  for (let i = 0; i < orderedIds.length; i++) {
    const id = orderedIds[i];
    if (!id) continue;
    await dbInstance
      .update(projectScheduleEntries)
      .set({ sortOrder: i + 1, updatedAt: new Date() })
      .where(eq(projectScheduleEntries.id, id));
  }
}

export async function recalculateProjectWaterfall(): Promise<void> {
  const active = await db
    .select()
    .from(projectScheduleEntries)
    .where(sql`${projectScheduleEntries.status}::text = ANY(ARRAY['planned', 'in_progress'])`);

  const updates = calculateProjectWaterfallUpdates(active);
  const activeById = new Map(active.map((entry) => [entry.id, entry]));

  for (const update of updates) {
    const entry = activeById.get(update.id);
    if (!entry) continue;
    if (
      entry.sortOrder === update.sortOrder &&
      entry.startDate === update.startDate &&
      entry.targetCompletionDate === update.targetCompletionDate
    ) {
      continue;
    }

    await db
      .update(projectScheduleEntries)
      .set({
        sortOrder: update.sortOrder,
        startDate: update.startDate,
        targetCompletionDate: update.targetCompletionDate,
        updatedAt: new Date(),
      })
      .where(eq(projectScheduleEntries.id, update.id));
  }
}

// ── Basic CRUD ────────────────────────────────────────────────────────────────

export async function getAllProjectScheduleEntries(
  filters?: ProjectFilterOptions,
): Promise<ProjectScheduleEntry[]> {
  const conditions = [];

  if (filters?.status?.length) {
    conditions.push(
      sql`${projectScheduleEntries.status}::text = ANY(ARRAY[${sql.join(
        filters.status.map((s) => sql`${s}`),
        sql`, `,
      )}])`,
    );
  }
  if (filters?.priority?.length) {
    conditions.push(
      sql`${projectScheduleEntries.priority}::text = ANY(ARRAY[${sql.join(
        filters.priority.map((p) => sql`${p}`),
        sql`, `,
      )}])`,
    );
  }
  if (filters?.clientId) {
    conditions.push(eq(projectScheduleEntries.clientId, filters.clientId));
  }
  if (filters?.divisionId) {
    conditions.push(eq(projectScheduleEntries.divisionId, filters.divisionId));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  return db
    .select()
    .from(projectScheduleEntries)
    .where(where)
    .orderBy(
      asc(SORT_ORDER),
      asc(PRIORITY_ORDER),
      asc(projectScheduleEntries.closingDate),
      asc(projectScheduleEntries.createdAt),
    );
}

export async function getActiveProjectScheduleEntries(): Promise<ProjectScheduleEntry[]> {
  return db
    .select()
    .from(projectScheduleEntries)
    .where(
      sql`${projectScheduleEntries.status}::text = ANY(ARRAY['planned', 'in_progress', 'completed'])`,
    )
    .orderBy(
      asc(SORT_ORDER),
      asc(PRIORITY_ORDER),
      asc(projectScheduleEntries.closingDate),
      asc(projectScheduleEntries.createdAt),
    );
}

export async function getProjectScheduleEntryById(id: string): Promise<ProjectScheduleEntry | null> {
  const result = await db
    .select()
    .from(projectScheduleEntries)
    .where(eq(projectScheduleEntries.id, id))
    .limit(1);
  return result[0] ?? null;
}

export async function createProjectScheduleEntry(
  data: NewProjectScheduleEntry,
): Promise<ProjectScheduleEntry> {
  const result = await db.insert(projectScheduleEntries).values(data).returning();
  const created = result[0];
  if (!created) {
    throw new Error('Failed to create tender schedule entry.');
  }
  return created;
}

export async function updateProjectScheduleEntry(
  id: string,
  data: Partial<NewProjectScheduleEntry>,
): Promise<ProjectScheduleEntry | null> {
  const result = await db
    .update(projectScheduleEntries)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(projectScheduleEntries.id, id))
    .returning();
  return result[0] ?? null;
}

export async function cancelProjectScheduleEntry(id: string): Promise<ProjectScheduleEntry | null> {
  const result = await db
    .update(projectScheduleEntries)
    .set({ status: 'cancelled', updatedAt: new Date() })
    .where(eq(projectScheduleEntries.id, id))
    .returning();
  return result[0] ?? null;
}

export async function transitionProjectStatus(
  id: string,
  newStatus: ProjectScheduleEntry['status'],
): Promise<ProjectScheduleEntry | null> {
  const now = new Date();
  const updates: Partial<NewProjectScheduleEntry> = {
    status: newStatus,
    updatedAt: now,
  };

  // Auto-set timestamp fields on specific transitions
  if (newStatus === 'in_progress') {
    updates.startDate = now.toISOString().split('T')[0];
  }
  if (newStatus === 'completed') {
    updates.actualCompletionDate = now.toISOString().split('T')[0];
  }
  if (newStatus === 'submitted') {
    updates.submissionDate = now.toISOString().split('T')[0];
  }

  const result = await db
    .update(projectScheduleEntries)
    .set(updates)
    .where(eq(projectScheduleEntries.id, id))
    .returning();
  return result[0] ?? null;
}

// ── Workload queries ──────────────────────────────────────────────────────────

export async function getCurrentWorkload(): Promise<CurrentWorkload> {
  const entries = await db
    .select()
    .from(projectScheduleEntries)
    .where(sql`${projectScheduleEntries.status}::text = ANY(ARRAY['planned', 'in_progress'])`)
    .orderBy(
      asc(SORT_ORDER),
      asc(PRIORITY_ORDER),
      asc(projectScheduleEntries.closingDate),
      asc(projectScheduleEntries.createdAt),
    );

  return {
    inProgress: entries.find((e) => e.status === 'in_progress') ?? null,
    planned: entries.filter((e) => e.status === 'planned'),
  };
}

export async function getProjectsAtRisk(): Promise<ProjectScheduleEntry[]> {
  const today = new Date().toISOString().split('T')[0];
  return db
    .select()
    .from(projectScheduleEntries)
    .where(
      and(
        sql`${projectScheduleEntries.status}::text = ANY(ARRAY['planned', 'in_progress'])`,
        or(
          // Start overdue: today > start_date and still planned
          and(
            eq(projectScheduleEntries.status, 'planned'),
            sql`${projectScheduleEntries.startDate} < ${today}`,
          ),
          // Past target completion
          sql`${projectScheduleEntries.targetCompletionDate} < ${today}`,
          // Tight buffer: scheduled target does not leave the tender's configured buffer.
          sql`${projectScheduleEntries.targetCompletionDate} > ${projectScheduleEntries.closingDate} - (${projectScheduleEntries.bufferDays} * INTERVAL '1 day')`,
        ),
      ),
    )
    .orderBy(
      asc(PRIORITY_ORDER),
      asc(projectScheduleEntries.closingDate),
      asc(projectScheduleEntries.createdAt),
    );
}

export async function getOverlappingProjects(
  startDate: string,
  endDate: string,
): Promise<ProjectScheduleEntry[]> {
  return db
    .select()
    .from(projectScheduleEntries)
    .where(
      and(
        sql`${projectScheduleEntries.status}::text = ANY(ARRAY['planned', 'in_progress'])`,
        // Date range overlap: A.start <= B.end AND B.start <= A.end
        sql`${projectScheduleEntries.startDate} <= ${endDate}`,
        sql`${startDate} <= ${projectScheduleEntries.targetCompletionDate}`,
      ),
    )
    .orderBy(
      asc(PRIORITY_ORDER),
      asc(projectScheduleEntries.closingDate),
      asc(projectScheduleEntries.createdAt),
    );
}

export async function detectOverlaps(): Promise<OverlapWarning[]> {
  const active = await db
    .select()
    .from(projectScheduleEntries)
    .where(sql`${projectScheduleEntries.status}::text = ANY(ARRAY['planned', 'in_progress'])`)
    .orderBy(asc(projectScheduleEntries.startDate));

  const warnings: OverlapWarning[] = [];

  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const a = active[i]!;
      const b = active[j]!;

      // In the waterfall chain each planned entry starts the day AFTER the
      // previous entry's targetCompletionDate (startDate = targetCompletion + 1).
      // Use strict inequality so that back-to-back sequential entries — where
      // B.startDate = A.targetCompletionDate + 1 day — are NOT flagged.
      // Real overlaps only exist when B starts ON or BEFORE A ends.
      if (a.startDate < b.targetCompletionDate && b.startDate < a.targetCompletionDate) {
        const overlapStart = a.startDate > b.startDate ? a.startDate : b.startDate;
        const overlapEnd =
          a.targetCompletionDate < b.targetCompletionDate
            ? a.targetCompletionDate
            : b.targetCompletionDate;
        const overlapMs = new Date(overlapEnd).getTime() - new Date(overlapStart).getTime();
        // Only report if the overlap is at least 1 full day (86400000 ms)
        const overlapDays = Math.ceil(overlapMs / (1000 * 60 * 60 * 24));
        if (overlapDays > 0) {
          warnings.push({ tenderA: a, tenderB: b, overlapDays });
        }
      }
    }
  }

  return warnings;
}

// ── Summary ───────────────────────────────────────────────────────────────────

export async function getProjectScheduleSummary(): Promise<ProjectScheduleSummary> {
  const all = await db
    .select()
    .from(projectScheduleEntries)
    .where(
      sql`${projectScheduleEntries.status}::text = ANY(ARRAY['planned', 'in_progress', 'completed'])`,
    );

  const today = new Date().toISOString().slice(0, 10);

  const inProgress = all.filter((e) => e.status === 'in_progress').length;
  const planned = all.filter((e) => e.status === 'planned').length;
  const upcomingDeadlines = all.filter(
    (e) =>
      e.status !== 'completed' &&
      e.closingDate >= today &&
      new Date(e.closingDate).getTime() - new Date(today).getTime() <= 7 * 24 * 60 * 60 * 1000, // within 7 days
  ).length;
  const atRisk = all.filter(
    (e) => (e.status === 'planned' || e.status === 'in_progress') && e.targetCompletionDate < today,
  ).length;
  const overdue = all.filter(
    (e) => e.status !== 'submitted' && e.status !== 'completed' && e.closingDate < today,
  ).length;

  return { inProgress, planned, upcomingDeadlines, atRisk, overdue };
}

// ── Checklist Queries ─────────────────────────────────────────────────────────

export interface ProgressItemWithCompleted extends ProjectProgressItem {}

export interface ProgressSectionWithItems extends ProjectProgressSection {
  items: ProgressItemWithCompleted[];
}

export async function getProjectChecklist(projectId: string): Promise<ProgressSectionWithItems[]> {
  const sections = await db
    .select()
    .from(projectProgressSections)
    .where(eq(projectProgressSections.projectId, projectId))
    .orderBy(asc(projectProgressSections.sortOrder));

  const sectionIds = sections.map((s) => s.id);
  if (sectionIds.length === 0) return [];

  const items = await db
    .select()
    .from(projectProgressItems)
    .where(
      sql`${projectProgressItems.sectionId}::text = ANY(ARRAY[${sql.join(
        sectionIds.map((id) => sql`${id}`),
        sql`, `,
      )}])`,
    )
    .orderBy(asc(projectProgressItems.sortOrder));

  return sections.map((section) => ({
    ...section,
    items: items.filter((item) => item.sectionId === section.id),
  }));
}

export async function getProjectsProgressMap(
  projectIds: string[],
): Promise<Map<string, { total: number; completed: number }>> {
  const map = new Map<string, { total: number; completed: number }>();
  if (projectIds.length === 0) return map;

  // Initialize map with 0s for all requested IDs
  for (const id of projectIds) {
    map.set(id, { total: 0, completed: 0 });
  }

  const results = await db
    .select({
      projectId: projectProgressSections.projectId,
      total: sql<number>`count(${projectProgressItems.id})::int`,
      completed: sql<number>`count(case when ${projectProgressItems.isCompleted} then 1 end)::int`,
    })
    .from(projectProgressSections)
    .innerJoin(projectProgressItems, eq(projectProgressItems.sectionId, projectProgressSections.id))
    .where(
      sql`${projectProgressSections.projectId}::text = ANY(ARRAY[${sql.join(
        projectIds.map((id) => sql`${id}`),
        sql`, `,
      )}])`,
    )
    .groupBy(projectProgressSections.projectId);

  for (const r of results) {
    if (r.projectId) {
      map.set(r.projectId, { total: r.total, completed: r.completed });
    }
  }

  return map;
}

