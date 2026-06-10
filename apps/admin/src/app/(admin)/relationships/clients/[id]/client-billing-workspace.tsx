'use client';

import React, { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BillingStatusBadge } from '@/components/billing/billing-status-badge';
import { DocumentPreview } from '@/components/billing/document-preview';
import { PrintButton } from '@/components/billing/print-button';
import { ExportPdfButton } from '@/components/billing/export-pdf-button';
import { EmailDocumentDialog } from '@/components/billing/email-document-dialog';
import { PaymentReceiptPreview } from '@/components/billing/payment-receipt-preview';
import { EmailReceiptDialog } from '@/components/billing/email-receipt-dialog';
import { ClientEditForm } from '@/components/clients/client-edit-form';
import { ClientFinancialDashboard } from './client-financial-dashboard';
import { formatZAR, fmtDate } from '@/lib/format';
import { getSASTToday } from '@/lib/format';
import { getDocumentLogoUrl } from '@/lib/document-logo';
import { ChevronDown, ChevronUp, FileDown, Mail, Loader2, Eye, Plus, CheckCircle2, XCircle } from 'lucide-react';
import { bulkIssueInvoices, bulkVoidInvoices, issueInvoice, voidInvoice } from '@/app/actions/billing-invoices';
import { sendDocumentEmailAction } from '@/app/actions/email-delivery';
import { updateQuotationStatus } from '@/app/actions/billing-quotes';
import type { InvoiceDetail, QuotationDetail } from '@pmg/db';

function extractInvoiceNumber(description: string | null): string {
  if (!description) return '-';
  const parts = description.split(' - ');
  if (parts.length > 0 && parts[0]!.includes('-INV-')) {
    return parts[0]!;
  }
  const match = description.match(/[A-Z0-9]+-INV-\d{4}-\d+/);
  if (match) return match[0];
  return description;
}

interface ClientBillingWorkspaceProps {
  client: any;
  invoices: InvoiceDetail[];
  quotes: QuotationDetail[];
  payments: any;
  statement: any;
  availableYears: number[];
  currentFY: number;
  divSettings: any;
  updateClientAction: any;
}

interface BulkLogEntry {
  id: string;
  docNumber: string;
  status: 'pending' | 'success' | 'failed';
  error?: string;
}

