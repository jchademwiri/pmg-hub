import type { Metadata } from 'next';
import { getGeneralLedger, getActiveChartAccounts, getLedgerMonthlySummaries } from '@pmg/db';
import { BillingKpiCard } from '@/components/billing/billing-kpi-card';
import { ArrowDownLeft, ArrowUpRight, Activity, ShieldCheck } from 'lucide-react';
import { formatZAR } from '@/lib/format';
import { GeneralLedgerTable } from './general-ledger-table';
import { LazyGeneralLedgerTable } from './lazy-general-ledger-table';
import { GeneralLedgerFilterBar } from './general-ledger-filter-bar';
import { generateFinancialYearGroups, getCurrentMonthString } from '@/lib/billing-groups';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'General Ledger' };

export default async function GeneralLedgerPage({
  searchParams,
}: {
  searchParams: Promise<{ accountId?: string }>;
}) {
  const params = await searchParams;

  const currentMonthStr = getCurrentMonthString();
  const { currentMonths, previousYearGroup } = generateFinancialYearGroups();
  const [currentYear, currentMonth] = currentMonthStr.split('-').map(Number);

  // Start date and end date for the current month
  const startDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
  const endOfMonth = new Date(currentYear, currentMonth, 0).getDate();
  const endDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${endOfMonth}`;

  const [currentMonthResult, accounts] = await Promise.all([
    getGeneralLedger({
      startDate,
      endDate,
      accountId: params.accountId,
      page: 1,
      pageSize: 5000,
    }),
    getActiveChartAccounts(),
  ]);

  const fyStartYear = currentMonth <= 2 ? currentYear - 1 : currentYear;

  const monthlySummaries = await getLedgerMonthlySummaries(fyStartYear, params.accountId);
  const globalDebits = monthlySummaries.reduce((sum, m) => sum + m.totalDebits, 0);
  const globalCredits = monthlySummaries.reduce((sum, m) => sum + m.totalCredits, 0);
  const globalMovement = globalDebits - globalCredits;
  const totalEntries = monthlySummaries.reduce((sum, m) => sum + (m.count ?? 0), 0);
  const isBalanced = Math.abs(globalMovement) < 0.01;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">General Ledger</h2>
          <p className="text-sm text-muted-foreground">
            View the complete debit and credit ledger with running balances for each account.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <GeneralLedgerFilterBar accounts={accounts} currentAccountId={params.accountId} />
        </div>
      </div>

      {/* Metrics Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {/* 1. Total Debits */}
        <BillingKpiCard
          title="Total Debits"
          value={formatZAR(globalDebits)}
          subtitle={<span>For the current financial year</span>}
          icon={ArrowDownLeft}
          variant="blue"
          tooltip="Total debits recorded across active ledger accounts"
        />

        {/* 2. Total Credits */}
        <BillingKpiCard
          title="Total Credits"
          value={formatZAR(globalCredits)}
          subtitle={<span>For the current financial year</span>}
          icon={ArrowUpRight}
          variant="emerald"
          tooltip="Total credits recorded across active ledger accounts"
        />

        {/* 3. Net Movement */}
        <BillingKpiCard
          title="Net Movement"
          value={formatZAR(Math.abs(globalMovement))}
          badge={globalMovement < 0 ? 'Net Credit' : globalMovement > 0 ? 'Net Debit' : 'Balanced'}
          subtitle={<span>Difference (Dr − Cr)</span>}
          icon={Activity}
          variant={isBalanced ? 'emerald' : 'amber'}
          tooltip="Net movement across selected accounts for the financial year"
        />

        {/* 4. Ledger Integrity */}
        <BillingKpiCard
          title="Ledger Integrity"
          value={isBalanced ? 'Balanced' : 'Unbalanced'}
          badge={`${totalEntries} line${totalEntries === 1 ? '' : 's'}`}
          subtitle={
            <span>{isBalanced ? 'Audit verified (Dr = Cr)' : 'Reconciliation pending'}</span>
          }
          icon={ShieldCheck}
          variant={isBalanced ? 'emerald' : 'rose'}
          tooltip="Double-entry audit verification across all accounts"
        />
      </div>

      <Accordion
        type="single"
        collapsible
        defaultValue="current-month"
        className="w-full space-y-4"
      >
        {/* CURRENT MONTH */}
        <AccordionItem value="current-month" className="border rounded-lg bg-card px-4">
          <AccordionTrigger className="flex items-center w-full pr-4 hover:no-underline group/trigger py-4">
            <span className="flex-1 text-left text-lg font-medium text-muted-foreground group-data-[state=open]/trigger:text-foreground transition-colors">
              Current Month (
              {new Date(currentYear, currentMonth - 1).toLocaleString('default', {
                month: 'long',
                year: 'numeric',
              })}
              )
            </span>

            {/* Summary Badges */}
            {(() => {
              const summary = monthlySummaries.find((s) => s.month === currentMonthStr);
              if (!summary) return null;
              return (
                <div className="flex items-center gap-3 pr-2">
                  <div className="px-2.5 py-0.5 rounded-full bg-muted/50 text-xs text-muted-foreground border border-border/50 hidden sm:block">
                    {summary.count} {summary.count === 1 ? 'line' : 'lines'}
                  </div>
                  <div className="px-2.5 py-0.5 rounded-full bg-primary/10 text-xs text-primary font-medium border border-primary/20">
                    Dr: {formatZAR(summary.totalDebits)}
                  </div>
                  <div className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-xs text-emerald-600 dark:text-emerald-400 font-medium border border-emerald-500/20">
                    Cr: {formatZAR(summary.totalCredits)}
                  </div>
                </div>
              );
            })()}
          </AccordionTrigger>
          <AccordionContent className="pt-2 pb-6">
            <GeneralLedgerTable entries={currentMonthResult.data} />
          </AccordionContent>
        </AccordionItem>

        {/* PREVIOUS MONTHS OF CURRENT FY */}
        {currentMonths.map((m) => {
          if (m.year === currentYear && m.month === currentMonth) return null;

          const val = m.value;
          return (
            <AccordionItem key={val} value={val} className="border rounded-lg bg-card px-4">
              <AccordionTrigger className="flex items-center w-full pr-4 hover:no-underline group/trigger py-4">
                <span className="flex-1 text-left text-lg font-medium text-muted-foreground group-data-[state=open]/trigger:text-foreground transition-colors">
                  {m.label}
                </span>

                {/* Summary Badges */}
                {(() => {
                  const summary = monthlySummaries.find((s) => s.month === val);
                  if (!summary) return null;
                  return (
                    <div className="flex items-center gap-3 pr-2">
                      <div className="px-2.5 py-0.5 rounded-full bg-muted/50 text-xs text-muted-foreground border border-border/50 hidden sm:block">
                        {summary.count} {summary.count === 1 ? 'line' : 'lines'}
                      </div>
                      <div className="px-2.5 py-0.5 rounded-full bg-primary/10 text-xs text-primary font-medium border border-primary/20">
                        Dr: {formatZAR(summary.totalDebits)}
                      </div>
                      <div className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-xs text-emerald-600 dark:text-emerald-400 font-medium border border-emerald-500/20">
                        Cr: {formatZAR(summary.totalCredits)}
                      </div>
                    </div>
                  );
                })()}
              </AccordionTrigger>
              <AccordionContent className="pt-2 pb-6">
                <LazyGeneralLedgerTable
                  year={m.year}
                  month={m.month}
                  accountId={params.accountId}
                />
              </AccordionContent>
            </AccordionItem>
          );
        })}

        {/* PREVIOUS FINANCIAL YEAR */}
        {previousYearGroup && (
          <AccordionItem value="previous-fy" className="border rounded-lg bg-card px-4">
            <AccordionTrigger className="flex items-center w-full pr-4 hover:no-underline group/trigger py-4">
              <span className="flex-1 text-left text-lg font-medium text-muted-foreground group-data-[state=open]/trigger:text-foreground transition-colors">
                Previous Financial Year (Mar {previousYearGroup.year} - Feb{' '}
                {previousYearGroup.year + 1})
              </span>
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-6">
              <LazyGeneralLedgerTable year={previousYearGroup.year} accountId={params.accountId} />
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>
    </div>
  );
}
