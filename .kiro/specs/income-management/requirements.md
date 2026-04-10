# Requirements Document

## Introduction

Phase 3 of the PMG Control Center adds full income entry management to the admin app.
The admin can create, view, edit, and delete income records. Every income entry must
be assigned to a division; a client association is optional at the database level but
the UI always presents the full client list as a select so the admin makes an explicit
choice. The feature spans two routes: `/income` (list + inline add form) and
`/income/[id]` (edit form). All mutations go through Zod-validated Server Actions that
return `Promise<{ error?: string }>` and revalidate both `/income` and `/dashboard` on
success. Filtering is server-side via URL search params.

## Glossary

- **Income_Page**: The Server Component rendered at `/income`.
- **Edit_Page**: The Server Component rendered at `/income/[id]`.
- **Income_Table**: The sortable, filterable table of income entries on the Income_Page.
- **Add_Form**: The inline form on the Income_Page used to create a new income entry.
- **Edit_Form**: The form on the Edit_Page used to update an existing income entry.
- **Income_Action**: The `createIncome`, `updateIncome`, and `deleteIncome` Server Actions in `actions/income.ts`.
- **Running_Total**: The aggregate sum of all income entries currently visible after filtering.
- **Division**: A business unit (e.g. AWS, TES, PMG). Every income entry must reference one.
- **Client**: A client record that can be associated with an income entry. The database column allows null, but the UI always presents the full client list as a select with a "No client" option.
- **IncomeSchema**: The Zod schema that validates income form data — `date`, `divisionId`, `clientId?`, `description?`, `amount`.
- **Filter**: The division select and month select controls that narrow the Income_Table rows.
- **Filter_Bar**: The `'use client'` wrapper component that owns the filter controls and pushes updated URL search params via `useRouter().push`.
- **DB_Queries**: The query helpers exported from `packages/db/src/queries.ts` and re-exported from `packages/db/src/index.ts`.

## Requirements

### Requirement 1: List Income Entries

**User Story:** As an admin, I want to see all income entries in a table, so that I can review what has been recorded.

#### Acceptance Criteria

1. WHEN the admin navigates to `/income`, THE Income_Page SHALL fetch and display all income entries from the database using `getAllIncome()`.
2. THE Income_Table SHALL display the following columns for each entry: date, division name, client name (or blank if none), description (or blank if none), amount, edit action, delete action.
3. THE Income_Table SHALL sort entries by date descending by default.
4. THE Income_Page SHALL display the Running_Total of all currently visible income entries above the Income_Table.
5. WHEN no income entries exist, THE Income_Page SHALL display an empty-state message in place of the Income_Table.

---

### Requirement 2: Filter Income Entries

**User Story:** As an admin, I want to filter income entries by division and month, so that I can focus on a specific subset of records.

#### Acceptance Criteria

1. THE Income_Page SHALL provide a division select control populated with all divisions returned by `getAllDivisions()`.
2. THE Income_Page SHALL provide a month select control populated with all distinct months returned by `getDistinctIncomeMonths()`, formatted as `YYYY-MM`, sorted descending.
3. WHEN the admin selects a division, THE Filter_Bar SHALL push `?divisionId=<uuid>` to the URL and THE Income_Page SHALL re-render server-side displaying only entries belonging to that division.
4. WHEN the admin selects a month, THE Filter_Bar SHALL push `?month=<YYYY-MM>` to the URL and THE Income_Page SHALL re-render server-side displaying only entries whose date falls within that calendar month.
5. WHEN both a division and a month are selected, THE Income_Page SHALL apply both filters simultaneously by passing both values to the DB query.
6. WHEN a filter is active, THE Running_Total SHALL reflect only the filtered entries.
7. WHEN no filter is selected, THE Income_Table SHALL display all entries.
8. THE Income_Page SHALL read filter values exclusively from `searchParams` — THE Income_Page SHALL NOT use client-side state or `useEffect` to manage filter values.

---

### Requirement 3: Add Income Entry

**User Story:** As an admin, I want to add a new income entry inline on the list page, so that I can record revenue without navigating away.

