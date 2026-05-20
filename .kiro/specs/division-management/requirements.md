# Requirements Document

## Introduction

Division Management is Phase 6 of the PMG Control Center admin app. It provides a single-route interface for creating, renaming, and deleting business divisions. The `/divisions` route renders a table showing each division's financial summary (total income, total expenses, net profit, lead count) alongside an inline add form and inline rename capability. Deletion is blocked at the database level when income or expense records reference the division. The feature follows the established PMG admin pattern: DB query helpers → Server Actions → Client Components → Server Component pages.

## Glossary

- **Divisions_Page**: The Server Component at `/divisions` that renders the divisions table, inline add form, and all division rows.
- **Divisions_Table**: The Client Component that renders the list of division rows with financial summary columns and inline rename/delete controls.
- **Division_Row**: A single row in the Divisions_Table representing one division, with inline rename state.
- **Add_Form**: The inline form on the Divisions_Page used to create a new division (name only).
- **Division_Action**: The `createDivision`, `updateDivision`, and `deleteDivision` Server Actions in `actions/divisions.ts`.
- **DivisionSchema**: The Zod schema that validates division form data - `name` as a string between 1 and 100 characters.
- **DivisionRow**: The shape returned by `getDivisionsWithStats()`, containing: `id`, `name`, `totalIncome`, `totalExpenses`, `netProfit`, `leadCount`.
- **Net_Profit**: The value computed as `totalIncome − totalExpenses` for a given division. Displayed in green when positive, red when negative or zero.
- **FK_Constraint**: The PostgreSQL foreign key constraint on the `income` and `expenses` tables that references `divisions.id`. Deletion of a division that has associated income or expense records will be rejected by the database.

---

## Requirements

### Requirement 1: List Divisions with Financial Summary

**User Story:** As an admin, I want to see all divisions in a table with their financial summary, so that I can understand the contribution and cost of each business unit at a glance.

#### Acceptance Criteria

1. WHEN the admin navigates to `/divisions`, THE Divisions_Page SHALL fetch all division rows using `getDivisionsWithStats()` and render them in the Divisions_Table.
2. THE Divisions_Table SHALL display the following columns for each division: name, total income, total expenses, net profit, and lead count.
3. THE Divisions_Table SHALL display the net profit value in green when the value is positive, and in red when the value is zero or negative.
4. WHEN no divisions exist, THE Divisions_Page SHALL display an empty-state message in place of the Divisions_Table.
5. THE Divisions_Table SHALL sort divisions by name ascending.

---

### Requirement 2: Add Division

**User Story:** As an admin, I want to add a new division inline on the list page, so that I can create a business unit without navigating away.

#### Acceptance Criteria

1. THE Divisions_Page SHALL render the Add_Form inline, without a modal.
2. THE Add_Form SHALL include a single required field: name (1–100 characters).
3. WHEN the admin submits the Add_Form with a valid name, THE Division_Action SHALL insert a new division record and call `revalidatePath('/divisions')`.
4. WHEN the admin submits the Add_Form with an empty name or a name exceeding 100 characters, THE Division_Action SHALL return `{ error: "<human-readable message>" }` and THE Add_Form SHALL display the error inline without throwing an exception.
5. WHEN `createDivision` succeeds, THE Division_Action SHALL return `{}` and THE Divisions_Page SHALL refresh and display the new division in the Divisions_Table.
6. WHILE a submission is pending, THE Add_Form SHALL disable the name input and submit button.

---

### Requirement 3: Rename Division

**User Story:** As an admin, I want to rename a division inline in the table, so that I can correct or update a division name without navigating to a separate page.

#### Acceptance Criteria

1. THE Divisions_Table SHALL render an edit/rename control for each Division_Row.
2. WHEN the admin activates the rename control, THE Division_Row SHALL switch to an inline edit state displaying a text input pre-populated with the current division name.
3. WHEN the admin submits the rename with a valid name (1–100 characters), THE Division_Action SHALL update the division's `name` and `updatedAt` fields and call `revalidatePath('/divisions')`.
4. WHEN the admin submits the rename with an empty name or a name exceeding 100 characters, THE Division_Action SHALL return `{ error: "<human-readable message>" }` and THE Division_Row SHALL display the error inline without throwing an exception.
5. WHEN `updateDivision` succeeds, THE Division_Action SHALL return `{}` and THE Divisions_Page SHALL refresh and display the updated name.
6. WHEN the admin cancels the rename (e.g. presses Escape or a cancel button), THE Division_Row SHALL revert to its display state without saving any changes.
7. WHILE a rename submission is pending, THE Division_Row SHALL disable the name input and submit button.

---

### Requirement 4: Delete Division

**User Story:** As an admin, I want to delete a division, so that I can remove business units that are no longer active.

#### Acceptance Criteria

