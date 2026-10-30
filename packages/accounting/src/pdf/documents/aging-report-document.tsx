import React from 'react';
import {
  Document,
  Page,
  PageBreak,
  KeepTogether,
  PageHeader,
  PageFooter,
  KeyValue,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  usePdfTheme,
} from '@pmg/billing/pdf';
import { formatZAR, fmtDate } from '@pmg/billing/format';
import { type PdfOrgHeader } from '@pmg/billing/pdf-shell';

export interface AgingReportRow {
  clientId: string;
  clientName: string;
  reference?: string | null;
  invoiceDate?: string | null;
  dueDate?: string | null;
  current: number;
  bucket_1_14: number;
  bucket_15_30: number;
  bucket_31_60: number;
  bucket_61_plus: number;
  totalOutstanding: number;
}

export interface AgingReportDocumentProps {
  title?: string;
  reportNumber: string;
  rows: AgingReportRow[];
  org: PdfOrgHeader;
  asOfDateLabel: string;
  clientScopeLabel: string;
  divisionLabel?: string;
  isClientDrilldown?: boolean;
  generatedAt: string;
}

function paginateRows<T>(rows: T[]): T[][] {
  if (rows.length === 0) return [[]];
  if (rows.length <= 20) return [rows];

  const pages: T[][] = [];
  const firstPageCount = 24;
  const middlePageCount = 32;
  const lastPageMaxWithTotals = 26;

  pages.push(rows.slice(0, firstPageCount));
  let offset = firstPageCount;

  while (offset < rows.length) {
    const remaining = rows.length - offset;
    if (remaining <= lastPageMaxWithTotals) {
      pages.push(rows.slice(offset));
      break;
    }
    if (remaining <= middlePageCount) {
      pages.push(rows.slice(offset));
      pages.push([]);
      break;
    }
    pages.push(rows.slice(offset, offset + middlePageCount));
    offset += middlePageCount;
  }

  return pages;
}

