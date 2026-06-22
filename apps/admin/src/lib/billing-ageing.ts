/**
 * Shared ageing calculation for customer statements.
 *
 * Used by the server-side PDF generator, the client workspace preview,
 * and the invoice detail page's hidden printable statement area.
 */

export type AgeingBucket = {
  current: number;
  days1_14: number;
  days15_30: number;
  days31_60: number;
  days61_90: number;
  days91_120: number;
};

export type AgeingInvoice = {
  dueDate?: string | null;
  invoiceDate: string;
  status: string;
  total: number | string;
  allocatedAmount?: number | string | null;
};

/**
 * Compute ageing buckets from a list of invoices.
 *
 * @param invoices - Invoice-like rows with status, dates, and financial fields.
 * @param todayStr - Today's date in YYYY-MM-DD format (SAST-aware).
 * @returns An AgeingBucket with totals per overdue range.
 */
export function calculateAgeing(
  invoices: AgeingInvoice[],
  todayStr: string,
): AgeingBucket {
  const ageing: AgeingBucket = {
    current: 0,
    days1_14: 0,
    days15_30: 0,
    days31_60: 0,
    days61_90: 0,
    days91_120: 0,
  };

  for (const invoice of invoices) {
    // Only invoices with an outstanding balance that are still active
    if (!['issued', 'overdue', 'partially_paid'].includes(invoice.status)) {
      continue;
    }

    const dueDateStr = invoice.dueDate ?? invoice.invoiceDate;
    const diffTime = new Date(todayStr).getTime() - new Date(dueDateStr).getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const total = Number(invoice.total) || 0;
    const allocated = Number(invoice.allocatedAmount ?? 0) || 0;
    const outstanding = total - allocated;
    if (outstanding <= 0) continue;

    if (diffDays <= 0) {
      ageing.current += outstanding;
    } else if (diffDays <= 14) {
      ageing.days1_14 += outstanding;
    } else if (diffDays <= 30) {
      ageing.days15_30 += outstanding;
    } else if (diffDays <= 60) {
      ageing.days31_60 += outstanding;
    } else if (diffDays <= 90) {
      ageing.days61_90 += outstanding;
    } else {
      ageing.days91_120 += outstanding;
    }
  }

  return ageing;
}

/**
 * Sum the six ageing buckets into a single total-due figure.
 */
export function totalAgeingDue(ageing: AgeingBucket): number {
  return (
    ageing.current +
    ageing.days1_14 +
    ageing.days15_30 +
    ageing.days31_60 +
    ageing.days61_90 +
    ageing.days91_120
  );
}