1. THE Divisions_Table SHALL render a delete control for each Division_Row.
2. WHEN the admin activates the delete control, THE Divisions_Table SHALL display a confirmation prompt before proceeding.
3. WHEN the admin confirms deletion and the division has no associated income or expense records, THE Division_Action SHALL delete the division record and call `revalidatePath('/divisions')`.
4. WHEN the admin confirms deletion and the division has associated income or expense records, THE Division_Action SHALL return `{ error: "Cannot delete division with existing income or expense records" }` and THE Divisions_Table SHALL display the error inline without throwing an exception.
5. WHEN deletion succeeds, THE Divisions_Page SHALL refresh and the deleted division SHALL no longer appear in the Divisions_Table.
6. WHEN the admin cancels the confirmation prompt, THE Divisions_Table SHALL remain unchanged.
7. WHEN `deleteDivision` encounters a database FK constraint violation, THE Division_Action SHALL return `{ error: "Cannot delete division with existing income or expense records" }` without throwing.

---

### Requirement 5: Server Action Return Contract

**User Story:** As an admin, I want form errors to appear inline, so that I can correct mistakes without losing context.

#### Acceptance Criteria

1. THE Division_Action SHALL return `Promise<{ error?: string }>` for every `createDivision`, `updateDivision`, and `deleteDivision` call.
2. WHEN DivisionSchema validation fails, THE Division_Action SHALL return `{ error: "<human-readable message>" }` without writing to the database.
3. WHEN a database error occurs, THE Division_Action SHALL return `{ error: "<human-readable message>" }` without throwing an exception.
4. WHEN the operation succeeds, THE Division_Action SHALL return `{}`.
5. THE Add_Form and Division_Row rename form SHALL use the return value of the Division_Action to display inline errors - THE Add_Form and Division_Row SHALL NOT rely on thrown exceptions for user-facing error display.

---

### Requirement 6: DivisionSchema Validation

**User Story:** As a developer, I want a Zod schema that validates division name input, so that only valid names reach the database.

#### Acceptance Criteria

1. THE DivisionSchema SHALL require `name` as a string with a minimum length of 1 and a maximum length of 100.
2. WHEN `name` is absent, empty, or exceeds 100 characters, THE DivisionSchema SHALL produce a descriptive validation error message.
3. FOR ALL valid name strings (length 1–100), parsing `{ name }` with DivisionSchema SHALL produce an output with the same `name` value (round-trip property).

---

### Requirement 7: DB Query Helpers

**User Story:** As a developer, I want a dedicated query helper for division management, so that the Divisions_Page can fetch all required data in one call.

#### Acceptance Criteria

1. THE `@pmg/db` package SHALL export a `getDivisionsWithStats()` function that returns all divisions joined with aggregated income totals, expense totals, and lead counts, ordered by name ascending.
2. THE `getDivisionsWithStats()` function SHALL return an array of `DivisionRow` objects, each containing: `id` (string), `name` (string), `totalIncome` (number), `totalExpenses` (number), `netProfit` (number), `leadCount` (number).
3. WHEN a division has no income records, THE `getDivisionsWithStats()` function SHALL return `totalIncome` as `0` for that division.
4. WHEN a division has no expense records, THE `getDivisionsWithStats()` function SHALL return `totalExpenses` as `0` for that division.
5. WHEN a division has no leads, THE `getDivisionsWithStats()` function SHALL return `leadCount` as `0` for that division.
6. THE `getDivisionsWithStats()` function SHALL compute `netProfit` as `totalIncome − totalExpenses` for each division.
7. THE `@pmg/db` package SHALL export the `DivisionRow` type and `getDivisionsWithStats` from `packages/db/src/index.ts`.
8. WHERE `getAllDivisions()` already exists in `packages/db/src/queries.ts`, THE `@pmg/db` package SHALL NOT add a duplicate - `getDivisionsWithStats()` is a separate, stats-enriched helper.

---

### Requirement 8: FK-Blocked Deletion

**User Story:** As a developer, I want division deletion to be blocked at the database level when income or expenses reference the division, so that referential integrity is always enforced regardless of UI state.

#### Acceptance Criteria

1. THE `deleteDivision` Server_Action SHALL attempt the database delete inside a `try/catch` block.
2. IF the database returns a foreign key constraint violation error, THEN THE `deleteDivision` Server_Action SHALL return `{ error: "Cannot delete division with existing income or expense records" }` without re-throwing.
3. THE `deleteDivision` Server_Action SHALL NOT perform a pre-check query to determine if records exist before attempting deletion - THE Server_Action SHALL rely on the FK constraint as the authoritative guard.
4. WHEN `deleteDivision` succeeds, THE Division_Action SHALL call `revalidatePath('/divisions')` and return `{}`.

---

### Requirement 9: Dashboard Consistency

**User Story:** As an admin, I want division changes to be reflected on the dashboard, so that division-based charts and breakdowns always show current data.

#### Acceptance Criteria

1. WHEN `createDivision` or `updateDivision` mutates the database, THE Division_Action SHALL call `revalidatePath('/dashboard')` so that division-based dashboard components reflect the change.
2. WHEN the admin returns to `/dashboard` after a division mutation, THE Dashboard SHALL display division names and breakdowns that include the change.
