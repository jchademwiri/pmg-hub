'use server';

import {
  getDb,
  getActiveChartAccounts,
  getJournalEntries,
  getGeneralLedger,
  getTrialBalance,
  getProfitAndLoss,
  getProfitAndLossByDivision,
  getOrganisationSettings,
  divisions,
} from '@pmg/db';
import { getSessionOrRedirect } from '@/lib/auth';

export interface ReportPreviewFilter {
  reportType: 'chart-of-accounts' | 'journal-entries' | 'general-ledger' | 'trial-balance' | 'profit-and-loss';
  period?: string;
  startDate?: string;
  endDate?: string;
  divisionId?: string;
  accountId?: string;
}

export function resolvePeriodDateRange(periodStr?: string, customStart?: string, customEnd?: string) {
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

    const { periodMonth, startDate, endDate } = resolvePeriodDateRange(filter.period, filter.startDate, filter.endDate);

    let data: any = null;

    switch (filter.reportType) {
      case 'chart-of-accounts': {
        const accounts = await getActiveChartAccounts();
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
        const [statement, divisions] = await Promise.all([
          getProfitAndLoss(periodMonth, d, startDate, endDate),
          getProfitAndLossByDivision(periodMonth, startDate, endDate),
        ]);
        data = { statement, divisions };
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
