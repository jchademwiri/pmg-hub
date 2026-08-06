import 'server-only';

export type AccountingReportType =
  | 'profit-and-loss'
  | 'trial-balance'
  | 'general-ledger'
  | 'journal-entries'
  | 'chart-of-accounts';

export interface AccountingPdfFilters {
  /** Accounting period, "YYYY-MM". Used by journal-entries, trial-balance, profit-and-loss. */
  period?: string;
  /** Chart-of-accounts account id. Used by general-ledger. */
  accountId?: string;
}

export interface AccountingPdfResult {
  fileName: string;
  buffer: Buffer;
}

const REPORT_TYPES: ReadonlySet<AccountingReportType> = new Set([
  'profit-and-loss',
  'trial-balance',
  'general-ledger',
  'journal-entries',
  'chart-of-accounts',
]);

export function isAccountingReportType(value: string): value is AccountingReportType {
  return REPORT_TYPES.has(value as AccountingReportType);
}

/**
 * Generates a PDF for one of the 5 accounting reports on /accounting/exports.
 * Returns null for a valid-but-not-yet-implemented type (filled in phase by
 * phase) or when the underlying data can't be found.
 */
export async function generateAccountingPdf(
  type: AccountingReportType,
  _filters: AccountingPdfFilters = {},
): Promise<AccountingPdfResult | null> {
  switch (type) {
    case 'profit-and-loss':
      return null; // Phase 1
    case 'trial-balance':
      return null; // Phase 2
    case 'general-ledger':
      return null; // Phase 3
    case 'journal-entries':
      return null; // Phase 4
    case 'chart-of-accounts':
      return null; // Phase 5
    default:
      return null;
  }
}
