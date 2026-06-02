# Requirements Document

## Introduction

Expense Management is Phase 4 of the PMG Control Center admin app. It provides a full CRUD interface for tracking business expenses across divisions. Every expense must be assigned a division and a freeform category. The feature mirrors the existing Income Management pattern: Server Components fetch data, Server Actions mutate it, and `revalidatePath` refreshes the cache on success. The `/expenses` route hosts a list view with an inline add form; `/expenses/[id]` hosts the edit view.

## Glossary

- **Expense_Page**: The Server Component at `/expenses` that renders the list, filter bar, summary, and inline add form.
- **Expense_Edit_Page**: The Server Component at `/expenses/[id]` that renders the edit form for a single expense entry.
- **Expense_Add_Form**: The Client Component that renders the inline form for creating a new expense entry.
- **Expense_Edit_Form**: The Client Component that renders the pre-populated form for updating an existing expense entry.
- **Expense_Table**: The Client Component that renders the paginated list of expense entries with edit and delete actions.
- **Expense_Filter_Bar**: The Client Component that renders division, category, and month filter controls.
- **Expense_Summary**: The UI section at the top of the Expense_Page that displays the running total and a per-category breakdown.
- **Server_Action**: A Next.js `'use server'` function that validates input, mutates the database, and returns `Promise<{ error?: string }>`.
- **ExpenseSchema**: The Zod schema that validates expense form data: `date`, `divisionId`, `category`, `amount` (required); `description` (optional).
- **Division**: A business unit record with `id` (UUID) and `name`, sourced from the `divisions` table.
- **Category**: A freeform text label for an expense (e.g. "Software", "Travel"). Not a foreign key - stored as plain text on the expense row.
- **Running_Total**: The sum of `amount` for all expense entries currently displayed (after filters are applied).
- **Category_Breakdown**: A per-category aggregation of amounts for the currently displayed entries.
- **ZAR**: South African Rand - the currency used for all monetary display values.

---

## Requirements

### Requirement 1: List Expenses

**User Story:** As an admin, I want to view all expense entries in a table, so that I can see what has been spent across the business.

#### Acceptance Criteria

1. THE Expense_Page SHALL fetch all expense entries from the database and render them in the Expense_Table.
2. WHEN no filter parameters are present in the URL, THE Expense_Page SHALL display all expense entries ordered by date descending.
3. WHEN the Expense_Table contains no entries, THE Expense_Page SHALL display a message indicating that no expense entries exist.
4. THE Expense_Table SHALL display the following columns for each entry: date, division name, category, description, and amount formatted in ZAR, and an actions column containing an edit link and a delete button.

---

### Requirement 2: Filter Expenses

**User Story:** As an admin, I want to filter expenses by division, category, and month, so that I can focus on specific subsets of spending.

#### Acceptance Criteria

1. THE Expense_Filter_Bar SHALL render a division selector, a category selector, and a month selector.
2. WHEN a division filter is selected, THE Expense_Page SHALL display only entries whose `divisionId` matches the selected value.
3. WHEN a category filter is selected, THE Expense_Page SHALL display only entries whose `category` matches the selected value.
4. WHEN a month filter is selected, THE Expense_Page SHALL display only entries whose `date` falls within the selected calendar month.
5. WHEN multiple filters are active simultaneously, THE Expense_Page SHALL display only entries that satisfy all active filter conditions.
6. THE Expense_Filter_Bar SHALL derive available category options from the distinct categories present in the database.
7. THE Expense_Filter_Bar SHALL derive available month options from the distinct months present in the database.
8. WHEN a filter is cleared, THE Expense_Page SHALL display entries as if that filter was never applied.

---

### Requirement 3: Expense Summary

**User Story:** As an admin, I want to see a running total and category breakdown at the top of the expenses page, so that I can quickly understand spending at a glance.

#### Acceptance Criteria

1. THE Expense_Summary SHALL display the Running_Total of all currently displayed expense entries formatted in ZAR.
2. THE Expense_Summary SHALL display the Category_Breakdown, listing each distinct category and its summed amount formatted in ZAR.
3. WHEN filters are applied, THE Expense_Summary SHALL reflect only the entries that pass the active filters.
4. THE Running_Total SHALL equal the sum of all `amount` values in the currently displayed entries.
5. THE sum of all amounts in the Category_Breakdown SHALL equal the Running_Total.

