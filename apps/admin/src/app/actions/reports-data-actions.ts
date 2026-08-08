'use server';

import {
  getDb,
  getActiveChartAccounts,
  getJournalEntries,
  getGeneralLedger,
  getTrialBalance,
  getProfitAndLoss,
  getProfitAndLossByDivision,
  getClientPerformance,
  getBalanceSheet,
  getCashFlowStatement,
  getAnnualFinancialStatements,
  getOrganisationSettings,
  divisions,
} from '@pmg/db';
import { getSessionOrRedirect } from '@/lib/auth';

export interface ReportPreviewFilter {
  reportType:
    | 'overview'
    | 'annual-financial-statements'
    | 'balance-sheet'
    | 'profit-and-loss'
    | 'cash-flow'
    | 'changes-in-equity'
    | 'division-performance'
    | 'client-performance'
    | 'trial-balance'
    | 'journal-entries'
    | 'general-ledger'
    | 'chart-of-accounts';
  period?: string;
  startDate?: string;
  endDate?: string;
  divisionId?: string;
  accountId?: string;
  category?: string;
}

export async function resolvePeriodDateRange(periodStr?: string, customStart?: string, customEnd?: string) {
  let startDate = customStart;
  let endDate = customEnd;
  let periodMonth: string | undefined = undefined;

  if (periodStr && periodStr !== 'all') {
    if (/^\d{4}-\d{2}$/.test(periodStr)) {
      periodMonth = periodStr;
    } else if (/^(\d{4})-Q([1-4])$/.test(periodStr)) {
      const match = periodStr.match(/^(\d{4})-Q([1-4])$/)!;
      const yr = match[1];
      const q = parseInt(match[2], 10);
      const starts = ['01-01', '04-01', '07-01', '10-01'];
      const ends = ['03-31', '06-30', '09-30', '12-31'];
      startDate = `${yr}-${starts[q - 1]}`;
      endDate = `${yr}-${ends[q - 1]}`;
    } else if (/^(\d{4})-H([1-2])$/.test(periodStr)) {
      const match = periodStr.match(/^(\d{4})-H([1-2])$/)!;
      const yr = match[1];
      const h = match[2];
      if (h === '1') {
        startDate = `${yr}-01-01`;
        endDate = `${yr}-06-30`;
      } else {
        startDate = `${yr}-07-01`;
        endDate = `${yr}-12-31`;
      }
    } else if (/^(FY)?(\d{4})$/.test(periodStr)) {
      const match = periodStr.match(/^(FY)?(\d{4})$/)!;
      const yr = match[2];
      startDate = `${yr}-01-01`;
      endDate = `${yr}-12-31`;
    }
  }

  return { periodMonth, startDate, endDate };
}

export async function fetchReportPreviewData(filter: ReportPreviewFilter) {
  try {
    await getSessionOrRedirect();
    const db = getDb();

    const [orgSettings, divList] = await Promise.all([
      getOrganisationSettings(),
      db.select({ id: divisions.id, name: divisions.name }).from(divisions),
    ]);

    const activeDivision = filter.divisionId && filter.divisionId !== 'all'
      ? divList.find((d) => d.id === filter.divisionId)
      : null;

    const { periodMonth, startDate, endDate } = await resolvePeriodDateRange(filter.period, filter.startDate, filter.endDate);

    let data: any = null;

    switch (filter.reportType) {
      case 'overview': {
        const d = filter.divisionId !== 'all' ? filter.divisionId : undefined;
        const [afs, trialBalanceRows] = await Promise.all([
          getAnnualFinancialStatements(periodMonth, d, startDate, endDate),
          getTrialBalance(periodMonth, d, startDate, endDate),
        ]);
        data = { afs, trialBalanceRows };
        break;
      }

      case 'chart-of-accounts': {
        let accounts = await getActiveChartAccounts();
        if (filter.category && filter.category !== 'all') {
          accounts = accounts.filter((a) => a.type === filter.category);
        }
        data = { accounts };
        break;
      }

      case 'journal-entries': {
        const result = await getJournalEntries({
          period: periodMonth,
          divisionId: filter.divisionId !== 'all' ? filter.divisionId : undefined,
          pageSize: 500,
        });
        data = { entries: result.data, total: result.total };
        break;
      }

      case 'general-ledger': {
        const result = await getGeneralLedger({
          startDate,
          endDate,
          accountId: filter.accountId !== 'all' ? filter.accountId : undefined,
          divisionId: filter.divisionId !== 'all' ? filter.divisionId : undefined,
          pageSize: 500,
        });
        data = { lines: result.data, total: result.total };
        break;
      }

      case 'trial-balance': {
        const d = filter.divisionId !== 'all' ? filter.divisionId : undefined;
        const rows = await getTrialBalance(periodMonth, d, startDate, endDate);
        const totalDebits = rows.reduce((s, r: any) => s + (Number(r.debit ?? r.totalDebits) || 0), 0);
        const totalCredits = rows.reduce((s, r: any) => s + (Number(r.credit ?? r.totalCredits) || 0), 0);
        data = { rows, totalDebits, totalCredits };
        break;
      }

      case 'profit-and-loss': {
        const d = filter.divisionId !== 'all' ? filter.divisionId : undefined;
        const statement = await getProfitAndLoss(periodMonth, d, startDate, endDate);
        data = { statement };
        break;
      }

      case 'division-performance': {
        const divisions = await getProfitAndLossByDivision(periodMonth, startDate, endDate);
        data = { divisions };
        break;
      }

      case 'client-performance': {
        const clients = await getClientPerformance(periodMonth, startDate, endDate);
        data = { clients };
        break;
      }

      case 'balance-sheet': {
        const d = filter.divisionId !== 'all' ? filter.divisionId : undefined;
        const balanceSheet = await getBalanceSheet(periodMonth, d, startDate, endDate);
        data = { balanceSheet };
        break;
      }

      case 'annual-financial-statements': {
        const d = filter.divisionId !== 'all' ? filter.divisionId : undefined;
        const afs = await getAnnualFinancialStatements(periodMonth, d, startDate, endDate);
        data = { afs };
        break;
      }

      case 'changes-in-equity': {
        const d = filter.divisionId !== 'all' ? filter.divisionId : undefined;
        const afs = await getAnnualFinancialStatements(periodMonth, d, startDate, endDate);
        data = { afs };
        break;
      }

      case 'cash-flow': {
        const d = filter.divisionId !== 'all' ? filter.divisionId : undefined;
        const cashFlow = await getCashFlowStatement(periodMonth, d, startDate, endDate);
        data = { cashFlow };
        break;
      }
    }

    return {
      success: true,
      orgSettings,
      divisionName: activeDivision?.name ?? 'All Divisions',
      data,
    };
  } catch (error: any) {
    console.error('Failed to fetch report preview data:', error);
    return { success: false, error: error?.message || 'Failed to load preview data.' };
  }
}
