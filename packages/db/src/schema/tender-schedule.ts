import {
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { clients } from "./clients";
import { divisions } from "./divisions";

// ── Enums ─────────────────────────────────────────────────────────────────────

export const tenderScheduleStatusEnum = pgEnum("tender_schedule_status", [
  "planned",
  "in_progress",
  "completed",
  "submitted",
  "cancelled",
]);

export const tenderSchedulePriorityEnum = pgEnum("tender_schedule_priority", [
  "low",
  "normal",
  "high",
  "urgent",
]);

export const tenderScheduleOutcomeEnum = pgEnum("tender_schedule_outcome", [
  "won",
  "lost",
  "pending",
]);

// ── Main table ────────────────────────────────────────────────────────────────

export const tenderScheduleEntries = pgTable(
  "tender_schedule_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "restrict" }),
    divisionId: uuid("division_id").references(() => divisions.id, {
      onDelete: "restrict",
    }),
    tenderReference: text("tender_reference").notNull(),
    closingDate: date("closing_date").notNull(),
    effortDays: integer("effort_days").notNull(),
    actualEffortDays: integer("actual_effort_days"),
    bufferDays: integer("buffer_days").notNull().default(2),
    startDate: date("start_date").notNull(),
    targetCompletionDate: date("target_completion_date").notNull(),
    actualCompletionDate: date("actual_completion_date"),
    submissionDate: date("submission_date"),
    status: tenderScheduleStatusEnum("status").notNull().default("planned"),
    priority: tenderSchedulePriorityEnum("priority")
      .notNull()
      .default("normal"),
    notes: text("notes"),
    sortOrder: integer("sort_order"),
    blockers: text("blockers"),
    outcome: tenderScheduleOutcomeEnum("outcome"),
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (t) => [
    index("tender_schedule_status_idx").on(t.status),
    index("tender_schedule_closing_date_idx").on(t.closingDate),
    index("tender_schedule_client_id_idx").on(t.clientId),
    index("tender_schedule_division_id_idx").on(t.divisionId),
  ],
);

// ── Types ─────────────────────────────────────────────────────────────────────

export type TenderScheduleEntry = typeof tenderScheduleEntries.$inferSelect;
export type NewTenderScheduleEntry = typeof tenderScheduleEntries.$inferInsert;

// ── Relations ─────────────────────────────────────────────────────────────────

export const tenderScheduleEntriesRelations = relations(
  tenderScheduleEntries,
  ({ one }) => ({
    client: one(clients, {
      fields: [tenderScheduleEntries.clientId],
      references: [clients.id],
    }),
    division: one(divisions, {
      fields: [tenderScheduleEntries.divisionId],
      references: [divisions.id],
    }),
  }),
);
