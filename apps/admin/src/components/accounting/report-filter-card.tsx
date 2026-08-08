'use client';

import * as React from 'react';
import {
  Filter,
  RotateCcw,
  Printer,
  Download,
  Building2,
  Calendar,
  Table2,
  BookOpen,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { formatZAR } from '@/lib/format';
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
  onPeriodChange: (period: string) => void;
  divisions: { id: string; name: string }[];
  selectedDivisionId: string;
  onDivisionChange: (divisionId: string) => void;
  accounts: ChartAccount[];
  selectedAccountId: string;
  onAccountChange: (accountId: string) => void;
  startDate: string;
  onStartDateChange: (startDate: string) => void;
  endDate: string;
  onEndDateChange: (endDate: string) => void;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
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
  loading = false,
  divisionSummary = null,
}: ReportFilterCardProps) {
  // Determine control visibilities based on matrix
  const isAfsOrEquity = reportType === 'annual-financial-statements' || reportType === 'changes-in-equity';
  const isChartOfAccounts = reportType === 'chart-of-accounts';
  const isClientPerformance = reportType === 'client-performance';

  const showPeriod = !isChartOfAccounts;
  const showDivision = !isChartOfAccounts && !isClientPerformance;
  const showAccountPicker = reportType === 'general-ledger';
  const showDateRange = [
    'balance-sheet',
    'profit-and-loss',
    'cash-flow',
    'division-performance',
    'client-performance',
    'trial-balance',
    'general-ledger',
    'journal-entries',
  ].includes(reportType);
  const showCategoryFilter = isChartOfAccounts;

  // Compute active filters count
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const defaultFy = `${currentMonth >= 3 ? currentYear + 1 : currentYear}-FY`;

  let activeFilterCount = 0;
  if (showPeriod && selectedPeriod && selectedPeriod !== defaultFy) activeFilterCount++;
  if (showDivision && selectedDivisionId && selectedDivisionId !== 'all') activeFilterCount++;
  if (showAccountPicker && selectedAccountId && selectedAccountId !== 'all') activeFilterCount++;
  if (showDateRange && (startDate || endDate)) activeFilterCount++;
  if (showCategoryFilter && selectedCategory && selectedCategory !== 'all') activeFilterCount++;

  const handleReset = () => {
    onPeriodChange(defaultFy);
    onDivisionChange('all');
    onAccountChange('all');
    onStartDateChange('');
    onEndDateChange('');
    onCategoryChange('all');
  };

  // Build financial year options (last 4 years)
  const fyYearNums = [currentYear + 1, currentYear, currentYear - 1, currentYear - 2];
  const annualFyOptions = fyYearNums.map((yr) => ({
    value: `${yr}-FY`,
    label: `FY${yr} (1 Mar ${yr - 1} – 28 Feb ${yr})`,
  }));

  // Build quarterly options for current and previous FY
  const quarterOptions: { value: string; label: string }[] = [];
  fyYearNums.slice(0, 2).forEach((yr) => {
    quarterOptions.push(
      { value: `${yr}-Q1`, label: `${yr} Q1 (Mar – May ${yr - 1})` },
      { value: `${yr}-Q2`, label: `${yr} Q2 (Jun – Aug ${yr - 1})` },
      { value: `${yr}-Q3`, label: `${yr} Q3 (Sep – Nov ${yr - 1})` },
      { value: `${yr}-Q4`, label: `${yr} Q4 (Dec ${yr - 1} – Feb ${yr})` }
    );
  });

  // Monthly options from periods prop
  const monthlyOptions = (periods || []).slice(0, 24);

  const selectedDivisionObj = divisions.find((d) => d.id === selectedDivisionId);

  return (
    <div className="rounded-2xl border bg-card p-3.5 shadow-sm transition-all dark:bg-zinc-900/60 dark:border-zinc-800/80 mb-5">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b border-border/60">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Filter className="h-3.5 w-3.5" />
          </div>
          <span className="text-xs font-semibold text-foreground tracking-tight">Report Controls & Filters</span>
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-medium bg-primary/10 text-primary border-primary/20">
              {activeFilterCount} Active {activeFilterCount === 1 ? 'Filter' : 'Filters'}
            </Badge>
          )}
          {loading && (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground animate-pulse ml-1">
              <Sparkles className="h-3 w-3 text-amber-500 animate-spin" /> Updating preview...
            </span>
          )}
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-2">
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <RotateCcw className="mr-1 h-3 w-3" /> Reset
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={onPrint}
            className="h-7 px-2.5 text-xs border-border/80 text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <Printer className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" /> Print
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={onDownloadPdf}
            className="h-7 px-2.5 text-xs bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs"
          >
            <Download className="mr-1.5 h-3.5 w-3.5" /> Export PDF
          </Button>
        </div>
      </div>

      {/* Control Grid */}
      <div className="mt-3.5 flex flex-wrap items-end gap-3">
        {/* Period Selector */}
        {showPeriod && (
          <div className="flex-1 min-w-[200px] max-w-[280px]">
            <label className="block text-[10px] font-bold uppercase text-muted-foreground tracking-wider mb-1">
              Period / Financial Year
            </label>
            <Select value={selectedPeriod} onValueChange={onPeriodChange}>
              <SelectTrigger className="h-8 text-xs bg-background">
                <Calendar className="mr-1.5 h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel className="text-[10px] uppercase font-bold text-muted-foreground">Annual Financial Years</SelectLabel>
                  {annualFyOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-xs">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectGroup>

                {!isAfsOrEquity && (
                  <>
                    <SelectGroup>
                      <SelectLabel className="text-[10px] uppercase font-bold text-muted-foreground mt-1">Quarterly</SelectLabel>
                      {quarterOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value} className="text-xs">
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>

                    <SelectGroup>
                      <SelectLabel className="text-[10px] uppercase font-bold text-muted-foreground mt-1">Monthly Periods</SelectLabel>
                      {monthlyOptions.map((m) => (
                        <SelectItem key={m} value={m} className="text-xs">
                          {m}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Division Selector */}
        {showDivision && (
          <div className="flex-1 min-w-[180px] max-w-[240px]">
            <label className="block text-[10px] font-bold uppercase text-muted-foreground tracking-wider mb-1">
              Division Filter
            </label>
            <Select value={selectedDivisionId} onValueChange={onDivisionChange}>
              <SelectTrigger className="h-8 text-xs bg-background">
                <Building2 className="mr-1.5 h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <SelectValue placeholder="All Divisions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs font-medium">
                  🏢 All Divisions (Consolidated)
                </SelectItem>
                {divisions.map((d) => (
                  <SelectItem key={d.id} value={d.id} className="text-xs">
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Account Selector (General Ledger) */}
        {showAccountPicker && (
          <div className="flex-1 min-w-[220px] max-w-[300px]">
            <label className="block text-[10px] font-bold uppercase text-muted-foreground tracking-wider mb-1">
              Account Picker
            </label>
            <Select value={selectedAccountId} onValueChange={onAccountChange}>
              <SelectTrigger className="h-8 text-xs bg-background">
                <Table2 className="mr-1.5 h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <SelectValue placeholder="All Accounts" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                <SelectItem value="all" className="text-xs font-medium">
                  All Chart Accounts
                </SelectItem>
                {accounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id} className="text-xs">
                    <span className="font-mono text-[11px] text-muted-foreground mr-1.5">{acc.code}</span>
                    {acc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Category Filter (Chart of Accounts) */}
        {showCategoryFilter && (
          <div className="flex-1 min-w-[180px] max-w-[240px]">
            <label className="block text-[10px] font-bold uppercase text-muted-foreground tracking-wider mb-1">
              Account Category
            </label>
            <Select value={selectedCategory} onValueChange={onCategoryChange}>
              <SelectTrigger className="h-8 text-xs bg-background">
                <BookOpen className="mr-1.5 h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs font-medium">All Categories</SelectItem>
                <SelectItem value="asset" className="text-xs">Assets</SelectItem>
                <SelectItem value="liability" className="text-xs">Liabilities</SelectItem>
                <SelectItem value="equity" className="text-xs">Equity</SelectItem>
                <SelectItem value="revenue" className="text-xs">Revenue</SelectItem>
                <SelectItem value="expense" className="text-xs">Expenses</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Custom Date Range Pickers */}
        {showDateRange && (
          <div className="flex items-center gap-2 min-w-[260px]">
            <div className="flex-1">
              <label className="block text-[10px] font-bold uppercase text-muted-foreground tracking-wider mb-1">
                Start Date
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => onStartDateChange(e.target.value)}
                className="h-8 text-xs bg-background px-2"
              />
            </div>
            <div className="flex-1">
              <label className="block text-[10px] font-bold uppercase text-muted-foreground tracking-wider mb-1">
                End Date
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => onEndDateChange(e.target.value)}
                className="h-8 text-xs bg-background px-2"
              />
            </div>
          </div>
        )}
      </div>

      {/* Active Division Summary Callout Pill */}
      {selectedDivisionId !== 'all' && selectedDivisionObj && (
        <div className="mt-3 pt-2.5 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground bg-primary/5 rounded-lg px-3 py-1.5 border border-primary/10">
          <div className="flex items-center gap-1.5 font-medium text-foreground">
            <Building2 className="h-3.5 w-3.5 text-primary" />
            <span>Showing information isolated for <strong className="text-primary">{selectedDivisionObj.name}</strong></span>
          </div>
          {divisionSummary && (
            <div className="flex items-center gap-3 text-[11px] font-mono">
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                Rev: {formatZAR(divisionSummary.revenue)}
              </span>
              <span className="text-rose-600 dark:text-rose-400 font-semibold">
                Exp: {formatZAR(divisionSummary.expenses)}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
