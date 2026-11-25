'use client';

import React, { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowDownLeft, History, TrendingDown, X } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  deleteRecurringInvoice,
  setRecurringInvoiceStatus,
  deleteRecurringExpense,
} from '@/app/actions/recurring-actions';
import type { ActiveItem } from '@/components/billing/billing-line-items-form';
import type { RecurringInvoiceRow, RecurringExpenseRow, RecurringInvoiceHistoryRow } from '@pmg/db';
import { computeClientHostingMargins, computeRecurringKpis } from './recurring-utils';
import { RecurringKpiStrip } from './recurring-kpi-strip';
import { InboundRetainersTab } from './inbound-retainers-tab';
import { OutboundSubscriptionsTab } from './outbound-subscriptions-tab';
import { BillingHistoryTab } from './billing-history-tab';

interface RecurringClientProps {
  recurringInvoices: RecurringInvoiceRow[];
  recurringExpenses: RecurringExpenseRow[];
  historyInvoices: RecurringInvoiceHistoryRow[];
  clients: { id: string; name: string; businessName: string | null; divisionId?: string | null }[];
  divisions: { id: string; name: string }[];
  activeItems: ActiveItem[];
  categories: string[];
  todayStr?: string;
}

type TabKey = 'inbound' | 'outbound' | 'history';

export function RecurringClient({
  recurringInvoices,
  recurringExpenses,
  historyInvoices,
  clients,
  divisions,
  activeItems,
  categories,
  todayStr,
}: RecurringClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const effectiveToday = todayStr || new Date().toISOString().slice(0, 10);

  const tabParam = searchParams.get('tab');
  const activeTab: TabKey =
    tabParam === 'outbound' || tabParam === 'history' ? tabParam : 'inbound';

  const handleTabChange = (tab: TabKey) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const [actionMessage, setActionMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const [confirmAction, setConfirmAction] = useState<{
    type: 'cancel_invoice' | 'delete_invoice' | 'delete_expense';
    id: string;
    title: string;
    description: string;
    confirmText: string;
  } | null>(null);

  useEffect(() => {
    if (!actionMessage) return;
    const timer = setTimeout(() => setActionMessage(null), 6000);
    return () => clearTimeout(timer);
  }, [actionMessage]);

  const kpis = useMemo(
    () => computeRecurringKpis(recurringInvoices, recurringExpenses, effectiveToday),
    [recurringInvoices, recurringExpenses, effectiveToday],
  );

  const hostingMargins = useMemo(
    () => computeClientHostingMargins(recurringInvoices, recurringExpenses),
    [recurringInvoices, recurringExpenses],
  );

  function handleConfirm() {
    if (!confirmAction) return;
    const { type, id } = confirmAction;
    setConfirmAction(null);

    startTransition(async () => {
      let res: { error?: string } = {};
      if (type === 'cancel_invoice') {
        res = await setRecurringInvoiceStatus(id, 'cancelled');
      } else if (type === 'delete_invoice') {
        res = await deleteRecurringInvoice(id);
      } else if (type === 'delete_expense') {
        res = await deleteRecurringExpense(id);
      }

      if (res.error) {
        setActionMessage({ type: 'error', text: res.error });
      } else {
        setActionMessage({
          type: 'success',
          text:
            type === 'cancel_invoice'
              ? 'Recurring retainer cancelled.'
              : type === 'delete_invoice'
                ? 'Recurring retainer deleted.'
                : 'Subscription deleted.',
        });
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <RecurringKpiStrip kpis={kpis} />

      {actionMessage && (
        <div
          className={`flex items-center justify-between rounded-lg border px-4 py-2.5 text-sm ${
            actionMessage.type === 'error'
              ? 'border-destructive/40 bg-destructive/10 text-destructive'
              : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
          }`}
        >
          <span>{actionMessage.text}</span>
          <button
            type="button"
            onClick={() => setActionMessage(null)}
            className="opacity-70 hover:opacity-100"
            aria-label="Dismiss notification"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 border-b">
        <button
          type="button"
          onClick={() => handleTabChange('inbound')}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'inbound'
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <ArrowDownLeft className="h-4 w-4" />
          Client Retainers ({kpis.activeInCount})
        </button>
        <button
          type="button"
          onClick={() => handleTabChange('outbound')}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'outbound'
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <TrendingDown className="h-4 w-4" />
          Subscriptions &amp; Domains ({kpis.ownOutCount + kpis.clientOutCount})
        </button>
        <button
          type="button"
          onClick={() => handleTabChange('history')}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'history'
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <History className="h-4 w-4" />
          Billing History ({historyInvoices.length})
        </button>
      </div>

      {activeTab === 'inbound' && (
        <InboundRetainersTab
          recurringInvoices={recurringInvoices}
          clients={clients}
          divisions={divisions}
          activeItems={activeItems}
          todayStr={effectiveToday}
          isPending={isPending}
          startTransition={startTransition}
          onNotify={setActionMessage}
          onRequestCancelOrDelete={(inv) =>
            setConfirmAction(
              inv.lastRunDate
                ? {
                    type: 'cancel_invoice',
                    id: inv.id,
                    title: 'Cancel Recurring Retainer?',
                    description: `This will stop future billing for ${inv.clientBusinessName || inv.clientName}. Previously generated invoices are kept.`,
                    confirmText: 'Cancel Retainer',
                  }
                : {
                    type: 'delete_invoice',
                    id: inv.id,
                    title: 'Delete Recurring Retainer?',
                    description: `Permanently delete this schedule for ${inv.clientBusinessName || inv.clientName}?`,
                    confirmText: 'Delete',
                  },
            )
          }
        />
      )}

      {activeTab === 'outbound' && (
        <OutboundSubscriptionsTab
          recurringExpenses={recurringExpenses}
          hostingMargins={hostingMargins}
          clients={clients}
          divisions={divisions}
          categories={categories}
          todayStr={effectiveToday}
          isPending={isPending}
          startTransition={startTransition}
          onNotify={setActionMessage}
          onRequestDelete={(exp) =>
            setConfirmAction({
              type: 'delete_expense',
              id: exp.id,
              title: `Delete ${exp.vendorName}?`,
              description:
                'This removes the recurring schedule. Previously logged expenses in Finance → Expenses will remain untouched.',
              confirmText: 'Delete',
            })
          }
        />
      )}

      {activeTab === 'history' && (
        <BillingHistoryTab historyInvoices={historyInvoices} divisions={divisions} />
      )}

      <ConfirmDialog
        open={!!confirmAction}
        onOpenChange={(open) => !open && setConfirmAction(null)}
        title={confirmAction?.title ?? ''}
        description={confirmAction?.description ?? ''}
        confirmText={confirmAction?.confirmText ?? 'Confirm'}
        variant="destructive"
        onConfirm={handleConfirm}
      />
    </div>
  );
}
