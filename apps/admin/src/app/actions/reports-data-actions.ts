'use server';

import {
  getDb,
  getActiveChartAccounts,
  getJournalEntries,
  getGeneralLedger,
  getTrialBalance,
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

    let data: any = null;

    switch (filter.reportType) {
      case 'chart-of-accounts': {
        const accounts = await getActiveChartAccounts();
        data = { accounts };
        break;
      }

      case 'journal-entries': {
        const result = await getJournalEntries({
          period: filter.period !== 'all' ? filter.period : undefined,
          divisionId: filter.divisionId !== 'all' ? filter.divisionId : undefined,
          pageSize: 500,
        });
        data = { entries: result.data, total: result.total };
        break;
      }

      case 'general-ledger': {
        const result = await getGeneralLedger({
          startDate: filter.startDate,
          endDate: filter.endDate,
          accountId: filter.accountId !== 'all' ? filter.accountId : undefined,
          divisionId: filter.divisionId !== 'all' ? filter.divisionId : undefined,
          pageSize: 500,
        });
        data = { lines: result.data, total: result.total };
        break;
      }

      case 'trial-balance': {
        const p = filter.period !== 'all' ? filter.period : undefined;
        const d = filter.divisionId !== 'all' ? filter.divisionId : undefined;
        const rows = await getTrialBalance(p, d);
        const totalDebits = rows.reduce((s, r: any) => s + (Number(r.debit ?? r.totalDebits) || 0), 0);
        const totalCredits = rows.reduce((s, r: any) => s + (Number(r.credit ?? r.totalCredits) || 0), 0);
        data = { rows, totalDebits, totalCredits };
        break;
      }

      case 'profit-and-loss': {
        const result = await getProfitAndLossByDivision(
          filter.period !== 'all' ? filter.period : undefined
        );
        data = { divisions: result };
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
