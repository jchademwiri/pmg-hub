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

export interface ExpenseReportRow {
  date: string;
  category: string;
  clientId: string | null;
  clientName: string;
  divisionName: string;
  description: string;
  hasReceipt: boolean;
  amount: number;
}

export interface ExpensesReportDocumentProps {
  rows: ExpenseReportRow[];
  org: PdfOrgHeader;
  periodLabel: string;
  clientScopeLabel: string;
  divisionLabel?: string;
  categoryFilterLabel?: string;
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

export function ExpensesReportDocument({
  rows,
  org,
  periodLabel,
  clientScopeLabel,
  divisionLabel,
  categoryFilterLabel,
  generatedAt,
}: ExpensesReportDocumentProps) {
  const theme = usePdfTheme();
  const showClientColumn = clientScopeLabel === 'All Clients';

  let totalExpenses = 0;
  for (const r of rows) {
    totalExpenses += r.amount;
  }

  const reportNumber = `EXP-RPT-${new Date().getFullYear()}`;
  const pages = paginateRows(rows);
  const totalPages = pages.length;

  return (
    <Document title={`Expense Report - ${clientScopeLabel}`}>
      {pages.map((pageRows, pageIdx) => {
        const isFirstPage = pageIdx === 0;
        const isLastPage = pageIdx === totalPages - 1;

        return (
          <React.Fragment key={pageIdx}>
            {pageIdx > 0 && <PageBreak />}
            <Page size="a4" style={{ paddingBottom: 24 }}>
              {isFirstPage ? (
                <>
                  <PageHeader org={org} title="Expense Report" number={reportNumber} />

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
                      {categoryFilterLabel && (
                        <span style={{ fontSize: 8, color: theme.colors.mutedForeground }}>
                          Category: {categoryFilterLabel}
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
                          { key: 'Entries', value: String(rows.length) },
                          {
                            key: 'Total Expenses',
                            value: formatZAR(totalExpenses),
                            keyStyle: { fontWeight: 700, color: theme.colors.foreground },
                            valueStyle: {
                              fontWeight: 700,
                              color: theme.colors.primary,
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
                    {org.name} — Expense Report ({clientScopeLabel})
                  </span>
                  <span style={{ fontSize: 8, color: theme.colors.mutedForeground }}>
                    {periodLabel}
                  </span>
                </div>
              )}

              {/* Essential Expenses Table */}
              {(pageRows.length > 0 || isFirstPage) && (
                <Table variant="compact" style={{ marginBottom: theme.spacing.sectionGap }}>
                  <TableHeader>
                    <TableRow header>
                      <TableCell header width={showClientColumn ? '16%' : '18%'}>
                        Date
                      </TableCell>
                      <TableCell header width={showClientColumn ? '22%' : '28%'}>
                        Category
                      </TableCell>
                      {showClientColumn && (
                        <TableCell header width="22%">
                          Client
                        </TableCell>
                      )}
                      <TableCell header width={showClientColumn ? '24%' : '34%'}>
                        Description
                      </TableCell>
                      <TableCell header align="right" width={showClientColumn ? '16%' : '20%'}>
                        Amount
                      </TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.length === 0 ? (
                      <TableRow striped={false}>
                        <TableCell
                          colSpan={showClientColumn ? 5 : 4}
                          align="center"
                          style={{ color: theme.colors.mutedForeground }}
                        >
                          No expenses recorded for this period.
                        </TableCell>
                      </TableRow>
                    ) : (
                      pageRows.map((row, idx) => (
                        <TableRow key={idx} striped={idx % 2 === 1}>
                          <TableCell width={showClientColumn ? '16%' : '18%'}>
                            {fmtDateLong(row.date)}
                          </TableCell>
                          <TableCell width={showClientColumn ? '22%' : '28%'} bold>
                            {row.category}
                          </TableCell>
                          {showClientColumn && <TableCell width="22%">{row.clientName}</TableCell>}
                          <TableCell width={showClientColumn ? '24%' : '34%'}>
                            {row.description || '-'}
                          </TableCell>
                          <TableCell
                            width={showClientColumn ? '16%' : '20%'}
                            align="right"
                            bold
                            tabular
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
                            key: 'Expense Entries',
                            value: String(rows.length),
                          },
                          {
                            key: 'Total Expenses',
                            value: formatZAR(totalExpenses),
                            keyStyle: {
                              fontWeight: 700,
                              fontSize: 10,
                              color: theme.colors.foreground,
                            },
                            valueStyle: {
                              fontWeight: 700,
                              fontSize: 11,
                              color: theme.colors.primary,
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
