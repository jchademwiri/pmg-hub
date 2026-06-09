import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  getClientById,
  getAllIncome,
  getAllQuotations,
  getAllInvoices,
  getInvoiceById,
  getQuotationById,
  getClientStatement,
  getStatementYears,
  getDivisionBillingSettings,
  getIncomeAllocations,
  type InvoiceDetail,
  type QuotationDetail,
} from '@pmg/db';
import { updateClient } from '@/app/actions/clients';
import { ClientBillingWorkspace } from './client-billing-workspace';

export const dynamic = 'force-dynamic';

interface ClientDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ year?: string; monthPeriod?: string }>;
}

export async function generateMetadata({ params }: ClientDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const client = await getClientById(id);
  return { title: client ? `${client.businessName ?? client.name}` : 'Client' };
}

export default async function ClientDetailPage({ params, searchParams }: ClientDetailPageProps) {
  const { id } = await params;
  const { year: yearParam, monthPeriod: monthPeriodParam } = await searchParams;

  const now = new Date();
  const currentFY = now.getMonth() < 2 ? now.getFullYear() - 1 : now.getFullYear();

  const isMonthPeriodValid =
    monthPeriodParam === 'current' ||
    monthPeriodParam === 'previous' ||
    monthPeriodParam === 'past3' ||
    monthPeriodParam === 'past6';

  // Default to 'current' monthPeriod if neither monthPeriod nor year filter is specified in URL
  const monthPeriod = isMonthPeriodValid
    ? monthPeriodParam
    : !yearParam
    ? 'current'
    : undefined;

  // Mutual exclusivity
  const year = monthPeriod ? undefined : yearParam ? parseInt(yearParam, 10) : undefined;

  // Parallel server data fetching
  const [client, incomeEntries, quotesList, invoicesList, statement, availableYears] =
    await Promise.all([
      getClientById(id),
      getAllIncome({ clientId: id }),
      getAllQuotations({ clientId: id }),
      getAllInvoices({ clientId: id }),
      getClientStatement(id, monthPeriod ? { monthPeriod } : year ? { year } : undefined),
      getStatementYears(id),
    ]);

  if (!client) notFound();

  // Load full document details (including line items) concurrently
  const [invoicesWithDetails, quotesWithDetails, paymentsWithAllocations] = await Promise.all([
    Promise.all(invoicesList.data.map((inv) => getInvoiceById(inv.id))),
    Promise.all(quotesList.data.map((q) => getQuotationById(q.id))),
    Promise.all(
      incomeEntries.data.map(async (pay) => {
        const allocations = await getIncomeAllocations(pay.id);
        return {
          ...pay,
          allocations,
        };
      })
    ),
  ]);

  const cleanInvoices = invoicesWithDetails.filter((i): i is InvoiceDetail => i !== null);
  const cleanQuotes = quotesWithDetails.filter((q): q is QuotationDetail => q !== null);

  const cleanPayments = {
    ...incomeEntries,
    data: paymentsWithAllocations,
  };

  const primaryDivisionId = cleanInvoices[0]?.divisionId ?? cleanQuotes[0]?.divisionId;
  const divSettings = primaryDivisionId
    ? await getDivisionBillingSettings(primaryDivisionId)
    : null;

  return (
    <ClientBillingWorkspace
      client={client}
      invoices={cleanInvoices}
      quotes={cleanQuotes}
      payments={cleanPayments}
      statement={statement}
      availableYears={availableYears}
      currentFY={currentFY}
      divSettings={divSettings}
      updateClientAction={updateClient.bind(null, id)}
    />
  );
}
