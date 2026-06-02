import { getDb } from '@pmg/db';

let hasBillingLineItemItemIdColumnPromise: Promise<boolean> | null = null;

export async function hasBillingLineItemItemIdColumn() {
  if (!hasBillingLineItemItemIdColumnPromise) {
    hasBillingLineItemItemIdColumnPromise = getDb()
      .execute(`
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'billing_line_items'
            AND column_name = 'item_id'
        ) AS "exists"
      `)
      .then((res) => {
        const rows = (res as { rows?: Array<{ exists?: boolean }> }).rows;
        const exists = Boolean(rows?.[0]?.exists);
        if (!exists) hasBillingLineItemItemIdColumnPromise = null;
        return exists;
      })
      .catch(() => {
        hasBillingLineItemItemIdColumnPromise = null;
        return false;
      });
  }
  return hasBillingLineItemItemIdColumnPromise;
}

export function lineItemInsertValues(
  item: { itemId?: string | null; description: string; quantity: number; unitPrice: number },
  documentType: 'quote' | 'invoice',
  documentId: string,
  sortOrder: number,
  includeItemId: boolean,
) {
  return {
    documentType,
    documentId,
    sortOrder,
    ...(includeItemId ? { itemId: item.itemId ?? null } : {}),
    description: item.description,
    quantity: String(item.quantity),
    unitPrice: String(item.unitPrice.toFixed(2)),
    vatRate: '0',
    lineTotal: String((item.quantity * item.unitPrice).toFixed(2)),
  };
}
