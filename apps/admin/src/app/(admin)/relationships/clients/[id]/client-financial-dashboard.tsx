'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { formatZAR, fmtDate, getSASTToday } from '@/lib/format';
import {
  calculateAverageDaysToPay,
  calculateClientHealth,
  buildActivityFeed,
  type ActivityEvent,
} from '@/lib/client-billing-helpers';
import type { InvoiceDetail, QuotationDetail } from '@pmg/db';
import { ChevronDown, ChevronUp, Activity, TrendingUp, Calendar, AlertTriangle } from 'lucide-react';

interface ClientFinancialDashboardProps {
  invoices: InvoiceDetail[];
  quotes: QuotationDetail[];
  payments: any[];
}

export function ClientFinancialDashboard({
  invoices,
  quotes,
  payments,
}: ClientFinancialDashboardProps) {
  const [isActivityExpanded, setIsActivityExpanded] = useState(true);
  const [showAllActivity, setShowAllActivity] = useState(false);

  // 1. Calculate Metrics
  const todayStr = getSASTToday();
  const activeInvoices = invoices.filter(
    (inv) => inv.status !== 'void' && inv.status !== 'draft' && inv.invoiceDate <= todayStr
  );
  const totalInvoiced = activeInvoices.reduce((sum, inv) => sum + Number(inv.total), 0);
  const totalPaid = payments.reduce((sum, pay) => sum + Number(pay.amount), 0);
  const outstandingBalance = activeInvoices.reduce(
    (sum, inv) => sum + (Number(inv.total) - Number(inv.allocatedAmount ?? 0)),
    0
  );

  // Overdue Balance Calculation
  const overdueInvoices = activeInvoices.filter(
    (inv) =>
      (inv.status === 'overdue' || inv.status === 'issued' || inv.status === 'partially_paid') &&
      inv.dueDate &&
      inv.dueDate < todayStr
  );
  const overdueBalance = overdueInvoices.reduce(
    (sum, inv) => sum + (Number(inv.total) - Number(inv.allocatedAmount ?? 0)),
    0
  );

  // Quote Conversion Rate
  const acceptedQuotes = quotes.filter((q) => q.status === 'accepted' || q.status === 'converted');
  const sentOrAcceptedQuotes = quotes.filter(
    (q) => q.status === 'sent' || q.status === 'accepted' || q.status === 'converted' || q.status === 'declined'
  );
  const quoteConversionRate =
    sentOrAcceptedQuotes.length > 0
      ? Math.round((acceptedQuotes.length / sentOrAcceptedQuotes.length) * 100)
      : 0;

  // 2. Client Health Score
  const health = calculateClientHealth(invoices, outstandingBalance, overdueBalance);

  // 3. Ageing Buckets
  const ageing = { current: 0, days1_30: 0, days31_60: 0, days61_plus: 0 };
  const today = new Date(todayStr);

  for (const inv of activeInvoices) {
    const balance = Number(inv.total) - Number(inv.allocatedAmount ?? 0);
    if (balance <= 0) continue;

    if (inv.status === 'issued' || inv.status === 'overdue' || inv.status === 'partially_paid') {
      const dueStr = inv.dueDate ?? inv.invoiceDate;
      const dDate = new Date(dueStr);
      const diffTime = today.getTime() - dDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= 0) {
        ageing.current += balance;
      } else if (diffDays <= 30) {
        ageing.days1_30 += balance;
      } else if (diffDays <= 60) {
        ageing.days31_60 += balance;
      } else {
        ageing.days61_plus += balance;
      }
    }
  }

  const totalAgeing = ageing.current + ageing.days1_30 + ageing.days31_60 + ageing.days61_plus;

  const getPct = (amount: number) => {
    if (totalAgeing <= 0) return 0;
    return Math.round((amount / totalAgeing) * 100);
  };

  const ageingAllocations = [
    { key: 'current', label: 'Current', amount: ageing.current, pct: getPct(ageing.current), color: 'bg-green-500' },
    { key: 'days1_30', label: '1-30 Days', amount: ageing.days1_30, pct: getPct(ageing.days1_30), color: 'bg-amber-500' },
    { key: 'days31_60', label: '31-60 Days', amount: ageing.days31_60, pct: getPct(ageing.days31_60), color: 'bg-orange-500' },
    { key: 'days61_plus', label: '61+ Days', amount: ageing.days61_plus, pct: getPct(ageing.days61_plus), color: 'bg-red-500' },
  ].filter(item => item.amount > 0);

  // 4. Payment Behavior
  const avgDaysToPay = calculateAverageDaysToPay(invoices);
  const collectionEfficiency = totalInvoiced > 0 ? Math.round((totalPaid / totalInvoiced) * 100) : 100;
  
  const lastPayment = payments.length > 0 
    ? payments.sort((a, b) => b.date.localeCompare(a.date))[0]
    : null;

  const largestPayment = payments.length > 0
    ? Math.max(...payments.map(p => Number(p.amount)))
    : 0;

  // 5. Activity Feed
  const activityEvents = buildActivityFeed(quotes, invoices, payments);

  return (
    <div className="flex flex-col gap-6">
      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="shadow-sm border-muted-foreground/10 bg-card">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Invoiced</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <span className="text-lg font-bold tabular-nums">{formatZAR(totalInvoiced)}</span>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-muted-foreground/10 bg-card">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Paid</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <span className="text-lg font-bold tabular-nums text-green-600 dark:text-green-400">{formatZAR(totalPaid)}</span>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-muted-foreground/10 bg-card">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Outstanding</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <span className={`text-lg font-bold tabular-nums ${outstandingBalance > 0 ? 'text-amber-600 dark:text-amber-400' : ''}`}>
              {formatZAR(outstandingBalance)}
            </span>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-muted-foreground/10 bg-card">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Overdue</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <span className={`text-lg font-bold tabular-nums ${overdueBalance > 0 ? 'text-red-600 dark:text-red-400' : ''}`}>
              {formatZAR(overdueBalance)}
            </span>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-muted-foreground/10 bg-card col-span-2 md:col-span-1">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Quote Conversion</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <span className="text-lg font-bold tabular-nums">{quoteConversionRate}%</span>
          </CardContent>
        </Card>
      </div>

      {/* Second Row: Ageing and Health/Payment Behaviour */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Ageing Card */}
        <Card className="lg:col-span-7 shadow-sm border-muted-foreground/10 bg-card">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold">Accounts Receivable Ageing</CardTitle>
              <CardDescription className="text-xs">Outstanding invoice ageing breakdown</CardDescription>
            </div>
            {overdueBalance > 0 && (
              <Badge variant="destructive" className="flex gap-1 items-center animate-pulse text-[10px] px-2 py-0.5">
                <AlertTriangle className="size-3" /> Overdue
              </Badge>
            )}
          </CardHeader>
          <CardContent className="p-4 flex flex-col gap-4">
            {/* Ageing stack bar */}
            {totalAgeing > 0 ? (
              <div className="flex flex-col gap-3">
                <div className="flex h-4 w-full overflow-hidden rounded-full bg-muted border border-muted-foreground/5">
                  {ageingAllocations.map((item) => (
                    <Tooltip key={item.key}>
                      <TooltipTrigger asChild>
                        <div className={`${item.color} transition-all`} style={{ width: `${item.pct}%` }} />
                      </TooltipTrigger>
                      <TooltipContent>
                        <span className="font-semibold">{item.label}</span>: {formatZAR(item.amount)} ({item.pct}%)
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
                
                {/* Ageing legend table */}
                <div className="grid grid-cols-4 gap-2 text-center text-xs mt-1">
                  <div className="flex flex-col items-center p-2 rounded-lg bg-green-500/5 dark:bg-green-500/10 border border-green-500/10">
                    <span className="font-medium text-green-600 dark:text-green-400">Current</span>
                    <span className="font-bold mt-0.5 tabular-nums text-foreground/80">{formatZAR(ageing.current)}</span>
                  </div>
                  <div className="flex flex-col items-center p-2 rounded-lg bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/10">
                    <span className="font-medium text-amber-600 dark:text-amber-400">1-30 Days</span>
                    <span className="font-bold mt-0.5 tabular-nums text-foreground/80">{formatZAR(ageing.days1_30)}</span>
                  </div>
                  <div className="flex flex-col items-center p-2 rounded-lg bg-orange-500/5 dark:bg-orange-500/10 border border-orange-500/10">
                    <span className="font-medium text-orange-600 dark:text-orange-400">31-60 Days</span>
                    <span className="font-bold mt-0.5 tabular-nums text-foreground/80">{formatZAR(ageing.days31_60)}</span>
                  </div>
                  <div className="flex flex-col items-center p-2 rounded-lg bg-red-500/5 dark:bg-red-500/10 border border-red-500/10">
                    <span className="font-medium text-red-600 dark:text-red-400">61+ Days</span>
                    <span className="font-bold mt-0.5 tabular-nums text-foreground/80">{formatZAR(ageing.days61_plus)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-16 flex items-center justify-center border border-dashed rounded-lg bg-muted/20">
                <span className="text-sm text-muted-foreground">All invoices settled. No outstanding aging balance.</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Health & Payment Behavior */}
        <Card className="lg:col-span-5 shadow-sm border-muted-foreground/10 bg-card">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold">Payment Health & Behaviour</CardTitle>
              <CardDescription className="text-xs">Payment history analytics & health rating</CardDescription>
            </div>
            <Badge
              variant={
                health.score === 'Excellent'
                  ? 'default'
                  : health.score === 'Good'
                  ? 'secondary'
                  : 'destructive'
              }
              className={`font-semibold capitalize text-xs ${
                health.score === 'Excellent'
                  ? 'bg-green-500 text-white hover:bg-green-600'
                  : health.score === 'Good'
                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                  : health.score === 'At Risk'
                  ? 'bg-orange-500 text-white hover:bg-orange-600'
                  : 'bg-red-500 text-white hover:bg-red-600'
              }`}
            >
              {health.score} Health
            </Badge>
          </CardHeader>
          <CardContent className="p-4 flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="size-3.5 text-muted-foreground/70" /> Avg. Days to Pay
                </span>
                <span className="font-bold tabular-nums text-base">
                  {avgDaysToPay > 0 ? `${avgDaysToPay} days` : '0 days (immediate)'}
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Activity className="size-3.5 text-muted-foreground/70" /> Collection Efficiency
                </span>
                <span className="font-bold tabular-nums text-base">{collectionEfficiency}%</span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="size-3.5 text-muted-foreground/70" /> Last Payment Date
                </span>
                <span className="font-bold text-sm">
                  {lastPayment ? fmtDate(lastPayment.date) : 'No payments yet'}
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  💳 Largest Single Payment
                </span>
                <span className="font-bold tabular-nums text-sm">
                  {largestPayment > 0 ? formatZAR(largestPayment) : '-'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Feed Accordion */}
      <Card className="shadow-sm border-muted-foreground/10 bg-card">
        <Button
          variant="ghost"
          onClick={() => setIsActivityExpanded(!isActivityExpanded)}
          className="w-full flex items-center justify-between p-4 h-auto hover:bg-muted/10 transition-colors"
        >
          <div className="flex items-center gap-2 text-left">
            <Activity className="size-4 text-amber-500" />
            <div>
              <span className="text-sm font-semibold block">Recent Billing Activity</span>
              <span className="text-xs text-muted-foreground block">Latest 10 financial events for this client</span>
            </div>
          </div>
          {isActivityExpanded ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
        </Button>
        {isActivityExpanded && (
          <CardContent className="p-4 pt-0 border-t border-muted-foreground/5">
            <div className="flex flex-col gap-3 mt-4">
              {activityEvents.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No recent activity found.</p>
              ) : (
                <>
                  {(showAllActivity ? activityEvents : activityEvents.slice(0, 5)).map((evt) => (
                    <div key={evt.id} className="flex items-center justify-between text-xs py-2 border-b border-muted-foreground/5 last:border-0">
                      <div className="flex items-center gap-3">
                        <span className={`p-1.5 rounded-full ${
                          evt.type === 'payment' 
                            ? 'bg-green-500/10 text-green-600 dark:text-green-400' 
                            : evt.type === 'invoice' 
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                            : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                        }`}>
                          {evt.type === 'payment' ? '📥' : evt.type === 'invoice' ? '📄' : '📜'}
                        </span>
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground/90">{evt.title} ({evt.docNumber})</span>
                          <span className="text-muted-foreground text-[10px]">{evt.description}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {evt.amount !== undefined && (
                          <span className={`font-semibold tabular-nums ${evt.type === 'payment' ? 'text-green-600 dark:text-green-400' : ''}`}>
                            {evt.type === 'payment' ? '+' : ''}{formatZAR(evt.amount)}
                          </span>
                        )}
                        <span className="text-muted-foreground text-[10px]">{fmtDate(evt.date.split('T')[0])}</span>
                      </div>
                    </div>
                  ))}
                  {activityEvents.length > 5 && (
                    <button
                      onClick={() => setShowAllActivity(!showAllActivity)}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors mt-1 self-start"
                    >
                      {showAllActivity ? 'Show less' : `Show all ${activityEvents.length} events`}
                    </button>
                  )}
                </>
              )}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
