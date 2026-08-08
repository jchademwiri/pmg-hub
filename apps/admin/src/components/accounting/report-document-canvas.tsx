'use client';

import * as React from 'react';
import { formatZAR, fmtDate } from '@/lib/format';

export interface ReportDocumentCanvasProps {
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

  const fullDocumentTitle = React.useMemo(() => {
    switch (reportType) {
      case 'annual-financial-statements':
        return 'ANNUAL FINANCIAL STATEMENTS';
      case 'balance-sheet':
        return 'STATEMENT OF FINANCIAL POSITION';
      case 'profit-and-loss':
        return 'STATEMENT OF COMPREHENSIVE INCOME';
      case 'cash-flow':
        return 'STATEMENT OF CASH FLOWS';
      case 'changes-in-equity':
        return 'STATEMENT OF CHANGES IN EQUITY';
      default:
        return reportTitle.toUpperCase();
    }
  }, [reportType, reportTitle]);

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
            Division:{' '}
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">
              {divisionName}
            </span>
            {divisionName && divisionName !== 'All Divisions' && (
              <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded">
                Isolated Division View
              </span>
            )}
          </p>
          {taxNumber && (
            <p className="text-[11px] text-zinc-400 dark:text-zinc-500">VAT / Tax Ref: {taxNumber}</p>
          )}
        </div>

        <div className="sm:text-right">
          <span suppressHydrationWarning className="inline-block px-3 py-1 text-xs font-semibold uppercase tracking-wider rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            {fullDocumentTitle}
          </span>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
            Period: <span className="font-medium text-zinc-800 dark:text-zinc-200">{periodLabel}</span>
          </p>
          {dateRangeLabel && (
            <p className="text-[11px] text-zinc-400 dark:text-zinc-500">{dateRangeLabel}</p>
          )}
          <p suppressHydrationWarning className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">Generated: {currentDate}</p>
        </div>
      </div>