---

### Requirement 4: Add Expense

**User Story:** As an admin, I want to add a new expense entry inline on the list page, so that I can record spending without navigating away.

#### Acceptance Criteria

1. THE Expense_Add_Form SHALL render inline on the Expense_Page with fields for date, division, category, description, and amount.
2. THE Expense_Add_Form SHALL require date, division, category, and amount before submission is allowed.
3. THE Expense_Add_Form SHALL render a `<datalist>` for the category field populated with distinct existing categories to enable autocomplete.
4. WHEN a valid form is submitted, THE Expense_Add_Form SHALL invoke the `createExpense` Server_Action with the form data.
5. WHEN the `createExpense` Server_Action succeeds, THE Expense_Add_Form SHALL reset all fields to their default empty state.
6. WHEN the `createExpense` Server_Action returns an error, THE Expense_Add_Form SHALL display the error message below the form.
7. WHILE a submission is pending, THE Expense_Add_Form SHALL disable all form controls and the submit button.

---

### Requirement 5: Create Expense Server Action

**User Story:** As a developer, I want a `createExpense` Server Action that validates and persists a new expense, so that data integrity is enforced on the server.

#### Acceptance Criteria

1. THE `createExpense` Server_Action SHALL validate form data against ExpenseSchema before any database write.
2. WHEN ExpenseSchema validation fails, THE `createExpense` Server_Action SHALL return `{ error: <first validation message> }` without writing to the database.
3. WHEN ExpenseSchema validation passes, THE `createExpense` Server_Action SHALL insert a new row into the `expenses` table with `amount` stored as `String(parsed.amount)`.
4. WHEN the database insert succeeds, THE `createExpense` Server_Action SHALL call `revalidatePath('/expenses')` and `revalidatePath('/dashboard')`.
5. IF a database error occurs, THEN THE `createExpense` Server_Action SHALL return `{ error: <error message> }` without calling `revalidatePath`.
6. THE `createExpense` Server_Action SHALL return `Promise<{ error?: string }>` and SHALL NOT throw under any input condition.

---

### Requirement 6: Edit Expense

**User Story:** As an admin, I want to edit an existing expense entry on a dedicated page, so that I can correct mistakes or update details.

#### Acceptance Criteria

1. THE Expense_Edit_Page SHALL fetch the expense entry by `id` and render it in the Expense_Edit_Form with all fields pre-populated.
2. WHEN no expense entry exists for the given `id`, THE Expense_Edit_Page SHALL render a 404 not-found response.
3. THE Expense_Edit_Form SHALL require date, division, category, and amount before submission is allowed.
4. THE Expense_Edit_Form SHALL render a `<datalist>` for the category field populated with distinct existing categories to enable autocomplete, consistent with the Expense_Add_Form behaviour.
5. WHEN a valid form is submitted, THE Expense_Edit_Form SHALL invoke the `updateExpense` Server_Action with the entry `id` and form data.
6. WHEN the `updateExpense` Server_Action succeeds, THE Expense_Edit_Form SHALL navigate the user back to `/expenses`.
7. WHEN the `updateExpense` Server_Action returns an error, THE Expense_Edit_Form SHALL display the error message below the form.
8. WHILE a submission is pending, THE Expense_Edit_Form SHALL disable all form controls and the submit button.

---

### Requirement 7: Update Expense Server Action

**User Story:** As a developer, I want an `updateExpense` Server Action that validates and persists changes to an existing expense, so that edits are safe and consistent.

#### Acceptance Criteria

1. THE `updateExpense` Server_Action SHALL validate form data against ExpenseSchema before any database write.
2. WHEN ExpenseSchema validation fails, THE `updateExpense` Server_Action SHALL return `{ error: <first validation message> }` without writing to the database.
3. WHEN ExpenseSchema validation passes, THE `updateExpense` Server_Action SHALL update the matching row in the `expenses` table, setting `amount` as `String(parsed.amount)` and `updatedAt` to the current timestamp.
4. WHEN the database update succeeds, THE `updateExpense` Server_Action SHALL call `revalidatePath('/expenses')` and `revalidatePath('/dashboard')`.
5. IF a database error occurs, THEN THE `updateExpense` Server_Action SHALL return `{ error: <error message> }` without calling `revalidatePath`.
6. THE `updateExpense` Server_Action SHALL return `Promise<{ error?: string }>` and SHALL NOT throw under any input condition.

