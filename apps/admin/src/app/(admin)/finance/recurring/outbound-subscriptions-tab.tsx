'use client';

import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  MoreHorizontal,
  PauseCircle,
  Pencil,
  Play,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { SearchableClientSelect } from '@/components/billing/searchable-client-select';
import { formatZAR, fmtDateLong } from '@/lib/format';
import {
  createRecurringExpense,
  updateRecurringExpense,
  setRecurringExpenseStatus,
  markRecurringExpenseAsPaid,
  type RecurringFrequency,
} from '@/app/actions/recurring-actions';
import type { RecurringExpenseRow } from '@pmg/db';
import {
  advanceDueDatePreview,
  defaultNextDueDate,
  formatFrequencyLabel,
  getDueState,
  toMonthlyAmount,
  type ClientHostingMarginRow,
} from './recurring-utils';

const BUILTIN_CATEGORIES = [
  'Domains & Hosting',
  'Software & SaaS',
  'Hosting & Infrastructure',
] as const;

interface OutboundSubscriptionsTabProps {
  recurringExpenses: RecurringExpenseRow[];
  hostingMargins: ClientHostingMarginRow[];
  clients: { id: string; name: string; businessName: string | null; divisionId?: string | null }[];
  divisions: { id: string; name: string }[];
  categories: string[];
  todayStr: string;
  isPending: boolean;
  startTransition: React.TransitionStartFunction;
  onNotify: (msg: { type: 'success' | 'error'; text: string }) => void;
  onRequestDelete: (exp: RecurringExpenseRow) => void;
}

