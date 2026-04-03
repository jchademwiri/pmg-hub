# Implementation Plan: Leads Management

## Overview

Implement the leads management feature following the established PMG admin pattern: DB layer → Server Actions → Client Components → Server Component pages → Tests. Each step builds on the previous, with no orphaned code.

## Tasks

- [ ] 1. Database layer — schema, migration, and query helpers
  - [ ] 1.1 Add `notes` column to leads schema
    - Add `notes: text("notes")` to `packages/db/src/schema/leads.ts` after `updatedAt` (nullable, no default, no `.notNull()`, no `.default()`)
    - _Requirements: 11.1_

  - [ ] 1.2 Generate and apply migration
    - Run `bun db:generate` to produce `ALTER TABLE "leads" ADD COLUMN "notes" text;`
    - Run `bun db:migrate` to apply to Neon PostgreSQL
    - _Requirements: 11.1_

  - [ ] 1.3 Add `LeadRow` type and `getAllLeads` to `packages/db/src/queries.ts`
    - Export `LeadRow` type with all fields: `id`, `name`, `email`, `phone`, `message`, `source`, `serviceInterest`, `status`, `divisionId`, `divisionName`, `notes`, `createdAt`, `updatedAt`
    - Implement `getAllLeads(filters?)` — LEFT JOIN divisions, optional `status`/`divisionId`/`source` filters using `and(...conditions)`, ORDER BY `createdAt DESC`
    - _Requirements: 10.1, 10.5, 10.6, 10.7_

  - [ ] 1.4 Add `getLeadById`, `getLeadCountsByStatus`, and `getDistinctLeadSources` to `packages/db/src/queries.ts`
    - `getLeadById(id)` — LEFT JOIN divisions, WHERE id, returns `LeadRow | null`
    - `getLeadCountsByStatus()` — single query with conditional aggregation, returns `{ all, new, contacted, converted, lost }`
    - `getDistinctLeadSources()` — SELECT DISTINCT non-null sources, ORDER BY ASC
    - _Requirements: 10.2, 10.3, 10.4_

  - [ ] 1.5 Export `LeadRow` type from `packages/db/src/index.ts`
    - Add `export type { LeadRow } from './queries'` (the functions are already covered by `export * from './queries'`)
    - _Requirements: 10.5, 10.8_

- [ ] 2. Server Actions — `apps/admin/src/app/actions/leads.ts`
  - [ ] 2.1 Implement `updateLeadStatus` server action
    - Create `apps/admin/src/app/actions/leads.ts` with `'use server'`
    - Define `LeadStatusSchema` with `z.enum(['new', 'contacted', 'converted', 'lost'])` and custom `errorMap`
    - Implement `updateLeadStatus(id, formData)`: `Object.fromEntries` → `safeParse` → Drizzle update (`status` + `updatedAt`) → `revalidatePath('/leads')`, `revalidatePath('/leads/${id}')`, `revalidatePath('/dashboard')` → return `{}`
    - Never throw; return `{ error }` on validation failure or DB error
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 12.1_

  - [ ] 2.2 Implement `updateLeadNotes` server action
    - Define `LeadNotesSchema` with `z.object({ notes: z.string().optional() })`
    - Implement `updateLeadNotes(id, formData)`: same pattern — `Object.fromEntries` → `safeParse` → Drizzle update (`notes` + `updatedAt`) → `revalidatePath('/leads/${id}')` → return `{}`
    - Never throw; return `{ error }` on validation failure or DB error
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