---

### Requirement 8: Delete Expense

**User Story:** As an admin, I want to delete an expense entry from the list, so that I can remove erroneous records.

#### Acceptance Criteria

1. THE Expense_Table SHALL render a delete button for each entry that, when clicked, shows an inline confirmation prompt.
2. THE Expense_Table SHALL render an edit link for each entry that navigates the user to `/expenses/[id]`.
3. WHEN the delete is confirmed, THE Expense_Table SHALL invoke the `deleteExpense` Server_Action with the entry `id`.
4. WHEN the `deleteExpense` Server_Action succeeds, THE Expense_Table SHALL reflect the removal via cache revalidation.
5. WHEN the `deleteExpense` Server_Action returns an error, THE Expense_Table SHALL display the error as a toast notification.
6. WHEN the delete is cancelled, THE Expense_Table SHALL return to its normal state without invoking the Server_Action.

---

### Requirement 9: Delete Expense Server Action

**User Story:** As a developer, I want a `deleteExpense` Server Action that removes an expense entry, so that deletions are handled safely on the server.

#### Acceptance Criteria

1. WHEN called with a valid `id`, THE `deleteExpense` Server_Action SHALL delete the matching row from the `expenses` table.
2. WHEN the database delete succeeds, THE `deleteExpense` Server_Action SHALL call `revalidatePath('/expenses')` and `revalidatePath('/dashboard')`.
3. IF a database error occurs, THEN THE `deleteExpense` Server_Action SHALL return `{ error: <error message> }` without calling `revalidatePath`.
4. THE `deleteExpense` Server_Action SHALL return `Promise<{ error?: string }>` and SHALL NOT throw under any input condition.

---

### Requirement 10: ExpenseSchema Validation

**User Story:** As a developer, I want a Zod schema that validates all expense form data, so that invalid data never reaches the database.

#### Acceptance Criteria

1. THE ExpenseSchema SHALL require `date` as a non-empty string.
2. THE ExpenseSchema SHALL require `divisionId` as a valid UUID string.
3. THE ExpenseSchema SHALL require `category` as a non-empty string.
4. THE ExpenseSchema SHALL accept `description` as an optional string.
5. THE ExpenseSchema SHALL require `amount` as a coerced positive number.
6. WHEN any required field is missing or invalid, THE ExpenseSchema SHALL produce a descriptive validation error message.
7. FOR ALL valid expense data objects, parsing the object with ExpenseSchema SHALL produce an output with the same `date`, `divisionId`, `category`, `description`, and a numeric `amount` (round-trip property).

---

### Requirement 11: Database Query Helpers

**User Story:** As a developer, I want query helper functions in `@pmg/db` for expenses, so that data access is centralised and reusable.

#### Acceptance Criteria

1. THE `@pmg/db` package SHALL export a `getAllExpenses(filters?)` function that accepts optional `divisionId`, `category`, and `month` filter parameters and returns all matching expense rows joined with division name.
2. THE `@pmg/db` package SHALL export a `getExpenseById(id)` function that returns a single expense row joined with division name, or `null` if not found.
3. THE `@pmg/db` package SHALL export a `getDistinctExpenseMonths()` function that returns an array of distinct `YYYY-MM` strings derived from the `date` column, ordered ascending.
4. THE `@pmg/db` package SHALL export a `getDistinctExpenseCategories()` function that returns an array of distinct category strings ordered alphabetically.
5. THE `@pmg/db` package SHALL export an `ExpenseRow` type representing the shape returned by `getAllExpenses` and `getExpenseById`, containing at minimum: `id` (string), `date` (string), `divisionId` (string), `divisionName` (string), `category` (string), `description` (string | null), `amount` (string), `createdAt`, and `updatedAt`.
6. WHEN `getAllExpenses` is called with a `month` filter of `YYYY-MM`, THE function SHALL return only entries whose `date` starts with that `YYYY-MM` prefix.
7. WHEN `getAllExpenses` is called with no filters, THE function SHALL return all expense rows.
