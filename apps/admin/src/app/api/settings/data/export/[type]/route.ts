import { NextResponse } from 'next/server';

import { buildExport, type ExportType } from '@/lib/data-export';
import { getSessionOrRedirect, requireRole } from '@/lib/auth';

const exportTypes = new Set<ExportType>([
  'income-expenses',
  'invoices',
  'clients',
  'full-json',
]);

export async function GET(
  _request: Request,
  context: { params: Promise<{ type: string }> },
) {
  const session = await getSessionOrRedirect();
  if (!requireRole(session, 'admin')) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  const { type } = await context.params;
  if (!exportTypes.has(type as ExportType)) {
    return new NextResponse('Unknown export type', { status: 404 });
  }

  const exportFile = await buildExport(type as ExportType);

  return new NextResponse(exportFile.body, {
    headers: {
      'Content-Type': exportFile.contentType,
      'Content-Disposition': `attachment; filename="${exportFile.filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
