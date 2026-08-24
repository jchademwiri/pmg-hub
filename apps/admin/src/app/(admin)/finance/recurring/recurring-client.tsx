'use client';

import React, { useState, useTransition } from 'react';
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
import {
  CalendarClock,
  ArrowDownLeft,
  TrendingDown,
  Play,
  Plus,
  CheckCircle2,
  PauseCircle,
  RefreshCw,
  Sparkles,
  Layers,
} from 'lucide-react';
import { formatZAR, fmtDateLong } from '@/lib/format';
import {
  createRecurringInvoice,
  setRecurringInvoiceStatus,
  triggerRecurringBillingRun,
  createRecurringExpense,
  setRecurringExpenseStatus,
  markRecurringExpenseAsPaid,
} from '@/app/actions/recurring-actions';
import type { RecurringInvoiceRow, RecurringExpenseRow } from '@pmg/db';

interface RecurringClientProps {
  recurringInvoices: RecurringInvoiceRow[];
  recurringExpenses: RecurringExpenseRow[];
  clients: { id: string; name: string; businessName: string | null }[];
  divisions: { id: string; name: string }[];
  billingItems: { id: string; name: string; unitPrice: string }[];
  categories: string[];
}

export function RecurringClient({
  recurringInvoices,
  recurringExpenses,
  clients,
  divisions,
  billingItems,
  categories,
}: RecurringClientProps) {
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<'inbound' | 'outbound'>('inbound');

  // Modals
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [actionMessage, setActionMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // New Inbound Invoice Form State
  const [newInvDivisionId, setNewInvDivisionId] = useState(divisions[0]?.id || '');
  const [newInvClientId, setNewInvClientId] = useState('');
  const [newInvRef, setNewInvRef] = useState('');
  const [newInvCycleDay, setNewInvCycleDay] = useState(25);
  const [newInvDescription, setNewInvDescription] = useState('');
  const [newInvAmount, setNewInvAmount] = useState('');

  // New Outbound Expense Form State
  const [newExpDivisionId, setNewExpDivisionId] = useState(divisions[0]?.id || '');
  const [newExpVendor, setNewExpVendor] = useState('');
  const [newExpCategory, setNewExpCategory] = useState(categories[0] || 'Software & SaaS');
  const [newExpAmount, setNewExpAmount] = useState('');
  const [newExpCycleDay, setNewExpCycleDay] = useState(1);
  const [newExpClientId, setNewExpClientId] = useState<string>('none');

  // Calculations
  const activeInbound = recurringInvoices.filter((i) => i.status === 'active');
  const activeOutbound = recurringExpenses.filter((e) => e.status === 'active');

  const totalMRR = activeInbound.reduce((sum, inv) => sum + parseFloat(inv.total), 0);
  const totalSoftwareBurn = activeOutbound.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
  const netMonthlySurplus = totalMRR - totalSoftwareBurn;

  // Handlers
  const handleTriggerRun = () => {
    setActionMessage(null);
    startTransition(async () => {
      const res = await triggerRecurringBillingRun();
      if (res.error) {
        setActionMessage({ type: 'error', text: res.error });
      } else {
        setActionMessage({
          type: 'success',
          text: `Successfully processed recurring run: ${res.generatedCount ?? 0} invoice(s) generated & issued.`,
        });
      }
    });
  };

  const handleCreateInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    setActionMessage(null);
    const amountNum = parseFloat(newInvAmount);
    if (!newInvClientId || isNaN(amountNum) || amountNum <= 0) {
      setActionMessage({
        type: 'error',
        text: 'Please enter a valid client, description, and amount.',
      });
      return;
    }

    startTransition(async () => {
      const res = await createRecurringInvoice({
        divisionId: newInvDivisionId,
        clientId: newInvClientId,
        reference: newInvRef || 'Monthly Hosting & Retainer',
        billingCycleDay: Number(newInvCycleDay),
        dueDaysOffset: 6, // due 1st
        autoSendEmail: true,
        vatEnabled: false,
        lineItems: [
          {
            description: newInvDescription || 'Monthly Website Hosting & Retainer Service',
            quantity: 1,
            unitPrice: amountNum,
          },
        ],
      });

      if (res.error) {
        setActionMessage({ type: 'error', text: res.error });
      } else {
        setInvoiceModalOpen(false);
        setNewInvAmount('');
        setNewInvDescription('');
        setNewInvRef('');
        setActionMessage({
          type: 'success',
          text: 'Recurring retainer schedule created successfully.',
        });
      }
    });
  };

  const handleCreateExpense = (e: React.FormEvent) => {
    e.preventDefault();
    setActionMessage(null);
    const amountNum = parseFloat(newExpAmount);
    if (!newExpVendor.trim() || isNaN(amountNum) || amountNum <= 0) {
      setActionMessage({ type: 'error', text: 'Please enter a valid vendor name and amount.' });
      return;
    }

    startTransition(async () => {
      const res = await createRecurringExpense({
        divisionId: newExpDivisionId,
        vendorName: newExpVendor.trim(),
        category: newExpCategory,
        amount: amountNum,
        billingCycleDay: Number(newExpCycleDay),
        clientId: newExpClientId === 'none' ? null : newExpClientId,
      });

      if (res.error) {
        setActionMessage({ type: 'error', text: res.error });
      } else {
        setExpenseModalOpen(false);
        setNewExpVendor('');
        setNewExpAmount('');
        setActionMessage({ type: 'success', text: 'Recurring subscription created successfully.' });
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
      {/* Top Banner Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-600">
              <ArrowDownLeft className="h-4 w-4" /> Inbound Monthly Retainers (MRR)
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
              {formatZAR(totalMRR)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {activeInbound.length} active client retainer(s) • Generated 25th, due 1st
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-rose-500">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-rose-600">
              <TrendingDown className="h-4 w-4" /> Outbound Subscriptions Burn
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-rose-700 dark:text-rose-400">
              {formatZAR(totalSoftwareBurn)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {activeOutbound.length} vendor software & VPS subscriptions (Claude, Antigravity,
            Hetzner)
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-blue-600">
              <Layers className="h-4 w-4" /> Net Monthly Recurring Surplus
            </CardDescription>
            <CardTitle
              className={`text-2xl font-bold ${netMonthlySurplus >= 0 ? 'text-blue-700 dark:text-blue-400' : 'text-rose-600'}`}
            >
              {formatZAR(netMonthlySurplus)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Net monthly baseline margin before variable project income
          </CardContent>
        </Card>
      </div>

      {actionMessage && (
        <div
          className={`p-4 rounded-lg text-sm border flex items-center gap-2 ${
            actionMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/30 dark:border-rose-800 dark:text-rose-300'
          }`}
        >
          {actionMessage.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : null}
          {actionMessage.text}
        </div>
      )}

      {/* Tabs & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4">
        <div className="flex items-center gap-2 bg-muted/60 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('inbound')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              activeTab === 'inbound'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Inbound Client Retainers ({recurringInvoices.length})
          </button>
          <button
            onClick={() => setActiveTab('outbound')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              activeTab === 'outbound'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Outbound Subscriptions ({recurringExpenses.length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'inbound' ? (
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
              <Button size="sm" onClick={() => setInvoiceModalOpen(true)} className="gap-1.5">
                <Plus className="h-4 w-4" /> Add Retainer Schedule
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={() => setExpenseModalOpen(true)} className="gap-1.5">
              <Plus className="h-4 w-4" /> Add Vendor Subscription
            </Button>
          )}
        </div>
      </div>

      {/* Content Section */}
      {activeTab === 'inbound' ? (
        <div className="grid grid-cols-1 gap-4">
          {recurringInvoices.length === 0 ? (
            <div className="text-center py-12 border border-dashed rounded-xl p-8 bg-muted/20">
              <CalendarClock className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-60" />
              <h3 className="text-base font-semibold">No Client Retainer Schedules Yet</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1 mb-4">
                Set up recurring monthly hosting or maintenance retainers to automatically generate
                and issue invoices on the 25th.
              </p>
              <Button size="sm" onClick={() => setInvoiceModalOpen(true)}>
                <Plus className="h-4 w-4 mr-1.5" /> Create First Retainer Schedule
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border bg-card">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-muted/50 text-muted-foreground border-b">
                  <tr>
                    <th className="px-4 py-3">Client & Reference</th>
                    <th className="px-4 py-3">Division</th>
                    <th className="px-4 py-3">Cycle / Next Run</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {recurringInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-foreground">
                          {inv.clientBusinessName || inv.clientName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {inv.reference || 'Monthly Retainer'}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-xs">
                          {inv.divisionName}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs font-medium">
                          Day {inv.billingCycleDay} of month
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Next: {fmtDateLong(inv.nextRunDate)}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-foreground">
                        {formatZAR(parseFloat(inv.total))}
                      </td>
                      <td className="px-4 py-3">
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
                        {inv.status === 'active' ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setRecurringInvoiceStatus(inv.id, 'paused')}
                            className="text-xs h-8"
                          >
                            <PauseCircle className="h-3.5 w-3.5 mr-1" /> Pause
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setRecurringInvoiceStatus(inv.id, 'active')}
                            className="text-xs h-8 text-emerald-600"
                          >
                            <Play className="h-3.5 w-3.5 mr-1" /> Resume
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {recurringExpenses.length === 0 ? (
            <div className="text-center py-12 border border-dashed rounded-xl p-8 bg-muted/20">
              <TrendingDown className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-60" />
              <h3 className="text-base font-semibold">No Outbound Subscriptions Configured</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1 mb-4">
                Track monthly software & hosting overhead (Claude, Antigravity, Hetzner VPS) to
                ensure 1-click accounting payment logging.
              </p>
              <Button size="sm" onClick={() => setExpenseModalOpen(true)}>
                <Plus className="h-4 w-4 mr-1.5" /> Add First Subscription
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border bg-card">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-muted/50 text-muted-foreground border-b">
                  <tr>
                    <th className="px-4 py-3">Vendor / Tool</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Division</th>
                    <th className="px-4 py-3">Cycle & Next Due</th>
                    <th className="px-4 py-3">Monthly Amount</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {recurringExpenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-foreground">{exp.vendorName}</div>
                        {exp.clientName && (
                          <div className="text-xs text-muted-foreground">For: {exp.clientName}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{exp.category}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-xs">
                          {exp.divisionName}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs font-medium">Day {exp.billingCycleDay}</div>
                        <div className="text-xs text-muted-foreground">
                          Due: {fmtDateLong(exp.nextDueDate)}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-foreground">
                        {formatZAR(parseFloat(exp.amount))}
                      </td>
                      <td className="px-4 py-3">
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
                            <CheckCircle2 className="h-3.5 w-3.5" /> Mark Paid
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal: Create Recurring Inbound Retainer */}
      <Dialog open={invoiceModalOpen} onOpenChange={setInvoiceModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleCreateInvoice}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CalendarClock className="h-5 w-5 text-emerald-600" /> Create Client Retainer
                Schedule
              </DialogTitle>
              <DialogDescription>
                Generates invoices on the 25th with a due date of the 1st of the next month.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-1.5">
                <Label htmlFor="inv-division">Division</Label>
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
                <Label htmlFor="inv-client">Client</Label>
                <Select value={newInvClientId} onValueChange={setNewInvClientId}>
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

              <div className="grid gap-1.5">
                <Label htmlFor="inv-ref">Schedule Reference</Label>
                <Input
                  id="inv-ref"
                  placeholder="e.g. Monthly Website Hosting & Retainer"
                  value={newInvRef}
                  onChange={(e) => setNewInvRef(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="inv-cycle">Cycle Day</Label>
                  <Input
                    id="inv-cycle"
                    type="number"
                    min={1}
                    max={28}
                    value={newInvCycleDay}
                    onChange={(e) => setNewInvCycleDay(Number(e.target.value))}
                  />
                  <span className="text-[11px] text-muted-foreground">Default: 25th (due 1st)</span>
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="inv-amount">Monthly Fee (ZAR)</Label>
                  <Input
                    id="inv-amount"
                    type="number"
                    step="0.01"
                    placeholder="1500.00"
                    value={newInvAmount}
                    onChange={(e) => setNewInvAmount(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="inv-desc">Line Item Description</Label>
                <Input
                  id="inv-desc"
                  placeholder="e.g. Monthly Web Hosting, Backups & Maintenance"
                  value={newInvDescription}
                  onChange={(e) => setNewInvDescription(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setInvoiceModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Saving...' : 'Create Retainer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Create Recurring Outbound Subscription */}
      <Dialog open={expenseModalOpen} onOpenChange={setExpenseModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleCreateExpense}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-rose-600" /> Add Vendor Subscription
              </DialogTitle>
              <DialogDescription>
                Track recurring software or server expenses (Claude, Antigravity, Hetzner).
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-1.5">
                <Label htmlFor="exp-division">Division</Label>
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
                <Label htmlFor="exp-vendor">Vendor / Software Name</Label>
                <Input
                  id="exp-vendor"
                  placeholder="e.g. Claude Anthropic / Antigravity / Hetzner"
                  value={newExpVendor}
                  onChange={(e) => setNewExpVendor(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="exp-category">Category</Label>
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
                  <Label htmlFor="exp-amount">Amount (ZAR)</Label>
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
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="exp-cycle">Billing Day</Label>
                  <Input
                    id="exp-cycle"
                    type="number"
                    min={1}
                    max={28}
                    value={newExpCycleDay}
                    onChange={(e) => setNewExpCycleDay(Number(e.target.value))}
                  />
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="exp-client">Direct Client Cost (Optional)</Label>
                  <Select value={newExpClientId} onValueChange={setNewExpClientId}>
                    <SelectTrigger id="exp-client">
                      <SelectValue placeholder="None (General)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None (General Overhead)</SelectItem>
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.businessName || c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setExpenseModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Saving...' : 'Add Subscription'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