- [ ] 3. Client Components — `apps/admin/src/components/leads/`
  - [ ] 3.1 Implement `LeadStatusTabs` (`lead-status-tabs.tsx`)
    - `'use client'`; accepts `counts`, `currentStatus?`, `currentDivisionId?`, `currentSource?`
    - Render five shadcn `Tabs` items: All, New, Contacted, Converted, Lost — each with count badge
    - `handleTabChange`: build `URLSearchParams` preserving `currentDivisionId` and `currentSource`, set `status` (omit for "all"), call `router.push('/leads?' + params.toString())`
    - Active tab derived from `currentStatus` prop
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ] 3.2 Implement `LeadsFilterBar` (`leads-filter-bar.tsx`)
    - `'use client'`; accepts `divisions`, `sources`, `currentDivisionId?`, `currentSource?`, `currentStatus?`
    - Two shadcn `Select` controls (division, source); each handler preserves all other active params and calls `router.push`
    - Mirrors `income/filter-bar.tsx` pattern
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [ ] 3.3 Implement `LeadsTable` (`leads-table.tsx`)
    - `'use client'`; accepts `entries: LeadRow[]`
    - Columns: name, email (fallback phone), divisionName, source, status badge, detail link (`/leads/${entry.id}`)
    - Status badge colour-coded: new=blue, contacted=amber, converted=green, lost=red
    - Read-only — no delete, no inline edit
    - _Requirements: 1.4_

  - [ ] 3.4 Implement `LeadStatusForm` (`lead-status-form.tsx`)
    - `'use client'`; accepts `id`, `currentStatus`, `updateAction`
    - `useTransition`; select pre-populated with `currentStatus`; disable select and submit while `isPending`
    - Display inline error when action returns `{ error }`
    - _Requirements: 5.1, 5.2, 5.4, 5.5_

  - [ ] 3.5 Implement `LeadNotesForm` (`lead-notes-form.tsx`)
    - `'use client'`; accepts `id`, `currentNotes: string | null`, `updateAction`
    - `useTransition`; textarea pre-populated with `currentNotes ?? ''`; disable textarea and submit while `isPending`
    - Display inline error when action returns `{ error }`
    - _Requirements: 7.1, 7.2, 7.4, 7.5, 11.2, 11.3_

- [ ] 4. Server Component Pages
  - [ ] 4.1 Implement `/leads` list page (`apps/admin/src/app/(admin)/leads/page.tsx`)
    - `export const dynamic = 'force-dynamic'`
    - Await `searchParams` (`status?`, `divisionId?`, `source?`)
    - `Promise.all([getAllLeads(filters), getLeadCountsByStatus(), getAllDivisions(), getDistinctLeadSources()])`
    - Render: page header, `LeadStatusTabs` (counts + currentStatus + currentDivisionId + currentSource), `LeadsFilterBar` (divisions + sources + currentDivisionId + currentSource + currentStatus), `LeadsTable` or empty-state message when `entries.length === 0`
    - _Requirements: 1.1, 1.2, 1.3, 2.2, 3.1, 3.2, 3.5, 3.6_

  - [ ] 4.2 Implement `/leads/[id]` detail page (`apps/admin/src/app/(admin)/leads/[id]/page.tsx`)
    - `export const dynamic = 'force-dynamic'`
    - Await `params`, call `getLeadById(id)`, call `notFound()` if null
    - Render: back link to `/leads`, lead detail fields (name, email, phone, message, source, serviceInterest, divisionName, status, createdAt formatted as human-readable date)
    - Render `LeadStatusForm` with `updateAction={updateLeadStatus.bind(null, id)}`
    - Render `LeadNotesForm` with `updateAction={updateLeadNotes.bind(null, id)}`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 5.3, 7.3, 12.2_

