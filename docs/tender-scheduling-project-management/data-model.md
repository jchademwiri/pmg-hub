# Data Model — Tender Scheduling

## Overview

The tender scheduling feature requires a single new database table (`tender_schedule_entries`) that captures the scheduling metadata for each tender opportunity. It references existing tables (`clients`, `divisions`) for relationship context but keeps the scheduling logic self-contained in one table.

## Recommended Table: `tender_schedule_entries`

### Column Definitions

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` | Primary key |
| `client_id` | `uuid` | FK → `clients.id` (nullable) | Optional link to an existing client in PMG Hub |
| `client_name` | `text` | Not null | Redundant denormalised client name (useful even when client_id is null for one-off tenders) |
| `division_id` | `uuid` | FK → `divisions.id` (nullable) | Which PMG division this tender belongs to (defaults to TES) |
| `tender_reference` | `text` | Not null | Tender number, description, or reference (e.g. "T12/2026") |
| `closing_date` | `date` | Not null | Hard deadline — tender must be submitted by this date |
| `effort_days` | `integer` | Not null, > 0 | Estimated number of working days required to complete preparation |
| `buffer_days` | `integer` | Not null, default 2 | Safety buffer between target completion and closing date |
| `start_date` | `date` | Not null | Planned or actual start date |
| `target_completion_date` | `date` | Not null | Planned completion date (before closing date) |
| `actual_completion_date` | `date` | Nullable | When preparation was actually completed |
| `submission_date` | `date` | Nullable | When the tender was actually submitted |
| `status` | `text` | Not null, default `'planned'` | Current status (see status enum below) |
| `priority` | `text` | default `'normal'` | Priority: `'low'`, `'normal'`, `'high'`, `'urgent'` |
| `notes` | `text` | Nullable | Free-text notes, blockers, or observations |
| `created_by` | `text` | Not null | Session user ID (matches Better Auth user table pattern) |
| `created_at` | `timestamp with tz` | default `now()` | Record creation timestamp |
| `updated_at` | `timestamp with tz` | Nullable | Last update timestamp (application-managed) |

### TypeScript Types (Drizzle ORM)

```typescript
// Following existing patterns in packages/db/src/schema/

export const tenderScheduleEntryStatusEnum = pgEnum("tender_schedule_entry_status", [
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

export const tenderScheduleEntries = pgTable(
  "tender_schedule_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id").references(() => clients.id, { onDelete: "set null" }),
    clientName: text("client_name").notNull(),
    divisionId: uuid("division_id").references(() => divisions.id, { onDelete: "restrict" }),
    tenderReference: text("tender_reference").notNull(),
    closingDate: date("closing_date").notNull(),
    effortDays: integer("effort_days").notNull(),
    bufferDays: integer("buffer_days").notNull().default(2),
    startDate: date("start_date").notNull(),
    targetCompletionDate: date("target_completion_date").notNull(),
    actualCompletionDate: date("actual_completion_date"),
    submissionDate: date("submission_date"),
    status: tenderScheduleEntryStatusEnum("status").notNull().default("planned"),
    priority: tenderSchedulePriorityEnum("priority").notNull().default("normal"),
    notes: text("notes"),
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (t) => [
    index("tender_schedule_status_idx").on(t.status),
    index("tender_schedule_closing_date_idx").on(t.closingDate),
    index("tender_schedule_client_id_idx").on(t.clientId),
    index("tender_schedule_division_id_idx").on(t.divisionId),
  ],
);
```

### Exported Types

```typescript
export type TenderScheduleEntry = typeof tenderScheduleEntries.$inferSelect;
export type NewTenderScheduleEntry = typeof tenderScheduleEntries.$inferInsert;
```

### Relations

```typescript
export const tenderScheduleEntriesRelations = relations(tenderScheduleEntries, ({ one }) => ({
  client: one(clients, {
    fields: [tenderScheduleEntries.clientId],
    references: [clients.id],
  }),
  division: one(divisions, {
    fields: [tenderScheduleEntries.divisionId],
    references: [divisions.id],
  }),
}));
```

## Relationships with Existing Data

```
clients ────< tender_schedule_entries >──── divisions
   │                                            │
   │  (optional FK)                    (optional FK, defaults to TES)
   │                                            │
   └──┴── income, expenses, billing...    ── leads, income, expenses...
```

- A tender schedule entry **optionally links** to a client record in PMG Hub. If the client is new or not yet in the system, the `client_name` field serves as a free-text fallback.
- A tender schedule entry **optionally links** to a division record. By default, tenders belong to Tender Edge Solutions (TES), but the model allows for future multi-division scheduling.
- There is **no direct relationship** to billing data (invoices, quotes) at this stage. A future enhancement could link a completed/submitted tender to a generated invoice or quote.

## Statuses

| Status | Description | Transitions To |
|---|---|---|
| `planned` | Captured and queued, not yet started | `in_progress`, `cancelled` |
| `in_progress` | Currently being worked on | `completed`, `cancelled` |
| `completed` | Preparation work finished | `submitted`, `cancelled` |
| `submitted` | Tender formally submitted (terminal) | — |
| `cancelled` | No longer being pursued (terminal) | — |

## Scheduling Logic (Application Layer)

The following calculations happen in the application layer (server action or query helper), not in the database:

### Recommended Start Date (auto-calculated)

```
recommended_start_date = closing_date - effort_days - buffer_days
```

If `recommended_start_date < today`, a "start overdue" warning is shown.

### Target Completion Date (auto-calculated)

```
target_completion_date = start_date + effort_days
```

This should be strictly `< closing_date`. If it's not, the buffer is effectively zero or negative, and an "at risk" warning is shown.

### WIP Overlap Detection (application-level query)

```
Count of tender_schedule_entries WHERE status = 'in_progress' > 2 → Warning
Or:
Two entries WHERE status IN ('planned', 'in_progress')
  AND date_ranges overlap (start_date <= entry2.target_completion AND entry2.start_date <= target_completion)
  → Overlap warning
```

### Default Values

| Field | Default |
|---|---|
| `status` | `'planned'` |
| `priority` | `'normal'` |
| `buffer_days` | `2` |

## Migration Notes

- PostgreSQL DDL migration using Drizzle Kit (following existing pattern in `packages/db/src/migrations/`)
- New enums: `tender_schedule_entry_status`, `tender_schedule_priority`
- New table: `tender_schedule_entries`
- New schema file: `packages/db/src/schema/tender-schedule.ts`
- New query file: `packages/db/src/queries/tender-schedule.ts`
- Export from `packages/db/src/schema/index.ts` and `packages/db/src/queries/index.ts`
