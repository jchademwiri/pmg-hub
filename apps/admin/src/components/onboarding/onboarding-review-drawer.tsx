'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Building,
  User,
  Mail,
  Phone,
  Calendar,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  MessageSquare,
  Sparkles,
  Archive,
  Trash2,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import type { OnboardingRow } from '@pmg/db';
import { fmtDate } from '@/lib/format';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  convertOnboardingToClient,
  updateOnboardingStatus,
  deleteOnboarding,
} from '@/actions/crm/onboarding';

interface OnboardingReviewDrawerProps {
  entry: OnboardingRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OnboardingReviewDrawer({ entry, open, onOpenChange }: OnboardingReviewDrawerProps) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [sendPortalInvite, setSendPortalInvite] = React.useState(true);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = React.useState(false);

  if (!entry) return null;

  const isConverted = entry.status === 'converted';
  const digits = entry.phone.replace(/[^0-9]/g, '');
  const cleanPhone =
    digits.startsWith('0') && digits.length === 10 ? `27${digits.slice(1)}` : digits;
  const whatsAppUrl = `https://wa.me/${cleanPhone}`;

  function handleConvert() {
    if (!entry) return;
    startTransition(async () => {
      const res = await convertOnboardingToClient(entry.id, {
        sendPortalInvite,
      });
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(`Client profile "${entry.companyName}" created successfully!`);
        onOpenChange(false);
        router.refresh();
      }
    });
  }

  function handleStatusUpdate(status: 'pending' | 'converted' | 'rejected' | 'archived') {
    if (!entry) return;
    startTransition(async () => {
      const res = await updateOnboardingStatus(entry.id, status);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(`Status updated to ${status}`);
        onOpenChange(false);
        router.refresh();
      }
    });
  }

  function handleDelete() {
    if (!entry) return;
    startTransition(async () => {
      const res = await deleteOnboarding(entry.id);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success('Onboarding submission deleted.');
        setConfirmDeleteOpen(false);
        onOpenChange(false);
        router.refresh();
      }
    });
  }

  return (
    <>
      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        onConfirm={handleDelete}
        title="Delete Onboarding Submission?"
        description="This action will remove the submission permanently."
        confirmText="Delete"
        variant="destructive"
      />

      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-xl flex flex-col justify-between p-0 overflow-y-auto">
          <div>
            <SheetHeader className="px-6 pt-6 pb-5 sm:px-8 border-b pr-14 space-y-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <Badge
                  variant={
                    entry.status === 'converted'
                      ? 'default'
                      : entry.status === 'pending'
                        ? 'secondary'
                        : 'outline'
                  }
                  className="capitalize font-semibold text-xs shadow-none"
                >
                  {entry.status}
                </Badge>
                <span className="text-xs text-muted-foreground font-medium">
                  Submitted {fmtDate(entry.createdAt)}
                </span>
              </div>
              <SheetTitle className="text-xl font-bold mt-1 text-foreground">
                {entry.companyName}
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground">
                {entry.divisionName || 'Playhouse Media Group'} • Review business details
              </SheetDescription>
            </SheetHeader>

            {/* Quick Contact Bar */}
            <div className="px-6 py-4 sm:px-8 border-b bg-muted/20 flex items-center gap-2.5">
              <a
                href={whatsAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-lg bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 border border-[#25D366]/30 text-xs font-semibold transition-colors"
              >
                <MessageSquare className="size-3.5" />
                <span>WhatsApp</span>
              </a>
              <a
                href={`tel:${entry.phone}`}
                className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-lg border text-xs font-semibold hover:bg-muted transition-colors"
              >
                <Phone className="size-3.5" />
                <span>Call</span>
              </a>
              <a
                href={`mailto:${entry.email}`}
                className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-lg border text-xs font-semibold hover:bg-muted transition-colors"
              >
                <Mail className="size-3.5" />
                <span>Email</span>
              </a>
            </div>

            {/* Profile Information */}
            <div className="px-6 py-6 sm:px-8 space-y-5">
              <div>
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Contact Person
                </Label>
                <p className="text-sm font-semibold text-foreground mt-1 flex items-center gap-2">
                  <User className="size-4 text-muted-foreground shrink-0" />
                  <span>{entry.contactName}</span>
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Email Address
                  </Label>
                  <p className="text-xs font-medium text-foreground mt-1 break-all flex items-center gap-1.5">
                    <Mail className="size-3.5 text-muted-foreground shrink-0" />
                    <span>{entry.email}</span>
                  </p>
                </div>
                <div>
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Phone Number
                  </Label>
                  <p className="text-xs font-mono font-medium text-foreground mt-1 flex items-center gap-1.5">
                    <Phone className="size-3.5 text-muted-foreground shrink-0" />
                    <span>{entry.phone}</span>
                  </p>
                </div>
              </div>

              {entry.registrationNumber && (
                <div>
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    CIPC Registration No.
                  </Label>
                  <p className="text-xs font-mono font-medium text-foreground mt-1 flex items-center gap-1.5">
                    <Building className="size-3.5 text-muted-foreground shrink-0" />
                    <span>{entry.registrationNumber}</span>
                  </p>
                </div>
              )}

              {entry.notes && (
                <div className="rounded-xl bg-muted/40 border p-4">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Client Notes
                  </Label>
                  <p className="text-xs text-foreground mt-1.5 whitespace-pre-wrap italic">
                    "{entry.notes}"
                  </p>
                </div>
              )}

              {isConverted && entry.convertedClientId && (
                <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4 flex items-start gap-3 text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-bold text-xs">Active Client Profile Linked</p>
                    <p className="text-[11px] opacity-90 mt-0.5">
                      This submission was converted into an active client record.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Footer */}
          <div className="px-6 py-6 sm:px-8 border-t bg-muted/10 space-y-4">
            {!isConverted ? (
              <>
                <div className="flex items-center space-x-2.5">
                  <Checkbox
                    id="send-invite"
                    checked={sendPortalInvite}
                    onCheckedChange={(checked) => setSendPortalInvite(Boolean(checked))}
                    disabled={isPending}
                  />
                  <Label
                    htmlFor="send-invite"
                    className="text-xs font-medium cursor-pointer text-muted-foreground"
                  >
                    Send Client Portal invitation upon saving
                  </Label>
                </div>

                <Button
                  type="button"
                  onClick={handleConvert}
                  disabled={isPending}
                  className="w-full h-11 gap-2 font-bold shadow-md text-xs cursor-pointer rounded-xl"
                >
                  {isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Sparkles className="size-4 text-amber-300" />
                  )}
                  <span>{isPending ? 'Saving Client Profile...' : '⚡ Save as New Client'}</span>
                </Button>

                <div className="flex items-center justify-between pt-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleStatusUpdate('archived')}
                    disabled={isPending}
                    className="text-xs text-muted-foreground hover:text-foreground h-8 px-2.5 gap-1.5"
                  >
                    <Archive className="size-3.5" />
                    <span>Archive</span>
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmDeleteOpen(true)}
                    disabled={isPending}
                    className="text-xs text-red-500 hover:text-red-600 hover:bg-red-500/10 h-8 px-2.5 gap-1.5"
                  >
                    <Trash2 className="size-3.5" />
                    <span>Delete</span>
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-between">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/relationships/clients`)}
                  className="text-xs font-semibold gap-1.5 rounded-xl h-9 px-3.5"
                >
                  <span>View in Clients List</span>
                  <ExternalLink className="size-3.5" />
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmDeleteOpen(true)}
                  disabled={isPending}
                  className="text-xs text-red-500 hover:text-red-600 h-9 px-3 gap-1.5"
                >
                  <Trash2 className="size-3.5" />
                  <span>Delete</span>
                </Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