      {/* Document Body View */}
      <div className="mt-6">
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
                {data?.rows?.filter((r: any) => Math.abs(r.debit ?? r.totalDebits ?? 0) >= 0.01 || Math.abs(r.credit ?? r.totalCredits ?? 0) >= 0.01).map((row: any) => (
                  <tr key={row.accountId} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                    <td className="py-2.5 px-3 font-mono font-bold text-zinc-900 dark:text-zinc-100">{row.accountCode}</td>
                    <td className="py-2.5 px-3 font-medium text-zinc-800 dark:text-zinc-200">{row.accountName}</td>
                    <td className="py-2.5 px-3 uppercase text-[10px] text-zinc-500">{row.accountType}</td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-zinc-900 dark:text-zinc-100">
                      {(row.debit ?? row.totalDebits ?? 0) > 0 ? formatZAR(row.debit ?? row.totalDebits) : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-zinc-900 dark:text-zinc-100">
                      {(row.credit ?? row.totalCredits ?? 0) > 0 ? formatZAR(row.credit ?? row.totalCredits) : '—'}
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
          <div className="flex flex-col gap-4">
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
        )}

        {/* 6. DIVISION PERFORMANCE */}
        {reportType === 'division-performance' && (
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
                    {(div.marginPercent ?? 0).toFixed(1)}%
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono tabular-nums text-zinc-500">
                    {(div.distributionPercent ?? 0).toFixed(1)}%
                  </td>
                </tr>
              ))}
              {(!data?.divisions || data.divisions.length === 0) && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-zinc-400">No division activity recorded.</td>
                </tr>
              )}
            </tbody>
            {data?.divisions && data.divisions.length > 0 && (() => {
              const totRev = data.divisions.reduce((s: number, d: any) => s + (d.totalRevenue || 0), 0);
              const totInc = data.divisions.reduce((s: number, d: any) => s + (d.totalIncome || 0), 0);
              const totAr = data.divisions.reduce((s: number, d: any) => s + (d.totalOutstandingAr || 0), 0);
              const totExp = data.divisions.reduce((s: number, d: any) => s + (d.totalExpenses || 0), 0);
              const totNet = totRev - totExp;
              const totMargin = totRev > 0 ? (totNet / totRev) * 100 : 0;
              return (
                <tfoot>
                  <tr className="border-t-2 border-zinc-900 dark:border-zinc-100 font-bold bg-zinc-50/50 dark:bg-zinc-900/40">
                    <td className="py-3 px-2 text-zinc-900 dark:text-white uppercase">Total / Summary</td>
                    <td className="py-3 px-2 text-right font-mono text-emerald-600 dark:text-emerald-400">{formatZAR(totRev)}</td>
                    <td className="py-3 px-2 text-right font-mono text-blue-600 dark:text-blue-400">{formatZAR(totInc)}</td>
                    <td className="py-3 px-2 text-right font-mono text-amber-600 dark:text-amber-400">{totAr > 0 ? formatZAR(totAr) : '—'}</td>
                    <td className="py-3 px-2 text-right font-mono text-zinc-800 dark:text-zinc-200">{formatZAR(totExp)}</td>
                    <td className={`py-3 px-2 text-right font-mono ${totNet >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                      {formatZAR(totNet)}
                    </td>
                    <td className="py-3 px-2 text-right font-mono text-zinc-800 dark:text-zinc-200">{totMargin.toFixed(1)}%</td>
                    <td className="py-3 px-2 text-right font-mono text-zinc-500">100.0%</td>
                  </tr>
                </tfoot>
              );
            })()}
          </table>
        )}

        {/* 3. CLIENT PERFORMANCE */}
        {reportType === 'client-performance' && (
          <table className="w-full text-left text-xs border-collapse" suppressHydrationWarning>
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-[10px] font-bold" suppressHydrationWarning>
                <th className="py-2.5 px-2">Client Name</th>
                <th className="py-2.5 px-2 text-right">Invoiced Revenue (ZAR)</th>
                <th className="py-2.5 px-2 text-right">Cash Collected (ZAR)</th>
                <th className="py-2.5 px-2 text-right">Outstanding AR (ZAR)</th>
                <th className="py-2.5 px-2 text-right">Collection Rate %</th>
                <th className="py-2.5 px-2 text-right" suppressHydrationWarning>Concentration %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
              {data?.clients?.map((cli: any) => {
                const conc = cli.concentrationPercent ?? cli.distributionPercent ?? 0;
                const isHighRisk = cli.isHighRisk || conc > 25;
                return (
                  <tr key={cli.clientId} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                    <td className="py-2.5 px-2 font-medium text-zinc-800 dark:text-zinc-200">
                      <div className="flex items-center gap-2">
                        <span>{cli.clientName}</span>
                        {isHighRisk && (
                          <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            High Risk
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatZAR(cli.totalRevenue)}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono tabular-nums text-blue-600 dark:text-blue-400">
                      {formatZAR(cli.totalCashCollected)}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono tabular-nums text-amber-600 dark:text-amber-400">
                      {cli.totalOutstandingAr > 0 ? formatZAR(cli.totalOutstandingAr) : '—'}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono tabular-nums font-medium text-zinc-700 dark:text-zinc-300">
                      {(cli.marginPercent ?? 0).toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="font-mono tabular-nums font-semibold text-zinc-800 dark:text-zinc-200">
                          {conc.toFixed(1)}%
                        </span>
                        <div className="w-16 h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${isHighRisk ? 'bg-amber-500' : 'bg-blue-600'}`}
                            style={{ width: `${Math.min(100, conc)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {(!data?.clients || data.clients.length === 0) && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-zinc-400">No client billing activity recorded.</td>
                </tr>
              )}
            </tbody>
            {data?.clients && data.clients.length > 0 && (() => {
              const totRev = data.clients.reduce((s: number, c: any) => s + (c.totalRevenue || 0), 0);
              const totCol = data.clients.reduce((s: number, c: any) => s + (c.totalCashCollected || 0), 0);
              const totAr = data.clients.reduce((s: number, c: any) => s + (c.totalOutstandingAr || 0), 0);
              const avgRate = totRev > 0 ? (totCol / totRev) * 100 : 0;
              return (
                <tfoot>
                  <tr className="border-t-2 border-zinc-900 dark:border-zinc-100 font-bold bg-zinc-50/50 dark:bg-zinc-900/40">
                    <td className="py-3 px-2 text-zinc-900 dark:text-white uppercase">Total Client Summary</td>
                    <td className="py-3 px-2 text-right font-mono text-emerald-600 dark:text-emerald-400">{formatZAR(totRev)}</td>
                    <td className="py-3 px-2 text-right font-mono text-blue-600 dark:text-blue-400">{formatZAR(totCol)}</td>
                    <td className="py-3 px-2 text-right font-mono text-amber-600 dark:text-amber-400">{totAr > 0 ? formatZAR(totAr) : '—'}</td>
                    <td className="py-3 px-2 text-right font-mono text-zinc-800 dark:text-zinc-200">{avgRate.toFixed(1)}%</td>
                    <td className="py-3 px-2 text-right font-mono text-zinc-800 dark:text-zinc-200">100.0%</td>
                  </tr>
                </tfoot>
              );
            })()}
          </table>
        )}

        {/* 7. BALANCE SHEET */}
        {reportType === 'balance-sheet' && (
          <div className="flex flex-col gap-6">
            {/* ASSETS */}
            <div>
              <h4 className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-2 border-b pb-1">Assets</h4>
              <table className="w-full text-left text-xs border-collapse">
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                  {data?.balanceSheet?.assets?.map((row: any) => (
                    <tr key={row.accountId} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                      <td className="py-2 px-3 font-mono text-zinc-500 w-20">{row.accountCode}</td>
                      <td className="py-2 px-3 font-medium text-zinc-800 dark:text-zinc-200">{row.accountName}</td>
                      <td className="py-2 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400 font-semibold">{formatZAR(row.amount)}</td>
                    </tr>
                  ))}
                  {(!data?.balanceSheet?.assets || data.balanceSheet.assets.length === 0) && (
                    <tr><td colSpan={3} className="py-3 px-3 text-zinc-400 italic text-[11px]">No asset accounts recorded.</td></tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t border-zinc-300 dark:border-zinc-700 font-bold">
                    <td colSpan={2} className="py-2.5 px-3 text-zinc-900 dark:text-white uppercase">Total Assets</td>
                    <td className="py-2.5 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400">{formatZAR(data?.balanceSheet?.totalAssets || 0)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* LIABILITIES */}
            <div>
              <h4 className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-2 border-b pb-1">Liabilities</h4>
              <table className="w-full text-left text-xs border-collapse">
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                  {data?.balanceSheet?.liabilities?.map((row: any) => (
                    <tr key={row.accountId} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                      <td className="py-2 px-3 font-mono text-zinc-500 w-20">{row.accountCode}</td>
                      <td className="py-2 px-3 font-medium text-zinc-800 dark:text-zinc-200">{row.accountName}</td>
                      <td className="py-2 px-3 text-right font-mono text-zinc-800 dark:text-zinc-200 font-semibold">{formatZAR(row.amount)}</td>
                    </tr>
                  ))}
                  {(!data?.balanceSheet?.liabilities || data.balanceSheet.liabilities.length === 0) && (
                    <tr><td colSpan={3} className="py-3 px-3 text-zinc-400 italic text-[11px]">No liability accounts recorded.</td></tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t border-zinc-300 dark:border-zinc-700 font-bold">
                    <td colSpan={2} className="py-2.5 px-3 text-zinc-900 dark:text-white uppercase">Total Liabilities</td>
                    <td className="py-2.5 px-3 text-right font-mono text-zinc-800 dark:text-zinc-200">{formatZAR(data?.balanceSheet?.totalLiabilities || 0)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* EQUITY */}
            <div>
              <h4 className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-2 border-b pb-1">Equity</h4>
              <table className="w-full text-left text-xs border-collapse">
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                  {data?.balanceSheet?.equity?.map((row: any) => (
                    <tr key={row.accountId} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                      <td className="py-2 px-3 font-mono text-zinc-500 w-20">{row.accountCode}</td>
                      <td className="py-2 px-3 font-medium text-zinc-800 dark:text-zinc-200">{row.accountName}</td>
                      <td className="py-2 px-3 text-right font-mono text-zinc-800 dark:text-zinc-200 font-semibold">{formatZAR(row.amount)}</td>
                    </tr>
                  ))}
                  <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 italic">
                    <td className="py-2 px-3 font-mono text-zinc-400 w-20">—</td>
                    <td className="py-2 px-3 font-medium text-zinc-700 dark:text-zinc-300">Retained Earnings / Current Period Net Profit</td>
                    <td className="py-2 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400 font-semibold">{formatZAR(data?.balanceSheet?.netIncome || 0)}</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr className="border-t border-zinc-300 dark:border-zinc-700 font-bold">
                    <td colSpan={2} className="py-2.5 px-3 text-zinc-900 dark:text-white uppercase">Total Equity</td>
                    <td className="py-2.5 px-3 text-right font-mono text-zinc-900 dark:text-white">{formatZAR(data?.balanceSheet?.totalEquity || 0)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* TOTAL LIABILITIES & EQUITY BAND */}
            <div className="p-3.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 flex justify-between items-center border border-zinc-200 dark:border-zinc-800">
              <span className="font-bold text-sm uppercase text-zinc-900 dark:text-white">Total Liabilities & Equity</span>
              <span className="font-mono text-base font-bold text-emerald-600 dark:text-emerald-400">
                {formatZAR(data?.balanceSheet?.totalLiabilitiesAndEquity || 0)}
              </span>
            </div>
          </div>
        )}

        {/* 8. CASH FLOW STATEMENT */}
        {reportType === 'cash-flow' && (
          <div className="flex flex-col gap-6">
            {/* Operating Activities */}
            <div>
              <h4 className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-2 border-b pb-1">Cash Flows from Operating Activities</h4>
              <table className="w-full text-left text-xs border-collapse">
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                  {data?.cashFlow?.operatingActivities?.map((row: any, idx: number) => (
                    <tr key={idx} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                      <td className="py-2.5 px-3 font-medium text-zinc-800 dark:text-zinc-200">{row.description}</td>
                      <td className={`py-2.5 px-3 text-right font-mono font-semibold ${
                        row.amount >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'
                      }`}>
                        {formatZAR(row.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-zinc-300 dark:border-zinc-700 font-bold">
                    <td className="py-2.5 px-3 text-zinc-900 dark:text-white uppercase">Net Cash Flow from Operating Activities</td>
                    <td className={`py-2.5 px-3 text-right font-mono ${
                      (data?.cashFlow?.netOperatingCashFlow || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'
                    }`}>
                      {formatZAR(data?.cashFlow?.netOperatingCashFlow || 0)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Net Increase Band */}
            <div className="p-3.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 flex justify-between items-center border border-zinc-200 dark:border-zinc-800">
              <span className="font-bold text-sm uppercase text-zinc-900 dark:text-white">Net Increase / (Decrease) in Cash</span>
              <span className={`font-mono text-base font-bold ${
                (data?.cashFlow?.netCashIncrease || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'
              }`}>
                {formatZAR(data?.cashFlow?.netCashIncrease || 0)}
              </span>
            </div>

            {/* Cash Position Summary */}
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 bg-card flex flex-col gap-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-500">Starting Cash & Bank Balance</span>
                <span className="font-mono text-zinc-700 dark:text-zinc-300 font-semibold">{formatZAR(data?.cashFlow?.startingCashBalance || 0)}</span>
              </div>
              <div className="flex justify-between items-center text-xs pt-2 border-t border-zinc-100 dark:border-zinc-900 font-bold">
                <span className="text-zinc-900 dark:text-white uppercase">Ending Cash & Bank Balance</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 text-sm">{formatZAR(data?.cashFlow?.endingCashBalance || 0)}</span>
              </div>
            </div>
          </div>
        )}

        {/* 8. STATEMENT OF CHANGES IN EQUITY */}
        {reportType === 'changes-in-equity' && (
          <div className="flex flex-col gap-6">
            <div className="border-b-2 border-zinc-900 dark:border-zinc-100 pb-3 flex justify-between items-end">
              <div>
                <h2 className="text-base font-extrabold uppercase text-zinc-900 dark:text-white tracking-wide">{companyName}</h2>
                <p className="text-xs text-zinc-500 font-medium mt-0.5">Registration Number: 2023/683669/07</p>
              </div>
              <div className="text-right">
                <h3 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">STATEMENT OF CHANGES IN EQUITY</h3>
                <p className="text-xs text-zinc-500 font-medium">Period: {periodLabel}</p>
              </div>
            </div>

            <table className="w-full text-left text-xs border-collapse font-mono">
              <thead>
                <tr className="border-b-2 border-zinc-900 dark:border-zinc-100 text-zinc-500 text-[10px] font-bold uppercase">
                  <th className="py-2.5 px-2 font-sans">Period / Movement Description</th>
                  <th className="py-2.5 px-2 text-right">Shareholders Contribution (R)</th>
                  <th className="py-2.5 px-2 text-right">Retained Earnings (R)</th>
                  <th className="py-2.5 px-2 text-right">Total Equity (R)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                <tr>
                  <td className="py-2 px-2 font-sans font-medium text-zinc-800 dark:text-zinc-200">Opening Balance (1 March)</td>
                  <td className="py-2 px-2 text-right">100,00</td>
                  <td className="py-2 px-2 text-right">{formatZAR(data?.afs?.statementOfChangesInEquity?.currentOpeningRetained || 0)}</td>
                  <td className="py-2 px-2 text-right font-semibold">{formatZAR(100 + (data?.afs?.statementOfChangesInEquity?.currentOpeningRetained || 0))}</td>
                </tr>
                <tr>
                  <td className="py-2 px-2 font-sans text-zinc-600 dark:text-zinc-400">Net profit / (loss) for period</td>
                  <td className="py-2 px-2 text-right">{formatZAR(0)}</td>
                  <td className="py-2 px-2 text-right text-emerald-600 dark:text-emerald-400 font-semibold">{formatZAR(data?.afs?.statementOfChangesInEquity?.currentNetProfit || 0)}</td>
                  <td className="py-2 px-2 text-right text-emerald-600 dark:text-emerald-400 font-semibold">{formatZAR(data?.afs?.statementOfChangesInEquity?.currentNetProfit || 0)}</td>
                </tr>
                <tr className="font-extrabold border-t-2 border-b-2 border-zinc-900 dark:border-zinc-100 text-sm text-zinc-900 dark:text-white bg-zinc-50 dark:bg-zinc-900/50">
                  <td className="py-3 px-2 font-sans uppercase">Closing Balance</td>
                  <td className="py-3 px-2 text-right">100,00</td>
                  <td className="py-3 px-2 text-right">{formatZAR(data?.afs?.statementOfChangesInEquity?.currentClosingRetained || 0)}</td>
                  <td className="py-3 px-2 text-right text-emerald-600 dark:text-emerald-400">{formatZAR(100 + (data?.afs?.statementOfChangesInEquity?.currentClosingRetained || 0))}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* 9. ANNUAL FINANCIAL STATEMENTS (AFS) */}
        {reportType === 'annual-financial-statements' && (() => {
          const curYear = data?.afs?.generalInfo?.currentYearLabel || '2027';
          const priYear = data?.afs?.generalInfo?.priorYearLabel || '2026';
          const info = data?.afs?.generalInfo;
          const dr = data?.afs?.directorsReport;
          const pnl = data?.afs?.statementOfProfitLoss;
          const bs = data?.afs?.statementOfPosition;
          const eq = data?.afs?.statementOfChangesInEquity;
          const cf = data?.afs?.statementOfCashFlows;
          const det = data?.afs?.detailedIncomeStatement;

          return (
            <div className="flex flex-col gap-10">
              {/* PAGE 1: DIRECTORS' REPORT & BUSINESS ACTIVITIES */}
              <div className="flex flex-col gap-6">
                <div className="sticky top-13 sm:top-13 z-30 bg-white dark:bg-zinc-950 -mt-6 pt-6 pb-3 px-3 -mx-3 border-b-2 border-zinc-900 dark:border-zinc-100 flex justify-between items-end mb-4 shadow-sm text-zinc-900 dark:text-zinc-100">
                  <div>
                    <h2 className="text-base font-extrabold uppercase text-zinc-900 dark:text-white tracking-wide">{info?.companyName}</h2>
                    <p className="text-xs text-zinc-500 font-medium mt-0.5">Registration Number: {info?.registrationNumber}</p>
                  </div>
                  <div className="text-right">
                    <h3 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">DIRECTORS' REPORT</h3>
                    <p className="text-xs text-zinc-500 font-medium">for the year ended {info?.financialYearEnd}</p>
                  </div>
                </div>

                <div className="text-xs flex flex-col gap-4 text-zinc-800 dark:text-zinc-200">
                  <div>
                    <h4 className="font-bold uppercase text-zinc-500 text-[10px] tracking-wider mb-1">1. Nature of business</h4>
                    <p className="leading-relaxed text-zinc-700 dark:text-zinc-300">{dr?.principalActivities}</p>
                  </div>

                  <div>
                    <h4 className="font-bold uppercase text-zinc-500 text-[10px] tracking-wider mb-2">2. Business activities & Financial Results</h4>
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-zinc-300 dark:border-zinc-700 text-zinc-500 text-[10px] font-bold uppercase">
                          <th className="py-2 px-2">Financial Indicator</th>
                          <th className="py-2 px-2 text-right font-mono">{curYear} (R)</th>
                          <th className="py-2 px-2 text-right font-mono">{priYear} (R)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900 font-mono">
                        <tr className="font-bold text-zinc-900 dark:text-white">
                          <td className="py-2 px-2 font-sans">Sales Revenue (Group Total)</td>
                          <td className="py-2 px-2 text-right text-emerald-600 dark:text-emerald-400">{formatZAR(dr?.businessActivities?.revenue?.current || 0)}</td>
                          <td className="py-2 px-2 text-right text-zinc-400">{formatZAR(dr?.businessActivities?.revenue?.prior || 0)}</td>
                        </tr>
                        {dr?.divisionBreakdown?.map((div: any) => (
                          <tr key={div.divisionId} className="text-zinc-600 dark:text-zinc-400 italic">
                            <td className="py-1 px-4 font-sans">- {div.divisionName}</td>
                            <td className="py-1 px-2 text-right">{formatZAR(div.current)}</td>
                            <td className="py-1 px-2 text-right text-zinc-400">{formatZAR(div.prior)}</td>
                          </tr>
                        ))}
                        <tr>
                          <td className="py-2 px-2 font-sans font-medium text-zinc-800 dark:text-zinc-200">Operating profit / (loss)</td>
                          <td className="py-2 px-2 text-right font-semibold text-zinc-900 dark:text-white">{formatZAR(dr?.businessActivities?.operatingProfit?.current || 0)}</td>
                          <td className="py-2 px-2 text-right text-zinc-400">{formatZAR(dr?.businessActivities?.operatingProfit?.prior || 0)}</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-2 font-sans font-medium text-zinc-800 dark:text-zinc-200">Profit / (loss) for the year</td>
                          <td className="py-2 px-2 text-right font-semibold text-emerald-600 dark:text-emerald-400">{formatZAR(dr?.businessActivities?.netProfit?.current || 0)}</td>
                          <td className="py-2 px-2 text-right text-zinc-400">{formatZAR(dr?.businessActivities?.netProfit?.prior || 0)}</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-2 font-sans font-medium text-zinc-800 dark:text-zinc-200">Total assets</td>
                          <td className="py-2 px-2 text-right font-semibold text-zinc-900 dark:text-white">{formatZAR(dr?.businessActivities?.totalAssets?.current || 0)}</td>
                          <td className="py-2 px-2 text-right text-zinc-400">{formatZAR(dr?.businessActivities?.totalAssets?.prior || 0)}</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-2 font-sans font-medium text-zinc-800 dark:text-zinc-200">Total liabilities</td>
                          <td className="py-2 px-2 text-right font-semibold text-amber-600 dark:text-amber-400">{formatZAR(dr?.businessActivities?.totalLiabilities?.current || 0)}</td>
                          <td className="py-2 px-2 text-right text-zinc-400">{formatZAR(dr?.businessActivities?.totalLiabilities?.prior || 0)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="pt-2 flex flex-col gap-2">
                    <h4 className="font-bold uppercase text-zinc-500 text-[10px] tracking-wider">3. Going concern & Subsequent Events</h4>
                    <p className="leading-relaxed text-zinc-700 dark:text-zinc-300">{dr?.goingConcernStatement}</p>
                    <p className="leading-relaxed text-zinc-600 dark:text-zinc-400">{dr?.eventsAfterReportingPeriod}</p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-between items-end">
                    <div>
                      <div className="border-b border-zinc-900 dark:border-zinc-100 w-48 mb-1" />
                      <p className="font-bold text-zinc-900 dark:text-white">{info?.directorName}</p>
                      <p className="text-[10px] text-zinc-500">Managing Director</p>
                    </div>
                    <span className="text-[10px] text-zinc-400 font-mono">Page 1</span>
                  </div>
                </div>
              </div>

              {/* PAGE 2: INCOME STATEMENT */}
              <div className="flex flex-col gap-6 pt-8 border-t-2 border-zinc-200 dark:border-zinc-800 print:break-before-page break-before-page">
                <div className="sticky top-13 sm:top-13 z-30 bg-white dark:bg-zinc-950 -mt-6 pt-6 pb-3 px-3 -mx-3 border-b-2 border-zinc-900 dark:border-zinc-100 flex justify-between items-end mb-4 shadow-sm text-zinc-900 dark:text-zinc-100">
                  <div>
                    <h2 className="text-base font-extrabold uppercase text-zinc-900 dark:text-white tracking-wide">{info?.companyName}</h2>
                    <p className="text-xs text-zinc-500 font-medium mt-0.5">Registration Number: {info?.registrationNumber}</p>
                  </div>
                  <div className="text-right">
                    <h3 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">STATEMENT OF COMPREHENSIVE INCOME</h3>
                    <p className="text-xs text-zinc-500 font-medium">for the year ended {info?.financialYearEnd}</p>
                  </div>
                </div>

                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b-2 border-zinc-900 dark:border-zinc-100 text-zinc-500 text-[10px] font-bold uppercase">
                      <th className="py-2.5 px-2">Account Description</th>
                      <th className="py-2.5 px-2 text-center w-16">NOTES</th>
                      <th className="py-2.5 px-2 text-right font-mono w-32">{curYear} (R)</th>
                      <th className="py-2.5 px-2 text-right font-mono w-32">{priYear} (R)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900 font-mono">
                    <tr className="font-bold text-zinc-900 dark:text-white bg-zinc-50/50 dark:bg-zinc-900/30">
                      <td className="py-2 px-2 font-sans">Sales Revenue (Group Total)</td>
                      <td className="py-2 px-2 text-center font-sans text-zinc-400">Note 2</td>
                      <td className="py-2 px-2 text-right text-emerald-600 dark:text-emerald-400">{formatZAR(pnl?.revenue?.current || 0)}</td>
                      <td className="py-2 px-2 text-right text-zinc-400">{formatZAR(pnl?.revenue?.prior || 0)}</td>
                    </tr>
                    {pnl?.divisionBreakdown?.map((div: any) => (
                      <tr key={div.divisionId} className="text-zinc-600 dark:text-zinc-400 italic">
                        <td className="py-1 px-4 font-sans">- {div.divisionName}</td>
                        <td className="py-1 px-2 text-center font-sans text-zinc-400">Note 2</td>
                        <td className="py-1 px-2 text-right">{formatZAR(div.current)}</td>
                        <td className="py-1 px-2 text-right text-zinc-400">{formatZAR(div.prior)}</td>
                      </tr>
                    ))}
                    <tr>
                      <td className="py-2 px-2 font-sans text-zinc-700 dark:text-zinc-300">Less: Depreciation expense</td>
                      <td className="py-2 px-2 text-center font-sans text-zinc-400">Note 5</td>
                      <td className="py-2 px-2 text-right">{formatZAR(pnl?.depreciation?.current || 0)}</td>
                      <td className="py-2 px-2 text-right text-zinc-400">{formatZAR(pnl?.depreciation?.prior || 0)}</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-2 font-sans text-zinc-700 dark:text-zinc-300">Employee benefits expense</td>
                      <td className="py-2 px-2 text-center font-sans text-zinc-400">Note 1</td>
                      <td className="py-2 px-2 text-right">{formatZAR(pnl?.employeeBenefits?.current || 0)}</td>
                      <td className="py-2 px-2 text-right text-zinc-400">{formatZAR(pnl?.employeeBenefits?.prior || 0)}</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-2 font-sans text-zinc-700 dark:text-zinc-300">Other operating expenses</td>
                      <td className="py-2 px-2 text-center font-sans text-zinc-400">Note 3</td>
                      <td className="py-2 px-2 text-right">{formatZAR(pnl?.totalExpenses?.current || 0)}</td>
                      <td className="py-2 px-2 text-right text-zinc-400">{formatZAR(pnl?.totalExpenses?.prior || 0)}</td>
                    </tr>
                    <tr className="font-bold border-t border-b border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-white">
                      <td className="py-2.5 px-2 font-sans uppercase">Operating profit / (loss)</td>
                      <td className="py-2.5 px-2 text-center font-sans text-zinc-400"></td>
                      <td className="py-2.5 px-2 text-right text-emerald-600 dark:text-emerald-400">{formatZAR(pnl?.operatingProfit?.current || 0)}</td>
                      <td className="py-2.5 px-2 text-right text-zinc-400">{formatZAR(pnl?.operatingProfit?.prior || 0)}</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-2 font-sans text-zinc-700 dark:text-zinc-300">Investment revenues</td>
                      <td className="py-2 px-2 text-center font-sans text-zinc-400">Note 2</td>
                      <td className="py-2 px-2 text-right">{formatZAR(0)}</td>
                      <td className="py-2 px-2 text-right text-zinc-400">{formatZAR(0)}</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-2 font-sans text-zinc-700 dark:text-zinc-300">Interest on finance cost</td>
                      <td className="py-2 px-2 text-center font-sans text-zinc-400">Note 2</td>
                      <td className="py-2 px-2 text-right">{formatZAR(0)}</td>
                      <td className="py-2 px-2 text-right text-zinc-400">{formatZAR(0)}</td>
                    </tr>
                    <tr className="font-bold text-zinc-900 dark:text-white">
                      <td className="py-2.5 px-2 font-sans uppercase">Profit / (loss) before tax</td>
                      <td className="py-2.5 px-2 text-center font-sans text-zinc-400"></td>
                      <td className="py-2.5 px-2 text-right">{formatZAR(pnl?.profitBeforeTax?.current || 0)}</td>
                      <td className="py-2.5 px-2 text-right text-zinc-400">{formatZAR(pnl?.profitBeforeTax?.prior || 0)}</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-2 font-sans text-zinc-700 dark:text-zinc-300">Income tax expense</td>
                      <td className="py-2 px-2 text-center font-sans text-zinc-400">Note 3</td>
                      <td className="py-2 px-2 text-right">{formatZAR(0)}</td>
                      <td className="py-2 px-2 text-right text-zinc-400">{formatZAR(0)}</td>
                    </tr>
                    <tr className="font-extrabold border-t-2 border-b-2 border-zinc-900 dark:border-zinc-100 text-sm text-zinc-900 dark:text-white bg-zinc-50 dark:bg-zinc-900/50">
                      <td className="py-3 px-2 font-sans uppercase">Profit / (loss) for the year</td>
                      <td className="py-3 px-2 text-center font-sans text-zinc-400">Note 4</td>
                      <td className="py-3 px-2 text-right text-emerald-600 dark:text-emerald-400">{formatZAR(pnl?.netProfit?.current || 0)}</td>
                      <td className="py-3 px-2 text-right text-zinc-400">{formatZAR(pnl?.netProfit?.prior || 0)}</td>
                    </tr>
                  </tbody>
                </table>

                <div className="mt-8 pt-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-between text-[10px] text-zinc-400">
                  <span>Annual Financial Statements — {info?.companyName}</span>
                  <span className="font-mono">Page 2</span>
                </div>
              </div>

              {/* PAGE 3: BALANCE SHEET */}
              <div className="flex flex-col gap-6 pt-8 border-t-2 border-zinc-200 dark:border-zinc-800 print:break-before-page break-before-page">
                <div className="sticky top-13 sm:top-13 z-30 bg-white dark:bg-zinc-950 -mt-6 pt-6 pb-3 px-3 -mx-3 border-b-2 border-zinc-900 dark:border-zinc-100 flex justify-between items-end mb-4 shadow-sm text-zinc-900 dark:text-zinc-100">
                  <div>
                    <h2 className="text-base font-extrabold uppercase text-zinc-900 dark:text-white tracking-wide">{info?.companyName}</h2>
                    <p className="text-xs text-zinc-500 font-medium mt-0.5">Registration Number: {info?.registrationNumber}</p>
                  </div>
                  <div className="text-right">
                    <h3 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">STATEMENT OF FINANCIAL POSITION</h3>
                    <p className="text-xs text-zinc-500 font-medium">at {info?.financialYearEnd}</p>
                  </div>
                </div>

                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b-2 border-zinc-900 dark:border-zinc-100 text-zinc-500 text-[10px] font-bold uppercase">
                      <th className="py-2.5 px-2">Account Description</th>
                      <th className="py-2.5 px-2 text-center w-16">NOTES</th>
                      <th className="py-2.5 px-2 text-right font-mono w-32">{curYear} (R)</th>
                      <th className="py-2.5 px-2 text-right font-mono w-32">{priYear} (R)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900 font-mono">
                    <tr className="font-bold text-zinc-900 dark:text-white uppercase text-[11px] bg-zinc-50 dark:bg-zinc-900/40">
                      <td colSpan={4} className="py-2 px-2 font-sans">ASSETS</td>
                    </tr>
                    <tr className="font-semibold text-zinc-800 dark:text-zinc-200 italic">
                      <td colSpan={4} className="py-1.5 px-3 font-sans">Non-current assets</td>
                    </tr>
                    {bs?.assets?.filter((a: any) => a.accountType === 'asset' && !a.accountName.toLowerCase().includes('receivable') && !a.accountName.toLowerCase().includes('bank') && !a.accountName.toLowerCase().includes('cash')).map((a: any) => (
                      <tr key={a.accountId}>
                        <td className="py-1.5 px-5 font-sans text-zinc-700 dark:text-zinc-300">{a.accountName}</td>
                        <td className="py-1.5 px-2 text-center font-sans text-zinc-400">Note 5</td>
                        <td className="py-1.5 px-2 text-right">{formatZAR(a.amount)}</td>
                        <td className="py-1.5 px-2 text-right text-zinc-400">{formatZAR(0)}</td>
                      </tr>
                    ))}
                    <tr className="font-semibold text-zinc-800 dark:text-zinc-200 italic">
                      <td colSpan={4} className="py-1.5 px-3 font-sans">Current assets</td>
                    </tr>
                    {bs?.assets?.filter((a: any) => a.accountName.toLowerCase().includes('receivable') || a.accountName.toLowerCase().includes('bank') || a.accountName.toLowerCase().includes('cash')).map((a: any) => (
                      <tr key={a.accountId}>
                        <td className="py-1.5 px-5 font-sans text-zinc-700 dark:text-zinc-300">{a.accountName}</td>
                        <td className="py-1.5 px-2 text-center font-sans text-zinc-400">{a.accountName.toLowerCase().includes('receivable') ? 'Note 7' : 'Note 8'}</td>
                        <td className="py-1.5 px-2 text-right">{formatZAR(a.amount)}</td>
                        <td className="py-1.5 px-2 text-right text-zinc-400">{formatZAR(0)}</td>
                      </tr>
                    ))}
                    <tr className="font-extrabold border-t-2 border-b-2 border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-white bg-zinc-50 dark:bg-zinc-900/50">
                      <td className="py-3 px-2 font-sans uppercase">Total assets</td>
                      <td className="py-3 px-2 text-center font-sans text-zinc-400"></td>
                      <td className="py-3 px-2 text-right text-emerald-600 dark:text-emerald-400">{formatZAR(bs?.totalAssets?.current || 0)}</td>
                      <td className="py-3 px-2 text-right text-zinc-400">{formatZAR(bs?.totalAssets?.prior || 0)}</td>
                    </tr>

                    <tr className="font-bold text-zinc-900 dark:text-white uppercase text-[11px] bg-zinc-50 dark:bg-zinc-900/40">
                      <td colSpan={4} className="py-2 px-2 font-sans pt-4">EQUITY AND LIABILITIES</td>
                    </tr>
                    <tr className="font-semibold text-zinc-800 dark:text-zinc-200 italic">
                      <td colSpan={4} className="py-1.5 px-3 font-sans">Capital and reserves</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-5 font-sans text-zinc-700 dark:text-zinc-300">Shareholders Contribution</td>
                      <td className="py-1.5 px-2 text-center font-sans text-zinc-400">Note 10</td>
                      <td className="py-1.5 px-2 text-right">R 100,00</td>
                      <td className="py-1.5 px-2 text-right text-zinc-400">R 100,00</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-5 font-sans text-zinc-700 dark:text-zinc-300">Retained earnings</td>
                      <td className="py-1.5 px-2 text-center font-sans text-zinc-400">Note 4</td>
                      <td className="py-1.5 px-2 text-right">{formatZAR(pnl?.netProfit?.current || 0)}</td>
                      <td className="py-1.5 px-2 text-right text-zinc-400">{formatZAR(pnl?.netProfit?.prior || 0)}</td>
                    </tr>
                    <tr className="font-semibold text-zinc-800 dark:text-zinc-200 italic">
                      <td colSpan={4} className="py-1.5 px-3 font-sans">Current liabilities</td>
                    </tr>
                    {bs?.liabilities?.map((l: any) => (
                      <tr key={l.accountId}>
                        <td className="py-1.5 px-5 font-sans text-zinc-700 dark:text-zinc-300">{l.accountName}</td>
                        <td className="py-1.5 px-2 text-center font-sans text-zinc-400">Note 11</td>
                        <td className="py-1.5 px-2 text-right">{formatZAR(l.amount)}</td>
                        <td className="py-1.5 px-2 text-right text-zinc-400">{formatZAR(0)}</td>
                      </tr>
                    ))}
                    <tr className="font-extrabold border-t-2 border-b-2 border-zinc-900 dark:border-zinc-100 text-sm text-zinc-900 dark:text-white bg-zinc-50 dark:bg-zinc-900/50">
                      <td className="py-3 px-2 font-sans uppercase">Total equity and liabilities</td>
                      <td className="py-3 px-2 text-center font-sans text-zinc-400"></td>
                      <td className="py-3 px-2 text-right text-emerald-600 dark:text-emerald-400">{formatZAR(bs?.totalLiabilitiesAndEquity?.current || 0)}</td>
                      <td className="py-3 px-2 text-right text-zinc-400">{formatZAR(bs?.totalLiabilitiesAndEquity?.prior || 0)}</td>
                    </tr>
                  </tbody>
                </table>

                <div className="mt-8 pt-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-between text-[10px] text-zinc-400">
                  <span>Annual Financial Statements — {info?.companyName}</span>
                  <span className="font-mono">Page 3</span>
                </div>
              </div>

              {/* PAGE 4: STATEMENT OF CHANGES IN EQUITY */}
              <div className="flex flex-col gap-6 pt-8 border-t-2 border-zinc-200 dark:border-zinc-800 print:break-before-page break-before-page">
                <div className="sticky top-13 sm:top-13 z-30 bg-white dark:bg-zinc-950 -mt-6 pt-6 pb-3 px-3 -mx-3 border-b-2 border-zinc-900 dark:border-zinc-100 flex justify-between items-end mb-4 shadow-sm text-zinc-900 dark:text-zinc-100">
                  <div>
                    <h2 className="text-base font-extrabold uppercase text-zinc-900 dark:text-white tracking-wide">{info?.companyName}</h2>
                    <p className="text-xs text-zinc-500 font-medium mt-0.5">Registration Number: {info?.registrationNumber}</p>
                  </div>
                  <div className="text-right">
                    <h3 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">STATEMENT OF CHANGES IN EQUITY</h3>
                    <p className="text-xs text-zinc-500 font-medium">for the year ended {info?.financialYearEnd}</p>
                  </div>
                </div>

                <table className="w-full text-left text-xs border-collapse font-mono">
                  <thead>
                    <tr className="border-b-2 border-zinc-900 dark:border-zinc-100 text-zinc-500 text-[10px] font-bold uppercase">
                      <th className="py-2.5 px-2 font-sans">Period / Movement Description</th>
                      <th className="py-2.5 px-2 text-right">Shareholders Contribution (R)</th>
                      <th className="py-2.5 px-2 text-right">Retained Earnings (R)</th>
                      <th className="py-2.5 px-2 text-right">Total Equity (R)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                    <tr>
                      <td className="py-2 px-2 font-sans font-medium text-zinc-800 dark:text-zinc-200">Balance at {eq?.priorYearStartLabel || '1 March 2025'}</td>
                      <td className="py-2 px-2 text-right">100,00</td>
                      <td className="py-2 px-2 text-right">0,00</td>
                      <td className="py-2 px-2 text-right font-semibold">100,00</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-2 font-sans text-zinc-600 dark:text-zinc-400">Net profit / (loss) for FY{priYear}</td>
                      <td className="py-2 px-2 text-right">{formatZAR(0)}</td>
                      <td className="py-2 px-2 text-right">{formatZAR(eq?.priorNetProfit || 0)}</td>
                      <td className="py-2 px-2 text-right">{formatZAR(eq?.priorNetProfit || 0)}</td>
                    </tr>
                    <tr className="font-bold border-t border-zinc-300 dark:border-zinc-700 bg-zinc-50/40 dark:bg-zinc-900/30">
                      <td className="py-2 px-2 font-sans">Balance at {eq?.priorYearEndLabel || '28 February 2026'}</td>
                      <td className="py-2 px-2 text-right">100,00</td>
                      <td className="py-2 px-2 text-right">{formatZAR(eq?.priorClosingRetained || 0)}</td>
                      <td className="py-2 px-2 text-right">{formatZAR(100 + (eq?.priorClosingRetained || 0))}</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-2 font-sans font-medium text-zinc-800 dark:text-zinc-200">Balance at 1 March {priYear}</td>
                      <td className="py-2 px-2 text-right">100,00</td>
                      <td className="py-2 px-2 text-right">{formatZAR(eq?.currentOpeningRetained || 0)}</td>
                      <td className="py-2 px-2 text-right font-semibold">{formatZAR(100 + (eq?.currentOpeningRetained || 0))}</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-2 font-sans text-zinc-600 dark:text-zinc-400">Net profit / (loss) for FY{curYear} (to date)</td>
                      <td className="py-2 px-2 text-right">{formatZAR(0)}</td>
                      <td className="py-2 px-2 text-right text-emerald-600 dark:text-emerald-400 font-semibold">{formatZAR(eq?.currentNetProfit || 0)}</td>
                      <td className="py-2 px-2 text-right text-emerald-600 dark:text-emerald-400 font-semibold">{formatZAR(eq?.currentNetProfit || 0)}</td>
                    </tr>
                    <tr className="font-extrabold border-t-2 border-b-2 border-zinc-900 dark:border-zinc-100 text-sm text-zinc-900 dark:text-white bg-zinc-50 dark:bg-zinc-900/50">
                      <td className="py-3 px-2 font-sans uppercase">Balance at {eq?.currentYearEndLabel || '28 February 2027'}</td>
                      <td className="py-3 px-2 text-right">100,00</td>
                      <td className="py-3 px-2 text-right">{formatZAR(eq?.currentClosingRetained || 0)}</td>
                      <td className="py-3 px-2 text-right text-emerald-600 dark:text-emerald-400">{formatZAR(100 + (eq?.currentClosingRetained || 0))}</td>
                    </tr>
                  </tbody>
                </table>

                <div className="mt-8 pt-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-between text-[10px] text-zinc-400">
                  <span>Annual Financial Statements — {info?.companyName}</span>
                  <span className="font-mono">Page 4</span>
                </div>
              </div>

              {/* PAGE 5: CASH FLOW STATEMENT */}
              <div className="flex flex-col gap-6 pt-8 border-t-2 border-zinc-200 dark:border-zinc-800 print:break-before-page break-before-page">
                <div className="sticky top-13 sm:top-13 z-30 bg-white dark:bg-zinc-950 -mt-6 pt-6 pb-3 px-3 -mx-3 border-b-2 border-zinc-900 dark:border-zinc-100 flex justify-between items-end mb-4 shadow-sm text-zinc-900 dark:text-zinc-100">
                  <div>
                    <h2 className="text-base font-extrabold uppercase text-zinc-900 dark:text-white tracking-wide">{info?.companyName}</h2>
                    <p className="text-xs text-zinc-500 font-medium mt-0.5">Registration Number: {info?.registrationNumber}</p>
                  </div>
                  <div className="text-right">
                    <h3 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">STATEMENT OF CASH FLOWS</h3>
                    <p className="text-xs text-zinc-500 font-medium">for the year ended {info?.financialYearEnd}</p>
                  </div>
                </div>

                <table className="w-full text-left text-xs border-collapse font-mono">
                  <thead>
                    <tr className="border-b-2 border-zinc-900 dark:border-zinc-100 text-zinc-500 text-[10px] font-bold uppercase">
                      <th className="py-2.5 px-2 font-sans">Cash Flow Category</th>
                      <th className="py-2.5 px-2 text-center w-16 font-sans">NOTES</th>
                      <th className="py-2.5 px-2 text-right w-32">{curYear} (R)</th>
                      <th className="py-2.5 px-2 text-right w-32">{priYear} (R)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                    <tr className="font-bold text-zinc-900 dark:text-white uppercase text-[11px] bg-zinc-50 dark:bg-zinc-900/40">
                      <td colSpan={4} className="py-2 px-2 font-sans">Operating activities</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-5 font-sans text-zinc-700 dark:text-zinc-300">Profit for the year</td>
                      <td className="py-1.5 px-2 text-center font-sans text-zinc-400"></td>
                      <td className="py-1.5 px-2 text-right text-emerald-600 dark:text-emerald-400">{formatZAR(pnl?.netProfit?.current || 0)}</td>
                      <td className="py-1.5 px-2 text-right text-zinc-400">{formatZAR(pnl?.netProfit?.prior || 0)}</td>
                    </tr>
                    <tr className="font-semibold text-zinc-800 dark:text-zinc-200 italic">
                      <td colSpan={4} className="py-1.5 px-5 font-sans">Adjustments for:</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-8 font-sans text-zinc-600 dark:text-zinc-400">Depreciation of property, plant and equipment</td>
                      <td className="py-1.5 px-2 text-center font-sans text-zinc-400">Note 5</td>
                      <td className="py-1.5 px-2 text-right">{formatZAR(pnl?.depreciation?.current || 0)}</td>
                      <td className="py-1.5 px-2 text-right text-zinc-400">{formatZAR(0)}</td>
                    </tr>
                    <tr className="font-bold border-t border-zinc-300 dark:border-zinc-700">
                      <td className="py-2 px-2 font-sans">Cash generated from operations</td>
                      <td className="py-2 px-2 text-center font-sans text-zinc-400"></td>
                      <td className="py-2 px-2 text-right text-emerald-600 dark:text-emerald-400">{formatZAR(cf?.current?.netOperatingCashFlow || 0)}</td>
                      <td className="py-2 px-2 text-right text-zinc-400">{formatZAR(cf?.prior?.netOperatingCashFlow || 0)}</td>
                    </tr>

                    <tr className="font-bold text-zinc-900 dark:text-white uppercase text-[11px] bg-zinc-50 dark:bg-zinc-900/40">
                      <td colSpan={4} className="py-2 px-2 font-sans pt-4">Investing & Financing activities</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-5 font-sans text-zinc-700 dark:text-zinc-300">Net cash used in investing activities</td>
                      <td className="py-1.5 px-2 text-center font-sans text-zinc-400"></td>
                      <td className="py-1.5 px-2 text-right">{formatZAR(0)}</td>
                      <td className="py-1.5 px-2 text-right text-zinc-400">{formatZAR(0)}</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-5 font-sans text-zinc-700 dark:text-zinc-300">Net cash used in financing activities</td>
                      <td className="py-1.5 px-2 text-center font-sans text-zinc-400"></td>
                      <td className="py-1.5 px-2 text-right">{formatZAR(0)}</td>
                      <td className="py-1.5 px-2 text-right text-zinc-400">{formatZAR(0)}</td>
                    </tr>

                    <tr className="font-extrabold border-t-2 border-b-2 border-zinc-900 dark:border-zinc-100 text-sm text-zinc-900 dark:text-white bg-zinc-50 dark:bg-zinc-900/50">
                      <td className="py-3 px-2 font-sans uppercase">Net increase in cash and cash equivalents</td>
                      <td className="py-3 px-2 text-center font-sans text-zinc-400"></td>
                      <td className="py-3 px-2 text-right text-emerald-600 dark:text-emerald-400">{formatZAR(cf?.current?.endingCashBalance || 0)}</td>
                      <td className="py-3 px-2 text-right text-zinc-400">{formatZAR(cf?.prior?.endingCashBalance || 0)}</td>
                    </tr>
                  </tbody>
                </table>

                <div className="mt-8 pt-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-between text-[10px] text-zinc-400">
                  <span>Annual Financial Statements — {info?.companyName}</span>
                  <span className="font-mono">Page 5</span>
                </div>
              </div>

              {/* PAGE 6: DETAILED INCOME STATEMENT & DIVISIONAL REVENUE BREAKDOWN */}
              <div className="flex flex-col gap-6 pt-8 border-t-2 border-zinc-200 dark:border-zinc-800 print:break-before-page break-before-page">
                <div className="sticky top-13 sm:top-13 z-30 bg-white dark:bg-zinc-950 -mt-6 pt-6 pb-3 px-3 -mx-3 border-b-2 border-zinc-900 dark:border-zinc-100 flex justify-between items-end mb-4 shadow-sm text-zinc-900 dark:text-zinc-100">
                  <div>
                    <h2 className="text-base font-extrabold uppercase text-zinc-900 dark:text-white tracking-wide">{info?.companyName}</h2>
                    <p className="text-xs text-zinc-500 font-medium mt-0.5">Registration Number: {info?.registrationNumber}</p>
                  </div>
                  <div className="text-right">
                    <h3 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">DETAILED INCOME STATEMENT</h3>
                    <p className="text-xs text-zinc-500 font-medium">for the year ended {info?.financialYearEnd}</p>
                  </div>
                </div>

                <table className="w-full text-left text-xs border-collapse font-mono">
                  <thead>
                    <tr className="border-b-2 border-zinc-900 dark:border-zinc-100 text-zinc-500 text-[10px] font-bold uppercase">
                      <th className="py-2.5 px-2 font-sans">Revenue & Expense Schedule</th>
                      <th className="py-2.5 px-2 text-right w-32">{curYear} (R)</th>
                      <th className="py-2.5 px-2 text-right w-32">{priYear} (R)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                    <tr className="font-bold text-zinc-900 dark:text-white uppercase text-[11px] bg-zinc-50 dark:bg-zinc-900/40">
                      <td colSpan={3} className="py-2 px-2 font-sans">INCOME</td>
                    </tr>
                    <tr className="font-bold text-zinc-900 dark:text-white">
                      <td className="py-2 px-2 font-sans">Sales Revenue (excluding VAT)</td>
                      <td className="py-2 px-2 text-right text-emerald-600 dark:text-emerald-400">{formatZAR(det?.revenue?.current || 0)}</td>
                      <td className="py-2 px-2 text-right text-zinc-400">{formatZAR(det?.revenue?.prior || 0)}</td>
                    </tr>
                    {det?.divisionBreakdown?.map((div: any) => (
                      <tr key={div.divisionId} className="text-zinc-600 dark:text-zinc-400 italic">
                        <td className="py-1 px-5 font-sans">- {div.divisionName}</td>
                        <td className="py-1 px-2 text-right">{formatZAR(div.current)}</td>
                        <td className="py-1 px-2 text-right text-zinc-400">{formatZAR(div.prior)}</td>
                      </tr>
                    ))}

                    <tr className="font-bold text-zinc-900 dark:text-white uppercase text-[11px] bg-zinc-50 dark:bg-zinc-900/40">
                      <td colSpan={3} className="py-2 px-2 font-sans pt-4">EXPENSES</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-5 font-sans text-zinc-700 dark:text-zinc-300">Depreciation of property, plant and equipment</td>
                      <td className="py-1.5 px-2 text-right">{formatZAR(pnl?.depreciation?.current || 0)}</td>
                      <td className="py-1.5 px-2 text-right text-zinc-400">{formatZAR(0)}</td>
                    </tr>
                    {det?.expenses?.map((exp: any) => (
                      <tr key={exp.accountId}>
                        <td className="py-1.5 px-5 font-sans text-zinc-700 dark:text-zinc-300">{exp.accountCode} - {exp.accountName}</td>
                        <td className="py-1.5 px-2 text-right">{formatZAR(exp.amount)}</td>
                        <td className="py-1.5 px-2 text-right text-zinc-400">{formatZAR(0)}</td>
                      </tr>
                    ))}
                    <tr className="font-extrabold border-t-2 border-b-2 border-zinc-900 dark:border-zinc-100 text-sm text-zinc-900 dark:text-white bg-zinc-50 dark:bg-zinc-900/50">
                      <td className="py-3 px-2 font-sans uppercase">Profit / (loss) for the year</td>
                      <td className="py-3 px-2 text-right text-emerald-600 dark:text-emerald-400">{formatZAR(det?.netProfit?.current || 0)}</td>
                      <td className="py-3 px-2 text-right text-zinc-400">{formatZAR(det?.netProfit?.prior || 0)}</td>
                    </tr>
                  </tbody>
                </table>

                <div className="mt-8 pt-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-between text-[10px] text-zinc-400">
                  <span>Annual Financial Statements — {info?.companyName}</span>
                  <span className="font-mono">Page 6</span>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Document Footer */}
      <div className="mt-8 pt-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-between items-center text-[10px] text-zinc-400 dark:text-zinc-500">
        <span>Confidential — Internal Financial Reporting System</span>
        <span>Page 1 of 1</span>
      </div>
    </div>
  );
}
