'use client';

import * as React from 'react';
import { useState } from 'react';
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
import { getReceiptEmailPreviewAction, sendReceiptEmailAction } from '@/app/actions/email-delivery';
import { EmailPreviewPanel } from '@/components/billing/email-preview-panel';

interface EmailReceiptDialogProps {
  incomeId: string;
  receiptNumber: string;
  defaultRecipientEmail: string;
  onSuccess?: () => void;
}

export function EmailReceiptDialog({
  incomeId,
  receiptNumber,
  defaultRecipientEmail,
  onSuccess,
}: EmailReceiptDialogProps) {
  const [open, setOpen] = useState(false);
  const [recipient, setRecipient] = useState(defaultRecipientEmail || '');
  const [subject, setSubject] = useState(`Payment Receipt ${receiptNumber}`);
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

      const result = await getReceiptEmailPreviewAction({
        incomeId,
        personalMessage: message || undefined,
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
  }, [open, incomeId, message]);

  async function handleSend() {
    if (!recipient) {
      toast.error('Recipient email is required.');
      return;
    }
    
    setIsSending(true);
    try {
      const { jsPDF } = await import('jspdf');
      const html2canvas = (await import('html2canvas-pro')).default;

      // Helper function to compile an HTML Element to a Base64 PDF
      async function compileToPdfBase64(elementId: string): Promise<string> {
        const targetElement = document.getElementById(elementId);
        if (!targetElement) {
          throw new Error(`Printable element '#${elementId}' not found.`);
        }

        const canvas = await html2canvas(targetElement, {
          scale: 2, // Sharp high-quality vector rendering
          useCORS: true,
          logging: false,
          backgroundColor: '#FFFFFF',
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4',
        });

        const imgWidth = 210;
        const pageHeight = 297;
        let imgHeight = (canvas.height * imgWidth) / canvas.width;

        // Scale down slightly to fit on a single page if minor overflow
        if (imgHeight > pageHeight && imgHeight < 315) {
          imgHeight = pageHeight;
        }

        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pageHeight;

        while (heightLeft > 10) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
          heightLeft -= pageHeight;
        }

        const base64 = pdf.output('datauristring').split(',')[1];
        if (!base64) throw new Error(`Base64 conversion failed for element: ${elementId}`);
        return base64;
      }

      setStatusText('Compiling receipt PDF...');
      const pdfBase64 = await compileToPdfBase64('printable-area');

      setStatusText('Transmitting receipt via Resend...');
      const result = await sendReceiptEmailAction({
        incomeId,
        recipientEmail: recipient,
        subject,
        personalMessage: message || undefined,
        base64Pdf: pdfBase64,
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Receipt emailed successfully!`);
        setOpen(false);
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate or deliver receipt email. Please try again.');
    } finally {
      setIsSending(false);
      setStatusText('');
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="border-emerald-200 hover:border-emerald-300 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20">
          <Mail className="size-4 mr-2 text-emerald-500" />
          Email Receipt
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[94vh] w-[calc(100vw-2rem)] max-w-[1180px] overflow-hidden p-0">
        <DialogHeader className="border-b px-5 pt-5">
          <DialogTitle>Email Payment Receipt</DialogTitle>
          <DialogDescription>
            Send receipt **{receiptNumber}** directly to the client as a high-fidelity PDF attachment.
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-[580px] grid-cols-1 overflow-hidden lg:grid-cols-[minmax(340px,420px)_1fr]">
          <div className="min-h-0 overflow-y-auto border-b p-5 lg:border-r lg:border-b-0">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="receipt-recipient">Recipient Email Address</FieldLabel>
                <Input
                  id="receipt-recipient"
                  type="email"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="client@company.com"
                  disabled={isSending}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="receipt-subject">Email Subject</FieldLabel>
                <Input
                  id="receipt-subject"
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Receipt Subject"
                  disabled={isSending}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="receipt-message">Personalized Message (Optional)</FieldLabel>
                <Textarea
                  id="receipt-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Thank you for your payment! Please find your official payment receipt attached."
                  rows={6}
                  disabled={isSending}
                  className="resize-none"
                />
              </Field>
            </FieldGroup>
          </div>

          <div className="min-h-0 bg-muted/20 p-5">
            <EmailPreviewPanel
              html={previewHtml}
              title="Receipt Email Preview"
              isLoading={isPreviewLoading}
              error={previewError}
            />
          </div>
        </div>

        <DialogFooter className="border-t px-5 pb-5">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isSending}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={isSending} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            {isSending ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                {statusText || 'Sending...'}
              </>
            ) : (
              <>
                <Mail className="size-4 mr-2" />
                Transmit Email
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
