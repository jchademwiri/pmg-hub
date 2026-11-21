import {
  check,
  date,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ── Personal Leave Tracker ────────────────────────────────────────────────────

export const leaveTypeEnum = pgEnum('leave_type', ['ANNUAL', 'SICK', 'FAMILY_RESPONSIBILITY']);

export const leaveStatusEnum = pgEnum('leave_status', ['PLANNED', 'TAKEN', 'CANCELLED']);

export type LeaveType = (typeof leaveTypeEnum.enumValues)[number];
export type LeaveStatus = (typeof leaveStatusEnum.enumValues)[number];

/**
 * Single-row baseline configuration for the personal leave tracker.
 * Pre-seeded on first load to the verified 31 October 2026 baseline.
 */
export const leaveSettings = pgTable(
  'leave_settings',
  {
    id: serial('id').primaryKey(),
    employmentStartDate: date('employment_start_date').notNull().default('2022-01-01'),
    anchorDate: date('anchor_date').notNull().default('2026-10-31'),
    annualOpeningBalance: numeric('annual_opening_balance', { precision: 5, scale: 2 })
      .notNull()
      .default('16.50'),
    annualMonthlyAccrual: numeric('annual_monthly_accrual', { precision: 4, scale: 2 })
      .notNull()
      .default('1.75'),
    annualMaxCarryOver: integer('annual_max_carry_over').notNull().default(5),
    sickCycleStartDate: date('sick_cycle_start_date').notNull().default('2025-01-01'),
    sickCycleEntitlement: integer('sick_cycle_entitlement').notNull().default(30),
    sickOpeningBalance: integer('sick_opening_balance').notNull().default(25),
    familyOpeningBalance: integer('family_opening_balance').notNull().default(0),
    familyAnnualEntitlement: integer('family_annual_entitlement').notNull().default(3),
    familyResetMonth: integer('family_reset_month').notNull().default(1),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    check('leave_settings_annual_accrual_non_negative', sql`${t.annualMonthlyAccrual} >= 0`),
    check('leave_settings_carry_over_non_negative', sql`${t.annualMaxCarryOver} >= 0`),
    check('leave_settings_sick_entitlement_positive', sql`${t.sickCycleEntitlement} > 0`),
    check('leave_settings_sick_opening_non_negative', sql`${t.sickOpeningBalance} >= 0`),
    check('leave_settings_family_opening_non_negative', sql`${t.familyOpeningBalance} >= 0`),
    check('leave_settings_family_entitlement_non_negative', sql`${t.familyAnnualEntitlement} >= 0`),
    check(
      'leave_settings_family_reset_month_valid',
      sql`${t.familyResetMonth} >= 1 AND ${t.familyResetMonth} <= 12`,
    ),
  ],
);

export type LeaveSettings = typeof leaveSettings.$inferSelect;
export type NewLeaveSettings = typeof leaveSettings.$inferInsert;

/**
 * Individual leave bookings (future PLANNED or past/current TAKEN).
 * Whole working days only, excluding weekends and South African public holidays.
 */
export const leaveEntries = pgTable(
  'leave_entries',
  {
    id: serial('id').primaryKey(),
    type: leaveTypeEnum('type').notNull(),
    status: leaveStatusEnum('status').notNull().default('PLANNED'),
    startDate: date('start_date').notNull(),
    endDate: date('end_date').notNull(),
    daysCount: integer('days_count').notNull(),
    notes: text('notes'),
    proofKey: text('proof_key'),
    proofFileName: text('proof_file_name'),
    proofMimeType: text('proof_mime_type'),
    proofSizeBytes: integer('proof_size_bytes'),
    proofUploadedAt: timestamp('proof_uploaded_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    check('leave_entries_days_positive', sql`${t.daysCount} >= 1`),
    check('leave_entries_date_order', sql`${t.endDate} >= ${t.startDate}`),
    check(
      'leave_entries_proof_size_positive',
      sql`${t.proofSizeBytes} IS NULL OR ${t.proofSizeBytes} > 0`,
    ),
    index('leave_entries_start_date_idx').on(t.startDate),
    index('leave_entries_type_status_idx').on(t.type, t.status),
  ],
);

export type LeaveEntry = typeof leaveEntries.$inferSelect;
export type NewLeaveEntry = typeof leaveEntries.$inferInsert;
