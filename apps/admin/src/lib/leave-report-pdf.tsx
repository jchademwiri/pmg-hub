import 'server-only';

import React from 'react';
import type { LeaveType } from '@pmg/db';
import {
  Document,
  Page,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  renderDocumentToPdf,
} from '@pmg/billing/pdf';
import { formatLeaveDate, type LeaveReportData } from '@/lib/leave';

const TYPE_ACCENT: Record<LeaveType, { bg: string; fg: string; border: string }> = {
  ANNUAL: { bg: '#ecfdf5', fg: '#047857', border: '#a7f3d0' },
  SICK: { bg: '#f0f9ff', fg: '#0369a1', border: '#bae6fd' },
  FAMILY_RESPONSIBILITY: { bg: '#f5f3ff', fg: '#6d28d9', border: '#ddd6fe' },
};

const STATUS_STYLE: Record<
  'Taken' | 'In Progress' | 'Planned',
  { bg: string; fg: string; border: string }
> = {
  Taken: { bg: '#ecfdf5', fg: '#047857', border: '#a7f3d0' },
  'In Progress': { bg: '#fffbeb', fg: '#b45309', border: '#fde68a' },
  Planned: { bg: '#eff6ff', fg: '#1d4ed8', border: '#bfdbfe' },
};

export function LeaveReportPdfDocument({ report }: { report: LeaveReportData }) {
  const { annual, sick, family } = report.balances;
  const hasRisk = annual.atRiskOfForfeiture > 0;

  return (
    <Document>
      <Page size="A4" orientation="portrait" style={{ padding: 32, backgroundColor: '#ffffff' }}>
        {/* Top Accent Bar */}
        <div style={{ width: '100%', height: 4, backgroundColor: '#0f172a', marginBottom: 18 }} />

        {/* Statement Header */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            paddingBottom: 16,
            borderBottom: '1px solid #e4e4e7',
            marginBottom: 18,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', maxWidth: '58%' }}>
            <span style={{ fontSize: 21, fontWeight: 700, color: '#0f172a', marginBottom: 5 }}>
              Personal Leave Statement
            </span>
            <span style={{ fontSize: 11.5, color: '#27272a', marginBottom: 3 }}>
              Employee: <strong>{report.employeeName}</strong>
            </span>
            <span style={{ fontSize: 9.5, color: '#71717a' }}>
              Employment Start: {formatLeaveDate(report.employmentStartDate)} · Balance Anchor:{' '}
              {formatLeaveDate(report.anchorDate)}
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              maxWidth: '42%',
            }}
          >
            <span
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: '#1e3a8a',
                marginBottom: 4,
              }}
            >
              {report.fy.label}
            </span>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#27272a', marginBottom: 3 }}>
              {report.fy.periodLabel}
            </span>
            <span style={{ fontSize: 9.5, color: '#71717a' }}>
              {report.scope === 'taken' ? 'Taken Leave Only' : 'Full Schedule & History'} ·
              Generated {formatLeaveDate(report.generatedDate)}
            </span>
          </div>
        </div>

        {/* 3-Column Balance Summary Cards (pdfcn Card Pattern) */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            gap: 12,
            width: '100%',
            marginBottom: 16,
          }}
        >
          {/* Annual Leave Card */}
          <div
            style={{
              flex: '1 1 0%',
              display: 'flex',
              flexDirection: 'column',
              border: '1px solid #e4e4e7',
              borderTop: `3px solid ${hasRisk ? '#f59e0b' : '#10b981'}`,
              borderRadius: 8,
              padding: 13,
              backgroundColor: '#fafafa',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 8,
              }}
            >
              <span style={{ fontSize: 11.5, fontWeight: 700, color: '#18181b' }}>
                Annual Leave
              </span>
              <span
                style={{
                  fontSize: 8.5,
                  fontWeight: 600,
                  color: '#047857',
                  backgroundColor: '#ecfdf5',
                  border: '1px solid #a7f3d0',
                  borderRadius: 4,
                  padding: '2px 6px',
                }}
              >
                +{annual.monthlyAccrual.toFixed(2)} d/mo
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'baseline',
                gap: 5,
                marginBottom: 9,
              }}
            >
              <span
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: '#047857',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {annual.availableNow.toFixed(2)}
              </span>
              <span style={{ fontSize: 10, color: '#71717a' }}>days available</span>
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'space-between',
                borderTop: '1px solid #e4e4e7',
                paddingTop: 7,
                fontSize: 8.5,
                color: '#52525b',
              }}
            >
              <span>FY Plan: {annual.fyPlannedDays}d</span>
              <span>Post-Feb: {annual.postFebPlannedDays}d</span>
              <span>
                {annual.fyEndLabel}: {annual.projectedFyEndBalance.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Sick Leave Card */}
          <div
            style={{
              flex: '1 1 0%',
              display: 'flex',
              flexDirection: 'column',
              border: '1px solid #e4e4e7',
              borderTop: '3px solid #0ea5e9',
              borderRadius: 8,
              padding: 13,
              backgroundColor: '#fafafa',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 8,
              }}
            >
              <span style={{ fontSize: 11.5, fontWeight: 700, color: '#18181b' }}>Sick Leave</span>
              <span
                style={{
                  fontSize: 8.5,
                  fontWeight: 600,
                  color: '#0369a1',
                  backgroundColor: '#f0f9ff',
                  border: '1px solid #bae6fd',
                  borderRadius: 4,
                  padding: '2px 6px',
                }}
              >
                BCEA 36-Mo
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'baseline',
                gap: 5,
                marginBottom: 9,
              }}
            >
              <span
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: '#0369a1',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {sick.remaining}
              </span>
              <span style={{ fontSize: 10, color: '#71717a' }}>/ {sick.entitlement} days left</span>
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'space-between',
                borderTop: '1px solid #e4e4e7',
                paddingTop: 7,
                fontSize: 8.5,
                color: '#52525b',
              }}
            >
              <span>Taken: {sick.takenInCycle}d</span>
              <span>Planned: {sick.plannedDays}d</span>
              <span>{sick.cycleLabel}</span>
            </div>
          </div>

          {/* Family Responsibility Card */}
          <div
            style={{
              flex: '1 1 0%',
              display: 'flex',
              flexDirection: 'column',
              border: '1px solid #e4e4e7',
              borderTop: `3px solid ${family.remaining === 0 ? '#e11d48' : '#8b5cf6'}`,
              borderRadius: 8,
              padding: 13,
              backgroundColor: '#fafafa',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 8,
              }}
            >
              <span style={{ fontSize: 11.5, fontWeight: 700, color: '#18181b' }}>
                Family Resp.
              </span>
              <span
                style={{
                  fontSize: 8.5,
                  fontWeight: 600,
                  color: '#6d28d9',
                  backgroundColor: '#f5f3ff',
                  border: '1px solid #ddd6fe',
                  borderRadius: 4,
                  padding: '2px 6px',
                }}
              >
                {family.annualEntitlement} Days / Yr
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'baseline',
                gap: 5,
                marginBottom: 9,
              }}
            >
              <span
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: family.remaining === 0 ? '#be123c' : '#6d28d9',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {family.remaining}
              </span>
              <span style={{ fontSize: 10, color: '#71717a' }}>days left</span>
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'space-between',
                borderTop: '1px solid #e4e4e7',
                paddingTop: 7,
                fontSize: 8.5,
                color: '#52525b',
              }}
            >
              <span>Taken: {family.takenCurrentYear}d</span>
              <span>Resets: {family.nextResetLabel}</span>
            </div>
          </div>
        </div>

        {/* Carry-Over Forfeiture Alert Banner (pdfcn Alert Pattern) */}
        {hasRisk ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#fffbeb',
              border: '1px solid #fcd34d',
              borderRadius: 6,
              padding: '10px 14px',
              marginBottom: 18,
              fontSize: 10,
              lineHeight: 1.4,
              color: '#92400e',
            }}
          >
            <span>
              <strong>Carry-Over Forfeiture Risk:</strong> {annual.atRiskOfForfeiture.toFixed(2)}{' '}
              annual leave days are projected to forfeit on {annual.fyEndLabel} (max unbooked
              carry-over cap: {annual.maxCarryOver} days) unless booked in advance.
            </span>
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#ecfdf5',
              border: '1px solid #a7f3d0',
              borderRadius: 6,
              padding: '9px 14px',
              marginBottom: 18,
              fontSize: 10,
              color: '#065f46',
            }}
          >
            <span>
              <strong>Carry-Over Status:</strong> No annual leave days are at risk of forfeiture on{' '}
              {annual.fyEndLabel} (cap {annual.maxCarryOver} days).
            </span>
          </div>
        )}

        {/* Section Heading */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: 8,
          }}
        >
          <span style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a' }}>
            Leave Log ({report.fy.label})
          </span>
          <span style={{ fontSize: 10, color: '#52525b' }}>
            {report.rows.length} {report.rows.length === 1 ? 'entry' : 'entries'} ·{' '}
            {report.grandTotalDays} working {report.grandTotalDays === 1 ? 'day' : 'days'}
          </span>
        </div>

        {/* Chronological Leave Log Table */}
        <Table style={{ border: '1px solid #e4e4e7', borderRadius: 6, overflow: 'hidden' }}>
          <TableHeader>
            <TableRow header>
              <TableHead width="23%" style={{ fontSize: 9.5, padding: '8px 6px' }}>
                Dates
              </TableHead>
              <TableHead width="15%" style={{ fontSize: 9.5, padding: '8px 6px' }}>
                Type
              </TableHead>
              <TableHead width="12%" style={{ fontSize: 9.5, padding: '8px 6px' }}>
                Status
              </TableHead>
              <TableHead width="7%" align="right" style={{ fontSize: 9.5, padding: '8px 6px' }}>
                Days
              </TableHead>
              <TableHead width="15%" style={{ fontSize: 9.5, padding: '8px 6px' }}>
                SA Holidays
              </TableHead>
              <TableHead width="10%" style={{ fontSize: 9.5, padding: '8px 6px' }}>
                Proof
              </TableHead>
              <TableHead width="18%" style={{ fontSize: 9.5, padding: '8px 6px' }}>
                Notes
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {report.rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  align="center"
                  style={{ padding: '22px 10px', fontSize: 10.5, color: '#71717a' }}
                >
                  No leave entries recorded for {report.fy.label} (
                  {report.scope === 'taken' ? 'Taken Only' : 'All Statuses'}).
                </TableCell>
              </TableRow>
            ) : (
              report.rows.map((row) => {
                const typeStyle = TYPE_ACCENT[row.type];
                const statusStyle = STATUS_STYLE[row.displayStatus];
                const holidayText =
                  row.excludedHolidays.length > 0
                    ? row.excludedHolidays.map((h) => h.name).join(', ')
                    : '—';

                return (
                  <TableRow key={row.id}>
                    <TableCell
                      width="23%"
                      tabular
                      style={{ fontSize: 10, fontWeight: 600, padding: '8px 6px' }}
                    >
                      {row.dateRangeLabel}
                    </TableCell>
                    <TableCell width="15%" style={{ padding: '8px 6px' }}>
                      <span
                        style={{
                          fontSize: 8.5,
                          fontWeight: 600,
                          color: typeStyle.fg,
                          backgroundColor: typeStyle.bg,
                          border: `1px solid ${typeStyle.border}`,
                          borderRadius: 4,
                          padding: '2px 6px',
                        }}
                      >
                        {row.type === 'FAMILY_RESPONSIBILITY' ? 'Family Resp.' : row.typeLabel}
                      </span>
                    </TableCell>
                    <TableCell width="12%" style={{ padding: '8px 6px' }}>
                      <span
                        style={{
                          fontSize: 8.5,
                          fontWeight: 600,
                          color: statusStyle.fg,
                          backgroundColor: statusStyle.bg,
                          border: `1px solid ${statusStyle.border}`,
                          borderRadius: 4,
                          padding: '2px 6px',
                        }}
                      >
                        {row.displayStatus}
                      </span>
                    </TableCell>
                    <TableCell
                      width="7%"
                      align="right"
                      bold
                      tabular
                      style={{ fontSize: 10.5, padding: '8px 6px' }}
                    >
                      {row.daysCount} d
                    </TableCell>
                    <TableCell
                      width="15%"
                      style={{ fontSize: 9.5, color: '#3f3f46', padding: '8px 6px' }}
                    >
                      {holidayText}
                    </TableCell>
                    <TableCell
                      width="10%"
                      style={{ fontSize: 9.5, color: '#3f3f46', padding: '8px 6px' }}
                    >
                      {row.proofFileName ? 'Attached' : '—'}
                    </TableCell>
                    <TableCell
                      width="18%"
                      style={{ fontSize: 9.5, color: '#3f3f46', padding: '8px 6px' }}
                    >
                      {row.notes ?? '—'}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* Totals Breakdown Strip */}
        <div
          style={{
            marginTop: 14,
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 6,
            padding: '10px 14px',
            fontSize: 10,
            color: '#1e293b',
          }}
        >
          <span>
            <strong>Annual:</strong> {report.totalsByType.ANNUAL.takenDays}d taken /{' '}
            {report.totalsByType.ANNUAL.plannedDays}d planned
          </span>
          <span>
            <strong>Sick:</strong> {report.totalsByType.SICK.takenDays}d taken /{' '}
            {report.totalsByType.SICK.plannedDays}d planned
          </span>
          <span>
            <strong>Family:</strong> {report.totalsByType.FAMILY_RESPONSIBILITY.takenDays}d taken /{' '}
            {report.totalsByType.FAMILY_RESPONSIBILITY.plannedDays}d planned
          </span>
          <span style={{ fontWeight: 700, color: '#0f172a' }}>Total: {report.grandTotalDays}d</span>
        </div>

        {/* Footer */}
        <div
          style={{
            marginTop: 22,
            paddingTop: 10,
            borderTop: '1px solid #e4e4e7',
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 9,
            color: '#71717a',
          }}
        >
          <span>PMG Hub · Personal Leave Tracker (SA BCEA &amp; Public Holidays Act rules)</span>
          <span>Generated {formatLeaveDate(report.generatedDate)}</span>
        </div>
      </Page>
    </Document>
  );
}

export async function renderLeaveReportPdf(report: LeaveReportData): Promise<Uint8Array> {
  return renderDocumentToPdf(<LeaveReportPdfDocument report={report} />, {
    size: 'a4',
    landscape: false,
  });
}
