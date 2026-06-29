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
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Mail,
  Loader2,
  Paperclip,
  X,
  ChevronDown,
  ChevronUp,
  FileText,
  CheckCircle,
} from 'lucide-react';
import {
  getDocumentEmailPreviewAction,
  sendDocumentEmailAction,
  getReceiptEmailPreviewAction,
  sendReceiptEmailAction,
} from '@/app/actions/email-delivery';
import { EmailPreviewPanel } from '@/components/billing/email-preview-panel';
import { elementToPdfBase64, serverPdfUrlToBase64 } from '@/lib/pdf-export';

interface UniversalEmailDialogProps {
  documentId: string; // Can be invoiceId, quoteId, or incomeId (receipt)
  documentNumber: string;
  documentType: 'invoice' | 'quote' | 'receipt';
  defaultRecipientEmail: string;
  printableElementId?: string;
  statementElementId?: string;
  pdfUrl?: string;
  statementPdfUrl?: string;
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}

interface CustomFile {
  name: string;
  size: number;
  base64: string;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve(base64String || '');
    };
    reader.onerror = (error) => reject(error);
  });
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function UniversalEmailDialog({
  documentId,
  documentNumber,
  documentType,
  defaultRecipientEmail,
  printableElementId = 'printable-area',
  statementElementId = 'printable-statement-area',
  pdfUrl,
  statementPdfUrl,
  onSuccess,
  trigger,
}: UniversalEmailDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  
  // Form fields
  const [recipient, setRecipient] = useState(defaultRecipientEmail || '');
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  
  const defaultSubjectText = 
    documentType === 'invoice' ? `New Invoice ${documentNumber}` :
    documentType === 'quote' ? `New Quotation ${documentNumber}` :
    `Payment Receipt ${documentNumber}`;
  
  const [subject, setSubject] = useState(defaultSubjectText);
  const [message, setMessage] = useState('');
  const [attachStatement, setAttachStatement] = useState(documentType === 'invoice');
  
  // Custom attachments
  const [customFiles, setCustomFiles] = useState<CustomFile[]>([]);
  
  // Status states
  const [isSending, setIsSending] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  // Fetch email preview
  React.useEffect(() => {
    if (!open) return;

    let cancelled = false;
    const timeout = window.setTimeout(async () => {
      setIsPreviewLoading(true);
      setPreviewError(null);

      try {
        let result;
        if (documentType === 'receipt') {
          result = await getReceiptEmailPreviewAction({
            incomeId: documentId,
            personalMessage: message || undefined,
          });
        } else {
          result = await getDocumentEmailPreviewAction({
            documentId,
            documentType,
            personalMessage: message || undefined,
            hasStatementAttached: attachStatement,
          });
        }

        if (cancelled) return;

        if (result.success && result.html) {
          setPreviewHtml(result.html);
        } else {
          setPreviewHtml('');
          setPreviewError(result.error ?? 'Preview failed.');
        }
      } catch (err) {
        if (!cancelled) {
          setPreviewError('Failed to load email preview.');
        }
      } finally {
        if (!cancelled) {
          setIsPreviewLoading(false);
        }
      }
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [open, documentId, documentType, message, attachStatement]);

  // File upload handler
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    
    const newFiles: CustomFile[] = [];
    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`File "${file.name}" exceeds the 5MB size limit.`);
        continue;
      }
      try {
        const base64 = await fileToBase64(file);
        newFiles.push({
          name: file.name,
          size: file.size,
          base64,
        });
      } catch (err) {
        toast.error(`Failed to process "${file.name}".`);
      }
    }
    setCustomFiles((prev) => [...prev, ...newFiles]);
    e.target.value = ''; // Reset input
  };

  const removeCustomFile = (index: number) => {
    setCustomFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Submit handler
  async function handleSend() {
    if (!recipient) {
      toast.error('Recipient email is required.');
      return;
    }
    
    setIsSending(true);
    try {
      // 1. Compile primary document
      const docLabel = documentType === 'invoice' ? 'Invoice' : documentType === 'quote' ? 'Quote' : 'Receipt';
      setStatusText(`Compiling ${docLabel.toLowerCase()} PDF...`);
      const pdfBase64 = pdfUrl
        ? await serverPdfUrlToBase64(pdfUrl, `${docLabel} PDF`)
        : await elementToPdfBase64(printableElementId, `${docLabel} PDF`);

      // 2. Compile statement if selected
      let statementBase64: string | undefined;
      if (documentType === 'invoice' && attachStatement) {
        setStatusText('Compiling account statement PDF...');
        try {
          statementBase64 = statementPdfUrl
            ? await serverPdfUrlToBase64(statementPdfUrl, 'Statement PDF')
            : await elementToPdfBase64(statementElementId, 'Statement PDF');
        } catch (err) {
          console.error('Statement compile failed:', err);
          toast.warning('Failed to render client statement. Emailing invoice only.');
        }
      }

      // 3. Prepare custom attachments payload
      const mappedCustomAttachments = customFiles.map((f) => ({
        filename: f.name,
        content: f.base64,
      }));

      // 4. Transmit email
      setStatusText('Transmitting documents via Resend...');
      let result;
      
      if (documentType === 'receipt') {
        result = await sendReceiptEmailAction({
          incomeId: documentId,
          recipientEmail: recipient,
          subject,
          personalMessage: message || undefined,
          base64Pdf: pdfBase64,
          customAttachments: mappedCustomAttachments,
        });
      } else {
        result = await sendDocumentEmailAction({
          documentId,
          documentType,
          recipientEmail: recipient,
          subject,
          personalMessage: message || undefined,
          base64Pdf: pdfBase64,
          base64StatementPdf: statementBase64,
          customAttachments: mappedCustomAttachments,
        });
      }

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`${docLabel} emailed successfully!`);
        setOpen(false);
        // Reset states
        setCustomFiles([]);
        setShowCcBcc(false);
        setCc('');
        setBcc('');
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

  const primaryDocName = 
    documentType === 'invoice' ? `Invoice-${documentNumber}.pdf` :
    documentType === 'quote' ? `Quote-${documentNumber}.pdf` :
    `Receipt-${documentNumber}.pdf`;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className={documentType === 'receipt' ? 'border-emerald-200 hover:border-emerald-300 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20' : ''}>
            <Mail data-icon="inline-start" className={documentType === 'receipt' ? 'text-emerald-500' : ''} />
            Email {documentType === 'invoice' ? 'Invoice' : documentType === 'quote' ? 'Quote' : 'Receipt'}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[94vh] w-[calc(100vw-2rem)] max-w-[1180px] overflow-hidden p-0">
        <DialogHeader className="border-b px-5 pt-5">
          <DialogTitle>Email {documentType === 'invoice' ? 'Invoice' : documentType === 'quote' ? 'Quotation' : 'Payment Receipt'}</DialogTitle>
          <DialogDescription>
            Send document **{documentNumber}** directly to the client as a high-fidelity PDF attachment.
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-[600px] grid-cols-1 overflow-hidden lg:grid-cols-[minmax(380px,460px)_1fr]">
          {/* Left Column - Composer */}
          <div className="min-h-0 overflow-y-auto border-b p-5 lg:border-r lg:border-b-0 space-y-4">
            <FieldGroup>
              <Field>
                <div className="flex items-center justify-between">
                  <FieldLabel htmlFor="email-recipient">Recipient Email Address</FieldLabel>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setShowCcBcc(!showCcBcc)}
                    className="h-7 text-xs text-muted-foreground hover:text-foreground"
                  >
                    CC/BCC {showCcBcc ? <ChevronUp className="size-3 ml-1" /> : <ChevronDown className="size-3 ml-1" />}
                  </Button>
                </div>
                <Input
                  id="email-recipient"
                  type="email"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="client@company.com"
                  disabled={isSending}
                />
              </Field>

              {showCcBcc && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <Field>
                    <FieldLabel htmlFor="email-cc">CC</FieldLabel>
                    <Input
                      id="email-cc"
                      type="email"
                      value={cc}
                      onChange={(e) => setCc(e.target.value)}
                      placeholder="cc@company.com"
                      disabled={isSending}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="email-bcc">BCC</FieldLabel>
                    <Input
                      id="email-bcc"
                      type="email"
                      value={bcc}
                      onChange={(e) => setBcc(e.target.value)}
                      placeholder="bcc@company.com"
                      disabled={isSending}
                    />
                  </Field>
                </div>
              )}

              <Field>
                <FieldLabel htmlFor="email-subject">Email Subject</FieldLabel>
                <Input
                  id="email-subject"
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Email Subject"
                  disabled={isSending}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="email-message">Personalized Message (Optional)</FieldLabel>
                <Textarea
                  id="email-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={
                    documentType === 'invoice' ? "Hi there, please find our invoice attached. Let us know if you have any questions!" :
                    documentType === 'quote' ? "Hi there, please find our quotation attached. We look forward to working with you!" :
                    "Thank you for your payment! Please find your official receipt attached."
                  }
                  rows={4}
                  disabled={isSending}
                  className="resize-none"
                />
              </Field>
            </FieldGroup>

            {/* Attachments Section */}
            <div className="pt-4 border-t space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <Paperclip className="size-4 text-muted-foreground" />
                  Attachments
                </h4>
                <label className="cursor-pointer">
                  <span className="inline-flex items-center justify-center rounded-md text-xs font-medium border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-7 px-3">
                    Add File
                  </span>
                  <input
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={isSending}
                  />
                </label>
              </div>

              {/* List of Attachments */}
              <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                {/* Primary Document (Auto-generated) */}
                <div className="flex items-center justify-between p-2 rounded-lg border bg-muted/30 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="size-3.5 text-blue-500 shrink-0" />
                    <span className="font-medium truncate text-foreground">{primaryDocName}</span>
                    <span className="text-muted-foreground/70 shrink-0">(auto-compiled)</span>
                  </div>
                  <CheckCircle className="size-3.5 text-emerald-500 shrink-0" />
                </div>

                {/* Account Statement (Optional for invoices) */}
                {documentType === 'invoice' && (
                  <div className="flex items-center justify-between p-2 rounded-lg border bg-muted/30 text-xs">
                    <label className="flex items-center gap-2 min-w-0 cursor-pointer w-full">
                      <Checkbox
                        id="attach-statement"
                        checked={attachStatement}
                        onCheckedChange={(checked) => setAttachStatement(Boolean(checked))}
                        disabled={isSending}
                      />
                      <span className="font-medium truncate text-foreground">Client Account Statement.pdf</span>
                    </label>
                    <span className="text-muted-foreground/70 shrink-0 text-[10px]">(optional)</span>
                  </div>
                )}

                {/* Custom Uploaded Files */}
                {customFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-lg border border-dashed bg-background text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <Paperclip className="size-3.5 text-muted-foreground shrink-0" />
                      <span className="font-medium truncate text-foreground">{file.name}</span>
                      <span className="text-muted-foreground/70 shrink-0">({formatBytes(file.size)})</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeCustomFile(idx)}
                      disabled={isSending}
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                    >
                      <X className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Live Preview */}
          <div className="min-h-0 bg-muted/25 p-5 flex flex-col">
            <EmailPreviewPanel
              html={previewHtml}
              title="Interactive Email Preview"
              isLoading={isPreviewLoading}
              error={previewError}
            />
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="border-t px-5 pb-5 pt-3">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isSending}>
            Cancel
          </Button>
          <Button 
            onClick={handleSend} 
            disabled={isSending} 
            className={documentType === 'receipt' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}
          >
            {isSending ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                {statusText || 'Transmitting...'}
              </>
            ) : (
              <>
                <Mail className="size-4 mr-2" />
                Send Email
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