- [ ] 5. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Tests — `apps/admin/src/__tests__/leads.test.ts`
  - [ ] 6.1 Set up test file with mocks and `leadArb` arbitrary
    - Create `apps/admin/src/__tests__/leads.test.ts`
    - `vi.mock('@pmg/db')` for all DB helpers; `vi.mock('@/app/actions/leads')` for server actions
    - Define `leadArb` using `fc.record` matching the `LeadRow` shape (id, name, email, phone, message, source, serviceInterest, status, divisionId, divisionName, notes, createdAt, updatedAt)
    - _Requirements: 10.5_

  - [ ]* 6.2 Write property test P1: getAllLeads shape and sort order
    - **Property 1: getAllLeads shape + sort order (createdAt DESC)**
    - **Validates: Requirements 1.1, 1.2, 10.1, 10.7**

  - [ ]* 6.3 Write property test P2: status filter excludes other statuses
    - **Property 2: status filter excludes entries with other statuses**
    - **Validates: Requirements 2.3, 10.6**

  - [ ]* 6.4 Write property test P3: divisionId filter excludes other divisions
    - **Property 3: divisionId filter excludes entries from other divisions**
    - **Validates: Requirements 3.3**

  - [ ]* 6.5 Write property test P4: source filter excludes other sources
    - **Property 4: source filter excludes entries from other sources**
    - **Validates: Requirements 3.4**

  - [ ]* 6.6 Write property test P5: getLeadById returns correct entry or null
    - **Property 5: getLeadById returns correct entry or null**
    - **Validates: Requirements 4.1, 10.2**

  - [ ]* 6.7 Write property test P6: getLeadCountsByStatus counts sum to total
    - **Property 6: new+contacted+converted+lost sum equals all**
    - **Validates: Requirements 2.2, 10.3**

  - [ ]* 6.8 Write property test P7: getDistinctLeadSources — non-null, no duplicates, sorted ASC
    - **Property 7: getDistinctLeadSources returns only non-null sources, no duplicates, sorted ASC**
    - **Validates: Requirements 3.2, 10.4**

  - [ ]* 6.9 Write property test P8: updateLeadStatus round-trip
    - **Property 8: valid status persisted, updatedAt updated**
    - **Validates: Requirements 5.2, 5.3, 6.3**

  - [ ]* 6.10 Write property test P9: updateLeadNotes round-trip
    - **Property 9: notes persisted, updatedAt updated**
    - **Validates: Requirements 7.2, 7.3, 8.3, 8.6**

  - [ ]* 6.11 Write property test P10: invalid status always returns { error }, never throws
    - **Property 10: invalid status to updateLeadStatus always returns { error }, never throws**
    - **Validates: Requirements 6.1, 6.2, 6.6**

  - [ ]* 6.12 Write property test P11: LeadStatusSchema round-trip for all four valid values
    - **Property 11: LeadStatusSchema round-trip for all four valid values**
    - **Validates: Requirements 9.1, 9.3**

  - [ ]* 6.13 Write property test P12: notes column nullable after migration
    - **Property 12: existing leads have notes=null after migration**
    - **Validates: Requirements 11.1**

  - [ ]* 6.14 Write unit tests for LeadStatusTabs
    - Renders correct tab as active from URL param
    - Tab change preserves `currentDivisionId` and `currentSource` in URL
    - _Requirements: 2.3, 2.5_

  - [ ]* 6.15 Write unit tests for LeadsTable
    - Renders detail links with correct `/leads/<id>` hrefs
    - _Requirements: 1.4_

  - [ ]* 6.16 Write unit tests for LeadStatusForm and LeadNotesForm
    - `LeadStatusForm` disables controls while `isPending`
    - `LeadNotesForm` pre-populates textarea with existing notes value
    - _Requirements: 5.5, 7.1, 7.5_

  - [ ]* 6.17 Write unit tests for server action error handling and edge cases
    - `updateLeadStatus` returns `{ error }` on DB throw
    - `updateLeadNotes` returns `{ error }` on DB throw
    - Empty-state renders when `entries.length === 0`
    - `LeadStatusSchema` produces descriptive error for invalid status value
    - _Requirements: 6.5, 8.5, 1.3, 9.2_

- [ ] 7. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests (P1–P12) validate universal correctness properties; unit tests validate specific UI states and error branches
- All DB functions and server actions are mocked in tests — no live DB connection required
