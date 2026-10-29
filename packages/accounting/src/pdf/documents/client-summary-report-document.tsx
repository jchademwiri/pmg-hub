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
import { formatZAR } from '@pmg/billing/format';
import { type PdfOrgHeader } from '@pmg/billing/pdf-shell';

/** One row per client — used when a report is grouped by client. */
export interface ClientSummaryRow {
  clientName: string;
  count: number;
  /** Monetary values, in the same order as `valueColumns`. */
  values: number[];
}

export type ClientSummaryTone = 'default' | 'success' | 'danger' | 'primary';

export interface ClientSummaryValueColumn {
  label: string;
  tone?: ClientSummaryTone;
}

export interface ClientSummaryReportDocumentProps {
  title: string;
  reportNumber: string;
  countLabel: string;
  valueColumns: ClientSummaryValueColumn[];
  /** Index into `valueColumns` of the headline figure shown in the report details. */
  headlineIndex: number;
  rows: ClientSummaryRow[];
  org: PdfOrgHeader;
  periodLabel: string;
  clientScopeLabel: string;
  divisionLabel?: string;
  filterLabel?: string;
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

export function ClientSummaryReportDocument({
  title,
  reportNumber,
  countLabel,
  valueColumns,
  headlineIndex,
  rows,
  org,
  periodLabel,
  clientScopeLabel,
  divisionLabel,
  filterLabel,
  generatedAt,
}: ClientSummaryReportDocumentProps) {
  const theme = usePdfTheme();

  const toneColor = (tone?: ClientSummaryTone) => {
    switch (tone) {
      case 'success':
        return theme.colors.success;
      case 'danger':
        return theme.colors.destructive;
      case 'primary':
        return theme.colors.primary;
      default:
        return theme.colors.foreground;
    }
  };

  const totalCount = rows.reduce((acc, r) => acc + r.count, 0);
  const totals = valueColumns.map((_, i) => rows.reduce((acc, r) => acc + (r.values[i] ?? 0), 0));
  const headline = valueColumns[headlineIndex];
  const headlineTotal = totals[headlineIndex] ?? 0;

  // Column widths: client 40%, count 12%, remaining split across value columns.
  const clientWidth = 40;
  const countWidth = 12;
  const valueWidth = `${(100 - clientWidth - countWidth) / Math.max(1, valueColumns.length)}%`;
  const colCount = 2 + valueColumns.length;

  const pages = paginateRows(rows);
  const totalPages = pages.length;

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
                        {clientScopeLabel} — Grouped by Client
                      </span>
                      {divisionLabel && (
                        <span style={{ fontSize: 8, color: theme.colors.mutedForeground }}>
                          Division: {divisionLabel}
                        </span>
                      )}
                      {filterLabel && (
                        <span style={{ fontSize: 8, color: theme.colors.mutedForeground }}>
                          Filter: {filterLabel}
                        </span>
                      )}
                    </div>

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
                          { key: 'Clients', value: String(rows.length) },
                          ...(headline
                            ? [
                                {
                                  key: headline.label,
                                  value: formatZAR(headlineTotal),
                                  keyStyle: { fontWeight: 700, color: theme.colors.foreground },
                                  valueStyle: {
                                    fontWeight: 700,
                                    color: toneColor(headline.tone),
                                    fontSize: 10,
                                  },
                                },
                              ]
                            : []),
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
                    {org.name} — {title} (Grouped by Client)
                  </span>
                  <span style={{ fontSize: 8, color: theme.colors.mutedForeground }}>
                    {periodLabel}
                  </span>
                </div>
              )}

              {(pageRows.length > 0 || isFirstPage) && (
                <Table variant="compact" style={{ marginBottom: theme.spacing.sectionGap }}>
                  <TableHeader>
                    <TableRow header>
                      <TableCell header width={`${clientWidth}%`}>
                        Client
                      </TableCell>
                      <TableCell header align="right" width={`${countWidth}%`}>
                        {countLabel}
                      </TableCell>
                      {valueColumns.map((col) => (
                        <TableCell key={col.label} header align="right" width={valueWidth}>
                          {col.label}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.length === 0 ? (
                      <TableRow striped={false}>
                        <TableCell
                          colSpan={colCount}
                          align="center"
                          style={{ color: theme.colors.mutedForeground }}
                        >
                          No records for this period.
                        </TableCell>
                      </TableRow>
                    ) : (
                      pageRows.map((row, idx) => (
                        <TableRow key={`${row.clientName}-${idx}`} striped={idx % 2 === 1}>
                          <TableCell width={`${clientWidth}%`} bold>
                            {row.clientName}
                          </TableCell>
                          <TableCell width={`${countWidth}%`} align="right" tabular>
                            {String(row.count)}
                          </TableCell>
                          {valueColumns.map((col, i) => (
                            <TableCell
                              key={col.label}
                              width={valueWidth}
                              align="right"
                              tabular
                              bold={i === headlineIndex}
                              style={
                                i === headlineIndex ? { color: toneColor(col.tone) } : undefined
                              }
                            >
                              {formatZAR(row.values[i] ?? 0)}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}

              {isLastPage && rows.length > 0 && (
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
                    <div style={{ width: '45%', padding: '4px 0' }}>
                      <KeyValue
                        size="sm"
                        divided
                        items={[
                          { key: 'Clients', value: String(rows.length) },
                          { key: `Total ${countLabel}`, value: String(totalCount) },
                          ...valueColumns.map((col, i) =>
                            i === headlineIndex
                              ? {
                                  key: col.label,
                                  value: formatZAR(totals[i] ?? 0),
                                  keyStyle: {
                                    fontWeight: 700,
                                    fontSize: 10,
                                    color: theme.colors.foreground,
                                  },
                                  valueStyle: {
                                    fontWeight: 700,
                                    fontSize: 11,
                                    color: toneColor(col.tone),
                                  },
                                }
                              : { key: col.label, value: formatZAR(totals[i] ?? 0) },
                          ),
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
