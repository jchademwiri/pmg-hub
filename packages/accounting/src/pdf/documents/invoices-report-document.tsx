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

export interface InvoiceReportRow {
  documentNumber: string;
  invoiceDate: string;
  dueDate: string | null;
  clientName: string;
  divisionName: string;
  status: string;
  subtotal: number;
  vatAmount: number;
  total: number;
  paidAmount: number;
  outstandingAmount: number;
}

export interface InvoicesReportDocumentProps {
  rows: InvoiceReportRow[];
  org: PdfOrgHeader;
  periodLabel: string;
  clientScopeLabel: string;
  divisionLabel?: string;
  statusFilterLabel?: string;
  generatedAt: string;
}

function formatStatusLabel(status: string): string {
  switch (status) {
    case 'partially_paid':
      return 'Part Paid';
    case 'written_off':
      return 'Written Off';
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
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

export function InvoicesReportDocument({
  rows,
  org,
  periodLabel,
  clientScopeLabel,
  divisionLabel,
  statusFilterLabel,
  generatedAt,
}: InvoicesReportDocumentProps) {
  const theme = usePdfTheme();
  const showClientColumn = clientScopeLabel === 'All Clients';

  let totalInvoiced = 0;
  let totalPaid = 0;
  let totalOutstanding = 0;

  for (const r of rows) {
    totalInvoiced += r.total;
    totalPaid += r.paidAmount;
    totalOutstanding += r.outstandingAmount;
  }

  const reportNumber = `INV-RPT-${new Date().getFullYear()}`;
  const pages = paginateRows(rows);
  const totalPages = pages.length;

  return (
    <Document title={`Invoice Report - ${clientScopeLabel}`}>
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
                    title="Invoice Report"
                    number={reportNumber}
                    status={totalOutstanding > 0 ? 'Balance Due' : 'Settled'}
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
                      {statusFilterLabel && (
                        <span style={{ fontSize: 8, color: theme.colors.mutedForeground }}>
                          Filter: {statusFilterLabel}
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
                          { key: 'Invoices', value: String(rows.length) },
                          {
                            key: 'Balance Due',
                            value: formatZAR(totalOutstanding),
                            keyStyle: { fontWeight: 700, color: theme.colors.foreground },
                            valueStyle: {
                              fontWeight: 700,
                              color:
                                totalOutstanding > 0 ? theme.colors.primary : theme.colors.success,
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
                    {org.name} — Invoice Report ({clientScopeLabel})
                  </span>
                  <span style={{ fontSize: 8, color: theme.colors.mutedForeground }}>
                    {periodLabel}
                  </span>
                </div>
              )}

              {/* Essential Invoices Table */}
              {(pageRows.length > 0 || isFirstPage) && (
                <Table variant="compact" style={{ marginBottom: theme.spacing.sectionGap }}>
                  <TableHeader>
                    <TableRow header>
                      <TableCell header width={showClientColumn ? '16%' : '20%'}>
                        Date
                      </TableCell>
                      <TableCell header width={showClientColumn ? '20%' : '26%'}>
                        Invoice #
                      </TableCell>
                      {showClientColumn && (
                        <TableCell header width="24%">
                          Client
                        </TableCell>
                      )}
                      <TableCell header width={showClientColumn ? '12%' : '18%'}>
                        Status
                      </TableCell>
                      <TableCell header align="right" width={showClientColumn ? '14%' : '18%'}>
                        Total
                      </TableCell>
                      <TableCell header align="right" width={showClientColumn ? '14%' : '18%'}>
                        Balance
                      </TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.length === 0 ? (
                      <TableRow striped={false}>
                        <TableCell
                          colSpan={showClientColumn ? 6 : 5}
                          align="center"
                          style={{ color: theme.colors.mutedForeground }}
                        >
                          No invoices recorded for this period.
                        </TableCell>
                      </TableRow>
                    ) : (
                      pageRows.map((row, idx) => (
                        <TableRow key={idx} striped={idx % 2 === 1}>
                          <TableCell width={showClientColumn ? '16%' : '20%'}>
                            {fmtDateLong(row.invoiceDate)}
                          </TableCell>
                          <TableCell width={showClientColumn ? '20%' : '26%'} bold>
                            {row.documentNumber}
                          </TableCell>
                          {showClientColumn && <TableCell width="24%">{row.clientName}</TableCell>}
                          <TableCell width={showClientColumn ? '12%' : '18%'}>
                            {formatStatusLabel(row.status)}
                          </TableCell>
                          <TableCell width={showClientColumn ? '14%' : '18%'} align="right" tabular>
                            {formatZAR(row.total)}
                          </TableCell>
                          <TableCell
                            width={showClientColumn ? '14%' : '18%'}
                            align="right"
                            bold
                            tabular
                            style={{
                              color:
                                row.outstandingAmount > 0
                                  ? theme.colors.foreground
                                  : theme.colors.mutedForeground,
                            }}
                          >
                            {row.outstandingAmount > 0 ? formatZAR(row.outstandingAmount) : '-'}
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
                            key: 'Total Invoiced',
                            value: formatZAR(totalInvoiced),
                            keyStyle: { fontWeight: 700 },
                            valueStyle: { fontWeight: 700 },
                          },
                          {
                            key: 'Less Paid',
                            value: totalPaid > 0 ? `-${formatZAR(totalPaid)}` : '-R 0,00',
                            valueStyle: {
                              color:
                                totalPaid > 0 ? theme.colors.success : theme.colors.mutedForeground,
                            },
                          },
                          {
                            key: 'Balance Due',
                            value: formatZAR(totalOutstanding),
                            keyStyle: {
                              fontWeight: 700,
                              fontSize: 10,
                              color: theme.colors.foreground,
                            },
                            valueStyle: {
                              fontWeight: 700,
                              fontSize: 11,
                              color:
                                totalOutstanding > 0 ? theme.colors.primary : theme.colors.success,
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
