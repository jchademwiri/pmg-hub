import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  getIncomeById,
  getIncomeAllocations,
  getClientById,
  getDivisionBillingSettings,
  getAllDivisions,
  getAllClients,
} from '@pmg/db';
import { getMinAllowedDate, isPeriodClosed } from '@/lib/date-rules';
import { generateReceiptNumber } from '@pmg/utils';
import { PaymentDetailClient } from './payment-detail-client';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const payment = await getIncomeById(id);
  if (!payment) return { title: 'Payment Receipt' };

  // Fetch division name for prefix
  const divisions = await getAllDivisions();
  const division = divisions.find((d) => d.id === payment.divisionId);
  const divisionName = division?.name ?? 'DIV';
  const receiptNumber = generateReceiptNumber(payment.id, divisionName);

  return { title: `Receipt ${receiptNumber}` };
}

export default async function PaymentDetailPage({ params }: Props) {
  const { id } = await params;
  const payment = await getIncomeById(id);
  if (!payment) notFound();

  const [allocations, client, divSettings, divisions, clients, minDate, isLocked] = await Promise.all([
    getIncomeAllocations(payment.id),
    payment.clientId ? getClientById(payment.clientId) : null,
    getDivisionBillingSettings(payment.divisionId),
    getAllDivisions(),
    getAllClients(),
    getMinAllowedDate(),
    isPeriodClosed(payment.date),
  ]);

  const resolvedClient = client ?? {
    name: payment.clientName || 'General Client',
    businessName: 'General / Non-Client',
    email: null,
    phone: null,
    address: null,
  };

  const paymentWithAllocations = {
    ...payment,
    allocations,
  };

  const division = divisions.find((d) => d.id === payment.divisionId);
  const receiptNumber = generateReceiptNumber(payment.id, division?.name ?? 'DIV');
  const amount = Number(payment.amount);
  const allocatedSum = allocations.reduce((sum, a) => sum + Number(a.amount), 0);
  const creditBalance = Math.max(0, amount - allocatedSum);

  return (
    <PaymentDetailClient
      payment={paymentWithAllocations}
      client={resolvedClient}
      divSettings={divSettings}
      receiptNumber={receiptNumber}
      amount={amount}
      allocatedSum={allocatedSum}
      creditBalance={creditBalance}
      isLocked={isLocked}
      pdfUrl={`/api/billing/pdf/receipt/${payment.id}`}
      divisions={divisions}
      clients={clients}
      minDate={minDate}
    />
  );
}
