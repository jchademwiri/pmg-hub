import React from 'react';
import {
  formatZAR,
  formatZARWithCR,
  fmtDate,
  fmtDateLong,
  formatStatementDueDate,
  isDueDateOverdue,
} from '../../format';
import { Document, Page, KeepTogether } from '../primitives';
import { PageHeader, type OrgDetails } from '../components/page-header';
import { PageFooter } from '../components/page-footer';
import { Table, TableHeader, TableBody, TableRow, TableCell } from '../components/table';
import { KeyValue } from '../components/key-value';
import { usePdfTheme } from '../theme-provider';
import type { InvoiceBankingDetails } from './invoice-pdf-document';

export interface StatementTransaction {
  date: string;
  reference: string;
  description: string;
  debit?: number;
  credit?: number;
  balance?: number;
}

export interface StatementAgeing {
  current: number;
  days1_14: number;
  days15_30: number;
  days31_60: number;
  days61plus: number;
}

export interface StatementPdfData {
  statementNumber: string;
  status: string;
  statementType?: 'activity' | 'outstanding';
  periodFrom?: string;
  periodTo?: string;
  dueDate?: string;
  org: OrgDetails;
  client: {
    name: string;
    accountRef?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
  };
  openingBalance?: number;
  transactions: StatementTransaction[];
  ageing?: StatementAgeing;
  totalDue?: number;
  subtotal?: number;
  totalPaid?: number;
  banking?: InvoiceBankingDetails;
  terms?: string | null;
}

