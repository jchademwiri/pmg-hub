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
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldGroup, FieldLabel, FieldSet } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Mail, Loader2 } from 'lucide-react';
import { getDocumentEmailPreviewAction, sendDocumentEmailAction } from '@/app/actions/email-delivery';
import { EmailPreviewPanel } from '@/components/billing/email-preview-panel';
import { elementToPdfBase64, serverPdfUrlToBase64 } from '@/lib/pdf-export';

interface EmailDocumentDialogProps {
  documentId: string;
  documentNumber: string;
  documentType: 'invoice' | 'quote';
  defaultRecipientEmail: string;
  printableElementId?: string;
  statementElementId?: string;
  pdfUrl?: string;
  statementPdfUrl?: string;
  onSuccess?: () => void;
}

export function EmailDocumentDialog({
  documentId,
  documentNumber,
  documentType,
  defaultRecipientEmail,
  printableElementId = 'printable-area',
  statementElementId = 'printable-statement-area',
  pdfUrl,
  statementPdfUrl,
  onSuccess,
}: EmailDocumentDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [recipient, setRecipient] = useState(defaultRecipientEmail || '');
  const [subject, setSubject] = useState(`New ${documentType === 'invoice' ? 'Invoice' : 'Quotation'} ${documentNumber}`);
  const [message, setMessage] = useState('');
  const [attachStatement, setAttachStatement] = useState(documentType === 'invoice'); // Default true for invoices
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
        documentId,
        documentType,
        personalMessage: message || undefined,
        hasStatementAttached: attachStatement,
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
  }, [open, documentId, documentType, message, attachStatement]);

  async function handleSend() {
    if (!recipient) {
      toast.error('Recipient email is required.');
      return;
    }
    
    setIsSending(true);
    try {
      setStatusText(`Compiling ${documentType === 'invoice' ? 'invoice' : 'quotation'} PDF...`);
      const pdfBase64 = pdfUrl
        ? await serverPdfUrlToBase64(pdfUrl, `${documentType === 'invoice' ? 'Invoice' : 'Quote'} PDF`)
        : await elementToPdfBase64(printableElementId, `${documentType === 'invoice' ? 'Invoice' : 'Quote'} PDF`);

      let statementBase64: string | undefined;
      if (documentType === 'invoice' && attachStatement) {
        setStatusText('Compiling account statement PDF...');
        try {
          statementBase64 = statementPdfUrl
            ? await serverPdfUrlToBase64(statementPdfUrl, 'Statement PDF')
            : await elementToPdfBase64(statementElementId, 'Statement PDF');
        } catch (err) {
          console.error("Statement compile failed:", err);
          toast.warning("Failed to render client statement. Emailing invoice only.");
        }
      }

      setStatusText('Transmitting documents via Resend...');
      const result = await sendDocumentEmailAction({
        documentId,
        documentType,
        recipientEmail: recipient,
        subject,
        personalMessage: message || undefined,
        base64Pdf: pdfBase64,
        base64StatementPdf: statementBase64,
      });

      if (!result || result.error) {
        toast.error(result?.error ?? 'Network error');
      } else {
        toast.success(`${documentType === 'invoice' ? 'Invoice' : 'Quote'} emailed successfully!`);
        setOpen(false);
        router.refresh();
        if (onSuccess) onSuccess();
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
          Email {documentType === 'invoice' ? 'Invoice' : 'Quote'}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[94vh] w-[calc(100vw-2rem)] max-w-[1180px] flex flex-col overflow-hidden p-0">
        <DialogHeader className="border-b px-5 py-4 shrink-0">
          <DialogTitle>Email {documentType === 'invoice' ? 'Invoice' : 'Quotation'}</DialogTitle>
          <DialogDescription>
            Send document **{documentNumber}** directly to the client as a high-fidelity PDF attachment.
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
                  placeholder="Invoice Subject"
                  disabled={isSending}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="email-message">Personalized Message (Optional)</FieldLabel>
                <Textarea
                  id="email-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Hi there, please find our invoice attached. Let us know if you have any questions!"
                  rows={5}
                  disabled={isSending}
                  className="resize-none"
                />
              </Field>

              {documentType === 'invoice' && (
                <FieldSet className="rounded-md border bg-muted/40 p-3">
                  <Field orientation="horizontal">
                    <Checkbox
                      id="attach-statement"
                      checked={attachStatement}
                      onCheckedChange={(checked) => setAttachStatement(checked === true)}
                      disabled={isSending}
                    />
                    <div className="flex flex-col gap-0.5">
                      <FieldLabel htmlFor="attach-statement" className="font-medium">
                        Attach Current Client Statement
                      </FieldLabel>
                      <p className="text-[10px] text-muted-foreground">
                        Appends a PDF statement of the client&apos;s current ledger activity for this financial year.
                      </p>
                    </div>
                  </Field>
                </FieldSet>
              )}
            </FieldGroup>
          </div>

            <div className="hidden lg:block lg:min-h-0 bg-muted/20 p-5">
              <EmailPreviewPanel
                html={previewHtml}
                title={`${documentType === 'invoice' ? 'Invoice' : 'Quote'} Email Preview`}
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
