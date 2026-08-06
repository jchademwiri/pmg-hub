import { NextResponse } from 'next/server';

import { generateAccountingPdf, isAccountingReportType } from '@pmg/accounting/server-accounting-pdf';
import { getSessionOrRedirect, requireRole } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ type: string }> },
) {
  const session = await getSessionOrRedirect();
  if (!requireRole(session, 'admin')) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  const { type } = await params;
  if (!isAccountingReportType(type)) {
    return NextResponse.json({ error: 'Unknown export type.' }, { status: 404 });
  }

  const url = new URL(req.url);
  const period = url.searchParams.get('period') ?? undefined;
  const accountId = url.searchParams.get('accountId') ?? undefined;

  const result = await generateAccountingPdf(type, { period, accountId });
  if (!result) {
    return NextResponse.json({ error: 'Report not available.' }, { status: 404 });
  }
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return new NextResponse(new Uint8Array(result.buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${result.fileName}"`,
      'Cache-Control': 'no-store',
    },
  });
}
