export * from "./client";
export * from "./schema";
export * from "./queries";
export * from "./accounts";
export { eq, and, desc, asc, sql } from "drizzle-orm";
export type { PeriodSummary, LeadRow, DivisionRow, SnapshotRow, ClientWithIncomeCount, LedgerEntryRow } from './queries';
export { getAllLedgerEntries, getLedgerById, getLedgerByAllocation, getLedgerByAllocationYTD } from './queries';
export { getAllSnapshots, getSnapshotByPeriod, insertSnapshot } from './queries';
export { getClientsWithIncomeCount, getClientById, setClientActive } from './queries';
export { getDivisionWithStatsById, setDivisionActive } from './queries';
export { getAllExpenseCategories, getExpenseCategoryById } from './queries';
export type { ExpenseCategory } from './schema/expense-categories';
export type { Invitation, NewInvitation } from './schema/invitations';

// ── Billing module ────────────────────────────────────────────────────────────
export * from './queries/billing';
export { getNextDocumentNumber } from './lib/document-numbers';
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
} from './queries/billing';
export { getActiveItems, getUnlinkedIncomeForClient, getStatementYears } from './queries/billing';

