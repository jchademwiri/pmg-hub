import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  getDb,
  creditNotes,
  creditApplications,
  creditRefunds,
  invoices,
  clients,
  divisions,
  user,
  eq,
  sql,
  desc,
} from '@pmg/db';
import { formatZAR, fmtDate } from '@/lib/format';
import { CreditNoteDetailClient } from './credit-note-detail-client';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const db = getDb();
  const [note] = await db
    .select({ documentNumber: creditNotes.documentNumber })
    .from(creditNotes)
    .where(eq(creditNotes.id, id))
    .limit(1);
  return {
    title: note ? `Credit Note ${note.documentNumber}` : 'Credit Note Details',
  };
}

export default async function CreditNoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();

  // Fetch credit note
  const [note] = await db
    .select()
    .from(creditNotes)
    .where(eq(creditNotes.id, id))
    .limit(1);

  if (!note) notFound();

  // Fetch client, division, creator
  const [client] = await db
    .select({ id: clients.id, name: clients.name, businessName: clients.businessName })
    .from(clients)
    .where(eq(clients.id, note.clientId))
    .limit(1);

  const [division] = await db
    .select({ id: divisions.id, name: divisions.name })
    .from(divisions)
    .where(eq(divisions.id, note.divisionId))
    .limit(1);

  const [creator] = await db
    .select({ name: user.name, email: user.email })
    .from(user)
    .where(eq(user.id, note.createdBy))
    .limit(1);

  // Fetch applications (which invoices this credit was applied to)
  const apps = await db
    .select({
      id: creditApplications.id,
      amount: creditApplications.amount,
      appliedAt: creditApplications.appliedAt,
      invoiceId: creditApplications.invoiceId,
      invoiceNumber: invoices.documentNumber,
      invoiceStatus: invoices.status,
    })
    .from(creditApplications)
    .innerJoin(invoices, eq(invoices.id, creditApplications.invoiceId))
    .where(eq(creditApplications.creditNoteId, id))
    .orderBy(desc(creditApplications.appliedAt));

  // Fetch refunds
  const refunds = await db
    .select()
    .from(creditRefunds)
    .where(eq(creditRefunds.creditNoteId, id))
    .orderBy(desc(creditRefunds.createdAt));

  // Fetch original invoice if linked
  let originalInvoice: { documentNumber: string } | null = null;
  if (note.originalInvoiceId) {
    const [inv] = await db
      .select({ documentNumber: invoices.documentNumber })
      .from(invoices)
      .where(eq(invoices.id, note.originalInvoiceId))
      .limit(1);
    originalInvoice = inv ?? null;
  }

  return (
    <CreditNoteDetailClient
      note={{
        id: note.id,
        documentNumber: note.documentNumber,
        status: note.status,
        type: note.type,
        reason: note.reason,
        amount: parseFloat(note.amount),
        amountRemaining: parseFloat(note.amountRemaining),
        createdAt: note.createdAt?.toISOString() ?? '',
        expiresAt: note.expiresAt?.toISOString() ?? null,
        voidedAt: note.voidedAt?.toISOString() ?? null,
      }}
      client={client ? { id: client.id, name: client.businessName ?? client.name } : null}
      division={division ?? null}
      creator={creator ?? null}
      originalInvoice={originalInvoice}
      applications={apps.map((a) => ({
        id: a.id,
        amount: parseFloat(a.amount),
        appliedAt: a.appliedAt?.toISOString() ?? '',
        invoiceId: a.invoiceId,
        invoiceNumber: a.invoiceNumber,
        invoiceStatus: a.invoiceStatus,
      }))}
      refunds={refunds.map((r) => ({
        id: r.id,
        amount: parseFloat(r.amount),
        refundDate: r.refundDate,
        refundMethod: r.refundMethod,
        reference: r.reference,
        description: r.description,
        createdAt: r.createdAt?.toISOString() ?? '',
      }))}
    />
  );
}
