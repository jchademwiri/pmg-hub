'use client';

import React, { useMemo, useState } from 'react';
import {
  Mail,
  MoreHorizontal,
  PauseCircle,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  XCircle,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
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
import {
  BillingLineItemsForm,
  type LineItemFormRow,
  type ActiveItem,
} from '@/components/billing/billing-line-items-form';
import { formatZAR, fmtDateLong } from '@/lib/format';
import {
  createRecurringInvoice,
  updateRecurringInvoice,
  getRecurringInvoiceDetail,
  setRecurringInvoiceStatus,
  triggerRecurringBillingRun,
  generateAndSendBillingDigest,
  type RecurringFrequency,
} from '@/app/actions/recurring-actions';
import type { RecurringInvoiceRow } from '@pmg/db';
import { defaultNextRunDate, formatFrequencyLabel, toMonthlyAmount } from './recurring-utils';

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

interface InboundRetainersTabProps {
  recurringInvoices: RecurringInvoiceRow[];
  clients: { id: string; name: string; businessName: string | null; divisionId?: string | null }[];
  divisions: { id: string; name: string }[];
  activeItems: ActiveItem[];
  todayStr: string;
  isPending: boolean;
  startTransition: React.TransitionStartFunction;
  onNotify: (msg: { type: 'success' | 'error'; text: string }) => void;
  onRequestCancelOrDelete: (inv: RecurringInvoiceRow) => void;
}

export function InboundRetainersTab({
  recurringInvoices,
  clients,
  divisions,
  activeItems,
  todayStr,
  isPending,
  startTransition,
  onNotify,
  onRequestCancelOrDelete,
}: InboundRetainersTabProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'all' | 'inactive'>('active');
  const [divisionFilter, setDivisionFilter] = useState('all');

  // Add / Edit modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [divisionId, setDivisionId] = useState(divisions[0]?.id || '');
  const [clientId, setClientId] = useState('');
  const [reference, setReference] = useState('');
  const [frequency, setFrequency] = useState<RecurringFrequency>('monthly');
  const [nextRunDate, setNextRunDate] = useState(() => defaultNextRunDate(todayStr));
  const [endDate, setEndDate] = useState('');
  const [autoSendEmail, setAutoSendEmail] = useState(true);
  const [notes, setNotes] = useState('');
  const [lineItems, setLineItems] = useState<LineItemFormRow[]>([blankRow()]);

  // Preserved advanced settings on edit
  const [preservedMeta, setPreservedMeta] = useState<{
    vatEnabled: boolean;
    discountType: 'percent' | 'amount' | null;
    discountValue: number | null;
    dueDaysOffset: number;
    terms: string | null;
  }>({
    vatEnabled: false,
    discountType: null,
    discountValue: null,
    dueDaysOffset: 6,
    terms: null,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return recurringInvoices.filter((inv) => {
      if (statusFilter === 'active' && inv.status !== 'active') return false;
      if (statusFilter === 'inactive' && inv.status === 'active') return false;
      if (divisionFilter !== 'all' && inv.divisionId !== divisionFilter) return false;
      if (!q) return true;
      return (
        inv.clientName.toLowerCase().includes(q) ||
        (inv.clientBusinessName ?? '').toLowerCase().includes(q) ||
        (inv.reference ?? '').toLowerCase().includes(q)
      );
    });
  }, [recurringInvoices, search, statusFilter, divisionFilter]);

  function openCreate() {
    setEditingId(null);
    setDivisionId(divisions[0]?.id || '');
    setClientId('');
    setReference('');
    setFrequency('monthly');
    setNextRunDate(defaultNextRunDate(todayStr));
    setEndDate('');
    setAutoSendEmail(true);
    setNotes('');
    setLineItems([blankRow()]);
    setPreservedMeta({
      vatEnabled: false,
      discountType: null,
      discountValue: null,
      dueDaysOffset: 6,
      terms: null,
    });
    setModalOpen(true);
  }

  function openEdit(inv: RecurringInvoiceRow) {
    startTransition(async () => {
      const res = await getRecurringInvoiceDetail(inv.id);
      if (res.error || !res.data) {
        onNotify({ type: 'error', text: res.error || 'Failed to load retainer details.' });
        return;
      }
      const d = res.data;
      setEditingId(d.id);
      setDivisionId(d.divisionId);
      setClientId(d.clientId);
      setReference(d.reference || '');
      setFrequency((d.frequency as RecurringFrequency) || 'monthly');
      setNextRunDate(d.nextRunDate || defaultNextRunDate(todayStr));
      setEndDate(d.endDate || '');
      setAutoSendEmail(d.autoSendEmail ?? true);
      setNotes(d.notes || '');
      setPreservedMeta({
        vatEnabled: d.vatEnabled ?? false,
        discountType: (d.discountType as 'percent' | 'amount' | null) ?? null,
        discountValue: d.discountValue != null ? parseFloat(d.discountValue) : null,
        dueDaysOffset: d.dueDaysOffset ?? 6,
        terms: d.terms ?? null,
      });
      setLineItems(
        d.lineItems && d.lineItems.length > 0
          ? d.lineItems.map((li) => ({
              id: generateRowId(),
              itemId: li.itemId || '',
              description: li.description,
              quantity: String(li.quantity),
              unitPrice: String(li.unitPrice),
              discountType: (li.discountType as 'percent' | 'amount' | null) ?? null,
              discountValue: li.discountValue != null ? String(li.discountValue) : '',
            }))
          : [blankRow()],
      );
      setModalOpen(true);
    });
  }

  function handleSave() {
    if (!clientId) {
      onNotify({ type: 'error', text: 'Please select a client.' });
      return;
    }
    const validItems = lineItems
      .filter((li) => li.description.trim() && parseFloat(li.unitPrice) > 0)
      .map((li) => ({
        itemId: li.itemId || null,
        description: li.description.trim(),
        quantity: Math.max(1, parseFloat(li.quantity) || 1),
        unitPrice: parseFloat(li.unitPrice) || 0,
        discountType: li.discountType,
        discountValue: li.discountValue ? parseFloat(li.discountValue) : null,
      }));

    if (validItems.length === 0) {
      onNotify({ type: 'error', text: 'Add at least one line item with a price greater than 0.' });
      return;
    }

    const payload = {
      divisionId,
      clientId,
      reference: reference.trim() || null,
      frequency,
      nextRunDate,
      endDate: endDate || null,
      autoSendEmail,
      notes: notes.trim() || null,
      vatEnabled: preservedMeta.vatEnabled,
      discountType: preservedMeta.discountType,
      discountValue: preservedMeta.discountValue,
      dueDaysOffset: preservedMeta.dueDaysOffset,
      terms: preservedMeta.terms,
      lineItems: validItems,
    };

    startTransition(async () => {
      const res = editingId
        ? await updateRecurringInvoice(editingId, payload)
        : await createRecurringInvoice(payload);
      if (res.error) {
        onNotify({ type: 'error', text: res.error });
      } else {
        onNotify({
          type: 'success',
          text: editingId ? 'Client retainer updated.' : 'Client retainer created.',
        });
        setModalOpen(false);
      }
    });
  }

  function handleToggleStatus(inv: RecurringInvoiceRow) {
    const nextStatus = inv.status === 'active' ? 'paused' : 'active';
    startTransition(async () => {
      const res = await setRecurringInvoiceStatus(inv.id, nextStatus);
      if (res.error) {
        onNotify({ type: 'error', text: res.error });
      } else {
        onNotify({
          type: 'success',
          text:
            nextStatus === 'paused'
              ? `Paused retainer for ${inv.clientBusinessName || inv.clientName}.`
              : `Resumed retainer for ${inv.clientBusinessName || inv.clientName}.`,
        });
      }
    });
  }

  function handleRunBillingNow() {
    startTransition(async () => {
      const res = await triggerRecurringBillingRun();
      if (res.error) {
        onNotify({ type: 'error', text: res.error });
      } else if ((res.generatedCount ?? 0) === 0) {
        onNotify({ type: 'success', text: 'No active retainers are due for billing today.' });
      } else {
        onNotify({
          type: 'success',
          text: `Generated ${res.generatedCount} recurring invoice${res.generatedCount === 1 ? '' : 's'}${res.emailFailureCount ? ` (${res.emailFailureCount} email delivery failed)` : ''}.`,
        });
      }
    });
  }

  function handleSendDigest() {
    startTransition(async () => {
      const res = await generateAndSendBillingDigest();
      if (res.error) onNotify({ type: 'error', text: res.error });
      else onNotify({ type: 'success', text: 'Billing digest email sent.' });
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <CardTitle className="text-base">Client Retainers (Money In)</CardTitle>
          <CardDescription>
            Recurring invoices billed to clients on repeat (auto-emailed with statement attached).
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRunBillingNow} disabled={isPending}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isPending ? 'animate-spin' : ''}`} />
            Run Billing Now
          </Button>
          <Button size="sm" onClick={openCreate} disabled={isPending}>
            <Plus className="h-4 w-4 mr-1.5" /> Add Retainer
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isPending}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleSendDigest}>
                <Mail className="h-3.5 w-3.5 mr-2" /> Send Digest Now
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="h-4 w-4 text-muted-foreground absolute left-2.5 top-2.5" />
            <Input
              placeholder="Search client or reference..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as 'active' | 'all' | 'inactive')}
          >
            <SelectTrigger className="w-[155px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="inactive">Paused &amp; Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Select value={divisionFilter} onValueChange={setDivisionFilter}>
            <SelectTrigger className="w-[165px] h-9">
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

        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client &amp; Reference</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right w-[130px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No client retainers match your filters.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((inv) => {
                  const total = parseFloat(inv.total) || 0;
                  const monthlyEq = toMonthlyAmount(total, inv.frequency);
                  return (
                    <TableRow key={inv.id} className={inv.status !== 'active' ? 'opacity-60' : ''}>
                      <TableCell>
                        <div className="font-medium text-sm">
                          {inv.clientBusinessName || inv.clientName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {inv.reference || 'Monthly Retainer'} · {inv.divisionName}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className="text-[11px] font-normal">
                            {formatFrequencyLabel(inv.frequency)}
                          </Badge>
                          {inv.autoSendEmail && (
                            <Badge variant="secondary" className="text-[10px] font-normal">
                              Auto-email
                            </Badge>
                          )}
                        </div>
                        <div className="text-muted-foreground mt-1">
                          Next run: {inv.nextRunDate ? fmtDateLong(inv.nextRunDate) : '—'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={inv.status === 'active' ? 'default' : 'secondary'}
                          className="capitalize text-xs"
                        >
                          {inv.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        <div className="font-medium text-sm">{formatZAR(total)}</div>
                        {inv.frequency !== 'monthly' && (
                          <div className="text-[11px] text-muted-foreground">
                            {formatZAR(monthlyEq)}/mo
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs"
                            onClick={() => openEdit(inv)}
                            disabled={isPending}
                          >
                            <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {inv.status !== 'cancelled' && (
                                <DropdownMenuItem onClick={() => handleToggleStatus(inv)}>
                                  {inv.status === 'active' ? (
                                    <>
                                      <PauseCircle className="h-3.5 w-3.5 mr-2" /> Pause
                                    </>
                                  ) : (
                                    <>
                                      <Play className="h-3.5 w-3.5 mr-2" /> Resume
                                    </>
                                  )}
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => onRequestCancelOrDelete(inv)}
                              >
                                {inv.lastRunDate ? (
                                  <>
                                    <XCircle className="h-3.5 w-3.5 mr-2" /> Cancel Schedule
                                  </>
                                ) : (
                                  <>
                                    <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete Schedule
                                  </>
                                )}
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

      {/* Add / Edit Retainer Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Client Retainer' : 'Add Client Retainer'}</DialogTitle>
            <DialogDescription>
              Configure recurring invoice line items, cadence, and automatic email delivery.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Client *</Label>
                <SearchableClientSelect
                  clients={clients}
                  value={clientId}
                  onValueChange={(id) => {
                    setClientId(id);
                    const found = clients.find((c) => c.id === id);
                    if (found?.divisionId) setDivisionId(found.divisionId);
                  }}
                  placeholder="Select client..."
                />
              </div>
              <div className="space-y-1.5">
                <Label>Division *</Label>
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
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Reference</Label>
                <Input
                  placeholder="e.g. Monthly Website & Hosting"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                />
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
              <div className="space-y-1.5">
                <Label>Next Invoice Date *</Label>
                <Input
                  type="date"
                  value={nextRunDate}
                  onChange={(e) => setNextRunDate(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              <div className="space-y-1.5">
                <Label>End Date (optional)</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
              <div className="flex items-center justify-between rounded-md border p-3 mt-4">
                <div>
                  <Label className="text-sm">Auto-email invoice &amp; statement</Label>
                  <p className="text-xs text-muted-foreground">
                    Email client automatically when generated
                  </p>
                </div>
                <Switch checked={autoSendEmail} onCheckedChange={setAutoSendEmail} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Line Items *</Label>
              <BillingLineItemsForm
                value={lineItems}
                onChange={setLineItems}
                activeItems={activeItems}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Notes (optional)</Label>
              <Textarea
                rows={2}
                placeholder="Internal notes or invoice footer note..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isPending}>
              {isPending ? 'Saving…' : editingId ? 'Save Changes' : 'Create Retainer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