export function AgingReportDocument({
  title = 'Accounts Receivable Aging Report',
  reportNumber,
  rows,
  org,
  asOfDateLabel,
  clientScopeLabel,
  divisionLabel,
  isClientDrilldown = false,
  generatedAt,
}: AgingReportDocumentProps) {
  const theme = usePdfTheme();

  const totalOutstanding = rows.reduce((s, r) => s + r.totalOutstanding, 0);
  const totalCurrent = rows.reduce((s, r) => s + r.current, 0);
  const total1_14 = rows.reduce((s, r) => s + r.bucket_1_14, 0);
  const total15_30 = rows.reduce((s, r) => s + r.bucket_15_30, 0);
  const total31_60 = rows.reduce((s, r) => s + r.bucket_31_60, 0);
  const total61Plus = rows.reduce((s, r) => s + r.bucket_61_plus, 0);
  const totalOverdue = total1_14 + total15_30 + total31_60 + total61Plus;

  const pages = paginateRows(rows);
  const totalPages = pages.length;

  const firstColHeader = isClientDrilldown ? 'Invoice' : 'Client';
  const countLabel = isClientDrilldown ? 'Outstanding Invoices' : 'Clients with Balance';

  return (
    <Document title={`${title} - ${clientScopeLabel}`}>
      {pages.map((pageRows, pageIdx) => {
        const isFirstPage = pageIdx === 0;
        const isLastPage = pageIdx === totalPages - 1;

        return (
          <React.Fragment key={pageIdx}>
            {pageIdx > 0 && <PageBreak />}
            <Page size="a4" style={{ paddingBottom: 24 }}>
              {isFirstPage ? (
                <>
                  <PageHeader org={org} title={title} number={reportNumber} />

                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      marginBottom: theme.spacing.sectionGap,
                      gap: 20,
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', width: '50%' }}>
                      <span
                        style={{
                          fontSize: 7.5,
                          fontWeight: 700,
                          color: theme.colors.primary,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          marginBottom: 4,
                        }}
                      >
                        Account Scope
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: theme.colors.foreground,
                          marginBottom: 2,
                        }}
                      >
                        {clientScopeLabel} — {isClientDrilldown ? 'Invoice Aging' : 'Aging Breakdown'}
                      </span>
                      {divisionLabel && (
                        <span style={{ fontSize: 8.5, color: theme.colors.mutedForeground }}>
                          Division: {divisionLabel}
                        </span>
                      )}
                    </div>

                    <div style={{ width: '45%' }}>
                      <KeyValue
                        size="sm"
                        items={[
                          { key: 'As Of', value: asOfDateLabel },
                          { key: 'Generated', value: generatedAt },
                          { key: countLabel, value: String(rows.length) },
                          {
                            key: 'Total Outstanding',
                            value: formatZAR(totalOutstanding),
                            keyStyle: {
                              fontWeight: 700,
                              color: theme.colors.foreground,
                              fontSize: 9,
                            },
                            valueStyle: {
                              fontWeight: 700,
                              color: totalOutstanding <= 0.005 ? theme.colors.success : theme.colors.primary,
                              fontSize: 10,
                            },
                          },
                        ]}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingBottom: 8,
                    marginBottom: 12,
                    borderBottom: `1px solid ${theme.colors.border}`,
                  }}
                >
                  <span style={{ fontSize: 9, fontWeight: 700, color: theme.colors.foreground }}>
                    {org.name} — {title} ({clientScopeLabel})
                  </span>
                  <span style={{ fontSize: 8, color: theme.colors.mutedForeground }}>
                    As of {asOfDateLabel}
                  </span>
                </div>
              )}

              {(pageRows.length > 0 || isFirstPage) && (
                <Table variant="compact" style={{ marginBottom: theme.spacing.sectionGap }}>
                  <TableHeader>
                    <TableRow header>
                      <TableCell header width="26%">
                        {firstColHeader}
                      </TableCell>
                      <TableCell header align="right" width="12%">
                        Current
                      </TableCell>
                      <TableCell header align="right" width="12%">
                        1–14 Days
                      </TableCell>
                      <TableCell header align="right" width="12%">
                        15–30 Days
                      </TableCell>
                      <TableCell header align="right" width="12%">
                        31–60 Days
                      </TableCell>
                      <TableCell header align="right" width="12%">
                        61+ Days
                      </TableCell>
                      <TableCell header align="right" width="14%">
                        Total Due
                      </TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.length === 0 ? (
                      <TableRow striped={false}>
                        <TableCell
                          colSpan={7}
                          align="center"
                          style={{ color: theme.colors.mutedForeground }}
                        >
                          {isClientDrilldown
                            ? 'No outstanding invoices found for this client.'
                            : 'No outstanding accounts receivable found.'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      pageRows.map((row, idx) => {
                        const isZero = row.totalOutstanding <= 0.005;
                        return (
                          <TableRow key={`${row.clientName}-${idx}`} striped={idx % 2 === 1}>
                            <TableCell width="26%" bold>
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span>{row.clientName}</span>
                                {isClientDrilldown && (row.dueDate || row.reference) && (
                                  <span
                                    style={{
                                      fontSize: 7,
                                      color: theme.colors.mutedForeground,
                                      fontWeight: 'normal',
                                      marginTop: 1,
                                    }}
                                  >
                                    {row.dueDate ? `Due ${fmtDate(row.dueDate)}` : ''}
                                    {row.dueDate && row.reference ? ' · ' : ''}
                                    {row.reference || ''}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell
                              width="12%"
                              align="right"
                              tabular
                              style={
                                row.current > 0
                                  ? { color: '#059669', fontWeight: 600 }
                                  : { color: theme.colors.mutedForeground }
                              }
                            >
                              {formatZAR(row.current)}
                            </TableCell>
                            <TableCell
                              width="12%"
                              align="right"
                              tabular
                              style={
                                row.bucket_1_14 > 0
                                  ? { color: '#d97706', fontWeight: 600 }
                                  : { color: theme.colors.mutedForeground }
                              }
                            >
                              {formatZAR(row.bucket_1_14)}
                            </TableCell>
                            <TableCell
                              width="12%"
                              align="right"
                              tabular
                              style={
                                row.bucket_15_30 > 0
                                  ? { color: '#ea580c', fontWeight: 600 }
                                  : { color: theme.colors.mutedForeground }
                              }
                            >
                              {formatZAR(row.bucket_15_30)}
                            </TableCell>
                            <TableCell
                              width="12%"
                              align="right"
                              tabular
                              style={
                                row.bucket_31_60 > 0
                                  ? { color: '#e11d48', fontWeight: 600 }
                                  : { color: theme.colors.mutedForeground }
                              }
                            >
                              {formatZAR(row.bucket_31_60)}
                            </TableCell>
                            <TableCell
                              width="12%"
                              align="right"
                              tabular
                              style={
                                row.bucket_61_plus > 0
                                  ? { color: '#dc2626', fontWeight: 700 }
                                  : { color: theme.colors.mutedForeground }
                              }
                            >
                              {formatZAR(row.bucket_61_plus)}
                            </TableCell>
                            <TableCell
                              width="14%"
                              align="right"
                              tabular
                              bold
                              style={{
                                color: isZero ? theme.colors.success : theme.colors.foreground,
                              }}
                            >
                              {formatZAR(row.totalOutstanding)}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              )}

              {isLastPage && rows.length > 0 && (
                <KeepTogether>
                  <div style={{ marginTop: 12, marginBottom: 12 }}>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 6,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 7.5,
                          fontWeight: 700,
                          color: theme.colors.primary,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                        }}
                      >
                        Aging Summary
                      </span>
                      <span style={{ fontSize: 7.5, color: theme.colors.mutedForeground }}>
                        <span style={{ marginRight: 10 }}>
                          {countLabel}:{' '}
                          <span style={{ fontWeight: 600, color: theme.colors.foreground }}>
                            {rows.length}
                          </span>
                        </span>
                        <span>
                          Total Outstanding (AR):{' '}
                          <span style={{ fontWeight: 700, color: theme.colors.foreground }}>
                            {formatZAR(totalOutstanding)}
                          </span>
                        </span>
                      </span>
                    </div>
                    <table
                      style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        border: `1px solid ${theme.colors.border}`,
                      }}
                    >
                      <thead>
                        <tr>
                          <th
                            style={{
                              padding: '4px 6px',
                              fontSize: 7,
                              fontWeight: 700,
                              textAlign: 'center',
                              backgroundColor: '#fef2f2',
                              color: '#b91c1c',
                              borderRight: `1px solid ${theme.colors.border}`,
                              borderBottom: `1px solid ${theme.colors.border}`,
                              width: '16.66%',
                            }}
                          >
                            61+ Days
                          </th>
                          <th
                            style={{
                              padding: '4px 6px',
                              fontSize: 7,
                              fontWeight: 700,
                              textAlign: 'center',
                              backgroundColor: '#fff1f2',
                              color: '#be123c',
                              borderRight: `1px solid ${theme.colors.border}`,
                              borderBottom: `1px solid ${theme.colors.border}`,
                              width: '16.66%',
                            }}
                          >
                            31–60 Days
                          </th>
                          <th
                            style={{
                              padding: '4px 6px',
                              fontSize: 7,
                              fontWeight: 700,
                              textAlign: 'center',
                              backgroundColor: '#fff7ed',
                              color: '#c2410c',
                              borderRight: `1px solid ${theme.colors.border}`,
                              borderBottom: `1px solid ${theme.colors.border}`,
                              width: '16.66%',
                            }}
                          >
                            15–30 Days
                          </th>
                          <th
                            style={{
                              padding: '4px 6px',
                              fontSize: 7,
                              fontWeight: 700,
                              textAlign: 'center',
                              backgroundColor: '#fffbeb',
                              color: '#b45309',
                              borderRight: `1px solid ${theme.colors.border}`,
                              borderBottom: `1px solid ${theme.colors.border}`,
                              width: '16.66%',
                            }}
                          >
                            1–14 Days
                          </th>
                          <th
                            style={{
                              padding: '4px 6px',
                              fontSize: 7,
                              fontWeight: 700,
                              textAlign: 'center',
                              backgroundColor: '#f0fdf4',
                              color: '#15803d',
                              borderRight: `1px solid ${theme.colors.border}`,
                              borderBottom: `1px solid ${theme.colors.border}`,
                              width: '16.66%',
                            }}
                          >
                            Current
                          </th>
                          <th
                            style={{
                              padding: '4px 6px',
                              fontSize: 7,
                              fontWeight: 700,
                              textAlign: 'center',
                              backgroundColor: '#f4f4f5',
                              color: '#18181b',
                              borderBottom: `1px solid ${theme.colors.border}`,
                              width: '16.7%',
                            }}
                          >
                            Total Overdue
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td
                            style={{
                              padding: '6px',
                              fontSize: 8,
                              textAlign: 'center',
                              fontWeight: 700,
                              color: total61Plus > 0 ? '#dc2626' : theme.colors.mutedForeground,
                              fontVariantNumeric: 'tabular-nums',
                              borderRight: `1px solid ${theme.colors.border}`,
                            }}
                          >
                            {formatZAR(total61Plus)}
                          </td>
                          <td
                            style={{
                              padding: '6px',
                              fontSize: 8,
                              textAlign: 'center',
                              fontWeight: 600,
                              color: total31_60 > 0 ? '#e11d48' : theme.colors.mutedForeground,
                              fontVariantNumeric: 'tabular-nums',
                              borderRight: `1px solid ${theme.colors.border}`,
                            }}
                          >
                            {formatZAR(total31_60)}
                          </td>
                          <td
                            style={{
                              padding: '6px',
                              fontSize: 8,
                              textAlign: 'center',
                              fontWeight: 600,
                              color: total15_30 > 0 ? '#ea580c' : theme.colors.mutedForeground,
                              fontVariantNumeric: 'tabular-nums',
                              borderRight: `1px solid ${theme.colors.border}`,
                            }}
                          >
                            {formatZAR(total15_30)}
                          </td>
                          <td
                            style={{
                              padding: '6px',
                              fontSize: 8,
                              textAlign: 'center',
                              fontWeight: 600,
                              color: total1_14 > 0 ? '#d97706' : theme.colors.mutedForeground,
                              fontVariantNumeric: 'tabular-nums',
                              borderRight: `1px solid ${theme.colors.border}`,
                            }}
                          >
                            {formatZAR(total1_14)}
                          </td>
                          <td
                            style={{
                              padding: '6px',
                              fontSize: 8,
                              textAlign: 'center',
                              fontWeight: 600,
                              color: totalCurrent > 0 ? '#059669' : theme.colors.mutedForeground,
                              fontVariantNumeric: 'tabular-nums',
                              borderRight: `1px solid ${theme.colors.border}`,
                            }}
                          >
                            {formatZAR(totalCurrent)}
                          </td>
                          <td
                            style={{
                              padding: '6px',
                              fontSize: 8,
                              textAlign: 'center',
                              fontWeight: 700,
                              color:
                                totalOverdue > 0 ? '#dc2626' : theme.colors.foreground,
                              fontVariantNumeric: 'tabular-nums',
                            }}
                          >
                            {formatZAR(totalOverdue)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </KeepTogether>
              )}

              <PageFooter
                org={org}
                pageNumber={pageIdx + 1}
                totalPages={totalPages}
                style={{ position: 'static', marginTop: 'auto' }}
              />
            </Page>
          </React.Fragment>
        );
      })}
    </Document>
  );
}
