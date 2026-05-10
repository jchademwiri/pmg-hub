When editing an existing quote or invoice, the form is not preserving the previously selected line items.
After opening the edit page, all items are cleared/reset, forcing the user to manually reselect every item again.

Expected behavior:

* When editing a quote or invoice, all existing data must preload correctly.
* Previously selected items/products/services must remain attached to the document.
* Quantities, rates, descriptions, totals, VAT settings, and any item-specific values must populate automatically.
* Editing should behave like updating existing data, not creating a new blank document.

Current issue:

* The edit form loads without the saved items.
* Item selection state is being lost during initialization or form hydration.
* This suggests the items array is either:

  * not being fetched from the database,
  * not being passed into default form values,
  * or being overwritten/reset when the form mounts.

Things to check:

1. Ensure invoice/quote items are included in the database query when fetching the document.
2. Ensure `defaultValues` in the form include the existing items array.
3. Prevent form reset logic from clearing items on mount/re-render.
4. If using React Hook Form + Field Arrays:

   * ensure `useFieldArray` is initialized with existing items
   * avoid calling `replace([])` or `reset()` incorrectly
5. Ensure item IDs and selected product references persist during edit mode.
6. Verify server-to-client serialization is not stripping nested item data.

Goal:
Editing an invoice or quote should fully preserve and preload all existing items so the user only changes what is necessary instead of rebuilding the document from scratch.
