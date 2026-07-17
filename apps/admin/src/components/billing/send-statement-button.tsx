'use client';

import * as React from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Mail, Loader2 } from 'lucide-react';
import { getDocumentEmailPreviewAction, sendDocumentEmailAction } from '@/app/actions/email-delivery';
import { EmailPreviewPanel } from '@/components/billing/email-preview-panel';
import { serverPdfUrlToBase64 } from '@/lib/pdf-export';

interface SendStatementButtonProps {
  clientId: string;
  clientName: string;
  defaultRecipientEmail: string;
  statementPdfUrl: string;
  statementDate: string;
  period: string;
  totalAmountDue: string;
}

export function SendStatementButton({
  clientId,
  clientName,
  defaultRecipientEmail,
  statementPdfUrl,
  statementDate,
  period,
  totalAmountDue,
}: SendStatementButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [recipient, setRecipient] = useState(defaultRecipientEmail || '');
  const [subject, setSubject] = useState(`Account Statement - ${clientName}`);
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  React.useEffect(() => {
    if (!open) return;

    let cancelled = false;
    const timeout = window.setTimeout(async () => {
      setIsPreviewLoading(true);
      setPreviewError(null);

      const result = await getDocumentEmailPreviewAction({
        documentId: clientId,
        documentType: 'statement',
        personalMessage: message || undefined,
        statementData: {
          statementDate,
          period,
          totalAmountDue,
        }
      });

      if (cancelled) return;

      if (result.success && result.html) {
        setPreviewHtml(result.html);
      } else {
        setPreviewHtml('');
        setPreviewError(result.error ?? 'Preview failed.');
      }

      setIsPreviewLoading(false);
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [open, clientId, message, statementDate, period, totalAmountDue]);

  async function handleSend() {
    if (!recipient) {
      toast.error('Recipient email is required.');
      return;
    }
    
    setIsSending(true);
    try {
      setStatusText('Compiling statement PDF...');
      const statementBase64 = await serverPdfUrlToBase64(statementPdfUrl, 'Statement PDF');

      setStatusText('Transmitting statement via Resend...');
      const result = await sendDocumentEmailAction({
        documentId: clientId,
        documentType: 'statement',
        recipientEmail: recipient,
        subject,
        personalMessage: message || undefined,
        base64Pdf: statementBase64, // We pass statement PDF as base64Pdf to satisfy the schema requirement (it represents the primary document)
        statementData: {
          statementDate,
          period,
          totalAmountDue,
        }
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Statement emailed successfully!');
        setOpen(false);
        router.refresh();
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate or deliver email. Please try again.');
    } finally {
      setIsSending(false);
      setStatusText('');
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Mail data-icon="inline-start" />
          Send Statement
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[94vh] w-[calc(100vw-2rem)] max-w-[1180px] flex flex-col overflow-hidden p-0">
        <DialogHeader className="border-b px-5 py-4 shrink-0">
          <DialogTitle>Email Account Statement</DialogTitle>
          <DialogDescription>
            Send the current account statement directly to {clientName} as a high-fidelity PDF attachment.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="grid grid-cols-1 lg:min-h-[680px] lg:grid-cols-[minmax(340px,420px)_1fr]">
            <div className="p-5 lg:border-r">
              <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email-recipient">Recipient Email Address</FieldLabel>
                <Input
                  id="email-recipient"
                  type="email"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="client@company.com"
                  disabled={isSending}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="email-subject">Email Subject</FieldLabel>
                <Input
                  id="email-subject"
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Statement Subject"
                  disabled={isSending}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="email-message">Personalized Message (Optional)</FieldLabel>
                <Textarea
                  id="email-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Hi there, please find your latest account statement attached. Let us know if you have any questions!"
                  rows={5}
                  disabled={isSending}
                  className="resize-none"
                />
              </Field>
            </FieldGroup>
          </div>

            <div className="hidden lg:block lg:min-h-0 bg-muted/20 p-5">
              <EmailPreviewPanel
                html={previewHtml}
                title="Statement Email Preview"
                isLoading={isPreviewLoading}
                error={previewError}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="border-t px-5 py-4 shrink-0">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isSending}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={isSending}>
            {isSending ? (
              <>
                <Loader2 data-icon="inline-start" className="animate-spin" />
                {statusText || 'Sending...'}
              </>
            ) : (
              <>
                <Mail data-icon="inline-start" />
                Transmit Email
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
