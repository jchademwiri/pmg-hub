'use client';

import React, { useState, useEffect, useTransition, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
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
import { ClientMetricStrip } from './client-metric-strip';
import { calculateClientHealth, calculateAverageDaysToPay, buildOrgProps, determineStatementStatus, buildIncomeInvoiceMap, buildTransactionHistory, resolveDivisionBranding, buildBankingProps } from '@/lib/client-billing-helpers';
import { formatZAR, fmtDate, getSASTToday } from '@/lib/format';
import { calculateAgeing } from '@/lib/billing-ageing';
import {
  appendElementToPdf,
  elementToPdfBase64,
  sanitizePdfFileName,
} from '@/lib/pdf-export';
import { ChevronDown, ChevronUp, FileDown, Mail, Loader2, Eye, Plus, CheckCircle2, XCircle, Wallet, Clock, AlertCircle } from 'lucide-react';
import { generateReceiptNumber } from '@pmg/utils';
import { IssueCreditNoteDialog } from '@/components/billing/issue-credit-note-dialog';
import { CreditHistoryTable } from '@/components/billing/credit-history-table';
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
  divisions: { id: string; name: string }[];
  divSettings: any;
  orgSettings?: any;
  updateClientAction: any;
  creditSummary?: any;
  creditHistory?: any;
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
  orgSettings,
  updateClientAction,
  creditSummary,
  creditHistory,
  divisions,
}: ClientBillingWorkspaceProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  // Collapsible Details
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const previewPanelRef = useRef<HTMLDivElement>(null);
  const [isLargeScreen, setIsLargeScreen] = useState(false);

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
  const [activeTab, setActiveTab] = useState<string>(searchParams.get('tab') || 'invoices');
  const [metricFilter, setMetricFilter] = useState<'all' | 'paid' | 'outstanding' | 'overdue'>('all');
  const [showIssueCreditDialog, setShowIssueCreditDialog] = useState(false);

  const clientDivisions = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const inv of invoices) {
      if (inv.divisionId && inv.divisionName) map.set(inv.divisionId, inv.divisionName);
    }
    for (const q of quotes) {
      if (q.divisionId && q.divisionName) map.set(q.divisionId, q.divisionName);
    }
    if (map.size === 0 && divSettings?.divisionId) {
      map.set(divSettings.divisionId, divSettings.salesRepName || 'Primary Division');
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [invoices, quotes, divSettings]);

  const activeTabFromUrl = searchParams.get('tab') || 'invoices';

  useEffect(() => {
    if (activeTabFromUrl !== activeTab) {
      setMetricFilter('all');
      setActiveTab(activeTabFromUrl);
      setSelectedInvoiceIds(new Set());
      setSelectedQuoteIds(new Set());
      setIsPreviewOpen(false);
      if (activeTabFromUrl === 'invoices' && invoices.length > 0) {
        setSelectedDocId(invoices[0]!.id);
        setSelectedDocType('invoice');
      } else if (activeTabFromUrl === 'quotes' && quotes.length > 0) {
        setSelectedDocId(quotes[0]!.id);
        setSelectedDocType('quote');
      } else if (activeTabFromUrl === 'payments' && payments?.data && payments.data.length > 0) {
        setSelectedDocId(payments.data[0]!.id);
        setSelectedDocType('payment');
      } else if (activeTabFromUrl === 'statement') {
        setSelectedDocType('statement');
        setSelectedDocId(null);
      } else if (activeTabFromUrl === 'analytics' || activeTabFromUrl === 'credits') {
        setSelectedInvoiceIds(new Set());
        setSelectedQuoteIds(new Set());
        setIsPreviewOpen(false);
      }
    }
  }, [activeTabFromUrl, invoices, quotes, payments]);

  const handleTabChange = (val: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', val);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const todayStrWS = getSASTToday();

  // ── Filtered document lists (driven by metric strip tile selection) ────────
  const filteredInvoices = (() => {
    switch (metricFilter) {
      case 'paid':
        return invoices.filter((inv) => inv.status === 'paid');
      case 'outstanding':
        return invoices.filter(
          (inv) =>
            inv.status !== 'paid' &&
            inv.status !== 'void' &&
            inv.status !== 'draft' &&
            (!inv.dueDate || inv.dueDate >= todayStrWS)
        );
      case 'overdue':
        return invoices.filter(
          (inv) =>
            inv.status !== 'paid' &&
            inv.status !== 'void' &&
            inv.status !== 'draft' &&
            inv.dueDate &&
            inv.dueDate < todayStrWS
        );
      case 'all':
      default:
        return invoices;
    }
  })();

  const filteredQuotes = (() => {
    switch (metricFilter) {
      case 'paid':
        return quotes.filter(
          (q) => q.status === 'accepted' || q.status === 'converted'
        );
      case 'outstanding':
        return quotes.filter((q) => q.status === 'sent');
      case 'overdue':
        return quotes.filter((q) => q.status === 'declined');
      case 'all':
      default:
        return quotes;
    }
  })();

  // ── Metric Strip Computations ──────────────────────────────────────────────
  const activeInvoicesWS = invoices.filter(
    (inv) => inv.status !== 'void' && inv.status !== 'draft' && inv.invoiceDate <= todayStrWS
  );
  const totalInvoicedWS = activeInvoicesWS.reduce((sum, inv) => sum + Number(inv.total), 0);
  const totalPaidWS = (payments?.data ?? []).reduce((sum: number, pay: any) => sum + Number(pay.amount), 0);

  // Overdue Balance Calculation (strictly unpaid invoices where due date is in the past)
  const overdueBalanceWS = activeInvoicesWS
    .filter((inv) => inv.status !== 'paid' && inv.dueDate && inv.dueDate < todayStrWS)
    .reduce((sum, inv) => sum + (Number(inv.total) - Number(inv.allocatedAmount ?? 0)), 0);

  // Outstanding Balance Calculation (strictly unpaid invoices that are not overdue yet)
  const outstandingBalanceWS = activeInvoicesWS
    .filter((inv) => inv.status !== 'paid' && (!inv.dueDate || inv.dueDate >= todayStrWS))
    .reduce((sum, inv) => sum + (Number(inv.total) - Number(inv.allocatedAmount ?? 0)), 0);

  // Client specific aging buckets calculation
  const agingBuckets = React.useMemo(() => {
    let current = 0;
    let bucket_1_14 = 0;
    let bucket_15_30 = 0;
    let bucket_31_60 = 0;
    let bucket_61_plus = 0;

    const todayVal = new Date(`${todayStrWS}T00:00:00`);
    const getDaysPastDue = (dueDateStr: string | null): number => {
      if (!dueDateStr) return 0;
      const dueDate = new Date(`${dueDateStr}T00:00:00`);
      const due = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
      const tod = new Date(todayVal.getFullYear(), todayVal.getMonth(), todayVal.getDate());
      if (due >= tod) return 0;
      const diffTime = tod.getTime() - due.getTime();
      return Math.floor(diffTime / (1000 * 60 * 60 * 24));
    };

    activeInvoicesWS.forEach((inv) => {
      if (inv.status === 'paid') return;
      const outstanding = Number(inv.total) - Number(inv.allocatedAmount ?? 0);
      const daysPastDue = getDaysPastDue(inv.dueDate);
      if (daysPastDue <= 0) {
        current += outstanding;
      } else if (daysPastDue <= 14) {
        bucket_1_14 += outstanding;
      } else if (daysPastDue <= 30) {
        bucket_15_30 += outstanding;
      } else if (daysPastDue <= 60) {
        bucket_31_60 += outstanding;
      } else {
        bucket_61_plus += outstanding;
      }
    });

    return {
      current,
      bucket_1_14,
      bucket_15_30,
      bucket_31_60,
      bucket_61_plus,
    };
  }, [activeInvoicesWS, todayStrWS]);

  const healthWS = calculateClientHealth(invoices, outstandingBalanceWS + overdueBalanceWS, overdueBalanceWS);
  const avgDaysToPayWS = calculateAverageDaysToPay(invoices);
  const sortedPaymentsWS = [...(payments?.data ?? [])].sort((a: any, b: any) =>
    b.date.localeCompare(a.date)
  );
  const lastPaymentWS = sortedPaymentsWS[0] ?? null;

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
    } else if (tabParam === 'analytics') {
      setActiveTab('analytics');
      setSelectedDocId(null);
    }
  }, [searchParams, invoices, quotes, payments]);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    setIsLargeScreen(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsLargeScreen(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (previewPanelRef.current) {
      previewPanelRef.current.scrollTop = 0;
    }
  }, [selectedDocId]);

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
    documentTitle = generateReceiptNumber(activePayment.id, activePayment.divisionName);
  }

  const navigableIds = (() => {
    if (selectedDocType === 'invoice') return invoices.map(i => i.id);
    if (selectedDocType === 'quote') return quotes.map(q => q.id);
    if (selectedDocType === 'payment') return (payments?.data ?? []).map((p: any) => p.id);
    return [];
  })();
  const currentNavIndex = selectedDocId ? navigableIds.indexOf(selectedDocId) : -1;

  // Helper to compile preview props in memory
  const getInvoicePreviewProps = (inv: InvoiceDetail) => ({
    number: inv.documentNumber,
    status: inv.status.charAt(0).toUpperCase() + inv.status.slice(1),
    issueDate: inv.invoiceDate,
    dueDate: inv.dueDate ?? undefined,
    reference: inv.reference ?? undefined,
    org: buildOrgProps(inv.divisionName, divSettings, orgSettings),
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
    banking: buildBankingProps(divSettings),
  });

  const getQuotePreviewProps = (q: QuotationDetail) => ({
    number: q.documentNumber,
    status: q.status.charAt(0).toUpperCase() + q.status.slice(1),
    issueDate: q.quoteDate,
    dueDate: q.expiryDate ?? undefined,
    reference: q.reference ?? undefined,
    org: buildOrgProps(q.divisionName, divSettings, orgSettings),
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
    banking: buildBankingProps(divSettings),
  });

  // Statement preparation
  const statementToInvoiceNumber = buildIncomeInvoiceMap(statement?.invoices ?? []);

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
  ];

  const statementTransactions = buildTransactionHistory(statementTxRaw, statement?.summary.openingBalance ?? 0);

  const statementStatus = determineStatementStatus(statement?.summary.totalOutstanding ?? 0, statement?.invoices ?? []);

  const statementAgeing = calculateAgeing(
    statement?.outstandingInvoices ?? statement?.invoices ?? [],
    getSASTToday(),
  );

  const statementPeriodParam = searchParams.get('monthPeriod');
  const statementYearParam = searchParams.get('year');
  const effectivePeriod = statementPeriodParam ?? (!statementYearParam ? 'current' : null);
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

  const { divisionName: statementDivisionName } = resolveDivisionBranding(
    client.divisionId,
    invoices,
    divisions,
  );

  const statementPreviewProps = {
    number: `STMT-${statementPeriodParam ? statementPeriodParam.toUpperCase() : (statementYearParam ? statementYearParam : currentFY)}-${(client.businessName ?? client.name).slice(0, 3).toUpperCase()}`,
    status: statementStatus,
    issueDate: getSASTToday(),
    periodFrom,
    periodTo,
    org: buildOrgProps(statementDivisionName, divSettings, orgSettings),
    client: {
      name: client.businessName ?? client.name,
      email: client.email ?? undefined,
      phone: client.phone ?? undefined,
    },
    banking: buildBankingProps(divSettings),
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
      setSelectedInvoiceIds(new Set(filteredInvoices.map((inv) => inv.id)));
    } else {
      setSelectedInvoiceIds(new Set());
    }
  };

  const handleSelectAllQuotes = (checked: boolean) => {
    if (checked) {
      setSelectedQuoteIds(new Set(filteredQuotes.map((q) => q.id)));
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

      const pdf = new jsPDF({
        orientation: 'portrait',
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

        const elementId = `offscreen-doc-${id}`;
        if (!document.getElementById(elementId)) {
          setBulkLog((prev) =>
            prev.map((e) => (e.id === id ? { ...e, status: 'failed', error: 'Render container missing' } : e))
          );
          continue;
        }

        await appendElementToPdf(pdf, elementId, pageAdded);
        pageAdded = true;

        // Success for this item
        setBulkLog((prev) =>
          prev.map((e) => (e.id === id ? { ...e, status: 'success' } : e))
        );
      }

      setBulkProgress(100);
      pdf.save(sanitizePdfFileName(`Combined_${activeTab === 'invoices' ? 'Invoices' : 'Quotes'}_${client.businessName ?? 'Client'}`));
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
      setActiveRenderingDocType(activeTab === 'invoices' ? 'invoice' : 'quote');

      for (let i = 0; i < selectedIds.length; i++) {
        const id = selectedIds[i]!;
        const item =
          activeTab === 'invoices' ? invoices.find((inv) => inv.id === id) : quotes.find((q) => q.id === id);

        setActiveRenderingDocId(id);
        setBulkProgress(Math.round((i / selectedIds.length) * 100));

        await new Promise((resolve) => setTimeout(resolve, 250));

        const elementId = `offscreen-doc-${id}`;
        if (!document.getElementById(elementId)) {
          setBulkLog((prev) =>
            prev.map((e) => (e.id === id ? { ...e, status: 'failed', error: 'Render error' } : e))
          );
          continue;
        }

        let base64Pdf: string;
        try {
          base64Pdf = await elementToPdfBase64(elementId, `${activeTab === 'invoices' ? 'Invoice' : 'Quote'} PDF`);
        } catch (error) {
          setBulkLog((prev) =>
            prev.map((e) => (
              e.id === id
                ? { ...e, status: 'failed', error: error instanceof Error ? error.message : 'PDF generation failed' }
                : e
            ))
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

  const workspacePrintableElementId =
    selectedDocType === 'statement'
      ? 'workspace-statement-printable'
      : selectedDocType === 'payment'
      ? 'workspace-receipt-printable'
      : 'workspace-document-printable';
  const dialogPrintableElementId =
    selectedDocType === 'statement'
      ? 'dialog-statement-printable'
      : selectedDocType === 'payment'
      ? 'dialog-receipt-printable'
      : 'dialog-document-printable';
  const statementPdfParams = new URLSearchParams();
  if (statementPeriodParam) statementPdfParams.set('monthPeriod', statementPeriodParam);
  if (statementYearParam) statementPdfParams.set('year', statementYearParam);
  const statementPdfUrl = `/api/billing/pdf/statement/${client.id}${statementPdfParams.size ? `?${statementPdfParams.toString()}` : ''}`;
  const activePdfUrl =
    selectedDocType === 'invoice' && activeInvoice
      ? `/api/billing/pdf/invoice/${activeInvoice.id}`
      : selectedDocType === 'quote' && activeQuote
      ? `/api/billing/pdf/quote/${activeQuote.id}`
      : selectedDocType === 'payment' && activePayment
      ? `/api/billing/pdf/receipt/${activePayment.id}`
      : selectedDocType === 'statement'
      ? statementPdfUrl
      : undefined;

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
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
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
          {(client.email || client.phone) && (
            <div className="flex items-center gap-4 pl-0 text-sm text-muted-foreground">
              {client.email && (
                <span className="flex items-center gap-1">
                  <span className="text-xs">✉</span>
                  {client.email}
                </span>
              )}
              {client.phone && (
                <span className="flex items-center gap-1">
                  <span className="text-xs">📞</span>
                  {client.phone}
                </span>
              )}
            </div>
          )}
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
          <h2 className="text-base font-semibold">Client Details</h2>            <ClientEditForm
              client={client}
              divisions={divisions}
              updateAction={updateClientAction}
            />
        </CollapsibleContent>
      </Collapsible>

      {/* Metric Strip */}
      <ClientMetricStrip
        totalInvoiced={totalInvoicedWS}
        totalPaid={totalPaidWS}
        outstandingBalance={outstandingBalanceWS}
        overdueBalance={overdueBalanceWS}
        healthScore={healthWS.score}
        avgDaysToPay={avgDaysToPayWS}
        lastPaymentDate={lastPaymentWS?.date ?? null}
        lastPaymentAmount={lastPaymentWS ? Number(lastPaymentWS.amount) : null}
        agingBuckets={agingBuckets}
        onFilterChange={(filter) => {
          setMetricFilter(filter);
          setSelectedInvoiceIds(new Set());
          setSelectedQuoteIds(new Set());
        }}
        activeFilter={metricFilter}
      />

      {/* Quick Actions */}
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

      {metricFilter !== 'all' && (activeTab === 'invoices' || activeTab === 'quotes') && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-md px-3 py-1.5 border border-muted-foreground/10 self-start">
          <span>
            Showing <span className="font-semibold text-foreground capitalize">{metricFilter}</span>{' '}
            {activeTab} only
          </span>
          <button
            onClick={() => setMetricFilter('all')}
            className="text-muted-foreground hover:text-foreground transition-colors ml-1 font-medium"
            aria-label="Clear filter"
          >
            ✕
          </button>
        </div>
      )}

      {/* Tabbed Document split-pane browser */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="flex flex-col gap-4">
        <div className="sticky top-[3.25rem] z-30 bg-background -mx-6 px-6 pb-2 border-b flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="bg-transparent h-10 p-0 flex gap-2 shrink-0">
            <TabsTrigger value="invoices" className="bg-transparent border-b-2 border-transparent data-[state=active]:border-amber-500 rounded-none shadow-none px-4 py-2 text-sm font-medium">Invoices</TabsTrigger>
            <TabsTrigger value="quotes" className="bg-transparent border-b-2 border-transparent data-[state=active]:border-amber-500 rounded-none shadow-none px-4 py-2 text-sm font-medium">Quotations</TabsTrigger>
            <TabsTrigger value="payments" className="bg-transparent border-b-2 border-transparent data-[state=active]:border-amber-500 rounded-none shadow-none px-4 py-2 text-sm font-medium">Payments</TabsTrigger>
            <TabsTrigger value="statement" className="bg-transparent border-b-2 border-transparent data-[state=active]:border-amber-500 rounded-none shadow-none px-4 py-2 text-sm font-medium">Statement</TabsTrigger>
            <TabsTrigger value="credits" className="bg-transparent border-b-2 border-transparent data-[state=active]:border-amber-500 rounded-none shadow-none px-4 py-2 text-sm font-medium">Credits</TabsTrigger>
            <TabsTrigger value="analytics" className="bg-transparent border-b-2 border-transparent data-[state=active]:border-amber-500 rounded-none shadow-none px-4 py-2 text-sm font-medium">
              Analytics
            </TabsTrigger>
          </TabsList>

          {/* Action buttons are displayed contextually inside the slide-over drawer */}
        </div>

        {/* Split pane: list (left) + preview (right on lg+) */}
        <div className="flex flex-col lg:flex-row gap-4 items-start w-full">

          {/* Document list — 40% on lg+, full width on mobile */}
          <div className={cn("w-full shrink-0", !['analytics', 'credits'].includes(activeTab) && "lg:w-[40%]")}>
            <Card className="w-full shadow-sm border-muted-foreground/10 bg-card overflow-hidden">
            <CardHeader className="p-4 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold capitalize">
                  {activeTab === 'analytics' ? 'Client Analytics' : activeTab}
                </CardTitle>
                <CardDescription className="text-xs">
                  {activeTab === 'statement'
                    ? 'Configure and preview the client account statement'
                    : activeTab === 'analytics'
                    ? 'Full financial health, ageing analysis, and billing activity'
                    : 'Select documents to view or batch process'}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {/* INVOICES TAB */}
              <TabsContent value="invoices" className="m-0">
                {filteredInvoices.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">
                    {metricFilter === 'all'
                      ? 'No invoices for this client.'
                      : `No ${metricFilter} invoices.`}
                  </p>
                ) : (
                  <Table className="text-xs">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">
                          <Checkbox
                            checked={filteredInvoices.length > 0 && selectedInvoiceIds.size === filteredInvoices.length}
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
                      {filteredInvoices.map((inv) => (
                        <TableRow
                          key={inv.id}
                          className={`cursor-pointer hover:bg-muted/30 transition-colors ${
                            selectedDocId === inv.id && selectedDocType === 'invoice' ? 'bg-muted/50 font-medium' : ''
                          }`}
                          onClick={() => {
                            setSelectedDocId(inv.id);
                            setSelectedDocType('invoice');
                            if (!isLargeScreen) setIsPreviewOpen(true);
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
                {filteredQuotes.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">
                    {metricFilter === 'all'
                      ? 'No quotations for this client.'
                      : `No ${metricFilter} quotations.`}
                  </p>
                ) : (
                  <Table className="text-xs">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">
                          <Checkbox
                            checked={filteredQuotes.length > 0 && selectedQuoteIds.size === filteredQuotes.length}
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
                      {filteredQuotes.map((q) => (
                        <TableRow
                          key={q.id}
                          className={`cursor-pointer hover:bg-muted/30 transition-colors ${
                            selectedDocId === q.id && selectedDocType === 'quote' ? 'bg-muted/50 font-medium' : ''
                          }`}
                          onClick={() => {
                            setSelectedDocId(q.id);
                            setSelectedDocType('quote');
                            if (!isLargeScreen) setIsPreviewOpen(true);
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
                        <TableHead>Receipt #</TableHead>
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
                            if (!isLargeScreen) setIsPreviewOpen(true);
                          }}
                        >
                          <TableCell className="tabular-nums">{fmtDate(entry.date)}</TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {generateReceiptNumber(entry.id, entry.divisionName)}
                          </TableCell>
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
                        variant={effectivePeriod === 'current' ? 'default' : 'outline'}
                        size="xs"
                        onClick={() => updateStatementFilter('monthPeriod', 'current')}
                        className="text-xs px-3 py-1.5 h-8"
                      >
                        Current Month
                      </Button>
                      <Button
                        variant={effectivePeriod === 'previous' ? 'default' : 'outline'}
                        size="xs"
                        onClick={() => updateStatementFilter('monthPeriod', 'previous')}
                        className="text-xs px-3 py-1.5 h-8"
                      >
                        Previous Month
                      </Button>
                      <Button
                        variant={effectivePeriod === 'past3' ? 'default' : 'outline'}
                        size="xs"
                        onClick={() => updateStatementFilter('monthPeriod', 'past3')}
                        className="text-xs px-3 py-1.5 h-8"
                      >
                        Past 3 Months
                      </Button>
                      <Button
                        variant={effectivePeriod === 'past6' ? 'default' : 'outline'}
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

                  {!isLargeScreen && (
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
                  )}
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
                          <TableHead className="text-right">Debit (+)</TableHead>
                          <TableHead className="text-right">Credit (-)</TableHead>
                          <TableHead className="text-right">Balance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {statementTransactions.map((tx, idx) => (
                          <TableRow key={idx} className="hover:bg-muted/30 transition-colors">
                            <TableCell className="tabular-nums">{fmtDate(tx.date)}</TableCell>
                            <TableCell className="font-semibold">
                              {tx.reference === '-' ? '' : tx.reference}
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-red-500 font-semibold">
                              {tx.debit ? formatZAR(tx.debit) : ''}
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-emerald-500 font-semibold">
                              {tx.credit ? formatZAR(tx.credit) : ''}
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

              {/* ANALYTICS TAB */}
              <TabsContent value="analytics" className="m-0 p-4">
                <ClientFinancialDashboard
                  invoices={invoices}
                  quotes={quotes}
                  payments={payments.data}
                />
              </TabsContent>

              {/* CREDITS TAB */}
              <TabsContent value="credits" className="m-0 p-6 flex flex-col gap-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex flex-col gap-1">
                    <h3 className="text-base font-semibold">Client Credits</h3>
                    <p className="text-xs text-muted-foreground">Manage credit notes and unallocated overpayments for this client</p>
                  </div>
                  <Button size="sm" onClick={() => setShowIssueCreditDialog(true)}>
                    <Plus className="size-4 mr-1" />
                    Issue Credit Note
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1 p-4 rounded-lg border bg-muted/20">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Issued</span>
                    <span className="text-xl font-bold tabular-nums">
                      {formatZAR(
                        creditSummary?.creditNotes.reduce((sum: number, n: any) => sum + n.amount, 0) ?? 0
                      )}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 p-4 rounded-lg border bg-emerald-50/50 border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-800/20">
                    <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Active Credits</span>
                    <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {formatZAR(creditSummary?.activeCredit ?? 0)}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 p-4 rounded-lg border bg-amber-50/50 border-amber-100 dark:bg-amber-950/20 dark:border-amber-800/20">
                    <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Expired Credits</span>
                    <span className="text-xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                      {formatZAR(creditSummary?.expiredCredit ?? 0)}
                    </span>
                  </div>
                </div>

                <Tabs defaultValue="notes" className="w-full">
                  <TabsList className="grid grid-cols-2 w-[300px]">
                    <TabsTrigger value="notes">Issued Notes</TabsTrigger>
                    <TabsTrigger value="history">Transaction Feed</TabsTrigger>
                  </TabsList>
                  <TabsContent value="notes" className="mt-4 border rounded-md overflow-hidden bg-card">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Document #</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Reason</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="text-right">Remaining</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {!creditSummary?.creditNotes || creditSummary.creditNotes.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="h-24 text-center text-muted-foreground text-xs">
                              No credit notes found for this client.
                            </TableCell>
                          </TableRow>
                        ) : (
                          creditSummary.creditNotes.map((note: any) => (
                            <TableRow key={note.id} className="hover:bg-muted/40 transition-colors">
                              <TableCell className="font-medium text-xs">{note.documentNumber}</TableCell>
                              <TableCell className="text-xs">
                                {note.type === 'overpayment' && 'Overpayment'}
                                {note.type === 'manual_adjustment' && 'Manual Adjustment'}
                                {note.type === 'credit_note' && 'Credit Note'}
                                {note.type === 'promotional' && 'Promotional'}
                                {note.type === 'refund_reversal' && 'Refund Reversal'}
                              </TableCell>
                              <TableCell className="text-xs truncate max-w-[200px]" title={note.reason ?? ''}>
                                {note.reason ?? '-'}
                              </TableCell>
                              <TableCell className="text-right tabular-nums font-semibold text-xs">
                                {formatZAR(note.amount)}
                              </TableCell>
                              <TableCell className="text-right tabular-nums text-xs">
                                {note.amountRemaining > 0 ? (
                                  <span className="font-bold text-emerald-600">{formatZAR(note.amountRemaining)}</span>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {note.status === 'active' && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                                    <CheckCircle2 className="size-3" /> Active
                                  </span>
                                )}
                                {note.status === 'partially_applied' && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400">
                                    <Clock className="size-3" /> Partial
                                  </span>
                                )}
                                {note.status === 'fully_applied' && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                                    Used
                                  </span>
                                )}
                                {note.status === 'expired' && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
                                    <AlertCircle className="size-3" /> Expired
                                  </span>
                                )}
                                {note.status === 'void' && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400">
                                    Void
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {fmtDate(note.createdAt)}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </TabsContent>
                  <TabsContent value="history" className="mt-4">
                    <CreditHistoryTable entries={creditHistory ?? []} />
                  </TabsContent>
                </Tabs>
              </TabsContent>
            </CardContent>
          </Card>
          </div>

          {/* Preview panel — 60% on lg+, hidden on mobile (uses Dialog instead) */}
          {!['analytics', 'credits'].includes(activeTab) && (
            <div
              ref={previewPanelRef}
              className="hidden lg:flex lg:flex-col lg:w-[60%] sticky top-[3.25rem] max-h-[calc(100vh-4rem)] overflow-y-auto w-full"
            >
            {/* ── Inline Preview Panel (lg+ only) ─────────────────────── */}
            <Card className="shadow-sm border-muted-foreground/10 bg-card overflow-hidden text-card-foreground">
              {/* Panel header with action buttons */}
              <div className="p-4 border-b flex flex-row items-center justify-between shrink-0">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold">
                    {selectedDocType === 'invoice' && activeInvoice?.documentNumber}
                    {selectedDocType === 'quote' && activeQuote?.documentNumber}
                  {selectedDocType === 'payment' && activePayment && generateReceiptNumber(activePayment.id, activePayment.divisionName)}
                  {selectedDocType === 'statement' && 'Statement'}
                  {!selectedDocId && selectedDocType !== 'statement' && 'No document selected'}
                </span>
                <span className="text-xs text-muted-foreground capitalize">
                  {selectedDocType === 'statement' ? statementPeriodLabel : selectedDocType}
                </span>
              </div>

              {/* Action buttons — same as Dialog header */}
              <div className="flex items-center gap-2 print:hidden">
                {selectedDocType !== 'statement' && selectedDocId && (
                  <>
                    <PrintButton label="Print" documentTitle={documentTitle} />
                    <ExportPdfButton fileName={documentTitle} elementId={workspacePrintableElementId} pdfUrl={activePdfUrl} />
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
                      elementId={workspacePrintableElementId}
                      pdfUrl={statementPdfUrl}
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
                      printableElementId={workspacePrintableElementId}
                      pdfUrl={activePdfUrl}
                      statementPdfUrl={statementPdfUrl}
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
                      printableElementId={workspacePrintableElementId}
                      pdfUrl={activePdfUrl}
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
                      receiptNumber={generateReceiptNumber(activePayment.id, activePayment.divisionName)}
                      defaultRecipientEmail={client.email ?? ''}
                      printableElementId={workspacePrintableElementId}
                      pdfUrl={activePdfUrl}
                    />
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/billing/payments/${activePayment.id}`}>View Page</Link>
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Document render area */}
              <div className="p-4 bg-muted/5">
                {selectedDocType === 'statement' ? (
                  <div className="bg-card rounded-lg p-4 overflow-x-auto">
                    <DocumentPreview id={workspacePrintableElementId} type="statement" {...statementPreviewProps} />
                  </div>
                ) : selectedDocId ? (
                  <div className="bg-card rounded-lg p-4 overflow-x-auto">
                    {selectedDocType === 'invoice' && activeInvoice && (
                      <DocumentPreview id={workspacePrintableElementId} type="invoice" {...getInvoicePreviewProps(activeInvoice)} />
                    )}
                    {selectedDocType === 'quote' && activeQuote && (
                      <DocumentPreview id={workspacePrintableElementId} type="quote" {...getQuotePreviewProps(activeQuote)} />
                    )}
                    {selectedDocType === 'payment' && activePayment && (
                      <PaymentReceiptPreview
                        id={workspacePrintableElementId}
                        payment={activePayment}
                        client={client}
                        divSettings={divSettings}
                      />
                    )}
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center border border-dashed rounded-lg bg-card shadow-sm">
                    <span className="text-sm text-muted-foreground">Select a document to preview</span>
                  </div>
                )}
              </div>
            </Card>
          </div>
          )}

        </div>

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-6 bg-background rounded-lg shadow-2xl">
          <DialogHeader className="p-0 pb-4 border-b flex flex-row items-center justify-between shrink-0">
            <div className="flex flex-col gap-1">
              <DialogTitle className="text-base font-bold flex gap-2 items-center">
                {selectedDocType === 'invoice' && activeInvoice?.documentNumber}
                {selectedDocType === 'quote' && activeQuote?.documentNumber}                  {selectedDocType === 'payment' && activePayment && generateReceiptNumber(activePayment.id, activePayment.divisionName)}
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
                  <ExportPdfButton fileName={documentTitle} elementId={dialogPrintableElementId} pdfUrl={activePdfUrl} />
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
                    elementId={dialogPrintableElementId}
                    pdfUrl={statementPdfUrl}
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
                    printableElementId={dialogPrintableElementId}
                    pdfUrl={activePdfUrl}
                    statementPdfUrl={statementPdfUrl}
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
                    printableElementId={dialogPrintableElementId}
                    pdfUrl={activePdfUrl}
                  />
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/billing/quotes/${activeQuote.id}/edit`}>Edit</Link>
                  </Button>
                </>
              )}                {selectedDocType === 'payment' && activePayment && (
                  <>
                    <EmailReceiptDialog
                      incomeId={activePayment.id}
                      receiptNumber={generateReceiptNumber(activePayment.id, activePayment.divisionName)}
                      defaultRecipientEmail={client.email ?? ''}
                      printableElementId={dialogPrintableElementId}
                      pdfUrl={activePdfUrl}
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
                <DocumentPreview id={dialogPrintableElementId} type="statement" {...statementPreviewProps} />
              </div>
            ) : selectedDocId ? (
              <div className="bg-card rounded-lg p-4 overflow-x-auto">
                {selectedDocType === 'invoice' && activeInvoice && (
                  <DocumentPreview id={dialogPrintableElementId} type="invoice" {...getInvoicePreviewProps(activeInvoice)} />
                )}
                {selectedDocType === 'quote' && activeQuote && (
                  <DocumentPreview id={dialogPrintableElementId} type="quote" {...getQuotePreviewProps(activeQuote)} />
                )}
                {selectedDocType === 'payment' && activePayment && (
                  <PaymentReceiptPreview
                    id={dialogPrintableElementId}
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

          {navigableIds.length > 1 && currentNavIndex >= 0 && (
            <div className="flex items-center justify-between pt-3 border-t mt-2">
              <Button
                variant="ghost"
                size="sm"
                disabled={currentNavIndex === 0}
                onClick={() => {
                  const prevId = navigableIds[currentNavIndex - 1];
                  if (prevId) setSelectedDocId(prevId);
                }}
              >
                ← Previous
              </Button>
              <span className="text-xs text-muted-foreground">
                {currentNavIndex + 1} of {navigableIds.length}
              </span>
              <Button
                variant="ghost"
                size="sm"
                disabled={currentNavIndex === navigableIds.length - 1}
                onClick={() => {
                  const nextId = navigableIds[currentNavIndex + 1];
                  if (nextId) setSelectedDocId(nextId);
                }}
              >
                Next →
              </Button>
            </div>
          )}
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

      {/* Issue Credit Note Dialog */}
      <IssueCreditNoteDialog
        open={showIssueCreditDialog}
        onOpenChange={setShowIssueCreditDialog}
        clients={[
          {
            id: client.id,
            name: client.name,
            businessName: client.businessName,
          },
        ]}
        divisions={clientDivisions}
      />
    </div>
  );
}
