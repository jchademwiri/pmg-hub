'use client';

import React, { useEffect, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  CalendarClock,
  ArrowDownLeft,
  TrendingDown,
  Play,
  Plus,
  CheckCircle2,
  PauseCircle,
  RefreshCw,
  Layers,
  Pencil,
  Trash2,
  X,
  XCircle,
  ExternalLink,
  History,
} from 'lucide-react';
import { formatZAR, fmtDateLong } from '@/lib/format';
import {
  createRecurringInvoice,
  updateRecurringInvoice,
  deleteRecurringInvoice,
  getRecurringInvoiceDetail,
  setRecurringInvoiceStatus,
  triggerRecurringBillingRun,
  createRecurringExpense,
  updateRecurringExpense,
  deleteRecurringExpense,
  setRecurringExpenseStatus,
  markRecurringExpenseAsPaid,
  type RecurringFrequency,
} from '@/app/actions/recurring-actions';
import {
  BillingLineItemsForm,
  type LineItemFormRow,
  type ActiveItem,
} from '@/components/billing/billing-line-items-form';
import type { RecurringInvoiceRow, RecurringExpenseRow, RecurringInvoiceHistoryRow } from '@pmg/db';

interface RecurringClientProps {
  recurringInvoices: RecurringInvoiceRow[];
  recurringExpenses: RecurringExpenseRow[];
  historyInvoices: RecurringInvoiceHistoryRow[];
  clients: { id: string; name: string; businessName: string | null; divisionId?: string | null }[];
  divisions: { id: string; name: string }[];
  activeItems: ActiveItem[];
  categories: string[];
}

function generateRowId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 15);
}

function blankRow(): LineItemFormRow {
  return {
    id: generateRowId(),
    itemId: '',
    description: '',
    quantity: '1',
    unitPrice: '',
    discountType: null,
    discountValue: '',
  };
}

/** Mirrors the server's default: the 25th of this month, or next month if
 *  the 25th has already passed. Just a starting point — fully editable. */
