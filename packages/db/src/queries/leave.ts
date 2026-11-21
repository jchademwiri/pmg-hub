import { asc, desc, eq, ne } from 'drizzle-orm';
import { getDb } from '../client';
import { leaveEntries, leaveSettings, type LeaveEntry, type LeaveSettings } from '../schema/leave';

export const DEFAULT_LEAVE_SETTINGS = {
  employmentStartDate: '2022-01-01',
  anchorDate: '2026-10-31',
  annualOpeningBalance: '16.50',
  annualMonthlyAccrual: '1.75',
  annualMaxCarryOver: 5,
  sickCycleStartDate: '2025-01-01',
  sickCycleEntitlement: 30,
  sickOpeningBalance: 25,
  familyOpeningBalance: 0,
  familyAnnualEntitlement: 3,
  familyResetMonth: 1,
} as const;

/**
 * Returns the single leave_settings row, seeding it with the October 31, 2026
 * baseline if the table is empty. Safe under concurrent first requests.
 */
export async function getOrSeedLeaveSettings(): Promise<LeaveSettings> {
  const db = getDb();
  const [existing] = await db.select().from(leaveSettings).orderBy(asc(leaveSettings.id)).limit(1);

  if (existing) return existing;

  await db
    .insert(leaveSettings)
    .values({
      id: 1,
      ...DEFAULT_LEAVE_SETTINGS,
    })
    .onConflictDoNothing({ target: leaveSettings.id });

  const [seeded] = await db.select().from(leaveSettings).orderBy(asc(leaveSettings.id)).limit(1);

  if (!seeded) {
    throw new Error('Failed to initialize leave_settings');
  }

  return seeded;
}

/**
 * Returns all active (non-cancelled) leave entries sorted newest first by start_date.
 */
export async function getAllLeaveEntries(): Promise<LeaveEntry[]> {
  const db = getDb();
  return db
    .select()
    .from(leaveEntries)
    .where(ne(leaveEntries.status, 'CANCELLED'))
    .orderBy(desc(leaveEntries.startDate), desc(leaveEntries.createdAt));
}

export async function getLeaveEntryById(id: number): Promise<LeaveEntry | undefined> {
  const db = getDb();
  const [row] = await db.select().from(leaveEntries).where(eq(leaveEntries.id, id)).limit(1);
  return row;
}
