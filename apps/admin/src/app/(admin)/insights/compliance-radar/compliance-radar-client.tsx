'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MessageCircle, Pencil, Search, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { updateComplianceRecord, deleteComplianceRecord } from '@/app/actions/compliance';
import { fmtDateLong } from '@/lib/format';
import { normalizeSAPhoneNumber } from '@/lib/billing/whatsapp';
import type { StatutoryDeadline } from '@/lib/compliance/statutory-calendar';

const COMPLIANCE_DOCUMENT_TYPES = [
  'SARS Tax Clearance PIN',
  'B-BBEE Affidavit / Certificate',
  'CIPC Annual Returns',
  'COIDA / Letter of Good Standing',
  'CIDB Registration (Annual & 3-Year Renewals)',
  'CUSTOM',
] as const;

export interface ComplianceRadarRow {
  id: string;
  clientId: string;
  clientName: string;
  clientPhone: string | null;
  documentType: string;
  customName: string | null;
  expiryDate: string;
  daysLeft: number;
}

interface ComplianceRadarClientProps {
  records: ComplianceRadarRow[];
  statutoryDeadlines: StatutoryDeadline[];
}

type BucketFilter = 'all' | 'expired' | 'critical' | 'upcoming';

function buildComplianceWhatsAppUrl(row: ComplianceRadarRow): string | null {
  const digits = normalizeSAPhoneNumber(row.clientPhone);
  if (!digits) return null;
  const docName =
    row.documentType === 'CUSTOM' ? row.customName || 'Compliance Document' : row.documentType;
  const statusLine =
    row.daysLeft < 0
      ? `expired on ${fmtDateLong(row.expiryDate)}`
      : `is expiring on ${fmtDateLong(row.expiryDate)} (${row.daysLeft} day${row.daysLeft === 1 ? '' : 's'} remaining)`;

  const msg = [
    `Hi ${row.clientName},`,
    '',
    `Friendly compliance reminder: your *${docName}* ${statusLine}.`,
    '',
    'Please share the renewed copy once available so we can keep your tender profile up to date. Thank you!',
  ].join('\n');

  return `https://wa.me/${digits}?text=${encodeURIComponent(msg)}`;
}