#### Acceptance Criteria

1. THE Income_Page SHALL render the Add_Form inline below the filter controls, without a modal.
2. THE Add_Form SHALL include the following fields: date (required), division select (required), client select (required UI element, with a "No client" blank option), description (optional), amount (required, positive number).
3. THE Add_Form SHALL populate the division select with all divisions returned by `getAllDivisions()`.
4. THE Add_Form SHALL populate the client select with all clients returned by `getAllClients()`, plus a leading "No client" option that submits an empty `clientId`.
5. WHEN the admin submits the Add_Form with valid data, THE Income_Action SHALL insert a new income record and revalidate `/income` and `/dashboard`.
6. WHEN the admin submits the Add_Form with an invalid or missing required field, THE Income_Action SHALL return `{ error: "<human-readable message>" }` and THE Add_Form SHALL display the error inline without throwing an exception.
7. WHEN `createIncome` succeeds, THE Income_Action SHALL return `{}` and THE Income_Page SHALL refresh and display the new entry in the Income_Table.

---

### Requirement 4: Edit Income Entry

**User Story:** As an admin, I want to edit an existing income entry, so that I can correct mistakes or update details.

#### Acceptance Criteria

1. THE Income_Table SHALL render an edit link for each row that navigates to `/income/[id]`.
2. WHEN the admin navigates to `/income/[id]`, THE Edit_Page SHALL fetch the income entry with the given `id` from the database using `getIncomeById(id)`.
3. THE Edit_Form SHALL pre-populate all fields with the existing entry values: date, division, client, description, amount.
4. THE Edit_Form SHALL include the same fields as the Add_Form: date (required), division select (required), client select (required UI element, with a "No client" blank option), description (optional), amount (required, positive number).
5. THE Edit_Form SHALL populate the division select with all divisions returned by `getAllDivisions()`.
6. THE Edit_Form SHALL populate the client select with all clients returned by `getAllClients()`, plus a leading "No client" option.
7. WHEN the admin submits the Edit_Form with valid data, THE Income_Action SHALL update the record, set `updatedAt` to the current timestamp, and revalidate `/income` and `/dashboard`.
8. WHEN the admin submits the Edit_Form with an invalid or missing required field, THE Income_Action SHALL return `{ error: "<human-readable message>" }` and THE Edit_Form SHALL display the error inline without throwing an exception.
9. IF `getIncomeById(id)` returns `null`, THEN THE Edit_Page SHALL call `notFound()` from `next/navigation` — THE Edit_Page SHALL NOT render a blank page or redirect.

---

### Requirement 5: Delete Income Entry

**User Story:** As an admin, I want to delete an income entry, so that I can remove records that were entered in error.

#### Acceptance Criteria

1. THE Income_Table SHALL render a delete control for each row.
2. WHEN the admin activates the delete control, THE Income_Page SHALL display a confirmation prompt before proceeding.
3. WHEN the admin confirms deletion, THE Income_Action SHALL delete the income record and revalidate `/income` and `/dashboard`.
4. WHEN deletion succeeds, THE Income_Page SHALL refresh and the deleted entry SHALL no longer appear in the Income_Table.
5. WHEN the admin cancels the confirmation prompt, THE Income_Table SHALL remain unchanged.
6. WHEN `deleteIncome` encounters a database error, THE Income_Action SHALL return `{ error: "<human-readable message>" }` without throwing.

---

### Requirement 6: Server Action Return Contract

**User Story:** As an admin, I want form errors to appear inline next to the form, so that I can correct mistakes without losing my input.

#### Acceptance Criteria

1. THE Income_Action SHALL return `Promise<{ error?: string }>` for every `createIncome`, `updateIncome`, and `deleteIncome` call.
2. WHEN validation fails, THE Income_Action SHALL return `{ error: "<human-readable message>" }` without throwing an exception.
3. WHEN a database error occurs, THE Income_Action SHALL return `{ error: "<human-readable message>" }` without throwing an exception.
4. WHEN the operation succeeds, THE Income_Action SHALL return `{}`.
5. THE Add_Form and Edit_Form SHALL use the return value of the Income_Action to display inline errors — THE Add_Form and Edit_Form SHALL NOT rely on thrown exceptions for user-facing error display.

