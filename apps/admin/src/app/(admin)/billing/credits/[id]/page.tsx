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
import { SetPageLabel } from '@/components/navigation/page-header-context';
import { CreditNoteDetailClient } from './credit-note-detail-client';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
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

export default async function CreditNoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = getDb();

  // Fetch credit note
  const [note] = await db.select().from(creditNotes).where(eq(creditNotes.id, id)).limit(1);

  if (!note) notFound();

  // Fetch client, division, creator, applications, refunds, and original invoice in parallel
  const [[client], [division], [creator], apps, refunds, [originalInvoice]] = await Promise.all([
    db
      .select({
        id: clients.id,
        name: clients.name,
        businessName: clients.businessName,
        email: clients.email,
      })
      .from(clients)
      .where(eq(clients.id, note.clientId))
      .limit(1),
    db
      .select({ id: divisions.id, name: divisions.name })
      .from(divisions)
      .where(eq(divisions.id, note.divisionId))
      .limit(1),
    db
      .select({ name: user.name, email: user.email })
      .from(user)
      .where(eq(user.id, note.createdBy))
      .limit(1),
    db
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
      .orderBy(desc(creditApplications.appliedAt)),
    db
      .select()
      .from(creditRefunds)
      .where(eq(creditRefunds.creditNoteId, id))
      .orderBy(desc(creditRefunds.createdAt)),
    note.originalInvoiceId
      ? db
          .select({ id: invoices.id, documentNumber: invoices.documentNumber })
          .from(invoices)
          .where(eq(invoices.id, note.originalInvoiceId))
          .limit(1)
      : Promise.resolve([undefined]),
  ]);

  return (
    <>
      <SetPageLabel value="Credit Note" />
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
        client={
          client
            ? {
                id: client.id,
                name: client.businessName ?? client.name,
                email: client.email ?? null,
              }
            : null
        }
        division={division ?? null}
        creator={creator ?? null}
        originalInvoice={originalInvoice ?? null}
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
    </>
  );
}
