'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Calendar, Plus, Loader2, ArrowUpRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BackButton } from '@/components/ui/back-button';
import { SetPageLabel } from '@/components/navigation/page-header-context';
import { Pagination } from '@/components/ui/pagination';
import { ClickableTableRow } from '@/components/ui/clickable-table-row';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatZAR, fmtDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { DivisionRow, IncomeRow, ExpenseRow } from '@pmg/db';

export function getDivisionBadge(name: string) {
  const upper = name.toUpperCase();
  if (upper.includes('PLAYHOUSE') || upper.includes('PMG')) {
    return {
      label: 'PMG',
      className: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    };
  }
  if (upper.includes('TENDER') || upper.includes('TES')) {
    return {
      label: 'TES',
      className: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    };
  }
  if (upper.includes('APEX') || upper.includes('AWS')) {
    return {
      label: 'AWS',
      className: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    };
  }
  return {
    label: name.slice(0, 3).toUpperCase(),
    className: 'bg-primary/10 text-primary border-primary/20',
  };
}

interface InvoiceItem {
  id: string;
  documentNumber: string;
  dueDate: string | null;
  total: string | number;
  allocatedAmount?: string | number | null;
}

interface QuotationItem {
  id: string;
  documentNumber: string;
  expiryDate: string | null;
  total: string | number;
}

interface DivisionDetailClientProps {
  division: DivisionRow;
  period: string;
  availablePeriods: { value: string; label: string }[];
  pnl: {
    totalRevenue: number;
    totalIncome: number;
    totalOutstandingAr: number;
    totalExpenses: number;
    totalBadDebt: number;
    netProfit: number;
    marginPercent: number;
    distributionPercent: number;
  };
  pmgShare: number;
  operatingExpenses: number;
  invoiceEntries: { data: InvoiceItem[]; total: number };
  incomeEntries: { data: IncomeRow[]; total: number };
  quoteEntries: { data: QuotationItem[]; total: number };
  expenseEntries: { data: ExpenseRow[]; total: number; sum: number };
  pagination: {
    invPage: number;
    quotePage: number;
    payPage: number;
    expPage: number;
    pageSize: number;
  };
}

