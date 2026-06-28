import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { portalAuth } from '@/lib/auth';
import { getDb, clients, invoices, quotations, eq, and } from '@pmg/db';
import { generateBillingPdf } from '@/lib/server-billing-pdf';

type PdfType = 'invoice' | 'quote' | 'statement';

const TYPES = new Set<PdfType>(['invoice', 'quote', 'statement']);

export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ type: string; id: string }> },
) {
  const session = await portalAuth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const { type, id } = await params;
  if (!TYPES.has(type as PdfType)) {
    return NextResponse.json({ error: 'Unsupported PDF type.' }, { status: 400 });
  }

  const db = getDb();

  // Fetch and verify the client associated with the authenticated user
  const [client] = await db
    .select()
    .from(clients)
    .where(eq(clients.userId, session.user.id))
    .limit(1);

  if (!client || !client.isActive) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  // Enforce document ownership checks to prevent IDOR
  if (type === 'invoice') {
    const [invoice] = await db
      .select()
      .from(invoices)
      .where(and(eq(invoices.id, id), eq(invoices.clientId, client.id)))
      .limit(1);

    if (!invoice || invoice.status === 'draft') {
      return NextResponse.json({ error: 'Document not found.' }, { status: 404 });
    }
  } else if (type === 'quote') {
    const [quote] = await db
      .select()
      .from(quotations)
      .where(and(eq(quotations.id, id), eq(quotations.clientId, client.id)))
      .limit(1);

    if (!quote || quote.status === 'draft') {
      return NextResponse.json({ error: 'Document not found.' }, { status: 404 });
    }
  } else if (type === 'statement') {
    // Clients can only fetch their own statements
    if (id !== client.id) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }
  }

  // Read the monthPeriod search parameter for statements
  const url = new URL(req.url);
  const monthPeriod = url.searchParams.get('monthPeriod');
  const filters = {
    ...(monthPeriod ? { monthPeriod: monthPeriod as 'current' | 'previous' | 'past3' | 'past6' } : {}),
  };

  // Generate the PDF
  const result = await generateBillingPdf(type as PdfType, id, filters);
  if (!result) {
    return NextResponse.json({ error: 'Document not found.' }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(result.buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${result.fileName}"`,
      'Cache-Control': 'no-store',
    },
  });
}
