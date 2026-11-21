import { NextResponse } from 'next/server';
import { getAllLeaveEntries, getOrSeedLeaveSettings } from '@pmg/db';
import { auth, requireRole } from '@/lib/auth';
import {
  buildLeaveReportCsv,
  buildLeaveReportData,
  getFYEndYearForDate,
  getTodaySAST,
  type LeaveReportScope,
} from '@/lib/leave';
import { renderLeaveReportPdf } from '@/lib/leave-report-pdf';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    if (!requireRole(session, 'admin')) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const format = (searchParams.get('format') || 'pdf').toLowerCase();
    const scopeParam = (searchParams.get('scope') || 'all').toLowerCase();
    const fyParam = searchParams.get('fy');

    if (format !== 'pdf' && format !== 'csv') {
      return new NextResponse('Invalid format. Expected "pdf" or "csv".', { status: 400 });
    }

    const scope: LeaveReportScope = scopeParam === 'taken' ? 'taken' : 'all';
    const todayDate = getTodaySAST();
    const defaultFyEndYear = getFYEndYearForDate(todayDate);

    let fyEndYear = defaultFyEndYear;
    if (fyParam) {
      const parsed = Number(fyParam);
      if (!Number.isInteger(parsed) || parsed < 2000 || parsed > 2100) {
        return new NextResponse('Invalid financial year parameter.', { status: 400 });
      }
      fyEndYear = parsed;
    }

    const [settings, entries] = await Promise.all([getOrSeedLeaveSettings(), getAllLeaveEntries()]);

    const report = buildLeaveReportData(settings, entries, {
      fyEndYear,
      scope,
      todayDate,
      employeeName: session.user.name || 'Jacob Chademwiri',
    });

    const scopeSuffix = scope === 'taken' ? '-Taken' : '';

    if (format === 'csv') {
      const csv = buildLeaveReportCsv(report);
      const filename = `Leave-History-${report.fy.slug}${scopeSuffix}-${todayDate}.csv`;
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-store',
        },
      });
    }

    const pdfBytes = await renderLeaveReportPdf(report);
    const filename = `Leave-Statement-${report.fy.slug}${scopeSuffix}-${todayDate}.pdf`;

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: unknown) {
    console.error('[API:LeaveExport Error]', error);
    return new NextResponse('Failed to generate leave report.', { status: 500 });
  }
}