export function DivisionDetailClient({
  division,
  period,
  availablePeriods,
  pnl,
  pmgShare,
  operatingExpenses,
  invoiceEntries,
  incomeEntries,
  quoteEntries,
  expenseEntries,
  pagination,
}: DivisionDetailClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = React.useTransition();

  const brandBadge = getDivisionBadge(division.name);

  function handlePeriodChange(newPeriod: string) {
    const p = new URLSearchParams(searchParams.toString());
    p.set('period', newPeriod);
    // Reset table pages on period change
    p.delete('invPage');
    p.delete('quotePage');
    p.delete('payPage');
    p.delete('expPage');

    startTransition(() => {
      router.push(`?${p.toString()}`, { scroll: false });
    });
  }

  function hrefFor(key: string, page: number) {
    const p = new URLSearchParams(searchParams.toString());
    p.set(key, String(page));
    return `?${p.toString()}`;
  }

  const isHighMargin = pnl.marginPercent >= 40;

  return (
    <div className="flex flex-col gap-8">
      <SetPageLabel value={division.name} />

      {/* Header with Brand Badge, Status, Fiscal Period, and Quick Actions */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <BackButton href="/relationships/divisions" label="Divisions" />
          <span
            className={cn(
              'inline-flex items-center justify-center font-mono text-xs font-bold px-2 py-0.5 rounded border tracking-wider',
              brandBadge.className,
            )}
          >
            {brandBadge.label}
          </span>
          <h1 className="text-2xl font-semibold tracking-tight">{division.name}</h1>
          <Badge variant={division.isActive ? 'default' : 'secondary'}>
            {division.isActive ? 'Active' : 'Disabled'}
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Fiscal Period Selector with faint transition indicator */}
          <div className="flex items-center gap-1.5">
            <Select value={period} onValueChange={handlePeriodChange} disabled={isPending}>
              <SelectTrigger
                className={cn(
                  'h-9 w-[190px] text-xs bg-muted/40 font-medium border-border/70 transition-opacity',
                  isPending && 'opacity-60',
                )}
              >
                <div className="flex items-center gap-1.5 truncate">
                  {isPending ? (
                    <Loader2 className="size-3.5 animate-spin text-muted-foreground shrink-0" />
                  ) : (
                    <Calendar className="size-3.5 text-muted-foreground shrink-0" />
                  )}
                  <SelectValue placeholder="Select period" />
                </div>
              </SelectTrigger>
              <SelectContent align="end">
                {availablePeriods.map((p) => (
                  <SelectItem key={p.value} value={p.value} className="text-xs">
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quick Action Shortcuts */}
          <Button asChild size="sm" variant="outline" className="h-9 gap-1 text-xs">
            <Link href={`/billing/invoices/new?divisionId=${division.id}`}>
              <Plus className="size-3.5" />
              Invoice
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="h-9 gap-1 text-xs">
            <Link href={`/billing/quotes/new?divisionId=${division.id}`}>
              <Plus className="size-3.5" />
              Quote
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="h-9 gap-1 text-xs">
            <Link href={`/finance/expenses/new?divisionId=${division.id}`}>
              <Plus className="size-3.5" />
              Expense
            </Link>
          </Button>
        </div>
      </div>

      {/* Main Content Area with faint transition when period changes */}
      <div
        className={cn(
          'flex flex-col gap-8 transition-opacity duration-200',
          isPending && 'opacity-60 pointer-events-none',
        )}
      >
        {/* Balanced 3x3 Financial Metrics Grid (No Leads!) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Revenue */}
          <div className="rounded-lg border bg-card/40 p-4 flex flex-col justify-between gap-2 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Revenue</span>
              <span className="text-[10px] text-muted-foreground/80 font-mono">Billed</span>
            </div>
            <span className="text-xl font-bold tabular-nums text-emerald-400">
              {formatZAR(pnl.totalRevenue)}
            </span>
          </div>

          {/* Net Profit */}
          <div className="rounded-lg border bg-card/40 p-4 flex flex-col justify-between gap-2 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Net Profit</span>
              <span className="text-[10px] text-muted-foreground/80 font-mono">Bottom line</span>
            </div>
            <span
              className={cn(
                'text-xl font-bold tabular-nums',
                pnl.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400',
              )}
            >
              {formatZAR(pnl.netProfit)}
            </span>
          </div>

          {/* Margin % with Emerald Highlighting */}
          <div className="rounded-lg border bg-card/40 p-4 flex flex-col justify-between gap-2 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Profit Margin</span>
              <span className="text-[10px] text-muted-foreground/80 font-mono">Efficiency</span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'text-xl font-bold tabular-nums',
                  pnl.marginPercent >= 0 ? 'text-emerald-400' : 'text-rose-400',
                )}
              >
                {pnl.marginPercent.toFixed(1)}%
              </span>
              {isHighMargin && (
                <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-400 border border-emerald-500/25">
                  High Margin
                </span>
              )}
            </div>
          </div>

          {/* Cash Receipts */}
          <div className="rounded-lg border bg-card/40 p-4 flex flex-col justify-between gap-2 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Cash Receipts</span>
              <span className="text-[10px] text-muted-foreground/80 font-mono">Collected</span>
            </div>
            <span className="text-xl font-bold tabular-nums text-emerald-400">
              {formatZAR(pnl.totalIncome)}
            </span>
          </div>

          {/* Operating Expenses */}
          <div className="rounded-lg border bg-card/40 p-4 flex flex-col justify-between gap-2 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Operating Expenses</span>
              <span className="text-[10px] text-muted-foreground/80 font-mono">Costs</span>
            </div>
            <span className="text-xl font-bold tabular-nums text-amber-400">
              {formatZAR(operatingExpenses)}
            </span>
          </div>

          {/* PMG Share */}
          <div className="rounded-lg border bg-card/40 p-4 flex flex-col justify-between gap-2 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">PMG Share</span>
              <span className="text-[10px] text-muted-foreground/80 font-mono">Holdback</span>
            </div>
            <span className="text-xl font-bold tabular-nums text-blue-400">
              {formatZAR(pmgShare)}
            </span>
          </div>

          {/* Accounts Receivable */}
          <div className="rounded-lg border bg-card/40 p-4 flex flex-col justify-between gap-2 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Accounts Receivable</span>
              <span className="text-[10px] text-muted-foreground/80 font-mono">Outstanding</span>
            </div>
            <span
              className={cn(
                'text-xl font-bold tabular-nums',
                pnl.totalOutstandingAr > 0 ? 'text-amber-400' : 'text-muted-foreground',
              )}
            >
              {formatZAR(pnl.totalOutstandingAr)}
            </span>
          </div>

          {/* Revenue Contribution */}
          <div className="rounded-lg border bg-card/40 p-4 flex flex-col justify-between gap-2 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Revenue Contribution
              </span>
              <span className="text-[10px] text-muted-foreground/80 font-mono">Share</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold tabular-nums">
                {pnl.distributionPercent.toFixed(1)}%
              </span>
              <span className="text-xs text-muted-foreground">of total group revenue</span>
            </div>
          </div>

          {/* Bad Debt */}
          <div className="rounded-lg border bg-card/40 p-4 flex flex-col justify-between gap-2 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Bad Debt</span>
              <span className="text-[10px] text-muted-foreground/80 font-mono">Written off</span>
            </div>
            <span
              className={cn(
                'text-xl font-bold tabular-nums',
                pnl.totalBadDebt > 0 ? 'text-rose-400' : 'text-muted-foreground',
              )}
            >
              {formatZAR(pnl.totalBadDebt)}
            </span>
          </div>
        </div>

        {/* Transaction Cards (2 per row) with Direct Module Jumps */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Outstanding Invoices */}
          <section className="rounded-lg border p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold">Outstanding Invoices</h2>
                <Button
                  asChild
                  variant="ghost"
                  size="icon"
                  className="size-6 text-muted-foreground"
                >
                  <Link
                    href={`/billing/invoices?divisionId=${division.id}`}
                    title="View all invoices for this division"
                  >
                    <ArrowUpRight className="size-3.5" />
                  </Link>
                </Button>
              </div>
              <span className="text-xs font-semibold text-amber-400 font-mono">
                {formatZAR(pnl.totalOutstandingAr)} outstanding
              </span>
            </div>
            {invoiceEntries.data.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No outstanding invoices for this division.
              </p>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Due</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoiceEntries.data.map((inv) => {
                      const balance = Number(inv.total) - Number(inv.allocatedAmount ?? 0);
                      return (
                        <ClickableTableRow key={inv.id} href={`/billing/invoices/${inv.id}`}>
                          <TableCell className="font-medium">{inv.documentNumber}</TableCell>
                          <TableCell>{inv.dueDate ? fmtDate(inv.dueDate) : '-'}</TableCell>
                          <TableCell className="text-right tabular-nums font-medium text-amber-400">
                            {formatZAR(balance)}
                          </TableCell>
                        </ClickableTableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                <Pagination
                  currentPage={pagination.invPage}
                  totalPages={Math.ceil(invoiceEntries.total / pagination.pageSize)}
                  buildHref={(p) => hrefFor('invPage', p)}
                />
              </>
            )}
          </section>

          {/* Payment Receipts */}
          <section className="rounded-lg border p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold">Payment Receipts</h2>
                <Button
                  asChild
                  variant="ghost"
                  size="icon"
                  className="size-6 text-muted-foreground"
                >
                  <Link
                    href={`/billing/payments?divisionId=${division.id}`}
                    title="View all payments for this division"
                  >
                    <ArrowUpRight className="size-3.5" />
                  </Link>
                </Button>
              </div>
              <span className="text-xs font-semibold text-emerald-400 font-mono">
                {formatZAR(pnl.totalIncome)} collected
              </span>
            </div>
            {incomeEntries.data.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No income records for this division.
              </p>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {incomeEntries.data.map((e) => (
                      <ClickableTableRow key={e.id} href={`/billing/payments/${e.id}`}>
                        <TableCell>{fmtDate(e.date)}</TableCell>
                        <TableCell>{e.clientName ?? '-'}</TableCell>
                        <TableCell className="text-right tabular-nums font-medium text-emerald-400">
                          +{formatZAR(Number(e.amount))}
                        </TableCell>
                      </ClickableTableRow>
                    ))}
                  </TableBody>
                </Table>
                <Pagination
                  currentPage={pagination.payPage}
                  totalPages={Math.ceil(incomeEntries.total / pagination.pageSize)}
                  buildHref={(p) => hrefFor('payPage', p)}
                />
              </>
            )}
          </section>

          {/* Quotes */}
          <section className="rounded-lg border p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold">Quotes</h2>
                <Button
                  asChild
                  variant="ghost"
                  size="icon"
                  className="size-6 text-muted-foreground"
                >
                  <Link
                    href={`/billing/quotes?divisionId=${division.id}`}
                    title="View all quotes for this division"
                  >
                    <ArrowUpRight className="size-3.5" />
                  </Link>
                </Button>
              </div>
            </div>
            {quoteEntries.data.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No quotes for this division.
              </p>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Quote</TableHead>
                      <TableHead>Expiry</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {quoteEntries.data.map((q) => (
                      <ClickableTableRow key={q.id} href={`/billing/quotes/${q.id}`}>
                        <TableCell className="font-medium">{q.documentNumber}</TableCell>
                        <TableCell>{q.expiryDate ? fmtDate(q.expiryDate) : '-'}</TableCell>
                        <TableCell className="text-right tabular-nums font-medium">
                          {formatZAR(Number(q.total))}
                        </TableCell>
                      </ClickableTableRow>
                    ))}
                  </TableBody>
                </Table>
                <Pagination
                  currentPage={pagination.quotePage}
                  totalPages={Math.ceil(quoteEntries.total / pagination.pageSize)}
                  buildHref={(p) => hrefFor('quotePage', p)}
                />
              </>
            )}
          </section>

          {/* Expense History */}
          <section className="rounded-lg border p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold">Expense History</h2>
                <Button
                  asChild
                  variant="ghost"
                  size="icon"
                  className="size-6 text-muted-foreground"
                >
                  <Link
                    href={`/finance/expenses?divisionId=${division.id}`}
                    title="View all expenses for this division"
                  >
                    <ArrowUpRight className="size-3.5" />
                  </Link>
                </Button>
              </div>
              <span className="text-xs font-semibold text-amber-400 font-mono">
                {formatZAR(expenseEntries.sum)} logged
              </span>
            </div>
            {expenseEntries.data.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No expense records for this division.
              </p>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenseEntries.data.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell>{fmtDate(e.date)}</TableCell>
                        <TableCell>{e.category}</TableCell>
                        <TableCell className="text-right tabular-nums font-medium text-amber-400">
                          −{formatZAR(Number(e.amount))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Pagination
                  currentPage={pagination.expPage}
                  totalPages={Math.ceil(expenseEntries.total / pagination.pageSize)}
                  buildHref={(p) => hrefFor('expPage', p)}
                />
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
