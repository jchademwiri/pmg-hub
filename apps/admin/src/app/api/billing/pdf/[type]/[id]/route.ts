import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

import { auth } from '@/lib/auth';
import { generateBillingPdf } from '@/lib/server-billing-pdf';

type PdfType = 'invoice' | 'quote' | 'statement' | 'receipt';

const TYPES = new Set<PdfType>(['invoice', 'quote', 'statement', 'receipt']);
const PERIODS = new Set(['current', 'previous', 'past3', 'past6']);

export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ type: string; id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const { type, id } = await params;
  if (!TYPES.has(type as PdfType)) {
    return NextResponse.json({ error: 'Unsupported PDF type.' }, { status: 400 });
  }

  const url = new URL(req.url);
  const year = url.searchParams.get('year');
  const monthPeriod = url.searchParams.get('monthPeriod');
  const yearNum = year == null ? undefined : Number(year);
  if (year != null && (year.trim() === '' || !Number.isFinite(yearNum) || !Number.isInteger(yearNum))) {
    return NextResponse.json({ error: 'Invalid year parameter.' }, { status: 400 });
  }

  const filters = {
    ...(yearNum != null ? { year: yearNum } : {}),
    ...(monthPeriod && PERIODS.has(monthPeriod)
      ? { monthPeriod: monthPeriod as 'current' | 'previous' | 'past3' | 'past6' }
      : {}),
  };

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
