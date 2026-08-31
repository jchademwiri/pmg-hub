'use client';

import * as React from 'react';
import {
  Calendar,
  Filter,
  Download,
  Printer,
  RefreshCw,
  Building2,
  Layers,
  Tag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from '@/components/ui/select';
import { fmtMonthYear, formatZAR } from '@/lib/format';
import type { ChartAccount } from '@pmg/db';

export type ReportType =
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

interface ReportFilterCardProps {
  reportType: ReportType;
  periods: string[];
  selectedPeriod: string;
  onPeriodChange: (p: string) => void;
  divisions: { id: string; name: string }[];
  selectedDivisionId: string;
  onDivisionChange: (d: string) => void;
  accounts: ChartAccount[];
  selectedAccountId: string;
  onAccountChange: (a: string) => void;
  startDate: string;
  onStartDateChange: (s: string) => void;
  endDate: string;
  onEndDateChange: (e: string) => void;
  selectedCategory: string;
  onCategoryChange: (c: string) => void;
  onPrint: () => void;
  onDownloadPdf: () => void;
  loading?: boolean;
  divisionSummary?: { revenue: number; expenses: number } | null;
}

export function ReportFilterCard({
  reportType,
  periods,
  selectedPeriod,
  onPeriodChange,
  divisions,
  selectedDivisionId,
  onDivisionChange,
  accounts,
  selectedAccountId,
  onAccountChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  selectedCategory,
  onCategoryChange,
  onPrint,
  onDownloadPdf,
  loading,
  divisionSummary,
}: ReportFilterCardProps) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const currentFyYear = currentMonth >= 3 ? currentYear + 1 : currentYear;

  // Filter Visibility Config per Report Type
  const isAnnualOnlyReport =
    reportType === 'annual-financial-statements' || reportType === 'changes-in-equity';
  const hidesPeriodFilter = reportType === 'chart-of-accounts';

  const showDivisionFilter =
    reportType !== 'client-performance' && reportType !== 'chart-of-accounts';
  const showAccountFilter = reportType === 'general-ledger';
  const showCategoryFilter = reportType === 'chart-of-accounts';

  const supportsDateRange = [
    'balance-sheet',
    'profit-and-loss',
    'cash-flow',
    'division-performance',
    'client-performance',
    'trial-balance',
    'general-ledger',
    'journal-entries',
  ].includes(reportType);

  // Calculate active filter count
  let activeFilterCount = 0;
  if (selectedPeriod && selectedPeriod !== `${currentFyYear}-FY` && !hidesPeriodFilter)
    activeFilterCount++;
  if (selectedDivisionId && selectedDivisionId !== 'all' && showDivisionFilter) activeFilterCount++;
  if (selectedAccountId && selectedAccountId !== 'all' && showAccountFilter) activeFilterCount++;
  if (selectedCategory && selectedCategory !== 'all' && showCategoryFilter) activeFilterCount++;
  if (startDate) activeFilterCount++;
  if (endDate) activeFilterCount++;

  const handleReset = () => {
    onPeriodChange(`${currentFyYear}-FY`);
    onDivisionChange('all');
    onAccountChange('all');
    onCategoryChange('all');
    onStartDateChange('');
    onEndDateChange('');
  };

  const selectedDivisionName =
    selectedDivisionId !== 'all'
      ? (divisions.find((d) => d.id === selectedDivisionId)?.name ?? 'Selected Division')
      : null;

  return (
    <div className="rounded-2xl border bg-card p-3.5 sm:p-4 shadow-xs flex flex-col gap-3 transition-all">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 border-b border-border/60">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Filter className="h-3.5 w-3.5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
              Filter Options
              {activeFilterCount > 0 && (
                <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-primary/10 text-primary">
                  {activeFilterCount} Active
                </span>
              )}
            </h4>
          </div>
        </div>

        {/* Division Isolated View KPI Snippet */}
        {selectedDivisionName && divisionSummary && (
          <div className="hidden md:flex items-center gap-3 px-2.5 py-1 rounded-lg bg-muted/60 border border-border/50 text-[11px]">
            <span className="font-semibold text-foreground flex items-center gap-1">
              <Building2 className="h-3 w-3 text-primary" /> {selectedDivisionName}:
            </span>
            <span className="text-emerald-600 dark:text-emerald-400 font-mono font-medium">
              Rev: {formatZAR(divisionSummary.revenue)}
            </span>
            <span className="text-zinc-500 font-mono">|</span>
            <span className="text-red-500 font-mono font-medium">
              Exp: {formatZAR(divisionSummary.expenses)}
            </span>
            <span className="text-zinc-500 font-mono">|</span>
            <span
              className={`font-mono font-bold ${divisionSummary.revenue - divisionSummary.expenses >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600'}`}
            >
              Net: {formatZAR(divisionSummary.revenue - divisionSummary.expenses)}
            </span>
          </div>
        )}

        {/* Top Right Action Buttons */}
        <div className="flex items-center gap-1.5 ml-auto">
          {activeFilterCount > 0 && (
            <Button
              onClick={handleReset}
              variant="ghost"
              size="sm"
              className="h-7 text-xs px-2 gap-1 text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className="h-3 w-3" /> Reset
            </Button>
          )}
          <Button
            onClick={onPrint}
            variant="outline"
            size="sm"
            className="h-7 text-xs px-2.5 gap-1.5"
          >
            <Printer className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Print</span>
          </Button>
          <Button
            onClick={onDownloadPdf}
            size="sm"
            className="h-7 text-xs px-2.5 gap-1.5 shadow-xs"
          >
            <Download className="h-3.5 w-3.5" />
            Download PDF
          </Button>
        </div>
      </div>

      {/* Dynamic Filter Controls Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 items-end">
        {/* 1. Period Selector */}
        {!hidesPeriodFilter && (
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Calendar className="size-3 text-primary" /> Period
            </label>
            <Select value={selectedPeriod} onValueChange={onPeriodChange}>
              <SelectTrigger className="h-8 text-xs bg-background">
                <SelectValue placeholder="Select Period" />
              </SelectTrigger>
              <SelectContent className="text-xs">
                {isAnnualOnlyReport ? (
                  <SelectGroup>
                    <SelectLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Annual Financial Years
                    </SelectLabel>
                    <SelectItem value={`${currentFyYear}-FY`}>
                      Annual: FY{currentFyYear} (1 Mar {currentFyYear - 1} – 28 Feb {currentFyYear})
                    </SelectItem>
                    <SelectItem value={`${currentFyYear - 1}-FY`}>
                      Annual: FY{currentFyYear - 1} (1 Mar {currentFyYear - 2} – 28 Feb{' '}
                      {currentFyYear - 1})
                    </SelectItem>
                  </SelectGroup>
                ) : (
                  <>
                    <SelectItem value="all">All Time</SelectItem>

                    {/* Annual Financial Years */}
                    <SelectGroup>
                      <SelectLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Annual Financial Years
                      </SelectLabel>
                      <SelectItem value={`${currentFyYear}-FY`}>
                        Annual: FY{currentFyYear} (1 Mar {currentFyYear - 1} – 28 Feb{' '}
                        {currentFyYear})
                      </SelectItem>
                      <SelectItem value={`${currentFyYear - 1}-FY`}>
                        Annual: FY{currentFyYear - 1} (1 Mar {currentFyYear - 2} – 28 Feb{' '}
                        {currentFyYear - 1})
                      </SelectItem>
                    </SelectGroup>

                    {/* Bi-Annually (Current Year) */}
                    <SelectGroup>
                      <SelectLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Bi-Annual Periods
                      </SelectLabel>
                      <SelectItem value={`${currentFyYear}-H1`}>
                        Bi-Annual: FY{currentFyYear} H1 (Mar – Aug {currentFyYear - 1})
                      </SelectItem>
                      <SelectItem value={`${currentFyYear}-H2`}>
                        Bi-Annual: FY{currentFyYear} H2 (Sep {currentFyYear - 1} – Feb{' '}
                        {currentFyYear})
                      </SelectItem>
                    </SelectGroup>

                    {/* Quarterly (Current Year) */}
                    <SelectGroup>
                      <SelectLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Quarterly Periods
                      </SelectLabel>
                      <SelectItem value={`${currentFyYear}-Q1`}>
                        Quarterly: FY{currentFyYear} Q1 (Mar – May {currentFyYear - 1})
                      </SelectItem>
                      <SelectItem value={`${currentFyYear}-Q2`}>
                        Quarterly: FY{currentFyYear} Q2 (Jun – Aug {currentFyYear - 1})
                      </SelectItem>
                      <SelectItem value={`${currentFyYear}-Q3`}>
                        Quarterly: FY{currentFyYear} Q3 (Sep – Nov {currentFyYear - 1})
                      </SelectItem>
                      <SelectItem value={`${currentFyYear}-Q4`}>
                        Quarterly: FY{currentFyYear} Q4 (Dec {currentFyYear - 1} – Feb{' '}
                        {currentFyYear})
                      </SelectItem>
                    </SelectGroup>

                    {/* Monthly */}
                    <SelectGroup>
                      <SelectLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Monthly Periods
                      </SelectLabel>
                      {periods.map((p) => (
                        <SelectItem key={p} value={p}>
                          Monthly: {fmtMonthYear(p)}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* 2. Division Selector */}
        {showDivisionFilter && (
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Building2 className="size-3 text-primary" /> Division
            </label>
            <Select value={selectedDivisionId} onValueChange={onDivisionChange}>
              <SelectTrigger className="h-8 text-xs bg-background">
                <SelectValue placeholder="All Divisions" />
              </SelectTrigger>
              <SelectContent className="text-xs">
                <SelectItem value="all">All Divisions</SelectItem>
                {divisions.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* 3. Account Selector (General Ledger) */}
        {showAccountFilter && (
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Layers className="size-3 text-primary" /> Account
            </label>
            <Select value={selectedAccountId} onValueChange={onAccountChange}>
              <SelectTrigger className="h-8 text-xs bg-background">
                <SelectValue placeholder="All Accounts" />
              </SelectTrigger>
              <SelectContent className="text-xs max-h-60">
                <SelectItem value="all">All Accounts</SelectItem>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.code} — {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* 4. Category Filter (Chart of Accounts) */}
        {showCategoryFilter && (
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Tag className="size-3 text-primary" /> Category
            </label>
            <Select value={selectedCategory} onValueChange={onCategoryChange}>
              <SelectTrigger className="h-8 text-xs bg-background">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent className="text-xs">
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="asset">Assets</SelectItem>
                <SelectItem value="liability">Liabilities</SelectItem>
                <SelectItem value="equity">Equity</SelectItem>
                <SelectItem value="revenue">Revenue</SelectItem>
                <SelectItem value="expense">Expenses</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* 5. Custom Date Range: Start Date */}
        {supportsDateRange && (
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              {reportType === 'balance-sheet' ? 'From Date (Opt)' : 'Start Date'}
            </label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
              className="h-8 text-xs bg-background"
            />
          </div>
        )}

        {/* 6. Custom Date Range: End Date / As at Date */}
        {supportsDateRange && (
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              {reportType === 'balance-sheet' ? 'As at Date' : 'End Date'}
            </label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => onEndDateChange(e.target.value)}
              className="h-8 text-xs bg-background"
            />
          </div>
        )}
      </div>
    </div>
  );
}
