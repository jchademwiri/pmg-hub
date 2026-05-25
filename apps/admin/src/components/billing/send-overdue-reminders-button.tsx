'use client';

import * as React from 'react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Mail, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { sendOverdueRemindersAction } from '@/app/actions/send-overdue-reminders';

export function SendOverdueRemindersButton() {
  const [isSending, setIsSending] = useState(false);

  async function handleConfirm() {
    setIsSending(true);
    try {
      const result = await sendOverdueRemindersAction();

      if (!result.success) {
        toast.error(result.error ?? 'Failed to send reminders.');
        return;
      }

      if (result.sent === 0 && result.skipped === 0 && result.errors.length === 0) {
        toast.info('No clients with overdue balances found.');
        return;
      }

      const parts: string[] = [];
      if (result.sent > 0) parts.push(`${result.sent} reminder${result.sent !== 1 ? 's' : ''} sent`);
      if (result.skipped > 0) parts.push(`${result.skipped} skipped (no email)`);
      if (result.errors.length > 0) parts.push(`${result.errors.length} failed`);

      if (result.errors.length > 0) {
        toast.warning(parts.join(' · '), {
          description: result.errors.slice(0, 3).join('\n'),
        });
      } else {
        toast.success(parts.join(' · '));
      }
    } catch {
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setIsSending(false);
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={isSending}>
          {isSending ? (
            <>
              <Loader2 data-icon="inline-start" className="animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Mail data-icon="inline-start" />
              Send Reminders
            </>
          )}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Send Overdue Payment Reminders</AlertDialogTitle>
          <AlertDialogDescription>
            This will send an overdue payment reminder email to every client with an
            outstanding balance. Clients without an email address will be skipped.
            <br />
            <br />
            This action cannot be undone. Are you sure you want to proceed?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={isSending}>
            {isSending ? 'Sending...' : 'Send Reminders'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