export function StatementPdfDocument({ data }: { data: StatementPdfData }) {
  const theme = usePdfTheme();

  const openingBalance = data.statementType === 'outstanding' ? 0 : (data.openingBalance ?? 0);
  const subtotal =
    data.subtotal ??
    (data.transactions ?? []).reduce((sum, tx) => sum + (tx.debit || 0), 0) + openingBalance;
  const totalPaid =
    data.totalPaid ?? (data.transactions ?? []).reduce((sum, tx) => sum + (tx.credit || 0), 0);
  const totalDue = data.totalDue ?? subtotal - totalPaid;

  return (
    <Document title={`Statement ${data.statementNumber}`}>
      <Page size="a4">
        <PageHeader
          org={data.org}
          title={
            data.statementType === 'outstanding'
              ? 'Statement of Outstanding Invoices'
              : 'Statement of Account'
          }
          number={data.statementNumber}
          status={data.status}
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
          {/* Account Details */}
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
              Account Details
            </span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: theme.colors.foreground,
                marginBottom: 2,
              }}
            >
              {data.client.name}
            </span>
            {data.client.email && (
              <span style={{ fontSize: 8, color: theme.colors.mutedForeground }}>
                {data.client.email}
              </span>
            )}
            {data.client.phone && (
              <span style={{ fontSize: 8, color: theme.colors.mutedForeground }}>
                {data.client.phone}
              </span>
            )}
          </div>

          {/* Statement Period & Total Due */}
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
              Statement Period
            </span>
            <KeyValue
              size="sm"
              items={[
                ...(data.statementType !== 'outstanding' && data.periodFrom
                  ? [{ key: 'Period From', value: fmtDateLong(data.periodFrom) }]
                  : []),
                ...(data.periodTo ? [{ key: 'Period To', value: fmtDateLong(data.periodTo) }] : []),
                ...(data.dueDate && totalDue > 0
                  ? [
                      {
                        key: 'Payment Due Date',
                        value: formatStatementDueDate(data.dueDate, { long: true }),
                        valueStyle: isDueDateOverdue(data.dueDate)
                          ? { color: '#e11d48', fontWeight: 700 }
                          : undefined,
                      },
                    ]
                  : []),
                ...(data.statementType === 'outstanding'
                  ? []
                  : [{ key: 'Opening Balance', value: formatZARWithCR(openingBalance) }]),
                {
                  key: 'Total Amount Due',
                  value: formatZARWithCR(totalDue),
                  keyStyle: { fontWeight: 700, color: theme.colors.foreground },
                  valueStyle: {
                    fontWeight: 700,
                    color: totalDue > 0 ? theme.colors.primary : theme.colors.success,
                    fontSize: 10,
                  },
                },
              ]}
            />
          </div>
        </div>

        {/* Transactions Table */}
        <Table variant="compact" style={{ marginBottom: theme.spacing.sectionGap }}>
          <TableHeader>
            <TableRow header>
              <TableCell header width="15%">
                Date
              </TableCell>
              <TableCell header width="18%">
                Reference
              </TableCell>
              <TableCell header width="28%">
                Description
              </TableCell>
              <TableCell header align="right" width="13%">
                Debit
              </TableCell>
              <TableCell header align="right" width="13%">
                Credit
              </TableCell>
              <TableCell header align="right" width="13%">
                Balance
              </TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Opening Balance Row (only for Activity Statement) */}
            {data.statementType !== 'outstanding' && (
              <TableRow striped={false}>
                <TableCell width="15%">
                  {data.periodFrom ? fmtDateLong(data.periodFrom) : '-'}
                </TableCell>
                <TableCell width="18%" bold>
                  OPENING
                </TableCell>
                <TableCell width="28%">Opening Balance</TableCell>
                <TableCell width="13%" align="right">
                  -
                </TableCell>
                <TableCell width="13%" align="right">
                  -
                </TableCell>
                <TableCell width="13%" align="right" bold tabular>
                  {formatZARWithCR(openingBalance)}
                </TableCell>
              </TableRow>
            )}

            {/* Transaction Rows */}
            {(data.transactions ?? []).map((tx, idx) => (
              <TableRow key={idx} striped={idx % 2 === 1}>
                <TableCell width="15%">{fmtDateLong(tx.date)}</TableCell>
                <TableCell width="18%" bold>
                  {tx.reference}
                </TableCell>
                <TableCell width="28%">{tx.description}</TableCell>
                <TableCell width="13%" align="right" tabular>
                  {tx.debit ? formatZAR(tx.debit) : '-'}
                </TableCell>
                <TableCell
                  width="13%"
                  align="right"
                  tabular
                  style={{ color: tx.credit ? theme.colors.success : undefined }}
                >
                  {tx.credit ? `(${formatZAR(tx.credit)})` : '-'}
                </TableCell>
                <TableCell width="13%" align="right" bold tabular>
                  {tx.balance != null ? formatZARWithCR(tx.balance) : '-'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Section Below Last Line Item: Banking on Left, Totals Breakdown on Right */}
        <KeepTogether>
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: 24,
              marginTop: 6,
              marginBottom: 12,
            }}
          >
            {/* Left: Banking Details */}
            <div style={{ width: '54%' }}>
              {data.banking && (
                <div
                  style={{
                    padding: '4px 0',
                  }}
                >
                  <span
                    style={{
                      fontSize: 7.5,
                      fontWeight: 700,
                      color: theme.colors.primary,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      display: 'block',
                      marginBottom: 6,
                    }}
                  >
                    Banking Details
                  </span>
                  <KeyValue
                    size="sm"
                    items={[
                      { key: 'Bank', value: data.banking.bankName },
                      { key: 'Account Name', value: data.banking.accountName },
                      { key: 'Account Number', value: data.banking.accountNumber },
                      { key: 'Branch Code', value: data.banking.branchCode },
                      {
                        key: 'Payment Reference',
                        value:
                          data.client.accountRef || data.client.name.slice(0, 14).toUpperCase(),
                      },
                    ]}
                  />
                  <div
                    style={{
                      marginTop: 6,
                      fontSize: 6.8,
                      color: theme.colors.mutedForeground,
                      lineHeight: '1.4',
                    }}
                  >
                    <span style={{ fontWeight: 600, color: theme.colors.foreground }}>
                      Payment Instructions:
                    </span>
                    <br />• Use{' '}
                    <span style={{ fontWeight: 600, color: theme.colors.foreground }}>
                      {data.client.accountRef || data.client.name.slice(0, 14).toUpperCase()}
                    </span>{' '}
                    as your deposit reference.
                    {data.org.email && (
                      <>
                        <br />• Email Proof of Payment (POP) to:{' '}
                        <span style={{ fontWeight: 600, color: theme.colors.primary }}>
                          {data.org.email}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right: Breakdown Card (Subtotal, Less Payments, Balance Due) */}
            <div
              style={{
                width: '42%',
                padding: '4px 0',
              }}
            >
              <KeyValue
                size="sm"
                divided
                items={[
                  ...(data.statementType === 'outstanding'
                    ? totalPaid > 0
                      ? [
                          {
                            key: 'Total Invoiced',
                            value: formatZARWithCR(subtotal),
                            keyStyle: { fontWeight: 700 },
                            valueStyle: { fontWeight: 700 },
                          },
                          {
                            key: 'Less Payments',
                            value: `-${formatZAR(totalPaid)}`,
                            valueStyle: { color: theme.colors.success },
                          },
                        ]
                      : []
                    : [
                        {
                          key: 'Subtotal',
                          value: formatZARWithCR(subtotal),
                          keyStyle: { fontWeight: 700 },
                          valueStyle: { fontWeight: 700 },
                        },
                        {
                          key: 'Less Payments',
                          value: totalPaid > 0 ? `-${formatZAR(totalPaid)}` : '-R 0,00',
                          valueStyle: {
                            color:
                              totalPaid > 0 ? theme.colors.success : theme.colors.mutedForeground,
                          },
                        },
                      ]),
                  {
                    key: data.statementType === 'outstanding' ? 'Total Outstanding' : 'Balance Due',
                    value: formatZARWithCR(totalDue),
                    keyStyle: { fontWeight: 700, fontSize: 10, color: theme.colors.foreground },
                    valueStyle: {
                      fontWeight: 700,
                      fontSize: 11,
                      color: totalDue > 0 ? theme.colors.primary : theme.colors.success,
                    },
                  },
                ]}
              />
            </div>
          </div>
        </KeepTogether>

        {/* Bottom Fixed Section: Ageing Summary & Footer */}
        <div
          style={{
            marginTop: 'auto',
            display: 'flex',
            flexDirection: 'column',
            breakInside: 'avoid',
            pageBreakInside: 'avoid',
          }}
        >
          {/* Ageing Summary Table */}
          {data.ageing && (
            <div style={{ marginTop: 8, marginBottom: 8 }}>
              <span
                style={{
                  fontSize: 7.5,
                  fontWeight: 700,
                  color: theme.colors.primary,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  display: 'block',
                  marginBottom: 6,
                }}
              >
                Ageing Summary
              </span>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  border: `1px solid ${theme.colors.border}`,
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: '#f9fafb' }}>
                    <th
                      style={{
                        padding: '4px 6px',
                        fontSize: 7,
                        fontWeight: 700,
                        textAlign: 'center',
                        borderRight: `1px solid ${theme.colors.border}`,
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
                        borderRight: `1px solid ${theme.colors.border}`,
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
                        borderRight: `1px solid ${theme.colors.border}`,
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
                        borderRight: `1px solid ${theme.colors.border}`,
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
                        borderRight: `1px solid ${theme.colors.border}`,
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
                      }}
                    >
                      Total Due
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
                        fontWeight: data.ageing.days61plus > 0 ? 700 : 400,
                        color: data.ageing.days61plus > 0 ? '#dc2626' : 'inherit',
                        fontVariantNumeric: 'tabular-nums',
                        borderRight: `1px solid ${theme.colors.border}`,
                      }}
                    >
                      {formatZAR(data.ageing.days61plus)}
                    </td>
                    <td
                      style={{
                        padding: '6px',
                        fontSize: 8,
                        textAlign: 'center',
                        fontWeight: data.ageing.days31_60 > 0 ? 700 : 400,
                        color: data.ageing.days31_60 > 0 ? '#dc2626' : 'inherit',
                        fontVariantNumeric: 'tabular-nums',
                        borderRight: `1px solid ${theme.colors.border}`,
                      }}
                    >
                      {formatZAR(data.ageing.days31_60)}
                    </td>
                    <td
                      style={{
                        padding: '6px',
                        fontSize: 8,
                        textAlign: 'center',
                        fontWeight: data.ageing.days15_30 > 0 ? 700 : 400,
                        color: data.ageing.days15_30 > 0 ? '#d97706' : 'inherit',
                        fontVariantNumeric: 'tabular-nums',
                        borderRight: `1px solid ${theme.colors.border}`,
                      }}
                    >
                      {formatZAR(data.ageing.days15_30)}
                    </td>
                    <td
                      style={{
                        padding: '6px',
                        fontSize: 8,
                        textAlign: 'center',
                        fontWeight: data.ageing.days1_14 > 0 ? 700 : 400,
                        color: data.ageing.days1_14 > 0 ? '#d97706' : 'inherit',
                        fontVariantNumeric: 'tabular-nums',
                        borderRight: `1px solid ${theme.colors.border}`,
                      }}
                    >
                      {formatZAR(data.ageing.days1_14)}
                    </td>
                    <td
                      style={{
                        padding: '6px',
                        fontSize: 8,
                        textAlign: 'center',
                        fontWeight: 700,
                        color: theme.colors.foreground,
                        fontVariantNumeric: 'tabular-nums',
                        borderRight: `1px solid ${theme.colors.border}`,
                      }}
                    >
                      {formatZAR(data.ageing.current)}
                    </td>
                    <td
                      style={{
                        padding: '6px',
                        fontSize: 8.5,
                        textAlign: 'center',
                        fontWeight: 700,
                        color: totalDue > 0 ? theme.colors.foreground : theme.colors.success,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {formatZARWithCR(totalDue)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          <PageFooter org={data.org} style={{ marginTop: 0 }} />
        </div>
      </Page>
    </Document>
  );
}