export function ClientBillingWorkspace({
  client,
  invoices,
  quotes,
  payments,
  statement,
  availableYears,
  currentFY,
  divSettings,
  updateClientAction,
}: ClientBillingWorkspaceProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  // Collapsible Details
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Split-Pane Preview Selection
  const [selectedDocId, setSelectedDocId] = useState<string | null>(
    invoices.length > 0
      ? invoices[0]!.id
      : quotes.length > 0
      ? quotes[0]!.id
      : (payments?.data && payments.data.length > 0)
      ? payments.data[0]!.id
      : null
  );
  const [selectedDocType, setSelectedDocType] = useState<'invoice' | 'quote' | 'statement' | 'payment'>(
    invoices.length > 0
      ? 'invoice'
      : quotes.length > 0
      ? 'quote'
      : (payments?.data && payments.data.length > 0)
      ? 'payment'
      : 'statement'
  );

  // Checkbox Multiselect Layer
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<Set<string>>(new Set());
  const [selectedQuoteIds, setSelectedQuoteIds] = useState<Set<string>>(new Set());
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Sequential Queue Render State (Recommendations implemented)
  const [activeRenderingDocId, setActiveRenderingDocId] = useState<string | null>(null);
  const [activeRenderingDocType, setActiveRenderingDocType] = useState<'invoice' | 'quote' | null>(null);

  // Bulk Progress Dialog
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [bulkType, setBulkType] = useState<'download' | 'email' | null>(null);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [bulkLog, setBulkLog] = useState<BulkLogEntry[]>([]);

  // Active Tab
  const [activeTab, setActiveTab] = useState<string>('invoices');

  // Handle initialization/selection from URL search parameters (e.g. navigation from payments page)
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    const paymentIdParam = searchParams.get('paymentId');
    const invoiceIdParam = searchParams.get('invoiceId');
    const quoteIdParam = searchParams.get('quoteId');

    if (tabParam === 'payments' || paymentIdParam) {
      setActiveTab('payments');
      if (paymentIdParam) {
        const hasPayment = (payments?.data || []).some((p: any) => p.id === paymentIdParam);
        if (hasPayment) {
          setSelectedDocId(paymentIdParam);
          setSelectedDocType('payment');
        }
      }
    } else if (tabParam === 'invoices' || invoiceIdParam) {
      setActiveTab('invoices');
      if (invoiceIdParam) {
        const hasInvoice = invoices.some((inv) => inv.id === invoiceIdParam);
        if (hasInvoice) {
          setSelectedDocId(invoiceIdParam);
          setSelectedDocType('invoice');
        }
      }
    } else if (tabParam === 'quotes' || quoteIdParam) {
      setActiveTab('quotes');
      if (quoteIdParam) {
        const hasQuote = quotes.some((q) => q.id === quoteIdParam);
        if (hasQuote) {
          setSelectedDocId(quoteIdParam);
          setSelectedDocType('quote');
        }
      }
    } else if (tabParam === 'statement') {
      setActiveTab('statement');
      setSelectedDocType('statement');
      setSelectedDocId(null);
    }
  }, [searchParams, invoices, quotes, payments]);

  // Find selected document detail in memory
  const activeInvoice = invoices.find((i) => i.id === selectedDocId);
  const activeQuote = quotes.find((q) => q.id === selectedDocId);
  const activePayment = (payments?.data || []).find((p: any) => p.id === selectedDocId);

  let documentTitle = 'Document';
  if (selectedDocType === 'invoice' && activeInvoice) {
    documentTitle = `Invoice-${activeInvoice.documentNumber}`;
  } else if (selectedDocType === 'quote' && activeQuote) {
    documentTitle = `Quote-${activeQuote.documentNumber}`;
  } else if (selectedDocType === 'payment' && activePayment) {
    documentTitle = `Receipt-${activePayment.id.slice(0, 8).toUpperCase()}`;
  }

  // Helper to compile preview props in memory
  const getInvoicePreviewProps = (inv: InvoiceDetail) => ({
    number: inv.documentNumber,
    status: inv.status.charAt(0).toUpperCase() + inv.status.slice(1),
    issueDate: inv.invoiceDate,
    dueDate: inv.dueDate ?? undefined,
    reference: inv.reference ?? undefined,
    org: {
      name: inv.divisionName,
      logoUrl: getDocumentLogoUrl(inv.divisionName),
      divisionOf: 'Playhouse Media Group',
      email: divSettings?.salesRepEmail ?? undefined,
      phone: divSettings?.salesRepPhone ?? undefined,
      website: divSettings?.divisionWebsite ?? undefined,
      salesRep: divSettings?.salesRepName ?? undefined,
    },
    client: {
      name: inv.clientName ?? 'No client',
      email: inv.clientEmail ?? undefined,
      phone: inv.clientPhone ?? undefined,
    },
    lineItems: inv.lineItems.map((li) => ({
      itemName: li.itemName,
      description: li.description,
      qty: Number(li.quantity),
      unitPrice: Number(li.unitPrice),
      vatApplicable: false,
    })),
    notes: inv.notes ?? divSettings?.invoiceNotes ?? undefined,
    terms: inv.terms ?? undefined,
    vatRate: 15 as const,
    discountAmount: Number(inv.discountAmount ?? 0),
    banking: divSettings?.bankName ? {
      bankName: divSettings.bankName,
      accountName: divSettings.bankAccountName ?? '',
      accountNumber: divSettings.bankAccountNumber ?? '',
      branchCode: divSettings.bankBranchCode ?? '',
    } : undefined,
  });

  const getQuotePreviewProps = (q: QuotationDetail) => ({
    number: q.documentNumber,
    status: q.status.charAt(0).toUpperCase() + q.status.slice(1),
    issueDate: q.quoteDate,
    dueDate: q.expiryDate ?? undefined,
    reference: q.reference ?? undefined,
    org: {
      name: q.divisionName,
      logoUrl: getDocumentLogoUrl(q.divisionName),
      divisionOf: 'Playhouse Media Group',
      email: divSettings?.salesRepEmail ?? undefined,
      phone: divSettings?.salesRepPhone ?? undefined,
      website: divSettings?.divisionWebsite ?? undefined,
      salesRep: divSettings?.salesRepName ?? undefined,
    },
    client: {
      name: q.clientName ?? 'No client',
      email: q.clientEmail ?? undefined,
      phone: q.clientPhone ?? undefined,
    },
    lineItems: q.lineItems.map((li) => ({
      itemName: li.itemName,
      description: li.description,
      qty: Number(li.quantity),
      unitPrice: Number(li.unitPrice),
      vatApplicable: false,
    })),
    notes: q.notes ?? divSettings?.quoteNotes ?? undefined,
    terms: q.terms ?? undefined,
    vatRate: 15 as const,
    discountAmount: Number(q.discountAmount ?? 0),
    banking: divSettings?.bankName ? {
      bankName: divSettings.bankName,
      accountName: divSettings.bankAccountName ?? '',
      accountNumber: divSettings.bankAccountNumber ?? '',
      branchCode: divSettings.bankBranchCode ?? '',
    } : undefined,
  });

  // Statement preparation
  const statementToInvoiceNumber = new Map<string, string>();
  for (const inv of statement?.invoices ?? []) {
    if (inv.incomeId) statementToInvoiceNumber.set(inv.incomeId, inv.documentNumber);
  }

  const statementTxRaw = [
    ...(statement?.invoices ?? [])
      .filter((inv: any) => inv.status !== 'void')
      .map((inv: any) => ({
        date: inv.invoiceDate,
        reference: inv.documentNumber,
        description: inv.reference ?? 'Invoice',
        debit: Number(inv.total),
      })),
    ...(payments.data ?? []).map((inc: any) => ({
      date: inc.date,
      reference: statementToInvoiceNumber.get(inc.id) ?? '-',
      description: 'Payment received',
      credit: Number(inc.amount),
    })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  let currentBal = statement?.summary.openingBalance ?? 0;
  const statementTransactions = statementTxRaw.map((tx) => {
    currentBal = currentBal + (tx.debit ?? 0) - (tx.credit ?? 0);
    return {
      date: tx.date,
      reference: tx.reference,
      description: tx.description,
      debit: tx.debit,
      credit: tx.credit,
      balance: currentBal,
    };
  });
  statementTransactions.reverse();

  let statementStatus = 'Paid';
  if (statement?.summary.totalOutstanding > 0) {
    const hasOverdue = (statement?.invoices ?? []).some((i: any) => i.status === 'overdue');
    statementStatus = hasOverdue ? 'Overdue' : 'Outstanding';
  }

  const todayStr = getSASTToday();
  const statementAgeing = { current: 0, days1_14: 0, days15_30: 0, days31_60: 0, days61_90: 0, days91_120: 0 };
  for (const inv of statement?.outstandingInvoices ?? statement?.invoices ?? []) {
    if (inv.status === 'issued' || inv.status === 'overdue' || inv.status === 'partially_paid') {
      const dueStr = inv.dueDate ?? inv.invoiceDate;
      const tDate = new Date(todayStr);
      const dDate = new Date(dueStr);
      const diffTime = tDate.getTime() - dDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const outstanding = Number(inv.total) - Number(inv.allocatedAmount ?? 0);
      if (outstanding <= 0) continue;

      if (diffDays <= 0) statementAgeing.current += outstanding;
      else if (diffDays <= 14) statementAgeing.days1_14 += outstanding;
      else if (diffDays <= 30) statementAgeing.days15_30 += outstanding;
      else if (diffDays <= 60) statementAgeing.days31_60 += outstanding;
      else if (diffDays <= 90) statementAgeing.days61_90 += outstanding;
      else statementAgeing.days91_120 += outstanding;
    }
  }

  const statementPeriodParam = searchParams.get('monthPeriod');
  const statementYearParam = searchParams.get('year');
  let statementPeriodLabel = '';
  if (statementPeriodParam === 'current') statementPeriodLabel = 'Current Month';
  else if (statementPeriodParam === 'previous') statementPeriodLabel = 'Previous Month';
  else if (statementPeriodParam === 'past3') statementPeriodLabel = 'Past 3 Months';
  else if (statementPeriodParam === 'past6') statementPeriodLabel = 'Past 6 Months';
  else if (statementYearParam) statementPeriodLabel = `FY ${statementYearParam}`;
  else statementPeriodLabel = 'Current Month';

  let periodFrom = '';
  let periodTo = '';
  if (statementPeriodParam) {
    // Mimic start date endDate helper
    const now = new Date();
    if (statementPeriodParam === 'current') {
      periodFrom = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      periodTo = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]!;
    } else if (statementPeriodParam === 'previous') {
      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      periodFrom = prev.toISOString().split('T')[0]!;
      periodTo = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0]!;
    } else if (statementPeriodParam === 'past3') {
      const past = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      periodFrom = past.toISOString().split('T')[0]!;
      periodTo = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]!;
    } else {
      const past = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      periodFrom = past.toISOString().split('T')[0]!;
      periodTo = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]!;
    }
  } else {
    const y = statementYearParam ? parseInt(statementYearParam, 10) : currentFY;
    periodFrom = `${y}-03-01`;
    periodTo = `${y + 1}-02-28`;
  }

  const statementPreviewProps = {
    number: `STMT-${statementPeriodParam ? statementPeriodParam.toUpperCase() : (statementYearParam ? statementYearParam : currentFY)}-${(client.businessName ?? client.name).slice(0, 3).toUpperCase()}`,
    status: statementStatus,
    issueDate: todayStr,
    periodFrom,
    periodTo,
    org: {
      name: invoices[0]?.divisionName ?? 'Playhouse Media Group',
      logoUrl: getDocumentLogoUrl(invoices[0]?.divisionName ?? 'Playhouse Media Group'),
      divisionOf: 'Playhouse Media Group',
      email: divSettings?.salesRepEmail ?? undefined,
      phone: divSettings?.salesRepPhone ?? undefined,
      website: divSettings?.divisionWebsite ?? undefined,
      salesRep: divSettings?.salesRepName ?? undefined,
      bankName: divSettings?.bankName ?? undefined,
      accountName: divSettings?.bankAccountName ?? undefined,
      accountNumber: divSettings?.bankAccountNumber ?? undefined,
      branchCode: divSettings?.bankBranchCode ?? undefined,
    },
    client: {
      name: client.businessName ?? client.name,
      email: client.email ?? undefined,
      phone: client.phone ?? undefined,
    },
    transactions: statementTransactions,
    ageing: statementAgeing,
    balanceDue: statement?.summary.totalOutstanding ?? 0,
    openingBalance: statement?.summary.openingBalance ?? 0,
  };

  // ── Statement Filter updates ───────────────────────────────────────────────
  const updateStatementFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    if (key === 'monthPeriod') params.delete('year');
    if (key === 'year') params.delete('monthPeriod');
    router.push(`?${params.toString()}`, { scroll: false });
  };

  // ── Checkbox Selection Handlers ────────────────────────────────────────────
  const handleSelectInvoice = (id: string, checked: boolean) => {
    const updated = new Set(selectedInvoiceIds);
    if (checked) updated.add(id);
    else updated.delete(id);
    setSelectedInvoiceIds(updated);
  };

  const handleSelectQuote = (id: string, checked: boolean) => {
    const updated = new Set(selectedQuoteIds);
    if (checked) updated.add(id);
    else updated.delete(id);
    setSelectedQuoteIds(updated);
  };

  const handleSelectAllInvoices = (checked: boolean) => {
    if (checked) {
      setSelectedInvoiceIds(new Set(invoices.map((inv) => inv.id)));
    } else {
      setSelectedInvoiceIds(new Set());
    }
  };

  const handleSelectAllQuotes = (checked: boolean) => {
    if (checked) {
      setSelectedQuoteIds(new Set(quotes.map((q) => q.id)));
    } else {
      setSelectedQuoteIds(new Set());
    }
  };

  const activeSelectionCount = activeTab === 'invoices' ? selectedInvoiceIds.size : selectedQuoteIds.size;

  // ── Sequential Combined PDF Generator ─────────────────────────────────────
  const generateCombinedPDF = async () => {
    const selectedIds = Array.from(activeTab === 'invoices' ? selectedInvoiceIds : selectedQuoteIds);
    if (selectedIds.length === 0) return;

    setBulkType('download');
    setBulkProgress(0);
    setBulkLog(
      selectedIds.map((id) => {
        const item =
          activeTab === 'invoices' ? invoices.find((i) => i.id === id) : quotes.find((q) => q.id === id);
        return {
          id,
          docNumber: item?.documentNumber ?? 'Doc',
          status: 'pending',
        };
      })
    );
    setIsBulkDialogOpen(true);

    try {
      const { jsPDF } = await import('jspdf');
      const html2canvas = (await import('html2canvas-pro')).default;

      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
      });

      let pageAdded = false;
      setActiveRenderingDocType(activeTab === 'invoices' ? 'invoice' : 'quote');

      for (let i = 0; i < selectedIds.length; i++) {
        const id = selectedIds[i]!;
        
        // Update state to render this document off-screen
        setActiveRenderingDocId(id);
        setBulkProgress(Math.round(((i) / selectedIds.length) * 100));

        // Delay to allow React mounting/rendering
        await new Promise((resolve) => setTimeout(resolve, 250));

        const element = document.getElementById(`offscreen-doc-${id}`);
        if (!element) {
          setBulkLog((prev) =>
            prev.map((e) => (e.id === id ? { ...e, status: 'failed', error: 'Render container missing' } : e))
          );
          continue;
        }

        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
        });

        const imgData = canvas.toDataURL('image/png');
        const imgWidth = 210;
        const pageHeight = 297;
        let imgHeight = (canvas.height * imgWidth) / canvas.width;

        if (imgHeight > pageHeight && imgHeight < 315) {
          imgHeight = pageHeight;
        }

        if (pageAdded) {
          pdf.addPage();
        } else {
          pageAdded = true;
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

        // Success for this item
        setBulkLog((prev) =>
          prev.map((e) => (e.id === id ? { ...e, status: 'success' } : e))
        );
      }

      setBulkProgress(100);
      pdf.save(`Combined_${activeTab === 'invoices' ? 'Invoices' : 'Quotes'}_${client.businessName?.replace(/\s+/g, '_') ?? 'Client'}.pdf`);
      toast.success('Combined PDF compiled successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Combined PDF compilation failed.');
    } finally {
      setActiveRenderingDocId(null);
      setActiveRenderingDocType(null);
    }
  };

  // ── Sequential Bulk Email Dispatcher ──────────────────────────────────────
  const handleBulkEmail = async () => {
    const selectedIds = Array.from(activeTab === 'invoices' ? selectedInvoiceIds : selectedQuoteIds);
    if (selectedIds.length === 0) return;

    if (!client.email) {
      toast.error('Client has no email address configured.');
      return;
    }

    setBulkType('email');
    setBulkProgress(0);
    setBulkLog(
      selectedIds.map((id) => {
        const item =
          activeTab === 'invoices' ? invoices.find((i) => i.id === id) : quotes.find((q) => q.id === id);
        return {
          id,
          docNumber: item?.documentNumber ?? 'Doc',
          status: 'pending',
        };
      })
    );
    setIsBulkDialogOpen(true);

    try {
      const { jsPDF } = await import('jspdf');
      const html2canvas = (await import('html2canvas-pro')).default;
      setActiveRenderingDocType(activeTab === 'invoices' ? 'invoice' : 'quote');

      for (let i = 0; i < selectedIds.length; i++) {
        const id = selectedIds[i]!;
        const item =
          activeTab === 'invoices' ? invoices.find((inv) => inv.id === id) : quotes.find((q) => q.id === id);

        setActiveRenderingDocId(id);
        setBulkProgress(Math.round((i / selectedIds.length) * 100));

        await new Promise((resolve) => setTimeout(resolve, 250));

        const element = document.getElementById(`offscreen-doc-${id}`);
        if (!element) {
          setBulkLog((prev) =>
            prev.map((e) => (e.id === id ? { ...e, status: 'failed', error: 'Render error' } : e))
          );
          continue;
        }

        // Render PDF to canvas
        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
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

        // Get raw base64 string
        const base64Pdf = pdf.output('datauristring').split(',')[1];
        if (!base64Pdf) {
          setBulkLog((prev) =>
            prev.map((e) => (e.id === id ? { ...e, status: 'failed', error: 'Base64 failure' } : e))
          );
          continue;
        }

        // Transmit via Resend
        const result = await sendDocumentEmailAction({
          documentId: id,
          documentType: activeTab === 'invoices' ? 'invoice' : 'quote',
          recipientEmail: client.email,
          subject: `${activeTab === 'invoices' ? 'Invoice' : 'Quotation'} ${item?.documentNumber} - ${client.businessName ?? client.name}`,
          personalMessage: `Please find attached document ${item?.documentNumber}.`,
          base64Pdf,
        });

        if (result.error) {
          setBulkLog((prev) =>
            prev.map((e) => (e.id === id ? { ...e, status: 'failed', error: result.error } : e))
          );
        } else {
          setBulkLog((prev) =>
            prev.map((e) => (e.id === id ? { ...e, status: 'success' } : e))
          );
        }
      }

      setBulkProgress(100);
      toast.success('Bulk email transmission completed!');
    } catch (err) {
      console.error(err);
      toast.error('Bulk email operations failed.');
    } finally {
      setActiveRenderingDocId(null);
      setActiveRenderingDocType(null);
    }
  };

  // ── Server actions for selection ───────────────────────────────────────────
  const handleBulkIssue = () => {
    const selectedIds = Array.from(selectedInvoiceIds);
    startTransition(async () => {
      const result = await bulkIssueInvoices(selectedIds);
      if (result.error) toast.error(result.error);
      else {
        toast.success(`Successfully issued ${result.successCount} invoices.`);
        setSelectedInvoiceIds(new Set());
        router.refresh();
      }
    });
  };

  const handleBulkVoid = () => {
    const selectedIds = Array.from(selectedInvoiceIds);
    startTransition(async () => {
      const result = await bulkVoidInvoices(selectedIds);
      if (result.error) toast.error(result.error);
      else {
        toast.success(`Successfully voided ${result.successCount} invoices.`);
        setSelectedInvoiceIds(new Set());
        router.refresh();
      }
    });
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Off-screen canvas render container (for sequential combined PDF/Email generation) */}
      {activeRenderingDocId && activeRenderingDocType && (
        <div className="absolute left-[-9999px] top-[-9999px] w-[794px] bg-white text-black" style={{ zIndex: -100 }}>
          {activeRenderingDocType === 'invoice' && invoices.find(i => i.id === activeRenderingDocId) && (
            <DocumentPreview 
              id={`offscreen-doc-${activeRenderingDocId}`}
              type="invoice" 
              {...getInvoicePreviewProps(invoices.find(i => i.id === activeRenderingDocId)!)} 
            />
          )}
          {activeRenderingDocType === 'quote' && quotes.find(q => q.id === activeRenderingDocId) && (
            <DocumentPreview 
              id={`offscreen-doc-${activeRenderingDocId}`}
              type="quote" 
              {...getQuotePreviewProps(quotes.find(q => q.id === activeRenderingDocId)!)} 
            />
          )}
        </div>
      )}

      {/* Header panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div className="flex items-center gap-4">
          <Link
            href="/relationships/clients"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to Clients
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">
            {client.businessName ?? client.name}
          </h1>
          <Badge variant={client.isActive ? 'default' : 'secondary'}>
            {client.isActive ? 'Active' : 'Disabled'}
          </Badge>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsDetailsOpen(!isDetailsOpen)}
          className="self-start sm:self-auto"
        >
          {isDetailsOpen ? (
            <>
              <ChevronUp className="size-4 mr-2" /> Hide Details
            </>
          ) : (
            <>
              <ChevronDown className="size-4 mr-2" /> Edit Details
            </>
          )}
        </Button>
      </div>

      {/* Collapsible Edit form */}
      <Collapsible open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <CollapsibleContent className="rounded-lg border p-5 bg-card flex flex-col gap-4 shadow-sm transition-all duration-300">
          <h2 className="text-base font-semibold">Client Details</h2>
          <ClientEditForm
            client={client}
            updateAction={updateClientAction}
          />
        </CollapsibleContent>
      </Collapsible>

      {/* Financial Overview Dashboard */}
      <ClientFinancialDashboard
        invoices={invoices}
        quotes={quotes}
        payments={payments.data}
      />

      {/* Quick actions panel */}
      <div className="flex flex-wrap gap-2 items-center">
        <Button asChild size="sm" variant="default" className="shadow-sm">
          <Link href="/billing/invoices/new">
            <Plus className="size-4 mr-1" /> New Invoice
          </Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href="/billing/quotes/new">
            <Plus className="size-4 mr-1" /> New Quote
          </Link>
        </Button>
        <Button asChild size="sm" variant="outline" className="border-green-200 hover:bg-green-50/50 dark:border-green-900/50 dark:hover:bg-green-950/20">
          <Link href={`/billing/payments/add?clientId=${client.id}`}>
            <Plus className="size-4 mr-1 text-green-600 dark:text-green-400" /> Record Payment
          </Link>
        </Button>
      </div>

      {/* Tabbed Document split-pane browser */}
      <Tabs value={activeTab} onValueChange={(val) => {
        setActiveTab(val);
        // Reset selections when switching tabs
        setSelectedInvoiceIds(new Set());
        setSelectedQuoteIds(new Set());
        setIsPreviewOpen(false);
        if (val === 'invoices' && invoices.length > 0) {
          setSelectedDocId(invoices[0]!.id);
          setSelectedDocType('invoice');
        } else if (val === 'quotes' && quotes.length > 0) {
          setSelectedDocId(quotes[0]!.id);
          setSelectedDocType('quote');
        } else if (val === 'payments' && payments?.data && payments.data.length > 0) {
          setSelectedDocId(payments.data[0]!.id);
          setSelectedDocType('payment');
        } else if (val === 'statement') {
          setSelectedDocType('statement');
          setSelectedDocId(null);
        }
      }} className="flex flex-col gap-4">
        <div className="sticky top-[3.25rem] z-30 bg-background -mx-6 px-6 pb-2 border-b flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="bg-transparent h-10 p-0 flex gap-2 shrink-0">
            <TabsTrigger value="invoices" className="bg-transparent border-b-2 border-transparent data-[state=active]:border-amber-500 rounded-none shadow-none px-4 py-2 text-sm font-medium">Invoices</TabsTrigger>
            <TabsTrigger value="quotes" className="bg-transparent border-b-2 border-transparent data-[state=active]:border-amber-500 rounded-none shadow-none px-4 py-2 text-sm font-medium">Quotations</TabsTrigger>
            <TabsTrigger value="payments" className="bg-transparent border-b-2 border-transparent data-[state=active]:border-amber-500 rounded-none shadow-none px-4 py-2 text-sm font-medium">Payments</TabsTrigger>
            <TabsTrigger value="statement" className="bg-transparent border-b-2 border-transparent data-[state=active]:border-amber-500 rounded-none shadow-none px-4 py-2 text-sm font-medium">Statement</TabsTrigger>
          </TabsList>

          {/* Action buttons are displayed contextually inside the slide-over drawer */}
        </div>

        {/* Tab content wrappers */}
        <div className="w-full">
          {/* Left Pane (Document lists) */}
          <Card className="w-full shadow-sm border-muted-foreground/10 bg-card overflow-hidden">
            <CardHeader className="p-4 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold capitalize">{activeTab}</CardTitle>
                <CardDescription className="text-xs">
                  {activeTab === 'statement'
                    ? 'Configure and preview the client account statement'
                    : 'Select documents to view or batch process'}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {/* INVOICES TAB */}
              <TabsContent value="invoices" className="m-0">
                {invoices.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">No invoices for this client.</p>
                ) : (
                  <Table className="text-xs">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">
                          <Checkbox
                            checked={selectedInvoiceIds.size === invoices.length}
                            onCheckedChange={handleSelectAllInvoices}
                          />
                        </TableHead>
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoices.map((inv) => (
                        <TableRow
                          key={inv.id}
                          className={`cursor-pointer hover:bg-muted/30 transition-colors ${
                            selectedDocId === inv.id && selectedDocType === 'invoice' ? 'bg-muted/50 font-medium' : ''
                          }`}
                          onClick={() => {
                            setSelectedDocId(inv.id);
                            setSelectedDocType('invoice');
                            setIsPreviewOpen(true);
                          }}
                        >
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={selectedInvoiceIds.has(inv.id)}
                              onCheckedChange={(checked) => handleSelectInvoice(inv.id, !!checked)}
                            />
                          </TableCell>
                          <TableCell className="font-semibold">{inv.documentNumber}</TableCell>
                          <TableCell className="tabular-nums">{fmtDate(inv.invoiceDate)}</TableCell>
                          <TableCell className="text-right tabular-nums font-semibold">{formatZAR(Number(inv.total))}</TableCell>
                          <TableCell>
                            <BillingStatusBadge status={inv.status} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>

              {/* QUOTATIONS TAB */}
              <TabsContent value="quotes" className="m-0">
                {quotes.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">No quotations for this client.</p>
                ) : (
                  <Table className="text-xs">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">
                          <Checkbox
                            checked={selectedQuoteIds.size === quotes.length}
                            onCheckedChange={handleSelectAllQuotes}
                          />
                        </TableHead>
                        <TableHead>Quote #</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {quotes.map((q) => (
                        <TableRow
                          key={q.id}
                          className={`cursor-pointer hover:bg-muted/30 transition-colors ${
                            selectedDocId === q.id && selectedDocType === 'quote' ? 'bg-muted/50 font-medium' : ''
                          }`}
                          onClick={() => {
                            setSelectedDocId(q.id);
                            setSelectedDocType('quote');
                            setIsPreviewOpen(true);
                          }}
                        >
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={selectedQuoteIds.has(q.id)}
                              onCheckedChange={(checked) => handleSelectQuote(q.id, !!checked)}
                            />
                          </TableCell>
                          <TableCell className="font-semibold">{q.documentNumber}</TableCell>
                          <TableCell className="tabular-nums">{fmtDate(q.quoteDate)}</TableCell>
                          <TableCell className="text-right tabular-nums font-semibold">{formatZAR(Number(q.total))}</TableCell>
                          <TableCell>
                            <BillingStatusBadge status={q.status} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>

              {/* PAYMENTS TAB */}
              <TabsContent value="payments" className="m-0">
                {payments.data.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">No payments recorded.</p>
                ) : (
                  <Table className="text-xs">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Invoice Number</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.data.map((entry: any) => (
                        <TableRow
                          key={entry.id}
                          className={`cursor-pointer hover:bg-muted/30 transition-colors ${
                            selectedDocId === entry.id && selectedDocType === 'payment' ? 'bg-muted/50 font-medium' : ''
                          }`}
                          onClick={() => {
                            setSelectedDocId(entry.id);
                            setSelectedDocType('payment');
                            setIsPreviewOpen(true);
                          }}
                        >
                          <TableCell className="tabular-nums">{fmtDate(entry.date)}</TableCell>
                          <TableCell className="font-semibold">{extractInvoiceNumber(entry.description)}</TableCell>
                          <TableCell className="text-right tabular-nums font-semibold text-emerald-500">
                            +{formatZAR(Number(entry.amount))}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>

              {/* STATEMENT FILTER PANEL TAB */}
              <TabsContent value="statement" className="m-0 flex flex-col gap-4">
                {/* Horizontal Filter Bar at the Top */}
                <div className="p-4 border-b flex flex-col md:flex-row md:items-center justify-between gap-4 bg-muted/5">
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-semibold text-muted-foreground">Select Statement Period</span>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant={statementPeriodParam === 'current' || (!statementPeriodParam && !statementYearParam) ? 'default' : 'outline'}
                        size="xs"
                        onClick={() => updateStatementFilter('monthPeriod', 'current')}
                        className="text-xs px-3 py-1.5 h-8"
                      >
                        Current Month
                      </Button>
                      <Button
                        variant={statementPeriodParam === 'previous' ? 'default' : 'outline'}
                        size="xs"
                        onClick={() => updateStatementFilter('monthPeriod', 'previous')}
                        className="text-xs px-3 py-1.5 h-8"
                      >
                        Previous Month
                      </Button>
                      <Button
                        variant={statementPeriodParam === 'past3' ? 'default' : 'outline'}
                        size="xs"
                        onClick={() => updateStatementFilter('monthPeriod', 'past3')}
                        className="text-xs px-3 py-1.5 h-8"
                      >
                        Past 3 Months
                      </Button>
                      <Button
                        variant={statementPeriodParam === 'past6' ? 'default' : 'outline'}
                        size="xs"
                        onClick={() => updateStatementFilter('monthPeriod', 'past6')}
                        className="text-xs px-3 py-1.5 h-8"
                      >
                        Past 6 Months
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 min-w-[150px]">
                    <span className="text-xs font-medium text-muted-foreground">Or Fiscal Year</span>
                    <Select
                      value={statementYearParam ?? String(currentFY)}
                      onValueChange={(val) => updateStatementFilter('year', val)}
                    >
                      <SelectTrigger className="text-xs h-8">
                        <SelectValue placeholder="Select Year" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableYears.map((year) => (
                          <SelectItem key={year} value={String(year)} className="text-xs">
                            FY {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-end mt-4 md:mt-0">
                    <Button
                      variant="default"
                      size="sm"
                      className="flex items-center gap-1.5 shadow-sm h-8"
                      onClick={() => setIsPreviewOpen(true)}
                    >
                      <Eye className="size-4" /> Preview Statement PDF
                    </Button>
                  </div>
                </div>

                {/* Statement Transactions Table */}
                <div className="p-0">
                  {statementTransactions.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-8">No transactions for the selected period.</p>
                  ) : (
                    <Table className="text-xs">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Reference</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Debit (+)</TableHead>
                          <TableHead className="text-right">Credit (-)</TableHead>
                          <TableHead className="text-right">Balance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {statementTransactions.map((tx, idx) => (
                          <TableRow key={idx} className="hover:bg-muted/30 transition-colors">
                            <TableCell className="tabular-nums">{fmtDate(tx.date)}</TableCell>
                            <TableCell className="font-semibold">{tx.reference}</TableCell>
                            <TableCell className="text-muted-foreground">{tx.description}</TableCell>
                            <TableCell className="text-right tabular-nums text-red-500 font-semibold">
                              {tx.debit ? formatZAR(tx.debit) : '-'}
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-emerald-500 font-semibold">
                              {tx.credit ? formatZAR(tx.credit) : '-'}
                            </TableCell>
                            <TableCell className="text-right tabular-nums font-bold">
                              {formatZAR(tx.balance)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </TabsContent>
            </CardContent>
          </Card>

        </div>

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-6 bg-background rounded-lg shadow-2xl">
          <DialogHeader className="p-0 pb-4 border-b flex flex-row items-center justify-between shrink-0">
            <div className="flex flex-col gap-1">
              <DialogTitle className="text-base font-bold flex gap-2 items-center">
                {selectedDocType === 'invoice' && activeInvoice?.documentNumber}
                {selectedDocType === 'quote' && activeQuote?.documentNumber}
                {selectedDocType === 'payment' && activePayment && `REC-${activePayment.id.slice(0, 8).toUpperCase()}`}
                {selectedDocType === 'statement' && "Statement"}
                <Badge
                  variant="outline"
                  className={cn(
                    "capitalize text-[10px]",
                    selectedDocType === 'payment' && "bg-emerald-50 text-emerald-700 border-emerald-200"
                  )}
                >
                  {selectedDocType}
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs">
                {selectedDocType === 'statement' ? statementPeriodLabel : "Document Inspection & Operations"}
              </DialogDescription>
            </div>
            
            {/* Action buttons inside dialog header */}
            <div className="flex items-center gap-2 shrink-0 mr-8 print:hidden">
              {selectedDocType !== 'statement' && selectedDocId && (
                <>
                  <PrintButton label="Print" documentTitle={documentTitle} />
                  <ExportPdfButton fileName={documentTitle} />
                </>
              )}
              {selectedDocType === 'statement' && (
                <>
                  <PrintButton
                    label="Print"
                    documentTitle={`Statement-${client.businessName?.replace(/\s+/g, '-') ?? client.name.replace(/\s+/g, '-')}`}
                  />
                  <ExportPdfButton
                    fileName={`Statement-${client.businessName?.replace(/\s+/g, '-') ?? client.name.replace(/\s+/g, '-')}`}
                  />
                </>
              )}

              {selectedDocType === 'invoice' && activeInvoice && (
                <>
                  <EmailDocumentDialog
                    documentId={activeInvoice.id}
                    documentNumber={activeInvoice.documentNumber}
                    documentType="invoice"
                    defaultRecipientEmail={client.email ?? ''}
                  />
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/billing/invoices/${activeInvoice.id}/edit`}>Edit</Link>
                  </Button>
                </>
              )}
              {selectedDocType === 'quote' && activeQuote && (
                <>
                  <EmailDocumentDialog
                    documentId={activeQuote.id}
                    documentNumber={activeQuote.documentNumber}
                    documentType="quote"
                    defaultRecipientEmail={client.email ?? ''}
                  />
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/billing/quotes/${activeQuote.id}/edit`}>Edit</Link>
                  </Button>
                </>
              )}
              {selectedDocType === 'payment' && activePayment && (
                <>
                  <EmailReceiptDialog
                    incomeId={activePayment.id}
                    receiptNumber={`REC-${activePayment.id.slice(0, 8).toUpperCase()}`}
                    defaultRecipientEmail={client.email ?? ''}
                  />
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/billing/payments/${activePayment.id}`}>View Page</Link>
                  </Button>
                </>
              )}
            </div>
          </DialogHeader>
          
          <div className="mt-4 overflow-x-auto bg-muted/5 p-4 rounded border">
            {selectedDocType === 'statement' ? (
              <div className="bg-card rounded-lg p-4 overflow-x-auto">
                <DocumentPreview type="statement" {...statementPreviewProps} />
              </div>
            ) : selectedDocId ? (
              <div className="bg-card rounded-lg p-4 overflow-x-auto">
                {selectedDocType === 'invoice' && activeInvoice && (
                  <DocumentPreview type="invoice" {...getInvoicePreviewProps(activeInvoice)} />
                )}
                {selectedDocType === 'quote' && activeQuote && (
                  <DocumentPreview type="quote" {...getQuotePreviewProps(activeQuote)} />
                )}
                {selectedDocType === 'payment' && activePayment && (
                  <PaymentReceiptPreview
                    payment={activePayment}
                    client={client}
                    divSettings={divSettings}
                  />
                )}
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center border border-dashed rounded-lg bg-card shadow-sm">
                <span className="text-sm text-muted-foreground">No document details found.</span>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      </Tabs>

      {/* Checkbox Floating Action Bar */}
      {activeSelectionCount > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 bg-background/80 dark:bg-card/90 backdrop-blur-md border border-muted-foreground/20 rounded-full py-3 px-6 shadow-2xl flex items-center gap-6 transition-all duration-300">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-foreground">{activeSelectionCount} Selected</span>
            <span className="text-[10px] text-muted-foreground capitalize">{activeTab}</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="default"
              onClick={generateCombinedPDF}
              className="rounded-full text-xs font-medium flex gap-1 items-center"
            >
              <FileDown className="size-3.5" /> Combined PDF
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleBulkEmail}
              className="rounded-full text-xs font-medium flex gap-1 items-center border-amber-200/50 hover:bg-amber-500/10"
            >
              <Mail className="size-3.5" /> Bulk Email
            </Button>

            {activeTab === 'invoices' && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleBulkIssue}
                  className="rounded-full text-xs font-medium text-green-600 dark:text-green-400 border-green-500/20 hover:bg-green-500/10"
                >
                  Issue
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleBulkVoid}
                  className="rounded-full text-xs font-medium text-red-600 dark:text-red-400 border-red-500/20 hover:bg-red-500/10"
                >
                  Void
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Sequential Queue Progress Dialog */}
      <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
        <DialogContent className="max-w-md bg-card border border-muted-foreground/10 text-card-foreground">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex gap-2 items-center">
              {bulkType === 'download' ? (
                <>
                  <Loader2 className="size-4 animate-spin text-amber-500" /> Compiling Combined PDF
                </>
              ) : (
                <>
                  <Loader2 className="size-4 animate-spin text-amber-500" /> Transmitting Bulk Emails
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Performing sequential off-screen canvas exports (one-by-one rendering)
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-3">
            <div className="flex justify-between items-center text-xs text-muted-foreground">
              <span>Progress</span>
              <span className="font-semibold tabular-nums">{bulkProgress}%</span>
            </div>
            <Progress value={bulkProgress} className="h-2" />

            <div className="border rounded-lg max-h-40 overflow-y-auto bg-muted/20 text-xs p-3 flex flex-col gap-2">
              {bulkLog.map((log) => (
                <div key={log.id} className="flex justify-between items-center py-1 border-b border-muted-foreground/5 last:border-0">
                  <span className="font-medium">{log.docNumber}</span>
                  <div className="flex items-center gap-1.5">
                    {log.status === 'pending' && (
                      <span className="text-[10px] text-muted-foreground flex gap-1 items-center">
                        <Loader2 className="size-3 animate-spin" /> Rendering...
                      </span>
                    )}
                    {log.status === 'success' && (
                      <span className="text-[10px] text-green-600 dark:text-green-400 flex gap-1 items-center font-medium">
                        <CheckCircle2 className="size-3.5" /> Compiled
                      </span>
                    )}
                    {log.status === 'failed' && (
                      <span className="text-[10px] text-red-500 flex gap-1 items-center font-medium">
                        <XCircle className="size-3.5" /> Failed {log.error && `(${log.error})`}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
