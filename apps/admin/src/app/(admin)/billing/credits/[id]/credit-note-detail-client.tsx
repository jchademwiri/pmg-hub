'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatZAR, fmtDate } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Wallet, AlertCircle, Clock, CheckCircle2, FileText, Pencil, Trash2, Ban, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface CreditNoteDetail {
  id: string;
  documentNumber: string;
  status: string;
  type: string;
  reason: string | null;
  amount: number;
  amountRemaining: number;
  createdAt: string;
  expiresAt: string | null;
  voidedAt: string | null;
}

interface CreditAppDetail {
  id: string;
  amount: number;
  appliedAt: string;
  invoiceId: string;
  invoiceNumber: string;
  invoiceStatus: string;
}

interface RefundDetail {
  id: string;
  amount: number;
  refundDate: string;
  refundMethod: string;
  reference: string | null;
  description: string | null;
  createdAt: string;
}

interface Props {
  note: CreditNoteDetail;
  client: { id: string; name: string } | null;
  division: { id: string; name: string } | null;
  creator: { name: string | null; email: string | null } | null;
  originalInvoice: { documentNumber: string } | null;
  applications: CreditAppDetail[];
  refunds: RefundDetail[];
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'active':
      return <Badge variant="default" className="bg-emerald-500/10 text-emerald-700 border-emerald-200 gap-1"><CheckCircle2 className="size-3" />Active</Badge>;
    case 'partially_applied':
      return <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200 gap-1"><Clock className="size-3" />Partial</Badge>;
    case 'fully_applied':
      return <Badge variant="outline" className="text-zinc-500 gap-1">Used</Badge>;
    case 'expired':
      return <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-200 gap-1"><AlertCircle className="size-3" />Expired</Badge>;
    case 'void':
      return <Badge variant="destructive" className="gap-1"><Ban className="size-3" />Void</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function getTypeLabel(type: string) {
  switch (type) {
    case 'overpayment': return 'Overpayment';
    case 'manual_adjustment': return 'Manual Adjustment';
    case 'credit_note': return 'Credit Note';
    case 'promotional': return 'Promotional';
    case 'refund_reversal': return 'Refund Reversal';
    default: return type;
  }
}

export function CreditNoteDetailClient({
  note,
  client,
  division,
  creator,
  originalInvoice,
  applications,
  refunds,
}: Props) {
  const router = useRouter();
  const [isVoiding, setIsVoiding] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editReason, setEditReason] = useState(note.reason ?? '');
  const [editExpiresAt, setEditExpiresAt] = useState(
    note.expiresAt ? note.expiresAt.split('T')[0] : ''
  );
  const [isSaving, setIsSaving] = useState(false);

  const canVoid = note.status !== 'void' && note.status !== 'fully_applied' && applications.length === 0;
  const canEdit = note.status !== 'void';
  const usedAmount = note.amount - note.amountRemaining;
  const totalRefunded = refunds.reduce((sum, r) => sum + r.amount, 0);