export function ComplianceRadarClient({ records, statutoryDeadlines }: ComplianceRadarClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [scope, setScope] = useState<'watchlist' | 'all'>('watchlist');
  const [bucketFilter, setBucketFilter] = useState<BucketFilter>('all');
  const [search, setSearch] = useState('');

  // Edit dialog state
  const [editTarget, setEditTarget] = useState<ComplianceRadarRow | null>(null);
  const [editDocType, setEditDocType] = useState('');
  const [editCustomName, setEditCustomName] = useState('');
  const [editExpiryDate, setEditExpiryDate] = useState('');

  // Delete confirm state
  const [deleteTarget, setDeleteTarget] = useState<ComplianceRadarRow | null>(null);

  const counts = useMemo(() => {
    let expired = 0;
    let critical = 0;
    let upcoming = 0;
    for (const r of records) {
      if (r.daysLeft < 0) expired += 1;
      else if (r.daysLeft <= 14) critical += 1;
      else if (r.daysLeft <= 60) upcoming += 1;
    }
    return { expired, critical, upcoming, watchlist: expired + critical + upcoming };
  }, [records]);

  const filteredRecords = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter((r) => {
      if (bucketFilter === 'expired' && r.daysLeft >= 0) return false;
      if (bucketFilter === 'critical' && (r.daysLeft < 0 || r.daysLeft > 14)) return false;
      if (bucketFilter === 'upcoming' && (r.daysLeft <= 14 || r.daysLeft > 60)) return false;
      if (bucketFilter === 'all' && scope === 'watchlist' && r.daysLeft > 60) return false;

      if (!q) return true;
      const docName = (r.documentType === 'CUSTOM' ? r.customName : r.documentType) ?? '';
      return r.clientName.toLowerCase().includes(q) || docName.toLowerCase().includes(q);
    });
  }, [records, scope, bucketFilter, search]);

  function toggleBucket(next: BucketFilter) {
    setBucketFilter((prev) => (prev === next ? 'all' : next));
  }

  function openEdit(row: ComplianceRadarRow) {
    setEditTarget(row);
    setEditDocType(row.documentType);
    setEditCustomName(row.customName ?? '');
    setEditExpiryDate(row.expiryDate);
  }

  function handleSaveEdit() {
    if (!editTarget) return;
    if (!editDocType || !editExpiryDate) {
      toast.error('Please select a document type and expiry date.');
      return;
    }
    if (editDocType === 'CUSTOM' && !editCustomName.trim()) {
      toast.error('Please enter a custom document name.');
      return;
    }

    startTransition(async () => {
      const fd = new FormData();
      fd.set('clientId', editTarget.clientId);
      fd.set('documentType', editDocType);
      if (editDocType === 'CUSTOM') fd.set('customName', editCustomName.trim());
      fd.set('expiryDate', editExpiryDate);

      const res = await updateComplianceRecord(editTarget.id, fd);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success('Compliance record updated.');
        setEditTarget(null);
        router.refresh();
      }
    });
  }

  function handleConfirmDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);

    startTransition(async () => {
      const res = await deleteComplianceRecord(target.id, target.clientId);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success('Compliance record deleted.');
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Clickable KPI Filter Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card
          role="button"
          tabIndex={0}
          onClick={() => toggleBucket('expired')}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && toggleBucket('expired')}
          className={`cursor-pointer transition-all hover:shadow-md ${
            bucketFilter === 'expired' ? 'ring-2 ring-destructive border-destructive/50' : ''
          }`}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Expired Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{counts.expired}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {bucketFilter === 'expired'
                ? 'Showing expired only (click to clear)'
                : 'Requires immediate attention'}
            </p>
          </CardContent>
        </Card>

        <Card
          role="button"
          tabIndex={0}
          onClick={() => toggleBucket('critical')}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && toggleBucket('critical')}
          className={`cursor-pointer transition-all hover:shadow-md ${
            bucketFilter === 'critical' ? 'ring-2 ring-orange-500 border-orange-500/50' : ''
          }`}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Critical (≤ 14 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{counts.critical}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {bucketFilter === 'critical'
                ? 'Showing critical only (click to clear)'
                : 'Expiring within 2 weeks'}
            </p>
          </CardContent>
        </Card>

        <Card
          role="button"
          tabIndex={0}
          onClick={() => toggleBucket('upcoming')}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && toggleBucket('upcoming')}
          className={`cursor-pointer transition-all hover:shadow-md ${
            bucketFilter === 'upcoming' ? 'ring-2 ring-primary border-primary/50' : ''
          }`}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Upcoming (15–60 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts.upcoming}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {bucketFilter === 'upcoming'
                ? 'Showing upcoming only (click to clear)'
                : 'On the radar for renewal'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Expiration Watchlist / All Tracked Card */}
      <Card className="border bg-card shadow-sm rounded-xl overflow-hidden">
        <CardHeader className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle>Expiration Watchlist</CardTitle>
              <CardDescription>
                {scope === 'watchlist' && bucketFilter === 'all'
                  ? 'Client documents expiring within the next 60 days or already expired.'
                  : 'Showing tracked compliance documents across all clients.'}
              </CardDescription>
            </div>

            <div className="flex items-center rounded-md border p-0.5 bg-muted/40 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => {
                  setScope('watchlist');
                  setBucketFilter('all');
                }}
                className={`px-2.5 py-1 text-xs rounded-sm transition-colors ${
                  scope === 'watchlist' && bucketFilter === 'all'
                    ? 'bg-background text-foreground shadow-xs font-medium'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Watchlist ≤ 60d ({counts.watchlist})
              </button>
              <button
                type="button"
                onClick={() => {
                  setScope('all');
                  setBucketFilter('all');
                }}
                className={`px-2.5 py-1 text-xs rounded-sm transition-colors ${
                  scope === 'all' && bucketFilter === 'all'
                    ? 'bg-background text-foreground shadow-xs font-medium'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                All Tracked ({records.length})
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[220px] max-w-md">
              <Search className="h-4 w-4 text-muted-foreground absolute left-2.5 top-2.5" />
              <Input
                placeholder="Search by client or document type..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
            {bucketFilter !== 'all' && (
              <Button
                variant="outline"
                size="sm"
                className="h-9 text-xs"
                onClick={() => setBucketFilter('all')}
              >
                Clear {bucketFilter} filter <X className="h-3.5 w-3.5 ml-1" />
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-semibold text-foreground py-3.5">Client</TableHead>
                <TableHead className="font-semibold text-foreground py-3.5">Document</TableHead>
                <TableHead className="font-semibold text-foreground py-3.5">Expiry Date</TableHead>
                <TableHead className="font-semibold text-foreground py-3.5">Status</TableHead>
                <TableHead className="font-semibold text-foreground py-3.5 text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground h-32">
                    {scope === 'watchlist' && records.length > 0
                      ? 'No documents expiring within 60 days. Switch to "All Tracked" to view future-dated records.'
                      : 'No compliance documents match your filters.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredRecords.map((row) => {
                  const docName =
                    row.documentType === 'CUSTOM'
                      ? row.customName || 'Custom Document'
                      : row.documentType;
                  const waUrl = buildComplianceWhatsAppUrl(row);

                  let badgeVariant: 'default' | 'destructive' | 'secondary' | 'outline' = 'outline';
                  let statusText = `Valid (${row.daysLeft}d)`;
                  if (row.daysLeft < 0) {
                    badgeVariant = 'destructive';
                    statusText = `Expired (${Math.abs(row.daysLeft)}d ago)`;
                  } else if (row.daysLeft <= 14) {
                    badgeVariant = 'destructive';
                    statusText = `Expiring (${row.daysLeft}d)`;
                  } else if (row.daysLeft <= 60) {
                    badgeVariant = 'secondary';
                    statusText = `Expiring (${row.daysLeft}d)`;
                  }

                  return (
                    <TableRow key={row.id}>
                      <TableCell className="font-semibold py-3.5">
                        <Link
                          href={`/relationships/clients/${row.clientId}`}
                          className="text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {row.clientName}
                        </Link>
                      </TableCell>
                      <TableCell className="py-3.5">{docName}</TableCell>
                      <TableCell className="py-3.5 whitespace-nowrap">
                        {fmtDateLong(row.expiryDate)}
                      </TableCell>
                      <TableCell className="py-3.5 whitespace-nowrap">
                        <Badge variant={badgeVariant}>{statusText}</Badge>
                      </TableCell>
                      <TableCell className="py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {waUrl && (
                            <Button
                              asChild
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="Send WhatsApp Compliance Reminder"
                            >
                              <a href={waUrl} target="_blank" rel="noopener noreferrer">
                                <MessageCircle className="h-4 w-4 text-emerald-600" />
                              </a>
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Edit / Renew Expiry Date"
                            onClick={() => openEdit(row)}
                            disabled={isPending}
                          >
                            <Pencil className="h-4 w-4 text-muted-foreground" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Delete Record"
                            onClick={() => setDeleteTarget(row)}
                            disabled={isPending}
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Statutory SARS & CIPC Deadlines Card */}
      <Card className="border bg-card shadow-sm rounded-xl overflow-hidden">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle>Statutory SARS &amp; CIPC Deadlines</CardTitle>
            <CardDescription>
              Playhouse Media Group (Pty) Ltd annual filing &amp; provisional tax calendar (Feb
              FY-end).
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild className="shrink-0">
            <Link href="/finance/projections?tab=tax">Open SBC Tax &amp; 1030 Reserve</Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-semibold text-foreground py-3">Obligation</TableHead>
                <TableHead className="font-semibold text-foreground py-3">Authority</TableHead>
                <TableHead className="font-semibold text-foreground py-3">Due Date</TableHead>
                <TableHead className="font-semibold text-foreground py-3">Countdown</TableHead>
                <TableHead className="font-semibold text-foreground py-3 text-right">
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {statutoryDeadlines.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="py-3">
                    <div className="font-medium text-sm">{d.title}</div>
                    <div className="text-xs text-muted-foreground">{d.description}</div>
                  </TableCell>
                  <TableCell className="py-3">
                    <Badge variant="outline" className="font-mono text-xs">
                      {d.authority}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-3 text-sm whitespace-nowrap">
                    {fmtDateLong(d.dueDate)}
                  </TableCell>
                  <TableCell className="py-3 whitespace-nowrap">
                    <Badge
                      variant={
                        d.severity === 'overdue' || d.severity === 'critical'
                          ? 'destructive'
                          : d.severity === 'upcoming'
                            ? 'secondary'
                            : 'outline'
                      }
                    >
                      {d.daysLeft < 0
                        ? `Overdue (${Math.abs(d.daysLeft)}d)`
                        : `${d.daysLeft} days left`}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-3 text-right whitespace-nowrap">
                    <Button variant="ghost" size="sm" asChild className="text-xs">
                      <Link href={d.actionHref}>{d.actionLabel}</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit / Renew Compliance Record Dialog */}
      <Dialog open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit / Renew Compliance Record</DialogTitle>
            <DialogDescription>
              {editTarget ? `Updating record for ${editTarget.clientName}.` : ''}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Document Type</Label>
              <Select value={editDocType} onValueChange={setEditDocType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select document type" />
                </SelectTrigger>
                <SelectContent>
                  {COMPLIANCE_DOCUMENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {editDocType === 'CUSTOM' && (
              <div className="space-y-1.5">
                <Label>Custom Document Name</Label>
                <Input
                  value={editCustomName}
                  onChange={(e) => setEditCustomName(e.target.value)}
                  placeholder="e.g. PSIRA Certificate"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Expiry Date</Label>
              <Input
                type="date"
                value={editExpiryDate}
                onChange={(e) => setEditExpiryDate(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={isPending}>
              {isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Compliance Record?"
        description={
          deleteTarget
            ? `Remove ${deleteTarget.documentType === 'CUSTOM' ? deleteTarget.customName || 'this document' : deleteTarget.documentType} for ${deleteTarget.clientName}?`
            : ''
        }
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
