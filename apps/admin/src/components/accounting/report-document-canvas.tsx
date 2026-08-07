'use client';

import * as React from 'react';
import { formatZAR, fmtDate } from '@/lib/format';

export interface ReportDocumentCanvasProps {
  reportType: 'chart-of-accounts' | 'journal-entries' | 'general-ledger' | 'trial-balance' | 'profit-and-loss';
  reportTitle: string;
  divisionName?: string;
  periodLabel?: string;
  dateRangeLabel?: string;
  orgSettings?: any;
  data: any;
  loading?: boolean;
}

export function ReportDocumentCanvas({
  reportType,
  reportTitle,
  divisionName = 'All Divisions',
  periodLabel = 'All Time',
  dateRangeLabel,
  orgSettings,
  data,
  loading = false,
}: ReportDocumentCanvasProps) {
  const companyName = orgSettings?.registeredName || 'PLAYHOUSE MEDIA GROUP (PTY) LTD';
  const taxNumber = orgSettings?.taxNumber || '9876543210';
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const currentDate = mounted ? fmtDate(new Date()) : '';

  if (loading) {
    return (
      <div className="bg-card border rounded-2xl p-8 min-h-[600px] flex flex-col items-center justify-center gap-3">
        <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground animate-pulse">Generating live document preview...</p>
      </div>
    );
  }

  return (
    <div id="printable-area" className="w-full bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-10 shadow-xl transition-all">
      {/* Document Header & Branding */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between pb-6 border-b border-zinc-200 dark:border-zinc-800 gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white uppercase">{companyName}</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Division: <span className="font-semibold text-zinc-700 dark:text-zinc-300">{divisionName}</span>
          </p>
          {taxNumber && (
            <p className="text-[11px] text-zinc-400 dark:text-zinc-500">VAT / Tax Ref: {taxNumber}</p>
          )}
        </div>

        <div className="sm:text-right">
          <span className="inline-block px-3 py-1 text-xs font-semibold uppercase tracking-wider rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            {reportTitle}
          </span>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
            Period: <span className="font-medium text-zinc-800 dark:text-zinc-200">{periodLabel}</span>
          </p>
          {dateRangeLabel && (
            <p className="text-[11px] text-zinc-400 dark:text-zinc-500">{dateRangeLabel}</p>
          )}
          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">Generated: {currentDate}</p>
        </div>
      </div>

      {/* Document Body View */}
      <div className="mt-6 overflow-x-auto">
        {/* 1. CHART OF ACCOUNTS */}
        {reportType === 'chart-of-accounts' && (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-[10px] font-bold">
                <th className="py-2.5 px-3">Code</th>
                <th className="py-2.5 px-3">Account Name</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
              {data?.accounts?.map((acc: any) => (
                <tr key={acc.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                  <td className="py-2.5 px-3 font-mono font-bold text-zinc-900 dark:text-zinc-100">{acc.code}</td>
                  <td className="py-2.5 px-3 font-medium text-zinc-800 dark:text-zinc-200">{acc.name}</td>
                  <td className="py-2.5 px-3 uppercase text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">{acc.type}</td>
                  <td className="py-2.5 px-3">
                    <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      Active
                    </span>
                  </td>
                </tr>
              ))}
              {(!data?.accounts || data.accounts.length === 0) && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-zinc-400">No chart of accounts records found.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {/* 2. JOURNAL ENTRIES */}
        {reportType === 'journal-entries' && (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-[10px] font-bold">
                <th className="py-2.5 px-3">Entry #</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Description</th>
                <th className="py-2.5 px-3">Source</th>
                <th className="py-2.5 px-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
              {data?.entries?.map((je: any) => (
                <tr key={je.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                  <td className="py-2.5 px-3 font-mono font-bold text-zinc-900 dark:text-zinc-100">{je.entryNumber}</td>
                  <td className="py-2.5 px-3 text-zinc-600 dark:text-zinc-400 tabular-nums">{fmtDate(je.entryDate)}</td>
                  <td className="py-2.5 px-3 font-medium text-zinc-800 dark:text-zinc-200">{je.description || '—'}</td>
                  <td className="py-2.5 px-3 text-zinc-500 dark:text-zinc-400 uppercase text-[10px]">{je.sourceModule} / {je.sourceTable}</td>
                  <td className="py-2.5 px-3 text-right">
                    <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-full ${
                      je.status === 'posted' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-zinc-500/10 text-zinc-500'
                    }`}>
                      {je.status}
                    </span>
                  </td>
                </tr>
              ))}
              {(!data?.entries || data.entries.length === 0) && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-zinc-400">No journal entries found for selected filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {/* 3. GENERAL LEDGER */}
        {reportType === 'general-ledger' && (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-[10px] font-bold">
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Entry #</th>
                <th className="py-2.5 px-3">Account</th>
                <th className="py-2.5 px-3">Description</th>
                <th className="py-2.5 px-3 text-right">Debit (ZAR)</th>
                <th className="py-2.5 px-3 text-right">Credit (ZAR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
              {data?.lines?.map((line: any) => (
                <tr key={line.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                  <td className="py-2.5 px-3 text-zinc-600 dark:text-zinc-400 tabular-nums">{fmtDate(line.entryDate)}</td>
                  <td className="py-2.5 px-3 font-mono font-bold text-zinc-900 dark:text-zinc-100">{line.entryNumber}</td>
                  <td className="py-2.5 px-3 font-medium text-zinc-800 dark:text-zinc-200">
                    <span className="font-mono text-xs mr-1.5 text-zinc-500">{line.accountCode}</span>
                    {line.accountName}
                  </td>
                  <td className="py-2.5 px-3 text-zinc-600 dark:text-zinc-400">{line.lineDescription || line.description || '—'}</td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums text-zinc-900 dark:text-zinc-100">
                    {line.debit > 0 ? formatZAR(line.debit) : '—'}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums text-zinc-900 dark:text-zinc-100">
                    {line.credit > 0 ? formatZAR(line.credit) : '—'}
                  </td>
                </tr>
              ))}
              {(!data?.lines || data.lines.length === 0) && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-zinc-400">No general ledger lines found.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {/* 4. TRIAL BALANCE */}
        {reportType === 'trial-balance' && (
          <div>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-[10px] font-bold">
                  <th className="py-2.5 px-3">Code</th>
                  <th className="py-2.5 px-3">Account Name</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3 text-right">Debit (ZAR)</th>
                  <th className="py-2.5 px-3 text-right">Credit (ZAR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                {data?.rows?.map((row: any) => (
                  <tr key={row.accountId} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                    <td className="py-2.5 px-3 font-mono font-bold text-zinc-900 dark:text-zinc-100">{row.accountCode}</td>
                    <td className="py-2.5 px-3 font-medium text-zinc-800 dark:text-zinc-200">{row.accountName}</td>
                    <td className="py-2.5 px-3 uppercase text-[10px] text-zinc-500">{row.accountType}</td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-zinc-900 dark:text-zinc-100">
                      {row.debit > 0 ? formatZAR(row.debit) : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-zinc-900 dark:text-zinc-100">
                      {row.credit > 0 ? formatZAR(row.credit) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              {data && (
                <tfoot>
                  <tr className="border-t-2 border-zinc-900 dark:border-zinc-100 font-bold text-xs">
                    <td colSpan={3} className="py-3 px-3 uppercase tracking-wider text-zinc-900 dark:text-white">Total Ledger Balance</td>
                    <td className="py-3 px-3 text-right font-mono text-zinc-900 dark:text-white tabular-nums">{formatZAR(data.totalDebits || 0)}</td>
                    <td className="py-3 px-3 text-right font-mono text-zinc-900 dark:text-white tabular-nums">{formatZAR(data.totalCredits || 0)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}

        {/* 5. PROFIT & LOSS */}
        {reportType === 'profit-and-loss' && (
          <div className="flex flex-col gap-8">
            {/* Section A: Corporate Profit & Loss Statement */}
            <div className="flex flex-col gap-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 border-b pb-1">
                1. Profit & Loss Statement (Account Breakdown)
              </h3>

              {/* Revenue Accounts */}
              <div>
                <h4 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Sales & Revenue Income</h4>
                <table className="w-full text-left text-xs border-collapse">
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                    {data?.statement?.revenue?.map((row: any) => (
                      <tr key={row.accountId} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                        <td className="py-2 px-3 font-mono text-zinc-500 w-20">{row.accountCode}</td>
                        <td className="py-2 px-3 font-medium text-zinc-800 dark:text-zinc-200">{row.accountName}</td>
                        <td className="py-2 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400 font-semibold">{formatZAR(row.amount)}</td>
                      </tr>
                    ))}
                    {(!data?.statement?.revenue || data.statement.revenue.length === 0) && (
                      <tr>
                        <td colSpan={3} className="py-3 px-3 text-zinc-400 italic text-[11px]">No revenue transactions recorded.</td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-zinc-300 dark:border-zinc-700 font-bold">
                      <td colSpan={2} className="py-2.5 px-3 text-zinc-900 dark:text-white uppercase">Total Operating Revenue</td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400">{formatZAR(data?.statement?.totalRevenue || 0)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Expense Accounts */}
              <div className="mt-2">
                <h4 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Operating Expenses</h4>
                <table className="w-full text-left text-xs border-collapse">
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                    {data?.statement?.expenses?.map((row: any) => (
                      <tr key={row.accountId} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                        <td className="py-2 px-3 font-mono text-zinc-500 w-20">{row.accountCode}</td>
                        <td className="py-2 px-3 font-medium text-zinc-800 dark:text-zinc-200">{row.accountName}</td>
                        <td className="py-2 px-3 text-right font-mono text-zinc-800 dark:text-zinc-200">{formatZAR(row.amount)}</td>
                      </tr>
                    ))}
                    {(!data?.statement?.expenses || data.statement.expenses.length === 0) && (
                      <tr>
                        <td colSpan={3} className="py-3 px-3 text-zinc-400 italic text-[11px]">No operating expenses recorded.</td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-zinc-300 dark:border-zinc-700 font-bold">
                      <td colSpan={2} className="py-2.5 px-3 text-zinc-900 dark:text-white uppercase">Total Operating Expenses</td>
                      <td className="py-2.5 px-3 text-right font-mono text-zinc-800 dark:text-zinc-200">{formatZAR(data?.statement?.totalExpenses || 0)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Net Profit Summary Band */}
              <div className="p-3.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 flex justify-between items-center border border-zinc-200 dark:border-zinc-800 mt-2">
                <span className="font-bold text-sm uppercase text-zinc-900 dark:text-white">Net Profit / (Loss)</span>
                <span className={`font-mono text-base font-bold ${
                  (data?.statement?.netProfit || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'
                }`}>
                  {formatZAR(data?.statement?.netProfit || 0)}
                </span>
              </div>
            </div>

            {/* Section B: Division Performance Summary Report */}
            <div className="flex flex-col gap-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 border-b pb-1">
                2. Division Performance & Cash Flow Summary
              </h3>

              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-[10px] font-bold">
                    <th className="py-2.5 px-2">Division</th>
                    <th className="py-2.5 px-2 text-right">Revenue (ZAR)</th>
                    <th className="py-2.5 px-2 text-right">Cash Received</th>
                    <th className="py-2.5 px-2 text-right">Outstanding AR</th>
                    <th className="py-2.5 px-2 text-right">Expenses</th>
                    <th className="py-2.5 px-2 text-right">Net Profit</th>
                    <th className="py-2.5 px-2 text-right">Margin %</th>
                    <th className="py-2.5 px-2 text-right">Share %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                  {data?.divisions?.map((div: any) => (
                    <tr key={div.divisionId} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                      <td className="py-2.5 px-2 font-semibold text-zinc-900 dark:text-zinc-100">{div.divisionName}</td>
                      <td className="py-2.5 px-2 text-right font-mono tabular-nums text-emerald-600 dark:text-emerald-400 font-medium">
                        {formatZAR(div.totalRevenue)}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono tabular-nums text-blue-600 dark:text-blue-400 font-medium">
                        {formatZAR(div.totalIncome)}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono tabular-nums text-amber-600 dark:text-amber-400">
                        {div.totalOutstandingAr > 0 ? formatZAR(div.totalOutstandingAr) : '—'}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono tabular-nums text-zinc-700 dark:text-zinc-300">
                        {formatZAR(div.totalExpenses)}
                      </td>
                      <td className={`py-2.5 px-2 text-right font-mono tabular-nums font-bold ${
                        div.netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'
                      }`}>
                        {formatZAR(div.netProfit)}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono tabular-nums font-medium text-zinc-700 dark:text-zinc-300">
                        {div.marginPercent.toFixed(1)}%
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono tabular-nums text-zinc-500">
                        {div.distributionPercent.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                  {(!data?.divisions || data.divisions.length === 0) && (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-zinc-400">No division activity recorded.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Document Footer */}
      <div className="mt-8 pt-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-between items-center text-[10px] text-zinc-400 dark:text-zinc-500">
        <span>Confidential — Internal Financial Reporting System</span>
        <span>Page 1 of 1</span>
      </div>
    </div>
  );
}
