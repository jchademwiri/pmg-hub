# Requirements Document

## Introduction

Leads Management is Phase 5 of the PMG Control Center admin app. It provides a read-and-update interface for incoming business leads. Leads are created exclusively by the public Astro apps — no manual lead creation exists in the admin. The admin can view all leads, filter by status/division/source, update a lead's status, and add internal notes. The feature follows the established PMG admin pattern: DB query helpers → Server Actions → Client Components → Server Component pages. The `/leads` route hosts a tabbed list view; `/leads/[id]` hosts the lead detail with status update and notes.

## Glossary

- **Leads_Page**: The Server Component at `/leads` that renders the tab filter, filter bar, and leads table.
- **Lead_Detail_Page**: The Server Component at `/leads/[id]` that renders the full lead info, status update form, and notes section.
- **Leads_Table**: The Client Component that renders the paginated list of lead entries.
- **Lead_Status_Tabs**: The Client Component that renders the tab filter: All | New | Contacted | Converted | Lost, each with a count badge.
- **Leads_Filter_Bar**: The Client Component that renders the division and source filter controls.
- **Lead_Status_Form**: The Client Component on the Lead_Detail_Page that renders the status update select and submit button.
- **Lead_Notes_Form**: The Client Component on the Lead_Detail_Page that renders the internal notes textarea and submit button.
- **Server_Action**: A Next.js `'use server'` function that validates input, mutates the database, and returns `Promise<{ error?: string }>`.
- **LeadStatusSchema**: The Zod schema that validates a status update: `status` must be one of `new`, `contacted`, `converted`, `lost`.
- **LeadNotesSchema**: The Zod schema that validates a notes update: `notes` as an optional string.
- **Lead_Status**: One of four values: `new`, `contacted`, `converted`, `lost`. Defined by the `lead_status` Postgres enum.
- **Division**: A business unit record with `id` (UUID) and `name`, sourced from the `divisions` table.
- **Source**: The freeform text field on a lead indicating where the lead originated (e.g. "website", "referral"). May be null.
- **LeadRow**: The shape returned by `getAllLeads` and `getLeadById`, containing at minimum: `id`, `name`, `email`, `phone`, `message`, `source`, `serviceInterest`, `status`, `divisionId`, `divisionName`, `notes`, `createdAt`, `updatedAt`.

---

## Requirements

### Requirement 1: List Leads

**User Story:** As an admin, I want to view all leads in a table, so that I can see every incoming business enquiry at a glance.

#### Acceptance Criteria

1. THE Leads_Page SHALL fetch all lead entries from the database and render them in the Leads_Table.
2. WHEN no filter parameters are present in the URL, THE Leads_Page SHALL display all lead entries ordered by `createdAt` descending.
3. WHEN the Leads_Table contains no entries matching the active filters, THE Leads_Page SHALL display a message indicating that no leads match the current filters.
4. THE Leads_Table SHALL display the following columns for each entry: name, email or phone, division name (or blank if none), source (or blank if none), status badge, and a link to the lead detail page.

---

### Requirement 2: Tab Filter by Status

**User Story:** As an admin, I want to filter leads by status using tabs with counts, so that I can quickly focus on leads that need attention.

#### Acceptance Criteria

1. THE Lead_Status_Tabs SHALL render five tabs: All, New, Contacted, Converted, Lost.
2. THE Lead_Status_Tabs SHALL display a count badge on each tab showing the number of leads in that status, derived from `getLeadCountsByStatus()`.
3. WHEN the admin selects a status tab, THE Lead_Status_Tabs SHALL push `?status=<value>` to the URL and THE Leads_Page SHALL re-render displaying only entries with that status.
4. WHEN the "All" tab is selected, THE Leads_Page SHALL display all leads regardless of status.
5. WHEN a `status` search param is present in the URL, THE Lead_Status_Tabs SHALL render the matching tab as active.

---

### Requirement 3: Filter by Division and Source

**User Story:** As an admin, I want to filter leads by division and source, so that I can narrow down leads relevant to a specific part of the business.

#### Acceptance Criteria