function defaultNextRunDate(): string {
  const now = new Date();
  const cycleDay = 25;
  let year = now.getFullYear();
  let month = now.getMonth();
  if (now.getDate() > cycleDay) {
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
  }
  const maxDay = new Date(year, month + 1, 0).getDate();
  const day = Math.min(cycleDay, maxDay);
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function defaultNextDueDate(cycleDay = 1): string {
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth();
  if (now.getDate() > cycleDay) {
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
  }
  const maxDay = new Date(year, month + 1, 0).getDate();
  const day = Math.min(cycleDay, maxDay);
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function formatFrequencyLabel(freq?: string): string {
  switch (freq) {
    case 'quarterly':
      return 'Quarterly (3 Mo)';
    case 'semi_annually':
      return 'Bi-Annually (6 Mo)';
    case 'annually':
      return 'Yearly (12 Mo)';
    case 'monthly':
    default:
      return 'Monthly';
  }
}

export function RecurringClient({
  recurringInvoices,
  recurringExpenses,
  historyInvoices,
  clients,
  divisions,
  activeItems,
  categories,
}: RecurringClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const tabParam = searchParams.get('tab');
  const activeTab = (tabParam === 'outbound' || tabParam === 'history' ? tabParam : 'inbound') as
    'inbound' | 'outbound' | 'history';

  const handleTabChange = (tab: 'inbound' | 'outbound' | 'history') => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  // Modals
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
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

  // New/Edit Inbound Invoice Form State
  const [newInvDivisionId, setNewInvDivisionId] = useState(divisions[0]?.id || '');
  const [newInvClientId, setNewInvClientId] = useState('');
  const [newInvRef, setNewInvRef] = useState('');
  const [newInvFrequency, setNewInvFrequency] = useState<RecurringFrequency>('monthly');
  const [newInvNextRunDate, setNewInvNextRunDate] = useState(defaultNextRunDate());
  const [newInvEndDate, setNewInvEndDate] = useState('');
  const [newInvLineItems, setNewInvLineItems] = useState<LineItemFormRow[]>([blankRow()]);

  // New/Edit Outbound Expense Form State
  const [newExpDivisionId, setNewExpDivisionId] = useState(divisions[0]?.id || '');
  const [newExpVendor, setNewExpVendor] = useState('');
  const [newExpCategory, setNewExpCategory] = useState(categories[0] || 'Software & SaaS');
  const [newExpFrequency, setNewExpFrequency] = useState<RecurringFrequency>('monthly');
  const [newExpAmount, setNewExpAmount] = useState('');
  const [newExpCycleDay, setNewExpCycleDay] = useState(1);
  const [newExpNextDueDate, setNewExpNextDueDate] = useState(defaultNextDueDate(1));
  const [newExpClientId, setNewExpClientId] = useState<string>('none');
  const [newExpNotes, setNewExpNotes] = useState('');

  // Calculations
  const activeInbound = recurringInvoices.filter((i) => i.status === 'active');
  const activeOutbound = recurringExpenses.filter((e) => e.status === 'active');

  // Option B: Strictly month-to-month contracts count towards MRR
  const activeMonthlyInbound = activeInbound.filter((i) => i.frequency === 'monthly');
  const totalMRR = activeMonthlyInbound.reduce((sum, inv) => sum + (parseFloat(inv.total) || 0), 0);

  // Option B: Strictly monthly software burn
  const activeMonthlyOutbound = activeOutbound.filter((e) => e.frequency === 'monthly');
  const totalMonthlyBurn = activeMonthlyOutbound.reduce(
    (sum, exp) => sum + (parseFloat(exp.amount) || 0),
    0,
  );

  const netMonthlySurplus = totalMRR - totalMonthlyBurn;

  // Current month scheduled cashflow calculations
  const now = new Date();
  const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const currentMonthName = now.toLocaleString('en-ZA', { month: 'long' });

  const inboundDueThisMonth = activeInbound.filter(
    (inv) => inv.nextRunDate && inv.nextRunDate.startsWith(currentYearMonth),
  );
  const scheduledInboundThisMonth = inboundDueThisMonth.reduce(
    (sum, inv) => sum + (parseFloat(inv.total) || 0),
    0,
  );

  const outboundDueThisMonth = activeOutbound.filter(
    (exp) => exp.nextDueDate && exp.nextDueDate.startsWith(currentYearMonth),
  );
  const scheduledOutboundThisMonth = outboundDueThisMonth.reduce(
    (sum, exp) => sum + (parseFloat(exp.amount) || 0),
    0,
  );

  const netCashflowThisMonth = scheduledInboundThisMonth - scheduledOutboundThisMonth;

  // Next month projected cashflow
  const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const nextYearMonth = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}`;
  const nextMonthName = nextMonthDate.toLocaleString('en-ZA', { month: 'long' });

  const inboundDueNextMonth = activeInbound.filter((inv) => {
    if (inv.endDate && inv.endDate < `${nextYearMonth}-01`) return false;
    // If the next scheduled date is further out than next month, it's not due next month
    if (inv.nextRunDate && inv.nextRunDate > `${nextYearMonth}-31`) return false;
    if (inv.nextRunDate && inv.nextRunDate.startsWith(nextYearMonth)) return true;
    if (inv.frequency === 'monthly') return true;
    return false;
  });
  const scheduledInboundNextMonth = inboundDueNextMonth.reduce(
    (sum, inv) => sum + (parseFloat(inv.total) || 0),
    0,
  );

  const outboundDueNextMonth = activeOutbound.filter((exp) => {
    if (exp.nextDueDate && exp.nextDueDate > `${nextYearMonth}-31`) return false;
    if (exp.nextDueDate && exp.nextDueDate.startsWith(nextYearMonth)) return true;
    if (exp.frequency === 'monthly') return true;
    return false;
  });
  const scheduledOutboundNextMonth = outboundDueNextMonth.reduce(
    (sum, exp) => sum + (parseFloat(exp.amount) || 0),
    0,
  );

  const netCashflowNextMonth = scheduledInboundNextMonth - scheduledOutboundNextMonth;

  // Sort tables: active items first, paused & cancelled sorted to the bottom
  const sortedInvoices = [...recurringInvoices].sort((a, b) => {
    if (a.status === 'active' && b.status !== 'active') return -1;
    if (a.status !== 'active' && b.status === 'active') return 1;
    return a.nextRunDate.localeCompare(b.nextRunDate);
  });

  const sortedExpenses = [...recurringExpenses].sort((a, b) => {
    if (a.status === 'active' && b.status !== 'active') return -1;
    if (a.status !== 'active' && b.status === 'active') return 1;
    return a.nextDueDate.localeCompare(b.nextDueDate);
  });

  // Handlers
  const handleTriggerRun = () => {
    setActionMessage(null);
    startTransition(async () => {
      const res = await triggerRecurringBillingRun();
      if (res.error) {
        setActionMessage({ type: 'error', text: res.error });
      } else if (res.generatedCount === 0) {
        const nextDates = activeInbound
          .map((i) => i.nextRunDate)
          .filter(Boolean)
          .sort();
        const earliestDate = nextDates[0];
        setActionMessage({
          type: 'success',
          text: earliestDate
            ? `No retainers are due for billing today. Next scheduled billing run is on ${fmtDateLong(earliestDate)}. To generate an invoice immediately, edit the retainer's "First / Next Invoice Date" to today.`
            : 'No active retainer schedules are due for billing today.',
        });
      } else {
        const emailNote = res.emailFailureCount
          ? ` ${res.emailFailureCount} email(s) failed to send — check client email addresses and try again.`
          : ' Invoices have been generated and emailed to clients with statements attached.';
        setActionMessage({
          type: res.emailFailureCount ? 'error' : 'success',
          text: `Successfully processed recurring run: ${res.generatedCount} invoice(s) generated & issued.${emailNote}`,
        });
      }
    });
  };

  function resetInvoiceForm() {
    setEditingId(null);
    setNewInvDivisionId(divisions[0]?.id || '');
    setNewInvClientId('');
    setNewInvRef('');
    setNewInvFrequency('monthly');
    setNewInvNextRunDate(defaultNextRunDate());
    setNewInvEndDate('');
    setNewInvLineItems([blankRow()]);
  }

  function handleOpenCreateInvoice() {
    resetInvoiceForm();
    setInvoiceModalOpen(true);
  }

  function handleOpenEditInvoice(id: string) {
    setActionMessage(null);
    startTransition(async () => {
      const res = await getRecurringInvoiceDetail(id);
      if (res.error || !res.data) {
        setActionMessage({ type: 'error', text: res.error || 'Failed to load schedule.' });
        return;
      }
      const detail = res.data;
      setEditingId(id);
      setNewInvDivisionId(detail.divisionId);
      setNewInvClientId(detail.clientId);
      setNewInvRef(detail.reference || '');
      setNewInvFrequency((detail.frequency as RecurringFrequency) || 'monthly');
      setNewInvNextRunDate(detail.nextRunDate);
      setNewInvEndDate(detail.endDate || '');
      setNewInvLineItems(
        detail.lineItems.length
          ? detail.lineItems.map((li) => ({
              id: generateRowId(),
              itemId: li.itemId || '',
              description: li.description,
              quantity: li.quantity,
              unitPrice: li.unitPrice,
              discountType: li.discountType as 'percent' | 'amount' | null,
              discountValue: li.discountValue,
            }))
          : [blankRow()],
      );
      setInvoiceModalOpen(true);
    });
  }

  function handleDeleteInvoice(id: string) {
    setConfirmAction({
      type: 'delete_invoice',
      id,
      title: 'Delete retainer schedule?',
      description:
        'This cannot be undone. You can only delete schedules that have never generated any invoices.',
      confirmText: 'Delete Schedule',
    });
  }

  function handleCancelInvoice(id: string) {
    setConfirmAction({
      type: 'cancel_invoice',
      id,
      title: 'Cancel retainer schedule?',
      description:
        'Future invoices will no longer be generated, but past invoices and history will be preserved.',
      confirmText: 'Cancel Retainer',
    });
  }

  function handleExecuteConfirm() {
    if (!confirmAction) return;
    const { type, id } = confirmAction;
    setConfirmAction(null);

    if (type === 'cancel_invoice') {
      setActionMessage(null);
      startTransition(async () => {
        const res = await setRecurringInvoiceStatus(id, 'cancelled');
        if (res.error) {
          setActionMessage({ type: 'error', text: res.error });
        } else {
          setActionMessage({ type: 'success', text: 'Retainer schedule cancelled successfully.' });
        }
      });
    } else if (type === 'delete_invoice') {
      setActionMessage(null);
      startTransition(async () => {
        const res = await deleteRecurringInvoice(id);
        if (res.error) {
          setActionMessage({ type: 'error', text: res.error });
        } else {
          setActionMessage({ type: 'success', text: 'Recurring retainer schedule deleted.' });
        }
      });
    } else if (type === 'delete_expense') {
      setActionMessage(null);
      startTransition(async () => {
        const res = await deleteRecurringExpense(id);
        if (res.error) {
          setActionMessage({ type: 'error', text: res.error });
        } else {
          setActionMessage({ type: 'success', text: 'Vendor subscription deleted.' });
        }
      });
    }
  }

  const handleCreateInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    setActionMessage(null);

    if (!newInvClientId) {
      setActionMessage({ type: 'error', text: 'Please select a client.' });
      return;
    }

    const lineItems = newInvLineItems
      .filter((row) => row.description.trim() && parseFloat(row.unitPrice) > 0)
      .map((row) => ({
        itemId: row.itemId || null,
        description: row.description.trim(),
        quantity: parseFloat(row.quantity) || 1,
        unitPrice: parseFloat(row.unitPrice) || 0,
        discountType: row.discountType ?? null,
        discountValue: row.discountValue ? parseFloat(row.discountValue) : null,
      }));

    if (lineItems.length === 0) {
      setActionMessage({
        type: 'error',
        text: 'Please add at least one line item with a description and unit price.',
      });
      return;
    }

    if (newInvEndDate && newInvEndDate < newInvNextRunDate) {
      setActionMessage({
        type: 'error',
        text: 'End date cannot be before the next invoice date.',
      });
      return;
    }

    startTransition(async () => {
      const payload = {
        divisionId: newInvDivisionId,
        clientId: newInvClientId,
        reference: newInvRef || 'Client Hosting & Retainer',
        frequency: newInvFrequency,
        nextRunDate: newInvNextRunDate,
        endDate: newInvEndDate || null,
        dueDaysOffset: 6, // due 1st
        autoSendEmail: true,
        vatEnabled: false,
        lineItems,
      };

      const res = editingId
        ? await updateRecurringInvoice(editingId, payload)
        : await createRecurringInvoice(payload);

      if (res.error) {
        setActionMessage({ type: 'error', text: res.error });
      } else {
        setInvoiceModalOpen(false);
        resetInvoiceForm();
        setActionMessage({
          type: 'success',
          text: editingId
            ? 'Recurring retainer schedule updated successfully.'
            : 'Recurring retainer schedule created successfully.',
        });
      }
    });
  };

  function resetExpenseForm() {
    setEditingExpenseId(null);
    setNewExpDivisionId(divisions[0]?.id || '');
    setNewExpVendor('');
    setNewExpCategory(categories[0] || 'Software & SaaS');
    setNewExpFrequency('monthly');
    setNewExpAmount('');
    setNewExpCycleDay(1);
    setNewExpNextDueDate(defaultNextDueDate(1));
    setNewExpClientId('none');
    setNewExpNotes('');
  }

  function handleOpenCreateExpense() {
    resetExpenseForm();
    setExpenseModalOpen(true);
  }

  function handleOpenEditExpense(id: string) {
    const exp = recurringExpenses.find((e) => e.id === id);
    if (!exp) return;
    setEditingExpenseId(id);
    setNewExpDivisionId(exp.divisionId);
    setNewExpVendor(exp.vendorName);
    setNewExpCategory(exp.category);
    setNewExpFrequency(exp.frequency as RecurringFrequency);
    setNewExpAmount(exp.amount);
    setNewExpCycleDay(exp.billingCycleDay);
    setNewExpNextDueDate(exp.nextDueDate);
    setNewExpClientId(exp.clientId || 'none');
    setNewExpNotes(exp.notes || '');
    setExpenseModalOpen(true);
  }

  function handleDeleteExpense(id: string) {
    setConfirmAction({
      type: 'delete_expense',
      id,
      title: 'Delete vendor subscription?',
      description: 'This action cannot be undone.',
      confirmText: 'Delete Subscription',
    });
  }

  function handleToggleExpenseStatus(id: string, currentStatus: string) {
    const nextStatus = currentStatus === 'active' ? 'paused' : 'active';
    setActionMessage(null);
    startTransition(async () => {
      const res = await setRecurringExpenseStatus(id, nextStatus);
      if (res.error) {
        setActionMessage({ type: 'error', text: res.error });
      } else {
        setActionMessage({
          type: 'success',
          text: `Vendor subscription ${nextStatus === 'active' ? 'resumed' : 'paused'}.`,
        });
      }
    });
  }

  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    setActionMessage(null);
    const amountNum = parseFloat(newExpAmount);
    if (!newExpVendor.trim() || isNaN(amountNum) || amountNum <= 0) {
      setActionMessage({ type: 'error', text: 'Please enter a valid vendor name and amount.' });
      return;
    }

    startTransition(async () => {
      const payload = {
        divisionId: newExpDivisionId,
        vendorName: newExpVendor.trim(),
        category: newExpCategory,
        frequency: newExpFrequency,
        amount: amountNum,
        billingCycleDay: Number(newExpCycleDay),
        nextDueDate: newExpNextDueDate,
        clientId: newExpClientId === 'none' ? null : newExpClientId,
        notes: newExpNotes || null,
      };

      const res = editingExpenseId
        ? await updateRecurringExpense(editingExpenseId, payload)
        : await createRecurringExpense(payload);

      if (res.error) {
        setActionMessage({ type: 'error', text: res.error });
      } else {
        setExpenseModalOpen(false);
        resetExpenseForm();
        setActionMessage({
          type: 'success',
          text: editingExpenseId
            ? 'Recurring subscription updated successfully.'
            : 'Recurring subscription created successfully.',
        });
      }
    });
  };

  const handleMarkPaid = (id: string) => {
    setActionMessage(null);
    startTransition(async () => {
      const res = await markRecurringExpenseAsPaid(id);
      if (res.error) {
        setActionMessage({ type: 'error', text: res.error });
      } else {
        setActionMessage({
          type: 'success',
          text: 'Subscription marked as paid. Official expense and journal entry posted.',
        });
      }
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Top Banner Stats - Reconciled Operational Cashflow & Monthly MRR */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: To Collect */}
        <Card className="border-b-4 border-b-emerald-500 overflow-hidden">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-600">
              <ArrowDownLeft className="h-4 w-4" /> To Collect ({currentMonthName})
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
              {formatZAR(scheduledInboundThisMonth)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {inboundDueThisMonth.length} retainer(s) running • Next Month ({nextMonthName}):{' '}
            {formatZAR(scheduledInboundNextMonth)} projected
          </CardContent>
        </Card>

        {/* Card 2: To Pay */}
        <Card className="border-b-4 border-b-rose-500 overflow-hidden">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-rose-600">
              <TrendingDown className="h-4 w-4" /> To Pay ({currentMonthName})
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-rose-700 dark:text-rose-400">
              {formatZAR(scheduledOutboundThisMonth)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {outboundDueThisMonth.length} vendor sub(s) due • Next Month ({nextMonthName}):{' '}
            {formatZAR(scheduledOutboundNextMonth)} projected
          </CardContent>
        </Card>

        {/* Card 3: Net Cashflow */}
        <Card className="border-b-4 border-b-cyan-500 overflow-hidden">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-cyan-600">
              <CalendarClock className="h-4 w-4" /> Net Cashflow ({currentMonthName})
            </CardDescription>
            <CardTitle
              className={`text-2xl font-bold ${netCashflowThisMonth >= 0 ? 'text-cyan-700 dark:text-cyan-400' : 'text-rose-600'}`}
            >
              {formatZAR(netCashflowThisMonth)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Next Month ({nextMonthName}): {formatZAR(netCashflowNextMonth)} projected
          </CardContent>
        </Card>

        {/* Card 4: Monthly Retainers (MRR) */}
        <Card className="border-b-4 border-b-blue-500 overflow-hidden">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-blue-600">
              <Layers className="h-4 w-4" /> Monthly Retainers (MRR)
            </CardDescription>
            <CardTitle
              className={`text-2xl font-bold ${netMonthlySurplus >= 0 ? 'text-blue-700 dark:text-blue-400' : 'text-rose-600'}`}
            >
              {formatZAR(totalMRR)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {activeMonthlyInbound.length} active monthly retainer(s) •{' '}
            {formatZAR(netMonthlySurplus)}/mo baseline
          </CardContent>
        </Card>
      </div>

      {actionMessage && (
        <div
          className={`p-4 rounded-lg text-sm border flex items-start justify-between gap-2 ${
            actionMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/30 dark:border-rose-800 dark:text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionMessage.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : null}
            {actionMessage.text}
          </div>
          <button
            type="button"
            onClick={() => setActionMessage(null)}
            aria-label="Dismiss message"
            className="shrink-0 rounded-md p-0.5 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Tabs & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4">
        <div className="flex items-center gap-2 bg-muted/60 p-1 rounded-lg">
          <button
            onClick={() => handleTabChange('inbound')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              activeTab === 'inbound'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Inbound Client Retainers ({recurringInvoices.length})
          </button>
          <button
            onClick={() => handleTabChange('outbound')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              activeTab === 'outbound'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Outbound Subscriptions ({recurringExpenses.length})
          </button>
          <button
            onClick={() => handleTabChange('history')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              activeTab === 'history'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Invoice History ({historyInvoices.length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'inbound' && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleTriggerRun}
                disabled={isPending}
                className="gap-1.5"
              >
                <RefreshCw className={`h-4 w-4 ${isPending ? 'animate-spin' : ''}`} />
                Run Billing Now
              </Button>
              <Button size="sm" onClick={handleOpenCreateInvoice} className="gap-1.5">
                <Plus className="h-4 w-4" /> Add Retainer Schedule
              </Button>
            </>
          )}
          {activeTab === 'outbound' && (
            <Button size="sm" onClick={handleOpenCreateExpense} className="gap-1.5">
              <Plus className="h-4 w-4" /> Add Vendor Subscription
            </Button>
          )}
          {activeTab === 'history' && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleTriggerRun}
              disabled={isPending}
              className="gap-1.5"
            >
              <RefreshCw className={`h-4 w-4 ${isPending ? 'animate-spin' : ''}`} />
              Run Billing Now
            </Button>
          )}
        </div>
      </div>

      {/* Content Section */}
      {activeTab === 'inbound' && (
        <div className="grid grid-cols-1 gap-4">
          {recurringInvoices.length === 0 ? (
            <div className="text-center py-12 border border-dashed rounded-xl p-8 bg-muted/20">
              <CalendarClock className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-60" />
              <h3 className="text-base font-semibold">No Client Retainer Schedules Yet</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1 mb-4">
                Set up recurring monthly hosting or maintenance retainers to automatically generate
                and issue invoices on the 25th.
              </p>
              <Button size="sm" onClick={handleOpenCreateInvoice}>
                <Plus className="h-4 w-4 mr-1.5" /> Create First Retainer Schedule
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border bg-card">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-muted/50 text-muted-foreground border-b">
                  <tr>
                    <th className="px-4 py-3">Client & Reference</th>
                    <th className="px-4 py-3 hidden lg:table-cell">Division</th>
                    <th className="px-4 py-3 hidden sm:table-cell">Cycle / Next Run</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3 hidden md:table-cell">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {sortedInvoices.map((inv) => {
                    const isInactive = inv.status !== 'active';
                    return (
                      <tr
                        key={inv.id}
                        className={`transition-colors ${
                          isInactive
                            ? 'opacity-65 bg-muted/20 text-muted-foreground'
                            : 'hover:bg-muted/30'
                        }`}
                      >
                        <td className="px-4 py-3">
                          <div className="font-semibold text-foreground flex items-center gap-1.5 flex-wrap">
                            <span>{inv.clientBusinessName || inv.clientName}</span>
                            {inv.status === 'paused' && (
                              <span className="text-xs font-normal text-amber-600 dark:text-amber-400">
                                (Paused)
                              </span>
                            )}
                            {inv.status === 'cancelled' && (
                              <span className="text-xs font-normal text-destructive">
                                (Cancelled)
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {inv.reference || 'Monthly Retainer'}
                          </div>
                          {/* Mobile secondary row indicators */}
                          <div className="flex flex-wrap items-center gap-1 mt-1 lg:hidden">
                            <Badge variant="outline" className="text-[10px]">
                              {inv.divisionName}
                            </Badge>
                            <Badge
                              variant={
                                inv.status === 'active'
                                  ? 'default'
                                  : inv.status === 'paused'
                                    ? 'secondary'
                                    : 'destructive'
                              }
                              className="text-[10px] md:hidden capitalize"
                            >
                              {inv.status}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground sm:hidden">
                              • Next: {fmtDateLong(inv.nextRunDate)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <Badge variant="outline" className="text-xs">
                            {inv.divisionName}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <div className="flex flex-wrap items-center gap-1.5 mb-1">
                            <Badge
                              variant="outline"
                              className="text-[10px] font-semibold uppercase tracking-wider bg-muted/40"
                            >
                              {formatFrequencyLabel(inv.frequency)}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              Day {inv.billingCycleDay}
                            </span>
                            {inv.nextRunDate && inv.nextRunDate.startsWith(currentYearMonth) && (
                              <Badge
                                variant="secondary"
                                className="text-[10px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200"
                              >
                                Runs This Month
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Next: {fmtDateLong(inv.nextRunDate)}
                          </div>
                          {inv.endDate && (
                            <div className="text-xs text-muted-foreground">
                              Ends: {fmtDateLong(inv.endDate)}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 font-semibold text-foreground">
                          <div>{formatZAR(parseFloat(inv.total) || 0)}</div>
                          {inv.frequency !== 'monthly' && (
                            <div className="text-[11px] font-normal text-muted-foreground">
                              {formatFrequencyLabel(inv.frequency)}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <Badge
                            variant={
                              inv.status === 'active'
                                ? 'default'
                                : inv.status === 'paused'
                                  ? 'secondary'
                                  : 'destructive'
                            }
                            className="capitalize"
                          >
                            {inv.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenEditInvoice(inv.id)}
                              disabled={isPending}
                              className="text-xs h-8"
                            >
                              <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                            </Button>
                            {inv.status === 'active' ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setRecurringInvoiceStatus(inv.id, 'paused')}
                                className="text-xs h-8 text-muted-foreground hover:text-foreground"
                              >
                                <PauseCircle className="h-3.5 w-3.5 mr-1" /> Pause
                              </Button>
                            ) : (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => setRecurringInvoiceStatus(inv.id, 'active')}
                                className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm"
                              >
                                <Play className="h-3.5 w-3.5 mr-1 fill-current" /> Resume
                              </Button>
                            )}
                            {inv.lastRunDate ? (
                              inv.status !== 'cancelled' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleCancelInvoice(inv.id)}
                                  disabled={isPending}
                                  className="text-xs h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                >
                                  <XCircle className="h-3.5 w-3.5 mr-1" /> Cancel
                                </Button>
                              )
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteInvoice(inv.id)}
                                disabled={isPending}
                                className="text-xs h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'outbound' && (
        <div className="grid grid-cols-1 gap-4">
          {recurringExpenses.length === 0 ? (
            <div className="text-center py-12 border border-dashed rounded-xl p-8 bg-muted/20">
              <TrendingDown className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-60" />
              <h3 className="text-base font-semibold">No Outbound Subscriptions Configured</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1 mb-4">
                Track monthly software & hosting overhead (Claude, Antigravity, Hetzner VPS) to
                ensure 1-click accounting payment logging.
              </p>
              <Button size="sm" onClick={handleOpenCreateExpense}>
                <Plus className="h-4 w-4 mr-1.5" /> Add First Subscription
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border bg-card">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-muted/50 text-muted-foreground border-b">
                  <tr>
                    <th className="px-4 py-3">Vendor / Tool</th>
                    <th className="px-4 py-3 hidden lg:table-cell">Category</th>
                    <th className="px-4 py-3 hidden lg:table-cell">Division</th>
                    <th className="px-4 py-3 hidden sm:table-cell">Cycle & Next Due</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3 hidden md:table-cell">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {sortedExpenses.map((exp) => {
                    const isInactive = exp.status !== 'active';
                    return (
                      <tr
                        key={exp.id}
                        className={`transition-colors ${
                          isInactive
                            ? 'opacity-65 bg-muted/20 text-muted-foreground'
                            : 'hover:bg-muted/30'
                        }`}
                      >
                        <td className="px-4 py-3">
                          <div className="font-semibold text-foreground flex items-center gap-1.5 flex-wrap">
                            <span>{exp.vendorName}</span>
                            {exp.status === 'paused' && (
                              <span className="text-xs font-normal text-amber-600 dark:text-amber-400">
                                (Paused)
                              </span>
                            )}
                            {exp.status === 'cancelled' && (
                              <span className="text-xs font-normal text-destructive">
                                (Cancelled)
                              </span>
                            )}
                          </div>
                          {exp.clientName && (
                            <div className="text-xs text-muted-foreground">
                              For: {exp.clientName}
                            </div>
                          )}
                          {/* Mobile secondary row indicators */}
                          <div className="flex flex-wrap items-center gap-1 mt-1 lg:hidden">
                            <span className="text-[11px] text-muted-foreground">
                              {exp.category}
                            </span>
                            <Badge variant="outline" className="text-[10px]">
                              {exp.divisionName}
                            </Badge>
                            <Badge
                              variant={
                                exp.status === 'active'
                                  ? 'default'
                                  : exp.status === 'paused'
                                    ? 'secondary'
                                    : 'destructive'
                              }
                              className="text-[10px] md:hidden capitalize"
                            >
                              {exp.status}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground sm:hidden">
                              • Due: {fmtDateLong(exp.nextDueDate)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground hidden lg:table-cell">
                          {exp.category}
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <Badge variant="outline" className="text-xs">
                            {exp.divisionName}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <div className="flex flex-wrap items-center gap-1.5 mb-1">
                            <Badge
                              variant="outline"
                              className="text-[10px] font-semibold uppercase tracking-wider bg-muted/40"
                            >
                              {formatFrequencyLabel(exp.frequency)}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              Day {exp.billingCycleDay}
                            </span>
                            {exp.nextDueDate && exp.nextDueDate.startsWith(currentYearMonth) && (
                              <Badge
                                variant="secondary"
                                className="text-[10px] bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200"
                              >
                                Due This Month
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Due: {fmtDateLong(exp.nextDueDate)}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-semibold text-foreground">
                          <div>{formatZAR(parseFloat(exp.amount) || 0)}</div>
                          {exp.frequency !== 'monthly' && (
                            <div className="text-[11px] font-normal text-muted-foreground">
                              {formatFrequencyLabel(exp.frequency)}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <Badge
                            variant={
                              exp.status === 'active'
                                ? 'default'
                                : exp.status === 'paused'
                                  ? 'secondary'
                                  : 'destructive'
                            }
                            className="capitalize"
                          >
                            {exp.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleMarkPaid(exp.id)}
                              disabled={isPending}
                              className="text-xs h-8 gap-1 text-emerald-700 dark:text-emerald-300"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" /> Log Paid
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenEditExpense(exp.id)}
                              disabled={isPending}
                              className="text-xs h-8"
                            >
                              <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                            </Button>
                            {exp.status === 'active' ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleExpenseStatus(exp.id, exp.status)}
                                disabled={isPending}
                                className="text-xs h-8 text-muted-foreground hover:text-foreground"
                              >
                                <PauseCircle className="h-3.5 w-3.5 mr-1" /> Pause
                              </Button>
                            ) : (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleToggleExpenseStatus(exp.id, exp.status)}
                                disabled={isPending}
                                className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm"
                              >
                                <Play className="h-3.5 w-3.5 mr-1 fill-current" /> Resume
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteExpense(exp.id)}
                              disabled={isPending}
                              className="text-xs h-8 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="grid grid-cols-1 gap-4">
          {historyInvoices.length === 0 ? (
            <div className="text-center py-12 border border-dashed rounded-xl p-8 bg-muted/20">
              <History className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-60" />
              <h3 className="text-base font-semibold">No Recurring Invoices Generated Yet</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1 mb-4">
                Invoices generated automatically by recurring retainers will appear here for easy
                tracking and review.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border bg-card">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-muted/50 text-muted-foreground border-b">
                  <tr>
                    <th className="px-4 py-3">Invoice & Client</th>
                    <th className="px-4 py-3 hidden lg:table-cell">Division</th>
                    <th className="px-4 py-3 hidden sm:table-cell">Period & Dates</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3 hidden md:table-cell">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {historyInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <Link
                          href={`/billing/invoices/${inv.id}`}
                          className="font-semibold text-foreground hover:underline flex items-center gap-1.5"
                        >
                          {inv.documentNumber}
                        </Link>
                        <div className="text-xs text-muted-foreground font-medium">
                          {inv.clientBusinessName || inv.clientName}
                        </div>
                        {inv.recurringReference && (
                          <div className="text-[11px] text-muted-foreground italic">
                            {inv.recurringReference}
                          </div>
                        )}
                        <div className="flex flex-wrap items-center gap-1 mt-1 lg:hidden">
                          <Badge variant="outline" className="text-[10px]">
                            {inv.divisionName}
                          </Badge>
                          <Badge
                            variant={
                              inv.status === 'paid'
                                ? 'default'
                                : inv.status === 'overdue'
                                  ? 'destructive'
                                  : 'secondary'
                            }
                            className="text-[10px] md:hidden capitalize"
                          >
                            {inv.status}
                          </Badge>
                          {inv.billingPeriod && (
                            <span className="text-[10px] text-muted-foreground sm:hidden">
                              • {inv.billingPeriod}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <Badge variant="outline" className="text-xs">
                          {inv.divisionName}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        {inv.billingPeriod && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] bg-muted/40 font-semibold mb-1"
                          >
                            Period: {inv.billingPeriod}
                          </Badge>
                        )}
                        <div className="text-xs text-muted-foreground">
                          Date: {fmtDateLong(inv.invoiceDate)}
                        </div>
                        {inv.dueDate && (
                          <div className="text-xs text-muted-foreground">
                            Due: {fmtDateLong(inv.dueDate)}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-semibold text-foreground">
                        {formatZAR(parseFloat(inv.total) || 0)}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <Badge
                          variant={
                            inv.status === 'paid'
                              ? 'default'
                              : inv.status === 'overdue'
                                ? 'destructive'
                                : 'secondary'
                          }
                          className="capitalize"
                        >
                          {inv.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="sm" asChild className="text-xs h-8">
                          <Link href={`/billing/invoices/${inv.id}`}>
                            <ExternalLink className="h-3.5 w-3.5 mr-1" /> View
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal: Create/Edit Recurring Inbound Retainer */}
      <Dialog
        open={invoiceModalOpen}
        onOpenChange={(open) => {
          setInvoiceModalOpen(open);
          if (!open) resetInvoiceForm();
        }}
      >
        <DialogContent
          className="sm:max-w-3xl md:max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden"
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <form onSubmit={handleCreateInvoice} className="flex flex-col h-full overflow-hidden">
            <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
              <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                <CalendarClock className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                {editingId ? 'Edit Client Retainer Schedule' : 'Create Client Retainer Schedule'}
              </DialogTitle>
              <DialogDescription>
                Automated recurring retainer billing. Invoices generate on the selected cadence with
                payment due 6 days later (e.g. 25th → 1st).
              </DialogDescription>
            </DialogHeader>

            <div className="px-6 py-5 overflow-y-auto flex-1 space-y-5">
              {/* Row 1: Division & Client */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="inv-division" className="text-xs font-semibold">
                    Division
                  </Label>
                  <Select value={newInvDivisionId} onValueChange={setNewInvDivisionId}>
                    <SelectTrigger id="inv-division">
                      <SelectValue placeholder="Select Division" />
                    </SelectTrigger>
                    <SelectContent>
                      {divisions.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="inv-client" className="text-xs font-semibold">
                    Client
                  </Label>
                  <Select
                    value={newInvClientId}
                    onValueChange={(val) => {
                      setNewInvClientId(val);
                      const matched = clients.find((c) => c.id === val);
                      if (matched?.divisionId) {
                        setNewInvDivisionId(matched.divisionId);
                      }
                    }}
                  >
                    <SelectTrigger id="inv-client">
                      <SelectValue placeholder="Select Client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.businessName || c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Row 2: Schedule Reference & Billing Cycle Frequency */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="inv-ref" className="text-xs font-semibold">
                    Schedule Reference
                  </Label>
                  <Input
                    id="inv-ref"
                    placeholder="e.g. Website Hosting & Maintenance Retainer"
                    value={newInvRef}
                    onChange={(e) => setNewInvRef(e.target.value)}
                  />
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="inv-frequency" className="text-xs font-semibold">
                    Billing Cycle / Frequency
                  </Label>
                  <Select
                    value={newInvFrequency}
                    onValueChange={(val) => setNewInvFrequency(val as RecurringFrequency)}
                  >
                    <SelectTrigger id="inv-frequency">
                      <SelectValue placeholder="Billing Frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly (Every 1 Month)</SelectItem>
                      <SelectItem value="quarterly">Quarterly (Every 3 Months)</SelectItem>
                      <SelectItem value="semi_annually">Bi-Annually (Every 6 Months)</SelectItem>
                      <SelectItem value="annually">Yearly / Annually (Every 12 Months)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Row 3: First / Next Invoice Date & End Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="inv-next-run" className="text-xs font-semibold">
                    First / Next Invoice Date <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="inv-next-run"
                    type="date"
                    value={newInvNextRunDate}
                    onChange={(e) => setNewInvNextRunDate(e.target.value)}
                    required
                  />
                  <span className="text-[11px] text-muted-foreground">
                    First scheduled run date (defaults to the 25th)
                  </span>
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="inv-end-date" className="text-xs font-semibold">
                    End Date (Optional)
                  </Label>
                  <Input
                    id="inv-end-date"
                    type="date"
                    value={newInvEndDate}
                    onChange={(e) => setNewInvEndDate(e.target.value)}
                  />
                  <span className="text-[11px] text-muted-foreground">
                    Leave blank to run indefinitely until paused or cancelled
                  </span>
                </div>
              </div>

              {/* Line Items Section */}
              <div className="space-y-2 pt-2 border-t">
                <Label className="text-xs font-semibold">Recurring Line Items</Label>
                <BillingLineItemsForm
                  value={newInvLineItems}
                  onChange={setNewInvLineItems}
                  activeItems={activeItems}
                />
              </div>
            </div>

            <DialogFooter className="px-6 py-4 border-t bg-muted/20 shrink-0 flex items-center justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setInvoiceModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isPending ? 'Saving...' : editingId ? 'Save Changes' : 'Create Retainer Schedule'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Create/Edit Recurring Outbound Expense */}
      <Dialog
        open={expenseModalOpen}
        onOpenChange={(open) => {
          setExpenseModalOpen(open);
          if (!open) resetExpenseForm();
        }}
      >
        <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
          <form onSubmit={handleSaveExpense} className="flex flex-col h-full overflow-hidden">
            <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
              <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                <TrendingDown className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                {editingExpenseId ? 'Edit Vendor Subscription' : 'Add Vendor Subscription'}
              </DialogTitle>
              <DialogDescription>
                Track recurring software licenses, AI subscriptions (Claude, Antigravity), and cloud
                hosting (Hetzner).
              </DialogDescription>
            </DialogHeader>

            <div className="px-6 py-5 overflow-y-auto flex-1 space-y-5">
              {/* Row 1: Division & Vendor Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="exp-division" className="text-xs font-semibold">
                    Division
                  </Label>
                  <Select value={newExpDivisionId} onValueChange={setNewExpDivisionId}>
                    <SelectTrigger id="exp-division">
                      <SelectValue placeholder="Select Division" />
                    </SelectTrigger>
                    <SelectContent>
                      {divisions.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="exp-vendor" className="text-xs font-semibold">
                    Vendor / Software Name
                  </Label>
                  <Input
                    id="exp-vendor"
                    placeholder="e.g. Claude Anthropic / Antigravity / Hetzner"
                    value={newExpVendor}
                    onChange={(e) => setNewExpVendor(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Row 2: Category & Billing Frequency */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="exp-category" className="text-xs font-semibold">
                    Expense Category
                  </Label>
                  <Select value={newExpCategory} onValueChange={setNewExpCategory}>
                    <SelectTrigger id="exp-category">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Software & SaaS">Software & SaaS</SelectItem>
                      <SelectItem value="Hosting & Infrastructure">
                        Hosting & Infrastructure
                      </SelectItem>
                      {categories
                        .filter((c) => c !== 'Software & SaaS' && c !== 'Hosting & Infrastructure')
                        .map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="exp-frequency" className="text-xs font-semibold">
                    Billing Cycle / Frequency
                  </Label>
                  <Select
                    value={newExpFrequency}
                    onValueChange={(val) => setNewExpFrequency(val as RecurringFrequency)}
                  >
                    <SelectTrigger id="exp-frequency">
                      <SelectValue placeholder="Billing Frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly (Every 1 Month)</SelectItem>
                      <SelectItem value="quarterly">Quarterly (Every 3 Months)</SelectItem>
                      <SelectItem value="semi_annually">Bi-Annually (Every 6 Months)</SelectItem>
                      <SelectItem value="annually">Yearly / Annually (Every 12 Months)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Row 3: Amount & Next Bill Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="exp-amount" className="text-xs font-semibold">
                    Subscription Amount (ZAR)
                  </Label>
                  <Input
                    id="exp-amount"
                    type="number"
                    step="0.01"
                    placeholder="380.00"
                    value={newExpAmount}
                    onChange={(e) => setNewExpAmount(e.target.value)}
                    required
                  />
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="exp-next-due" className="text-xs font-semibold">
                    Next Bill Date (Debited Date)
                  </Label>
                  <Input
                    id="exp-next-due"
                    type="date"
                    value={newExpNextDueDate}
                    onChange={(e) => {
                      setNewExpNextDueDate(e.target.value);
                      if (e.target.value) {
                        const day = Number(e.target.value.split('-')[2]);
                        if (!isNaN(day)) setNewExpCycleDay(day);
                      }
                    }}
                    required
                  />
                  <span className="text-[11px] text-muted-foreground">
                    Date when the next subscription charge will occur (Day {newExpCycleDay})
                  </span>
                </div>
              </div>

              {/* Row 4: Client Cost Attribution */}
              <div className="p-4 rounded-lg bg-muted/40 border">
                <div className="grid gap-1.5">
                  <Label htmlFor="exp-client" className="text-xs font-semibold">
                    Project Cost Attribution
                  </Label>
                  <Select value={newExpClientId} onValueChange={setNewExpClientId}>
                    <SelectTrigger id="exp-client">
                      <SelectValue placeholder="None (General Overhead)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None (General Business Overhead)</SelectItem>
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.businessName || c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-[11px] text-muted-foreground">
                    Deducted when calculating client net profit
                  </span>
                </div>
              </div>
            </div>

            <DialogFooter className="px-6 py-4 border-t bg-muted/20 shrink-0 flex items-center justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setExpenseModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="bg-rose-600 hover:bg-rose-700 text-white"
              >
                {isPending ? 'Saving...' : editingExpenseId ? 'Save Changes' : 'Add Subscription'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmAction}
        onOpenChange={(open) => {
          if (!open) setConfirmAction(null);
        }}
        title={confirmAction?.title || 'Confirm Action'}
        description={confirmAction?.description}
        confirmText={confirmAction?.confirmText || 'Confirm'}
        variant="destructive"
        onConfirm={handleExecuteConfirm}
      />
    </div>
  );
}
