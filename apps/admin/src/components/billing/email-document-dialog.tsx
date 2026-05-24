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
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldGroup, FieldLabel, FieldSet } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Mail, Loader2 } from 'lucide-react';
import { sendDocumentEmailAction } from '@/app/actions/email-delivery';

interface EmailDocumentDialogProps {
  documentId: string;
  documentNumber: string;
  documentType: 'invoice' | 'quote';
  defaultRecipientEmail: string;
  onSuccess?: () => void;
}

export function EmailDocumentDialog({
  documentId,
  documentNumber,
  documentType,
  defaultRecipientEmail,
  onSuccess,
}: EmailDocumentDialogProps) {
  const [open, setOpen] = useState(false);
  const [recipient, setRecipient] = useState(defaultRecipientEmail || '');
  const [subject, setSubject] = useState(`New ${documentType === 'invoice' ? 'Invoice' : 'Quotation'} ${documentNumber}`);
  const [message, setMessage] = useState('');
  const [attachStatement, setAttachStatement] = useState(documentType === 'invoice'); // Default true for invoices
  const [isSending, setIsSending] = useState(false);
  const [statusText, setStatusText] = useState('');

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

        // If the captured height is slightly larger than A4 (e.g., within 18mm overflow),
        // we scale it down slightly so it fits perfectly on a single page instead of spawning a blank page.
        if (imgHeight > pageHeight && imgHeight < 315) {
          imgHeight = pageHeight;
        }

        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pageHeight;

        // Multi-page splitting if height exceeds A4 height with a 10mm safety threshold
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

      // 1. Generate primary Invoice/Quote PDF
      setStatusText(`Compiling ${documentType === 'invoice' ? 'invoice' : 'quotation'} PDF...`);
      const pdfBase64 = await compileToPdfBase64('printable-area');

      // 2. Generate Client Statement PDF if selected (Invoice only)
      let statementBase64: string | undefined;
      if (documentType === 'invoice' && attachStatement) {
        setStatusText('Compiling account statement PDF...');
        try {
          statementBase64 = await compileToPdfBase64('printable-statement-area');
        } catch (err) {
          console.error("Statement compile failed:", err);
          toast.warning("Failed to render client statement. Emailing invoice only.");
        }
      }

      // 3. Dispatch Server action
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

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`${documentType === 'invoice' ? 'Invoice' : 'Quote'} emailed successfully!`);
        setOpen(false);
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
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Email {documentType === 'invoice' ? 'Invoice' : 'Quotation'}</DialogTitle>
          <DialogDescription>
            Send document **{documentNumber}** directly to the client as a high-fidelity PDF attachment.
          </DialogDescription>
        </DialogHeader>

        <FieldGroup className="py-4">
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
              rows={3}
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

        <DialogFooter>
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
