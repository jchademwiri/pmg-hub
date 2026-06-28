import {
  boolean,
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
    bufferDays: integer("buffer_days").notNull().default(5),
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

// ── Progress Sections table ───────────────────────────────────────────────────

export const tenderProgressSections = pgTable(
  "tender_progress_sections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenderId: uuid("tender_id")
      .notNull()
      .references(() => tenderScheduleEntries.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    sortOrder: integer("sort_order").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (t) => [
    index("tender_progress_sections_tender_id_idx").on(t.tenderId),
  ],
);

// ── Progress Items table ──────────────────────────────────────────────────────

export const tenderProgressItems = pgTable(
  "tender_progress_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sectionId: uuid("section_id")
      .notNull()
      .references(() => tenderProgressSections.id, { onDelete: "cascade" }),
    task: text("task").notNull(),
    isCompleted: boolean("is_completed").notNull().default(false),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    sortOrder: integer("sort_order").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (t) => [
    index("tender_progress_items_section_id_idx").on(t.sectionId),
  ],
);

// ── Types ─────────────────────────────────────────────────────────────────────

export type TenderScheduleEntry = typeof tenderScheduleEntries.$inferSelect;
export type NewTenderScheduleEntry = typeof tenderScheduleEntries.$inferInsert;

export type TenderProgressSection = typeof tenderProgressSections.$inferSelect;
export type NewTenderProgressSection = typeof tenderProgressSections.$inferInsert;

export type TenderProgressItem = typeof tenderProgressItems.$inferSelect;
export type NewTenderProgressItem = typeof tenderProgressItems.$inferInsert;

// ── Relations ─────────────────────────────────────────────────────────────────

export const tenderScheduleEntriesRelations = relations(
  tenderScheduleEntries,
  ({ one, many }) => ({
    client: one(clients, {
      fields: [tenderScheduleEntries.clientId],
      references: [clients.id],
    }),
    division: one(divisions, {
      fields: [tenderScheduleEntries.divisionId],
      references: [divisions.id],
    }),
    progressSections: many(tenderProgressSections),
  }),
);

export const tenderProgressSectionsRelations = relations(
  tenderProgressSections,
  ({ one, many }) => ({
    tender: one(tenderScheduleEntries, {
      fields: [tenderProgressSections.tenderId],
      references: [tenderScheduleEntries.id],
    }),
    items: many(tenderProgressItems),
  }),
);

export const tenderProgressItemsRelations = relations(
  tenderProgressItems,
  ({ one }) => ({
    section: one(tenderProgressSections, {
      fields: [tenderProgressItems.sectionId],
      references: [tenderProgressSections.id],
    }),
  }),
);