---

### Requirement 7: Server-Side Filtering via URL Search Params

**User Story:** As an admin, I want filter state to be reflected in the URL, so that I can share or bookmark a filtered view.

#### Acceptance Criteria

1. THE Income_Page SHALL read `divisionId` and `month` filter values exclusively from `searchParams`.
2. THE Filter_Bar SHALL be a `'use client'` component that calls `useRouter().push` to update the URL when the admin changes a filter value.
3. WHEN filter values are present in `searchParams`, THE Income_Page SHALL pass those values to the DB query functions to perform server-side filtering.
4. THE Running_Total SHALL be computed from the already-filtered result set returned by the DB query — THE Income_Page SHALL NOT filter a full result set client-side.

---

### Requirement 8: DB Query Helpers

**User Story:** As a developer, I want dedicated query helpers for income management, so that the Income_Page and Edit_Page can fetch exactly the data they need.

#### Acceptance Criteria

1. THE DB_Queries SHALL export `getAllIncome()` which returns all income rows joined to divisions and clients, sorted by date descending, with shape `{ id, date, divisionId, divisionName, clientId, clientName, description, amount }[]`.
2. THE DB_Queries SHALL export `getIncomeById(id: string)` which returns a single income row with division and client joined, or `null` if no row with that `id` exists.
3. THE DB_Queries SHALL export `getDistinctIncomeMonths()` which returns distinct `YYYY-MM` strings for months that have at least one income entry, sorted descending.
4. THE DB_Queries SHALL export `getAllDivisions()` which returns `{ id, name }[]` sorted by name ascending. WHERE `getAllDivisions()` already exists in `packages/db/src/queries.ts`, THE DB_Queries SHALL NOT add a duplicate.
5. THE DB_Queries SHALL export `getAllClients()` which returns `{ id, name, businessName }[]` sorted by name ascending.
6. THE DB_Queries SHALL export all new helpers from `packages/db/src/index.ts`.

---

### Requirement 9: Amount Storage

**User Story:** As a developer, I want income amounts stored correctly in the database, so that numeric precision is preserved.

#### Acceptance Criteria

1. THE Income_Action SHALL always pass `String(parsed.amount)` when writing `amount` to the database — THE Income_Action SHALL NOT pass a raw JavaScript number to a Drizzle `numeric` column.
2. THE IncomeSchema SHALL coerce `amount` to a positive number via Zod before the Income_Action converts it to a string for storage.

---

### Requirement 10: Server Action Validation

**User Story:** As an admin, I want all income mutations to be validated server-side, so that invalid data never reaches the database.

#### Acceptance Criteria

1. THE Income_Action SHALL validate every `createIncome` and `updateIncome` submission against the IncomeSchema before writing to the database.
2. THE IncomeSchema SHALL require `date` to be a non-empty string, `divisionId` to be a valid UUID, `clientId` to be a valid UUID when provided, and `amount` to coerce to a positive number.
3. IF the IncomeSchema validation fails, THEN THE Income_Action SHALL return `{ error: "<human-readable message>" }` without writing to the database.
4. WHEN `createIncome` or `updateIncome` succeeds, THE Income_Action SHALL call `revalidatePath('/income')` and `revalidatePath('/dashboard')`.
5. WHEN `deleteIncome` succeeds, THE Income_Action SHALL call `revalidatePath('/income')` and `revalidatePath('/dashboard')`.

---

### Requirement 11: Dashboard Consistency

**User Story:** As an admin, I want income changes to be immediately reflected on the dashboard, so that the KPIs always show current data.

#### Acceptance Criteria

1. WHEN any Income_Action mutates the database, THE Income_Action SHALL revalidate `/dashboard` so that all dashboard KPIs reflect the updated income data.
2. WHEN the admin returns to `/dashboard` after an income mutation, THE Dashboard SHALL display revenue and profit pool figures that include the change.