export function OutboundSubscriptionsTab({
  recurringExpenses,
  hostingMargins,
  clients,
  divisions,
  categories,
  todayStr,
  isPending,
  startTransition,
  onNotify,
  onRequestDelete,
}: OutboundSubscriptionsTabProps) {
  const [search, setSearch] = useState('');
  const [ownershipFilter, setOwnershipFilter] = useState<'all' | 'own' | 'client'>('all');
  const [statusFilter, setStatusFilter] = useState<'active' | 'all' | 'inactive'>('active');
  const [divisionFilter, setDivisionFilter] = useState('all');

  // Add / Edit modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [vendorName, setVendorName] = useState('');
  const [notes, setNotes] = useState('');
  const [category, setCategory] = useState(categories[0] || 'Domains & Hosting');
  const [divisionId, setDivisionId] = useState(divisions[0]?.id || '');
  const [frequency, setFrequency] = useState<RecurringFrequency>('monthly');
  const [amount, setAmount] = useState('');
  const [nextDueDate, setNextDueDate] = useState(() => defaultNextDueDate(1, todayStr));
  const [ownership, setOwnership] = useState<'own' | 'client'>('own');
  const [clientId, setClientId] = useState('');

  // Log Payment modal state
  const [payTarget, setPayTarget] = useState<RecurringExpenseRow | null>(null);
  const [payDate, setPayDate] = useState(todayStr);
  const [payAmount, setPayAmount] = useState('');

  const allCategories = useMemo(() => {
    const set = new Set<string>([...BUILTIN_CATEGORIES, ...categories]);
    return Array.from(set);
  }, [categories]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return recurringExpenses.filter((exp) => {
      if (ownershipFilter === 'own' && exp.clientId !== null) return false;
      if (ownershipFilter === 'client' && exp.clientId === null) return false;
      if (statusFilter === 'active' && exp.status !== 'active') return false;
      if (statusFilter === 'inactive' && exp.status === 'active') return false;
      if (divisionFilter !== 'all' && exp.divisionId !== divisionFilter) return false;
      if (!q) return true;
      return (
        exp.vendorName.toLowerCase().includes(q) ||
        (exp.notes ?? '').toLowerCase().includes(q) ||
        exp.category.toLowerCase().includes(q) ||
        (exp.clientName ?? '').toLowerCase().includes(q)
      );
    });
  }, [recurringExpenses, search, ownershipFilter, statusFilter, divisionFilter]);

  const unbilledMargins = useMemo(
    () => hostingMargins.filter((m) => m.unbilled || m.netMonthly < 0),
    [hostingMargins],
  );

  function openCreate() {
    setEditingId(null);
    setVendorName('');
    setNotes('');
    setCategory(allCategories[0] || 'Domains & Hosting');
    setDivisionId(divisions[0]?.id || '');
    setFrequency('monthly');
    setAmount('');
    setNextDueDate(defaultNextDueDate(1, todayStr));
    setOwnership('own');
    setClientId('');
    setModalOpen(true);
  }

  function openEdit(exp: RecurringExpenseRow) {
    setEditingId(exp.id);
    setVendorName(exp.vendorName);
    setNotes(exp.notes || '');
    setCategory(exp.category);
    setDivisionId(exp.divisionId);
    setFrequency(exp.frequency || 'monthly');
    setAmount(String(parseFloat(exp.amount) || ''));
    setNextDueDate(exp.nextDueDate || defaultNextDueDate(exp.billingCycleDay || 1, todayStr));
    setOwnership(exp.clientId ? 'client' : 'own');
    setClientId(exp.clientId || '');
    setModalOpen(true);
  }

  function handleSave() {
    const parsedAmount = parseFloat(amount);
    if (!vendorName.trim()) {
      onNotify({ type: 'error', text: 'Vendor or registrar name is required.' });
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      onNotify({ type: 'error', text: 'Amount must be greater than 0.' });
      return;
    }
    if (ownership === 'client' && !clientId) {
      onNotify({ type: 'error', text: 'Select a client or switch ownership to Own / Internal.' });
      return;
    }

    const cycleDay = Number(nextDueDate.split('-')[2]) || 1;
    const payload = {
      divisionId,
      vendorName: vendorName.trim(),
      category,
      amount: parsedAmount,
      frequency,
      billingCycleDay: Math.min(Math.max(1, cycleDay), 28),
      nextDueDate,
      clientId: ownership === 'client' ? clientId : null,
      notes: notes.trim() || null,
    };

    startTransition(async () => {
      const res = editingId
        ? await updateRecurringExpense(editingId, payload)
        : await createRecurringExpense(payload);
      if (res.error) {
        onNotify({ type: 'error', text: res.error });
      } else {
        onNotify({
          type: 'success',
          text: editingId ? 'Subscription updated.' : 'Subscription added.',
        });
        setModalOpen(false);
      }
    });
  }

  function handleToggleStatus(exp: RecurringExpenseRow) {
    const nextStatus = exp.status === 'active' ? 'paused' : 'active';
    startTransition(async () => {
      const res = await setRecurringExpenseStatus(exp.id, nextStatus);
      if (res.error) onNotify({ type: 'error', text: res.error });
      else
        onNotify({
          type: 'success',
          text:
            nextStatus === 'paused' ? `Paused ${exp.vendorName}.` : `Resumed ${exp.vendorName}.`,
        });
    });
  }

  function openLogPayment(exp: RecurringExpenseRow) {
    setPayTarget(exp);
    setPayDate(todayStr);
    setPayAmount(String(parseFloat(exp.amount) || ''));
  }

  function handleConfirmLogPayment() {
    if (!payTarget) return;
    const actualAmount = parseFloat(payAmount);
    if (!Number.isFinite(actualAmount) || actualAmount <= 0) {
      onNotify({ type: 'error', text: 'Payment amount must be greater than 0.' });
      return;
    }

    startTransition(async () => {
      const res = await markRecurringExpenseAsPaid(payTarget.id, {
        paymentDate: payDate,
        actualAmount,
      });
      if (res.error) {
        onNotify({ type: 'error', text: res.error });
      } else {
        onNotify({
          type: 'success',
          text: `Logged payment of ${formatZAR(actualAmount)} for ${payTarget.vendorName} and posted journal entry.`,
        });
        setPayTarget(null);
      }
    });
  }

  const nextDatePreview = payTarget
    ? advanceDueDatePreview(
        payTarget.nextDueDate,
        payTarget.billingCycleDay || 1,
        payTarget.frequency || 'monthly',
      )
    : '';

  return (
    <div className="space-y-4">
      {/* Hosting & Retainer Margin Monitor (Flags unbilled client hosting in red) */}
      {hostingMargins.length > 0 && (
        <Card
          className={
            unbilledMargins.length > 0 ? 'border-rose-500/40 bg-rose-500/5' : 'border-border'
          }
        >
          <CardHeader className="py-3.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {unbilledMargins.length > 0 && (
                  <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                )}
                <CardTitle className="text-sm font-semibold">
                  Hosting &amp; Retainer Margin Monitor
                </CardTitle>
              </div>
              {unbilledMargins.length > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {unbilledMargins.length} Unbilled / Negative Margin
                </Badge>
              )}
            </div>
            <CardDescription className="text-xs">
              Compares normalized monthly client retainer revenue against client-linked hosting
              &amp; domain costs.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0 pb-3.5">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {hostingMargins.map((row) => (
                <div
                  key={row.clientId}
                  className={`rounded-lg border p-3 text-xs ${
                    row.unbilled || row.netMonthly < 0
                      ? 'border-rose-500/50 bg-rose-500/10'
                      : 'border-border bg-card'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 font-medium">
                    <span className="truncate">{row.clientName}</span>
                    {row.unbilled ? (
                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                        Unbilled Cost
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {row.marginPercent != null ? `${row.marginPercent}% margin` : 'Active'}
                      </Badge>
                    )}
                  </div>
                  {row.vendors.length > 0 && (
                    <p className="text-muted-foreground truncate mt-0.5">
                      {row.vendors.join(', ')}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-2 font-mono tabular-nums">
                    <span className="text-muted-foreground">
                      In {formatZAR(row.monthlyRevenue)} · Out {formatZAR(row.monthlyCost)}
                    </span>
                    <span
                      className={
                        row.netMonthly < 0
                          ? 'text-rose-600 dark:text-rose-400 font-semibold'
                          : 'text-emerald-600 dark:text-emerald-400 font-semibold'
                      }
                    >
                      {row.netMonthly >= 0 ? '+' : ''}
                      {formatZAR(row.netMonthly)}/mo
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-base">Subscriptions &amp; Domains (Money Out)</CardTitle>
            <CardDescription>
              Track your own internal tools/domains and client-linked hosting renewals.
            </CardDescription>
          </div>
          <Button size="sm" onClick={openCreate} disabled={isPending}>
            <Plus className="h-4 w-4 mr-1.5" /> Add Subscription / Domain
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="h-4 w-4 text-muted-foreground absolute left-2.5 top-2.5" />
              <Input
                placeholder="Search vendor, domain/notes, category, or client..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9"
              />
            </div>

            <div className="flex items-center rounded-md border p-0.5 bg-muted/40">
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'own', label: 'Own / Internal' },
                  { id: 'client', label: 'Client-Linked' },
                ] as const
              ).map((pill) => (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setOwnershipFilter(pill.id)}
                  className={`px-2.5 py-1 text-xs rounded-sm transition-colors ${
                    ownershipFilter === pill.id
                      ? 'bg-background text-foreground shadow-xs font-medium'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as 'active' | 'all' | 'inactive')}
            >
              <SelectTrigger className="w-[145px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="inactive">Paused / Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={divisionFilter} onValueChange={setDivisionFilter}>
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue placeholder="All Divisions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Divisions</SelectItem>
                {divisions.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor &amp; Domain / Asset</TableHead>
                  <TableHead>Ownership</TableHead>
                  <TableHead>Cycle &amp; Due Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right w-[150px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No subscriptions or domains match your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((exp) => {
                    const dueState = getDueState(exp.nextDueDate, exp.status, todayStr);
                    const rawAmount = parseFloat(exp.amount) || 0;
                    const monthlyEq = toMonthlyAmount(rawAmount, exp.frequency);

                    return (
                      <TableRow
                        key={exp.id}
                        className={exp.status !== 'active' ? 'opacity-60' : ''}
                      >
                        <TableCell>
                          <div className="font-medium text-sm">{exp.vendorName}</div>
                          {exp.notes && (
                            <div className="text-xs text-muted-foreground">{exp.notes}</div>
                          )}
                          <div className="text-[11px] text-muted-foreground mt-0.5">
                            {exp.category} · {exp.divisionName}
                          </div>
                        </TableCell>
                        <TableCell>
                          {exp.clientId ? (
                            <Badge variant="outline" className="text-xs font-normal">
                              Client: {exp.clientName || 'Linked'}
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs font-normal">
                              Own / Internal
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge variant="outline" className="text-[11px] font-normal">
                              {formatFrequencyLabel(exp.frequency)}
                            </Badge>
                            {dueState === 'overdue' && (
                              <Badge variant="destructive" className="text-[10px]">
                                Overdue
                              </Badge>
                            )}
                            {dueState === 'due_soon' && (
                              <Badge className="text-[10px] bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/15">
                                Due Soon
                              </Badge>
                            )}
                            {dueState === 'this_month' && (
                              <Badge variant="secondary" className="text-[10px]">
                                This Month
                              </Badge>
                            )}
                            {exp.status !== 'active' && (
                              <Badge variant="secondary" className="text-[10px] capitalize">
                                {exp.status}
                              </Badge>
                            )}
                          </div>
                          <div className="mt-1 text-muted-foreground">
                            Next due: {exp.nextDueDate ? fmtDateLong(exp.nextDueDate) : '—'}
                            {exp.lastPaidDate && ` · Last paid: ${fmtDateLong(exp.lastPaidDate)}`}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums">
                          <div className="font-medium text-sm">{formatZAR(rawAmount)}</div>
                          {exp.frequency !== 'monthly' && (
                            <div className="text-[11px] text-muted-foreground">
                              {formatZAR(monthlyEq)}/mo
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {exp.status === 'active' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs"
                                onClick={() => openLogPayment(exp)}
                                disabled={isPending}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                                Log Paid
                              </Button>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openEdit(exp)}>
                                  <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleToggleStatus(exp)}>
                                  {exp.status === 'active' ? (
                                    <>
                                      <PauseCircle className="h-3.5 w-3.5 mr-2" /> Pause
                                    </>
                                  ) : (
                                    <>
                                      <Play className="h-3.5 w-3.5 mr-2" /> Resume
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => onRequestDelete(exp)}
                                >
                                  <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add / Edit Subscription Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Edit Subscription / Domain' : 'Add Subscription / Domain'}
            </DialogTitle>
            <DialogDescription>
              Track recurring software, hosting, or domain renewals (yours or client-linked).
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Vendor / Registrar *</Label>
                <Input
                  placeholder="e.g. Domains.co.za, Cloudflare, Hetzner"
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Category *</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {allCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Domain / Asset / Notes</Label>
              <Input
                placeholder="e.g. playhousemedia.co.za or plan / account email"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Who is this for? (Ownership)</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={ownership === 'own' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setOwnership('own');
                    setClientId('');
                  }}
                >
                  Own / Internal (No Client)
                </Button>
                <Button
                  type="button"
                  variant={ownership === 'client' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setOwnership('client')}
                >
                  Linked to a Client
                </Button>
              </div>
              {ownership === 'client' && (
                <div className="pt-1.5">
                  <SearchableClientSelect
                    clients={clients}
                    value={clientId}
                    onValueChange={setClientId}
                    placeholder="Select client..."
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Division</Label>
                <Select value={divisionId} onValueChange={setDivisionId}>
                  <SelectTrigger>
                    <SelectValue />
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
              <div className="space-y-1.5">
                <Label>Frequency</Label>
                <Select
                  value={frequency}
                  onValueChange={(v) => setFrequency(v as RecurringFrequency)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly (3 Mo)</SelectItem>
                    <SelectItem value="semi_annually">Bi-Annually (6 Mo)</SelectItem>
                    <SelectItem value="annually">Yearly (12 Mo)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Amount (ZAR) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Next Bill Date *</Label>
                <Input
                  type="date"
                  value={nextDueDate}
                  onChange={(e) => setNextDueDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isPending}>
              {isPending ? 'Saving…' : editingId ? 'Save Changes' : 'Add Subscription'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Log Payment Confirmation Modal */}
      <Dialog open={!!payTarget} onOpenChange={(open) => !open && setPayTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Log Subscription Payment</DialogTitle>
            <DialogDescription>
              {payTarget && (
                <>
                  Recording payment for <strong>{payTarget.vendorName}</strong>
                  {payTarget.notes ? ` (${payTarget.notes})` : ''}.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label>Payment Date</Label>
              <Input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Actual Amount Paid (ZAR)</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Adjust if FX rates or registrar pricing changed on this billing cycle.
              </p>
            </div>
            {payTarget && (
              <p className="text-xs rounded-md bg-muted/60 p-2.5 text-muted-foreground">
                This will create an expense record, post the balanced journal entry, and advance the
                next due date to <strong>{fmtDateLong(nextDatePreview)}</strong>.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPayTarget(null)} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={handleConfirmLogPayment} disabled={isPending}>
              {isPending ? 'Recording…' : 'Confirm & Log Paid'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