1. THE Leads_Filter_Bar SHALL render a division selector populated with all divisions returned by `getAllDivisions()`, plus an "All divisions" default option.
2. THE Leads_Filter_Bar SHALL render a source selector populated with all distinct source values returned by `getDistinctLeadSources()`, plus an "All sources" default option.
3. WHEN a division filter is selected, THE Leads_Page SHALL display only entries whose `divisionId` matches the selected value.
4. WHEN a source filter is selected, THE Leads_Page SHALL display only entries whose `source` matches the selected value.
5. WHEN multiple filters are active simultaneously, THE Leads_Page SHALL display only entries that satisfy all active filter conditions.
6. WHEN a filter is cleared, THE Leads_Page SHALL display entries as if that filter was never applied.

---

### Requirement 4: Lead Detail View

**User Story:** As an admin, I want to view the full details of a lead on a dedicated page, so that I can see all the information submitted by the prospect.

#### Acceptance Criteria

1. WHEN the admin navigates to `/leads/[id]`, THE Lead_Detail_Page SHALL fetch the lead entry by `id` using `getLeadById(id)`.
2. IF `getLeadById(id)` returns `null`, THEN THE Lead_Detail_Page SHALL call `notFound()` from `next/navigation`.
3. THE Lead_Detail_Page SHALL display the following lead fields: name, email, phone, message, source, service interest, division name, status, and `createdAt` formatted as a human-readable date.
4. THE Lead_Detail_Page SHALL render the Lead_Status_Form and Lead_Notes_Form below the lead detail fields.

---

### Requirement 5: Update Lead Status

**User Story:** As an admin, I want to update the status of a lead, so that I can track where each prospect is in the sales pipeline.

#### Acceptance Criteria

1. THE Lead_Status_Form SHALL render a status select pre-populated with the lead's current status, with options: New, Contacted, Converted, Lost.
2. WHEN a valid status is submitted, THE Lead_Status_Form SHALL invoke the `updateLeadStatus` Server_Action with the lead `id` and form data.
3. WHEN the `updateLeadStatus` Server_Action succeeds, THE Lead_Detail_Page SHALL reflect the updated status via cache revalidation.
4. WHEN the `updateLeadStatus` Server_Action returns an error, THE Lead_Status_Form SHALL display the error message inline.
5. WHILE a submission is pending, THE Lead_Status_Form SHALL disable the select and submit button.

---

### Requirement 6: Update Lead Status Server Action

**User Story:** As a developer, I want an `updateLeadStatus` Server Action that validates and persists a status change, so that only valid transitions reach the database.

#### Acceptance Criteria

1. THE `updateLeadStatus` Server_Action SHALL validate form data against LeadStatusSchema before any database write.
2. WHEN LeadStatusSchema validation fails, THE `updateLeadStatus` Server_Action SHALL return `{ error: <first validation message> }` without writing to the database.
3. WHEN LeadStatusSchema validation passes, THE `updateLeadStatus` Server_Action SHALL update the matching row in the `leads` table, setting `status` and `updatedAt` to the current timestamp.
4. WHEN the database update succeeds, THE `updateLeadStatus` Server_Action SHALL call `revalidatePath('/leads')`, `revalidatePath('/leads/<id>')`, and `revalidatePath('/dashboard')`.
5. IF a database error occurs, THEN THE `updateLeadStatus` Server_Action SHALL return `{ error: <error message> }` without calling `revalidatePath`.
6. THE `updateLeadStatus` Server_Action SHALL return `Promise<{ error?: string }>` and SHALL NOT throw under any input condition.

---

### Requirement 7: Add Internal Notes

**User Story:** As an admin, I want to add internal notes to a lead, so that I can record context about conversations or next steps.

#### Acceptance Criteria

1. THE Lead_Notes_Form SHALL render a textarea pre-populated with the lead's existing `notes` value (or empty if null).
2. WHEN notes are submitted, THE Lead_Notes_Form SHALL invoke the `updateLeadNotes` Server_Action with the lead `id` and form data.
3. WHEN the `updateLeadNotes` Server_Action succeeds, THE Lead_Detail_Page SHALL reflect the updated notes via cache revalidation.
4. WHEN the `updateLeadNotes` Server_Action returns an error, THE Lead_Notes_Form SHALL display the error message inline.
5. WHILE a submission is pending, THE Lead_Notes_Form SHALL disable the textarea and submit button.

---

### Requirement 8: Update Lead Notes Server Action

