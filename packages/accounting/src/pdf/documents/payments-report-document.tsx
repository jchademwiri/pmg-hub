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
import { formatZAR, fmtDateLong } from '@pmg/billing/format';
import { type PdfOrgHeader } from '@pmg/billing/pdf-shell';

export interface PaymentReportRow {
  date: string;
  clientName: string;
  divisionName: string;
  description: string;
  allocatedInvoices: string;
  amount: number;
}

export interface PaymentsReportDocumentProps {
  rows: PaymentReportRow[];
  org: PdfOrgHeader;
  periodLabel: string;
  clientScopeLabel: string;
  divisionLabel?: string;
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

export function PaymentsReportDocument({
  rows,
  org,
  periodLabel,
  clientScopeLabel,
  divisionLabel,
  generatedAt,
}: PaymentsReportDocumentProps) {
  const theme = usePdfTheme();
  const showClientColumn = clientScopeLabel === 'All Clients';

  let totalReceived = 0;
  for (const r of rows) {
    totalReceived += r.amount;
  }

  const reportNumber = `PAY-RPT-${new Date().getFullYear()}`;
  const pages = paginateRows(rows);
  const totalPages = pages.length;

  return (
    <Document title={`Payment Report - ${clientScopeLabel}`}>
      {pages.map((pageRows, pageIdx) => {
        const isFirstPage = pageIdx === 0;
        const isLastPage = pageIdx === totalPages - 1;

        return (
          <React.Fragment key={pageIdx}>
            {pageIdx > 0 && <PageBreak />}
            <Page size="a4" style={{ paddingBottom: 24 }}>
              {isFirstPage ? (
                <>
                  <PageHeader
                    org={org}
                    title="Payment Report"
                    number={reportNumber}
                    status="Paid"
                  />

                  {/* Account & Period Section */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      marginBottom: theme.spacing.sectionGap,
                      gap: 20,
                    }}
                  >
                    {/* Left: Client Scope */}
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
                        {clientScopeLabel}
                      </span>
                      {divisionLabel && (
                        <span style={{ fontSize: 8, color: theme.colors.mutedForeground }}>
                          Division: {divisionLabel}
                        </span>
                      )}
                    </div>

                    {/* Right: Report Metadata */}
                    <div style={{ display: 'flex', flexDirection: 'column', width: '45%' }}>
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
                        Report Details
                      </span>
                      <KeyValue
                        size="sm"
                        items={[
                          { key: 'Period', value: periodLabel },
                          { key: 'Generated', value: generatedAt },
                          { key: 'Payments', value: String(rows.length) },
                          {
                            key: 'Total Received',
                            value: formatZAR(totalReceived),
                            keyStyle: { fontWeight: 700, color: theme.colors.foreground },
                            valueStyle: {
                              fontWeight: 700,
                              color: theme.colors.success,
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
                    {org.name} — Payment Report ({clientScopeLabel})
                  </span>
                  <span style={{ fontSize: 8, color: theme.colors.mutedForeground }}>
                    {periodLabel}
                  </span>
                </div>
              )}

              {/* Essential Payments Table */}
              {(pageRows.length > 0 || isFirstPage) && (
                <Table variant="compact" style={{ marginBottom: theme.spacing.sectionGap }}>
                  <TableHeader>
                    <TableRow header>
                      <TableCell header width={showClientColumn ? '18%' : '22%'}>
                        Date
                      </TableCell>
                      {showClientColumn && (
                        <TableCell header width="26%">
                          Client
                        </TableCell>
                      )}
                      <TableCell header width={showClientColumn ? '38%' : '54%'}>
                        Reference / Invoice
                      </TableCell>
                      <TableCell header align="right" width={showClientColumn ? '18%' : '24%'}>
                        Amount
                      </TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.length === 0 ? (
                      <TableRow striped={false}>
                        <TableCell
                          colSpan={showClientColumn ? 4 : 3}
                          align="center"
                          style={{ color: theme.colors.mutedForeground }}
                        >
                          No payments recorded for this period.
                        </TableCell>
                      </TableRow>
                    ) : (
                      pageRows.map((row, idx) => (
                        <TableRow key={idx} striped={idx % 2 === 1}>
                          <TableCell width={showClientColumn ? '18%' : '22%'}>
                            {fmtDateLong(row.date)}
                          </TableCell>
                          {showClientColumn && (
                            <TableCell width="26%" bold>
                              {row.clientName}
                            </TableCell>
                          )}
                          <TableCell width={showClientColumn ? '38%' : '54%'}>
                            {row.allocatedInvoices || row.description || '-'}
                          </TableCell>
                          <TableCell
                            width={showClientColumn ? '18%' : '24%'}
                            align="right"
                            bold
                            tabular
                            style={{ color: theme.colors.success }}
                          >
                            {formatZAR(row.amount)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}

              {/* Totals Breakdown on Final Page */}
              {isLastPage && (
                <KeepTogether>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      justifyContent: 'flex-end',
                      marginTop: 6,
                      marginBottom: 12,
                    }}
                  >
                    <div style={{ width: '42%', padding: '4px 0' }}>
                      <KeyValue
                        size="sm"
                        divided
                        items={[
                          {
                            key: 'Payments Count',
                            value: String(rows.length),
                          },
                          {
                            key: 'Total Received',
                            value: formatZAR(totalReceived),
                            keyStyle: {
                              fontWeight: 700,
                              fontSize: 10,
                              color: theme.colors.foreground,
                            },
                            valueStyle: {
                              fontWeight: 700,
                              fontSize: 11,
                              color: theme.colors.success,
                            },
                          },
                        ]}
                      />
                    </div>
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