  async function handleVoid() {
    setIsVoiding(true);
    try {
      const { voidCreditNote } = await import('@/app/actions/credit-management');
      const res = await voidCreditNote(note.id);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(`Credit note ${note.documentNumber} voided`);
        router.refresh();
      }
    } catch {
      toast.error('Failed to void credit note');
    } finally {
      setIsVoiding(false);
    }
  }

  async function handleSaveEdit() {
    setIsSaving(true);
    try {
      const { updateCreditNote } = await import('@/app/actions/credit-management');
      const res = await updateCreditNote({
        creditNoteId: note.id,
        reason: editReason || null,
        expiresAt: editExpiresAt || null,
      });
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success('Credit note updated');
        setShowEditDialog(false);
        router.refresh();
      }
    } catch {
      toast.error('Failed to update credit note');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Back link */}
      <Link
        href="/billing/credits"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
      >
        <ArrowLeft className="size-4" />
        Back to Credits
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Wallet className="size-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold">{note.documentNumber}</h1>
              {getStatusBadge(note.status)}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {getTypeLabel(note.type)} · Created {fmtDate(note.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowEditDialog(true)}>
              <Pencil className="size-4" />
              Edit
            </Button>
          )}
          {canVoid && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="gap-1.5">
                  <Trash2 className="size-4" />
                  Void
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Void Credit Note</AlertDialogTitle>
                  <AlertDialogDescription>
                    Voiding <strong>{note.documentNumber}</strong> will mark it as void.
                    This cannot be undone. The credit amount will no longer be available for use.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleVoid} disabled={isVoiding}>
                    {isVoiding ? 'Voiding...' : 'Confirm Void'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold tabular-nums">{formatZAR(note.amount)}</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Remaining</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold text-emerald-600 tabular-nums">{formatZAR(note.amountRemaining)}</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Applied</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold text-blue-600 tabular-nums">{formatZAR(usedAmount)}</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Refunded</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold text-amber-600 tabular-nums">{formatZAR(totalRefunded)}</span>
          </CardContent>
        </Card>
      </div>

      {/* Details & Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Details */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Client</Label>
              <p className="text-sm font-medium mt-0.5">
                {client ? (
                  <Link href={`/relationships/clients/${client.id}`} className="text-primary hover:underline inline-flex items-center gap-1">
                    {client.name}
                    <ExternalLink className="size-3" />
                  </Link>
                ) : 'Unknown'}
              </p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Division</Label>
              <p className="text-sm font-medium mt-0.5">{division?.name ?? 'Unknown'}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Type</Label>
              <p className="text-sm font-medium mt-0.5">{getTypeLabel(note.type)}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Reason</Label>
              <p className="text-sm mt-0.5">{note.reason ?? '—'}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Expires</Label>
              <p className="text-sm mt-0.5">{note.expiresAt ? fmtDate(note.expiresAt) : 'No expiry'}</p>
            </div>
            {originalInvoice && (
              <div>
                <Label className="text-xs text-muted-foreground">Original Invoice</Label>
                <p className="text-sm font-medium mt-0.5">{originalInvoice.documentNumber}</p>
              </div>
            )}
            <div>
              <Label className="text-xs text-muted-foreground">Created By</Label>
              <p className="text-sm mt-0.5">{creator?.name ?? creator?.email ?? 'Unknown'}</p>
            </div>
            {note.voidedAt && (
              <div>
                <Label className="text-xs text-muted-foreground">Voided At</Label>
                <p className="text-sm mt-0.5">{fmtDate(note.voidedAt)}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Applications Timeline */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">Application History</CardTitle>
            <CardDescription>Invoices this credit has been applied to</CardDescription>
          </CardHeader>
          <CardContent>
            {applications.length === 0 && refunds.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                This credit note has not been applied or refunded yet.
              </p>
            ) : (
              <div className="space-y-0">
                {/* Applications */}
                {applications.map((app, i) => (
                  <div key={app.id} className="flex items-start gap-3 pb-4 border-l-2 border-blue-200 ml-3 pl-4 last:border-l-0 last:pb-0">
                    <div className="size-2 rounded-full bg-blue-500 mt-1.5 -ml-[21px] ring-2 ring-background shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <Link
                          href={`/billing/invoices/${app.invoiceId}`}
                          className="text-sm font-medium text-primary hover:underline inline-flex items-center gap-1"
                        >
                          <FileText className="size-3.5" />
                          {app.invoiceNumber}
                          <ExternalLink className="size-3" />
                        </Link>
                        <span className="text-sm font-semibold text-blue-600">-{formatZAR(app.amount)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Applied {fmtDate(app.appliedAt)} · Status: {app.invoiceStatus}
                      </p>
                    </div>
                  </div>
                ))}
                {/* Refunds */}
                {refunds.map((refund) => (
                  <div key={refund.id} className="flex items-start gap-3 pt-4 border-l-2 border-amber-200 ml-3 pl-4">
                    <div className="size-2 rounded-full bg-amber-500 mt-1.5 -ml-[21px] ring-2 ring-background shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Refund ({refund.refundMethod})</span>
                        <span className="text-sm font-semibold text-amber-600">-{formatZAR(refund.amount)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {fmtDate(refund.createdAt)} · {refund.reference ? `Ref: ${refund.reference}` : ''}
                        {refund.description ? ` · ${refund.description}` : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Credit Note</DialogTitle>
            <DialogDescription>
              Update the reason and/or expiry date for {note.documentNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Reason</Label>
              <Textarea
                id="reason"
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                placeholder="Reason for credit note"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiresAt">Expiry Date</Label>
              <Input
                id="expiresAt"
                type="date"
                value={editExpiresAt}
                onChange={(e) => setEditExpiresAt(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Leave empty for no expiry</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