**User Story:** As a developer, I want an `updateLeadNotes` Server Action that persists internal notes for a lead, so that admin commentary is saved reliably.

#### Acceptance Criteria

1. THE `updateLeadNotes` Server_Action SHALL validate form data against LeadNotesSchema before any database write.
2. WHEN LeadNotesSchema validation fails, THE `updateLeadNotes` Server_Action SHALL return `{ error: <first validation message> }` without writing to the database.
3. WHEN LeadNotesSchema validation passes, THE `updateLeadNotes` Server_Action SHALL update the `notes` field and `updatedAt` timestamp on the matching row in the `leads` table.
4. WHEN the database update succeeds, THE `updateLeadNotes` Server_Action SHALL call `revalidatePath('/leads/<id>')`.
5. IF a database error occurs, THEN THE `updateLeadNotes` Server_Action SHALL return `{ error: <error message> }` without calling `revalidatePath`.
6. THE `updateLeadNotes` Server_Action SHALL return `Promise<{ error?: string }>` and SHALL NOT throw under any input condition.

---

### Requirement 9: LeadStatusSchema Validation

**User Story:** As a developer, I want a Zod schema that validates lead status updates, so that only valid status values reach the database.

#### Acceptance Criteria

1. THE LeadStatusSchema SHALL require `status` as one of the four enum values: `new`, `contacted`, `converted`, `lost`.
2. WHEN `status` is absent or not one of the four valid values, THE LeadStatusSchema SHALL produce a descriptive validation error message.
3. FOR ALL valid status strings, parsing the object with LeadStatusSchema SHALL produce an output with the same `status` value (round-trip property).

---

### Requirement 10: Database Query Helpers

**User Story:** As a developer, I want query helper functions in `@pmg/db` for leads, so that data access is centralised and reusable.

#### Acceptance Criteria

1. THE `@pmg/db` package SHALL export a `getAllLeads(filters?)` function that accepts optional `status`, `divisionId`, and `source` filter parameters and returns all matching lead rows left-joined with division name, ordered by `createdAt` descending.
2. THE `@pmg/db` package SHALL export a `getLeadById(id)` function that returns a single lead row left-joined with division name, or `null` if not found.
3. THE `@pmg/db` package SHALL export a `getLeadCountsByStatus()` function that returns an object with counts for each status: `{ all: number, new: number, contacted: number, converted: number, lost: number }`.
4. THE `@pmg/db` package SHALL export a `getDistinctLeadSources()` function that returns an array of distinct non-null source strings ordered alphabetically.
5. THE `@pmg/db` package SHALL export a `LeadRow` type representing the shape returned by `getAllLeads` and `getLeadById`, containing at minimum: `id` (string), `name` (string | null), `email` (string | null), `phone` (string | null), `message` (string | null), `source` (string | null), `serviceInterest` (string | null), `status` (string), `divisionId` (string | null), `divisionName` (string | null), `notes` (string | null), `createdAt`, and `updatedAt`.
6. WHEN `getAllLeads` is called with a `status` filter, THE function SHALL return only entries whose `status` matches the provided value.
7. WHEN `getAllLeads` is called with no filters, THE function SHALL return all lead rows.
8. THE `@pmg/db` package SHALL export all new helpers from `packages/db/src/index.ts`.

---

### Requirement 11: Notes Field on Leads Table

**User Story:** As a developer, I want a `notes` column on the `leads` table, so that internal admin commentary can be persisted.

#### Acceptance Criteria

1. THE `leads` table SHALL include a `notes` column of type `text`, nullable, with no default value.
2. WHEN `notes` is null, THE Lead_Notes_Form SHALL render an empty textarea.
3. WHEN `notes` is a non-empty string, THE Lead_Notes_Form SHALL pre-populate the textarea with that value.

---

### Requirement 12: Dashboard Consistency

**User Story:** As an admin, I want lead status changes to be immediately reflected on the dashboard, so that the leads summary always shows current data.

#### Acceptance Criteria

1. WHEN `updateLeadStatus` mutates the database, THE `updateLeadStatus` Server_Action SHALL revalidate `/dashboard` so that the `LeadsSummary` component reflects the updated status counts.
2. WHEN the admin returns to `/dashboard` after a status update, THE Dashboard SHALL display lead counts that include the change.
