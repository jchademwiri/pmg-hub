export * from "./client";
export * from "./schema";
export * from "./queries";
export * from "./accounts";
export { eq, and, or, desc, asc, sql, inArray } from "drizzle-orm";
export type { PeriodSummary, LeadRow, DivisionRow, SnapshotRow, ClientWithIncomeCount, LedgerEntryRow } from './queries';
export { getAllLedgerEntries, getLedgerById, getLedgerByAllocation, getLedgerByAllocationYTD } from './queries';
export { getAllSnapshots, getSnapshotByPeriod, insertSnapshot, isPeriodLocked } from './queries';
export { getIncomeByPeriod, getExpensesByPeriod, getLedgerEntriesByPeriod, getUncategorizedExpensesCount, getDraftInvoicesCount, getPeriodTotals } from './queries/general';
export { getClientsWithIncomeCount, getClientById, setClientActive } from './queries';
export { getDivisionWithStatsById, setDivisionActive } from './queries';
export { getAllExpenseCategories, getExpenseCategoryById } from './queries';
export type { ExpenseCategory } from './schema/expense-categories';
export type { Invitation, NewInvitation } from './schema/invitations';

// ── Billing module ────────────────────────────────────────────────────────────
export * from './queries/billing';
export { getNextDocumentNumber, deriveDivisionPrefix } from './lib/document-numbers';
export { bridgeDatabaseEnv } from './env';
export type {
  QuotationRow,
  InvoiceRow,
  QuotationDetail,
  InvoiceDetail,
  ClientStatement,
  ClientBillingRow,
  BillingItemRow,
  BillingItemDetail,
  LineItemDetail,
  OrganisationSettings,
  DivisionBillingSettings,
  AgingBucket,
  AgingRow,
  ClientAgingRow,
  OutstandingInvoiceRow,
} from './queries/billing';
export { getActiveItems, getUnlinkedIncomeForClient, getStatementYears, getAgingReport, getClientAgingReport, getClientOutstandingInvoices } from './queries/billing';

// ── Distribution Settings ──────────────────────────────────────────────────────
export { getActiveRates, getActiveRateForKey, getCurrentRates, getAllDistributionSettings } from './queries/distribution-settings';
export type { ActiveRates, RateKey } from './queries/distribution-settings';

// ── Accounting ───────────────────────────────────────────────────────────────
export {
  getAllChartAccounts,
  getActiveChartAccounts,
  getChartAccountsByType,
  getChartAccountById,
  getNextAccountCode,
  getJournalEntries,
  getJournalEntryWithLines,
  validateJournalLines,
  getNextJournalEntryNumber,
  getAllAccountingPeriods,
  getCurrentOpenPeriod,
  isPeriodOpen,
  getTrialBalance,
  getProfitAndLoss,
  getGeneralLedger,
  getAccountingOverview,
  ensureOpenPeriod,
  closePeriod,
  lockPeriod,
  reopenPeriod,
} from './queries/accounting';
export type {
  TrialBalanceRow,
  ProfitAndLossRow,
  ProfitAndLossResult,
  GeneralLedgerRow,
  AccountingOverview,
  AccountingPeriodWithNames,
} from './queries/accounting';
export type {
  ChartAccount,
  NewChartAccount,
  JournalEntry,
  NewJournalEntry,
  JournalLine,
  NewJournalLine,
  AccountingPeriod,
  NewAccountingPeriod,
} from './schema/accounting';

// ── Date utilities ────────────────────────────────────────────────────────────
export { addDays, today } from './lib/date-utils';

