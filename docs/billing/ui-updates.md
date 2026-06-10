
# Billing Pages UI/UX Updates

## Reference Page

Use the current Statements page as the reference implementation:

`/billing/statements`

The statements table already works correctly. The full table row is clickable and takes the user to the detailed statement page. Apply the same interaction pattern to the following pages.

---

## Pages to Update

* `/billing/quotes`
* `/billing/invoices`
* `/billing/payments`
* `/billing/items`

---

## 1. Quotes Page

On `/billing/quotes`:

* Make the full table row clickable.
* Clicking anywhere on the row should navigate to the quote detail page.
* Keep the existing action column with the three-dot menu.
* Add a clear title/tooltip to the three-dot action menu, for example: `Actions`.
* Ensure clicking the action menu does not trigger the row navigation.

Expected behaviour:

* Row click = open quote detail page.
* Three-dot menu click = open quote actions only.

---

## 2. Invoices Page

On `/billing/invoices`:

* Make the full table row clickable.
* Clicking anywhere on the row should navigate to the invoice detail page.
* Keep the existing action column with the three-dot menu.
* Add a clear title/tooltip to the three-dot action menu, for example: `Actions`.
* Ensure clicking the action menu does not trigger the row navigation.

Expected behaviour:

* Row click = open invoice detail page.
* Three-dot menu click = open invoice actions only.

---

## 3. Payments Page

On `/billing/payments`:

* Make the full table row clickable.
* Clicking anywhere on the row should navigate to the payment detail page.
* Remove the eye/view icon because the full row click will now perform the same action.
* Hide horizontal overflow where possible.
* Remove the `Allocated` column.
* Keep the credit/unallocated balance column because it already shows whether there is remaining credit or unallocated balance.

Expected behaviour:

* Row click = open payment detail page.
* No duplicate view action/icon.
* Cleaner table with fewer unnecessary columns.

---

## 4. Payment Editing UX Improvement

Improve the payment editing flow.

Instead of editing payments from theinline table, use the payment detail page as the main editing location.

Recommended flow:

* User clicks a payment row.
* User lands on the payment detail page.
* Add an `Edit Payment` button on the payment detail page.
* When clicked, display the edit form using the same UI pattern as the “Add New Payment” form.
* Pre-fill the form with the existing payment details.
* Save updates from the detail page.

This keeps the payment experience consistent with the existing add-payment flow and improves the overall UI/UX.

---

## 5. Items Page

On `/billing/items`:

* Make the full table row clickable.
* Clicking anywhere on the row should navigate to the item detail page.
* Remove the edit button from the table because it duplicates the row-click/detail-page action.
* Editing should happen from the item detail page instead.

Expected behaviour:

* Row click = open item detail page.
* Edit action is handled inside the item detail page.
* Table remains cleaner and easier to use.

---

## General Implementation Notes

* Use the `/billing/statements` table as the pattern for clickable rows.
* Add proper hover styling so users clearly understand that rows are clickable.
* Ensure keyboard accessibility where possible.
* Prevent event bubbling from dropdown/action buttons inside clickable rows.
* Keep table behaviour consistent across Quotes, Invoices, Payments, Items, and Statements.
* The goal is to reduce duplicate actions, improve navigation, and make the billing module feel consistent across all document types.
