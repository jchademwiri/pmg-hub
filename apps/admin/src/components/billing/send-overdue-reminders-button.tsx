'use client';

import * as React from 'react';
import { toast } from 'sonner';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Mail,
  RefreshCw,
  Search,
  Send,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  getPendingRemindersAction,
  getReminderPreviewAction,
  sendCustomizedReminderAction,
  type PendingReminderClient,
} from '@/app/actions/send-overdue-reminders';
import { validatePersonalMessage, validateRecipientEmail } from '@/lib/email-validation';
import { EmailPreviewPanel } from '@/components/billing/email-preview-panel';
import { fmtDate } from '@/lib/format';

type ReminderConfig = {
  recipientEmail: string;
  subject: string;
  personalMessage: string;
};

type SendStatus = 'idle' | 'sending' | 'sent' | 'failed' | 'skipped';

function formatMoney(amount: number) {
  return `R ${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;
}

function defaultSubject(item: PendingReminderClient) {
  const clientLabel = item.businessName ?? item.clientName;
  return `Overdue Payment Reminder - ${clientLabel}: ${formatMoney(item.outstandingBalance)} outstanding`;
}

function clientLabel(item: PendingReminderClient) {
  return item.businessName || item.clientName;
}

function StatusBadge({ status }: { status: SendStatus }) {
  if (status === 'sent') {
    return (
      <Badge variant="secondary" className="gap-1 text-emerald-700">
        <CheckCircle2 className="size-3" />
        Sent
      </Badge>
    );
  }

  if (status === 'failed') {
    return (
      <Badge variant="destructive" className="gap-1">
        <AlertCircle className="size-3" />
        Failed
      </Badge>
    );
  }

  if (status === 'sending') {
    return (
      <Badge variant="outline" className="gap-1">
        <Loader2 className="size-3 animate-spin" />
        Sending
      </Badge>
    );
  }

  if (status === 'skipped') return <Badge variant="outline">Skipped</Badge>;
  return null;
}

export function SendOverdueRemindersButton({ clientId, trigger }: { clientId?: string; trigger?: React.ReactNode } = {}) {
  const [open, setOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSending, setIsSending] = React.useState(false);
  const [items, setItems] = React.useState<PendingReminderClient[]>([]);
  const [activeKey, setActiveKey] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState('');
  const [sortDirection, setSortDirection] = React.useState<'desc' | 'asc'>('desc');
  const [selected, setSelected] = React.useState<Record<string, boolean>>({});
  const [configs, setConfigs] = React.useState<Record<string, ReminderConfig>>({});
  const [statuses, setStatuses] = React.useState<Record<string, SendStatus>>({});
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [previewHtml, setPreviewHtml] = React.useState('');
  const [previewError, setPreviewError] = React.useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = React.useState(false);

  const activeItem = React.useMemo(
    () => items.find((item) => item.reminderKey === activeKey) ?? items[0],
    [activeKey, items],
  );
  const activeConfig = activeItem ? configs[activeItem.reminderKey] : undefined;

  const filteredItems = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = needle
      ? items.filter((item) => {
          const haystack = [
            clientLabel(item),
            item.email ?? '',
            item.divisionName,
            item.headlineDocumentNumber,
            String(item.invoiceCount),
            String(item.outstandingBalance),
          ]
            .join(' ')
            .toLowerCase();
          return haystack.includes(needle);
        })
      : items;

    return [...filtered].sort((a, b) =>
      sortDirection === 'desc'
        ? b.outstandingBalance - a.outstandingBalance
        : a.outstandingBalance - b.outstandingBalance,
    );
  }, [items, query, sortDirection]);

  const selectedItems = React.useMemo(
    () => items.filter((item) => selected[item.reminderKey]),
    [items, selected],
  );

  async function loadPending() {
    setIsLoading(true);
    setPreviewHtml('');
    setPreviewError(null);
    try {
      const result = await getPendingRemindersAction();
      if (!result.success) {
        toast.error(result.error ?? 'Failed to load overdue reminders.');
        return;
      }

      let data = result.data;
      if (clientId) {
        data = data.filter((item) => item.clientId === clientId);
      }
      setItems(data);
      setActiveKey(data[0]?.reminderKey ?? null);
      setSelected(
        Object.fromEntries(result.data.map((item) => [item.reminderKey, Boolean(item.email)])),
      );
      setConfigs(
        Object.fromEntries(
          result.data.map((item) => [
            item.reminderKey,
            {
              recipientEmail: item.email ?? '',
              subject: defaultSubject(item),
              personalMessage: '',
            },
          ]),
        ),
      );
      setStatuses(Object.fromEntries(result.data.map((item) => [item.reminderKey, 'idle'])));
      setErrors({});

      if (result.data.length === 0) toast.info('No clients with overdue balances found.');
    } catch {
      toast.error('Failed to load overdue reminders.');
    } finally {
      setIsLoading(false);
    }
  }

  React.useEffect(() => {
    if (open) void loadPending();
  }, [open]);

  React.useEffect(() => {
    if (!activeItem || !activeConfig) {
      setPreviewHtml('');
      return;
    }

    const messageValidation = validatePersonalMessage(activeConfig.personalMessage);
    if (!messageValidation.valid) {
      setPreviewHtml('');
      setPreviewError(messageValidation.error ?? 'Personal message is invalid.');
      return;
    }

    let cancelled = false;
    const timeout = window.setTimeout(async () => {
      setIsPreviewLoading(true);
      setPreviewError(null);
      const result = await getReminderPreviewAction({
        clientId: activeItem.clientId,
        divisionId: activeItem.divisionId,
        recipientEmail: activeConfig.recipientEmail,
        subject: activeConfig.subject,
        personalMessage: activeConfig.personalMessage || undefined,
      });

      if (cancelled) return;
      if (result.success && result.html) {
        setPreviewHtml(result.html);
      } else {
        setPreviewHtml('');
        setPreviewError(result.error ?? 'Preview failed.');
      }
      setIsPreviewLoading(false);
    }, 400);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [activeItem, activeConfig]);

  function updateActiveConfig(patch: Partial<ReminderConfig>) {
    if (!activeItem) return;
    setConfigs((current) => ({
      ...current,
      [activeItem.reminderKey]: {
        ...current[activeItem.reminderKey],
        ...patch,
      },
    }));
  }

  function toggleAll(value: boolean) {
    setSelected((current) => ({
      ...current,
      ...Object.fromEntries(
        filteredItems.map((item) => [
          item.reminderKey,
          value && validateRecipientEmail(configs[item.reminderKey]?.recipientEmail ?? '').valid,
        ]),
      ),
    }));
  }

  async function sendOne(item: PendingReminderClient, batchId: string) {
    const config = configs[item.reminderKey];
    if (!config) return false;

    const emailValidation = validateRecipientEmail(config.recipientEmail);
    const messageValidation = validatePersonalMessage(config.personalMessage);
    if (!emailValidation.valid || !messageValidation.valid || !config.subject.trim()) {
      const error =
        emailValidation.error ??
        messageValidation.error ??
        'Subject is required before sending.';
      setStatuses((current) => ({ ...current, [item.reminderKey]: 'failed' }));
      setErrors((current) => ({ ...current, [item.reminderKey]: error }));
      return false;
    }

    setStatuses((current) => ({ ...current, [item.reminderKey]: 'sending' }));
    setErrors((current) => ({ ...current, [item.reminderKey]: '' }));

    const result = await sendCustomizedReminderAction({
      clientId: item.clientId,
      divisionId: item.divisionId,
      recipientEmail: config.recipientEmail,
      subject: config.subject,
      personalMessage: config.personalMessage || undefined,
      batchId,
    });

    if (result.success) {
      setStatuses((current) => ({ ...current, [item.reminderKey]: 'sent' }));
      return true;
    }

    setStatuses((current) => ({ ...current, [item.reminderKey]: 'failed' }));
    setErrors((current) => ({
      ...current,
      [item.reminderKey]: result.error ?? 'Failed to send reminder.',
    }));
    return false;
  }

  async function sendCurrent() {
    if (!activeItem || isSending) return;
    setIsSending(true);
    const ok = await sendOne(activeItem, crypto.randomUUID());
    setIsSending(false);
    if (ok) toast.success(`Reminder sent to ${clientLabel(activeItem)}.`);
    else toast.error(errors[activeItem.reminderKey] ?? 'Failed to send reminder.');
  }

  async function sendSelected() {
    if (selectedItems.length === 0 || isSending) return;

    setIsSending(true);
    const batchId = crypto.randomUUID();
    let cursor = 0;
    let sentCount = 0;

    async function worker() {
      while (cursor < selectedItems.length) {
        const item = selectedItems[cursor++];
        if (!item) continue;
        const ok = await sendOne(item, batchId);
        if (ok) sentCount++;
      }
    }

    await Promise.all(Array.from({ length: Math.min(3, selectedItems.length) }, () => worker()));
    setIsSending(false);

    const failedCount = selectedItems.length - sentCount;
    if (failedCount > 0) {
      toast.warning(`${sentCount} sent, ${failedCount} failed.`);
    } else {
      toast.success(`${sentCount} reminder${sentCount === 1 ? '' : 's'} sent.`);
    }
  }

  const activeEmailError = activeConfig
    ? validateRecipientEmail(activeConfig.recipientEmail).error
    : undefined;
  const activeMessageError = activeConfig
    ? validatePersonalMessage(activeConfig.personalMessage).error
    : undefined;
  const activeSubjectError =
    activeConfig && !activeConfig.subject.trim() ? 'Subject is required.' : undefined;
  const activeCanSend = Boolean(activeItem && activeConfig && !activeEmailError && !activeMessageError && !activeSubjectError);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm">
            <Mail data-icon="inline-start" />
            Send Reminders
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[94vh] w-[calc(100vw-2rem)] max-w-[1500px] overflow-hidden p-0">
        <DialogHeader className="border-b px-5 pt-5">
          <DialogTitle>Review & Send Overdue Reminders</DialogTitle>
          <DialogDescription>
            Review recipients, customize messages, and send only the reminders you choose.
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-[680px] grid-cols-1 overflow-hidden lg:grid-cols-[340px_1fr] xl:grid-cols-[340px_minmax(320px,380px)_minmax(600px,1fr)]">
          <div className="flex min-h-0 flex-col border-b lg:border-r lg:border-b-0">
            <div className="space-y-3 border-b p-4">
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search clients"
                  className="pl-8"
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={filteredItems.length > 0 && filteredItems.every((item) => selected[item.reminderKey])}
                    onCheckedChange={(value) => toggleAll(value === true)}
                    disabled={filteredItems.length === 0 || isSending}
                  />
                  Select visible
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSortDirection((current) => (current === 'desc' ? 'asc' : 'desc'))}
                >
                  Balance {sortDirection === 'desc' ? 'high' : 'low'}
                </Button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Loading overdue clients...
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="p-6 text-sm text-muted-foreground">No overdue reminder candidates found.</div>
              ) : (
                <div className="divide-y">
                  {filteredItems.map((item) => {
                    const config = configs[item.reminderKey];
                    const emailValid = validateRecipientEmail(config?.recipientEmail ?? '').valid;
                    const isActive = item.reminderKey === activeItem?.reminderKey;

                    return (
                      <div
                        key={item.reminderKey}
                        onClick={() => setActiveKey(item.reminderKey)}
                        className={`w-full px-4 py-3 text-left transition hover:bg-muted/60 ${
                          isActive ? 'bg-muted' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span onClick={(event) => event.stopPropagation()}>
                            <Checkbox
                              checked={Boolean(selected[item.reminderKey])}
                              disabled={!emailValid || isSending}
                              onCheckedChange={(value) =>
                                setSelected((current) => ({
                                  ...current,
                                  [item.reminderKey]: value === true,
                                }))
                              }
                            />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className="truncate text-sm font-medium">{clientLabel(item)}</p>
                              <StatusBadge status={statuses[item.reminderKey] ?? 'idle'} />
                            </div>
                            <p className="mt-0.5 truncate text-xs text-muted-foreground">{item.divisionName}</p>
                            <div className="mt-2 flex items-center justify-between gap-2 text-xs">
                              <span className="text-muted-foreground">
                                {item.invoiceCount} invoice{item.invoiceCount === 1 ? '' : 's'}
                              </span>
                              <span className="font-medium">{formatMoney(item.outstandingBalance)}</span>
                            </div>
                            {!emailValid && (
                              <p className="mt-2 text-xs text-destructive">Recipient email needed</p>
                            )}
                            {errors[item.reminderKey] && (
                              <p className="mt-2 line-clamp-2 text-xs text-destructive">
                                {errors[item.reminderKey]}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="min-h-0 overflow-y-auto border-b p-5 lg:border-b-0 xl:border-r">
            {!activeItem || !activeConfig ? (
              <div className="flex min-h-[420px] items-center justify-center text-sm text-muted-foreground">
                Select a client to review the reminder.
              </div>
            ) : (
              <div className="space-y-5">
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold">{clientLabel(activeItem)}</h3>
                        <p className="text-sm text-muted-foreground">{activeItem.divisionName}</p>
                      </div>
                      <Badge variant="outline">{formatMoney(activeItem.outstandingBalance)}</Badge>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="reminder-recipient">
                      Recipient Email
                    </label>
                    <Input
                      id="reminder-recipient"
                      value={activeConfig.recipientEmail}
                      onChange={(event) => updateActiveConfig({ recipientEmail: event.target.value })}
                      aria-invalid={Boolean(activeEmailError)}
                    />
                    {activeEmailError && <p className="text-xs text-destructive">{activeEmailError}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="reminder-subject">
                      Subject
                    </label>
                    <Input
                      id="reminder-subject"
                      value={activeConfig.subject}
                      onChange={(event) => updateActiveConfig({ subject: event.target.value })}
                      aria-invalid={Boolean(activeSubjectError)}
                    />
                    {activeSubjectError && <p className="text-xs text-destructive">{activeSubjectError}</p>}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <label className="text-sm font-medium" htmlFor="reminder-message">
                        Personal Message
                      </label>
                      <span className="text-xs text-muted-foreground">
                        {activeConfig.personalMessage.trim().length}/500
                      </span>
                    </div>
                    <Textarea
                      id="reminder-message"
                      value={activeConfig.personalMessage}
                      onChange={(event) => updateActiveConfig({ personalMessage: event.target.value })}
                      maxLength={500}
                      rows={5}
                      aria-invalid={Boolean(activeMessageError)}
                    />
                    {activeMessageError && <p className="text-xs text-destructive">{activeMessageError}</p>}
                  </div>

                  <div className="rounded-md border">
                    <div className="border-b px-3 py-2 text-sm font-medium">Outstanding Invoices</div>
                    <div className="divide-y">
                      {activeItem.invoices.map((invoice) => (
                        <div key={invoice.id} className="grid grid-cols-[1fr_auto] gap-3 px-3 py-2 text-sm">
                          <div className="min-w-0">
                            <p className="truncate font-medium">{invoice.documentNumber}</p>
                            <p className="text-xs text-muted-foreground">
                              Due {fmtDate(invoice.dueDate) === '-' ? 'N/A' : fmtDate(invoice.dueDate)} · Total {formatMoney(invoice.total)}
                            </p>
                          </div>
                          <div className="text-right font-medium">{formatMoney(invoice.outstanding)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
              </div>
            )}
          </div>

          <div className="min-h-0 bg-muted/20 p-5">
            <EmailPreviewPanel
              html={previewHtml}
              title="Reminder Preview"
              isLoading={isPreviewLoading}
              error={previewError}
            />
          </div>
        </div>

        <DialogFooter className="items-center justify-between border-t px-5 pb-5">
          <div className="mr-auto flex items-center gap-3 text-sm text-muted-foreground">
            <span>
              {selectedItems.length} selected of {items.length}
            </span>
            <Button type="button" variant="ghost" size="sm" onClick={loadPending} disabled={isLoading || isSending}>
              <RefreshCw data-icon="inline-start" />
              Refresh
            </Button>
          </div>
          <Button type="button" variant="outline" onClick={sendCurrent} disabled={!activeCanSend || isSending}>
            {isSending ? <Loader2 data-icon="inline-start" className="animate-spin" /> : <Send data-icon="inline-start" />}
            Send Current
          </Button>
          <Button type="button" onClick={sendSelected} disabled={selectedItems.length === 0 || isSending}>
            {isSending ? <Loader2 data-icon="inline-start" className="animate-spin" /> : <Mail data-icon="inline-start" />}
            Send Selected
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
