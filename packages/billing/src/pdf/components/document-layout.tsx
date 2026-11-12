import React, { type CSSProperties, type ReactNode } from 'react';
import { Page } from '../primitives';
import type { OrgDetails } from './page-header';

/**
 * Uniform layout kit shared by every billing PDF (statement, invoice, quote,
 * receipt, credit note). It mirrors the web `DocumentPreview` 1:1 so the
 * downloaded PDF looks like the on-screen document.
 *
 * Sizes are expressed in PDF points: preview px * 0.75.
 */
export const DOC_COLORS = {
  text: '#18181b',
  textSoft: '#3f3f46',
  muted: '#52525b',
  subtle: '#71717a',
  label: '#a1a1aa',
  title: '#d4d4d8',
  border: '#f4f4f5',
  borderStrong: '#e4e4e7',
  tableHeaderBg: '#fafafa',
  blue: '#1d4ed8',
  link: '#2563eb',
  emerald: '#059669',
  red: '#dc2626',
  rose: '#e11d48',
  amber: '#d97706',
  orange: '#ea580c',
} as const;

export const ACCENT_BLUE = '#1d4ed8';
export const ACCENT_EMERALD = '#059669';

const labelStyle: CSSProperties = {
  fontSize: 7.5,
  fontWeight: 600,
  color: DOC_COLORS.label,
  textTransform: 'uppercase',
  letterSpacing: '1px',
};

export function SectionLabel({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <span style={{ ...labelStyle, ...style }}>{children}</span>;
}

/** A4 page with a full-bleed top accent bar and a padded, growing body. */
export function DocumentPage({
  children,
  accent = ACCENT_BLUE,
}: {
  children: ReactNode;
  accent?: string;
}) {
  return (
    <Page size="a4" style={{ padding: 0 }}>
      <div style={{ display: 'flex', width: '100%', height: 3, backgroundColor: accent }} />
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flexGrow: 1,
          padding: '30px 36px 28px 36px',
        }}
      >
        {children}
      </div>
    </Page>
  );
}

const PILL_STYLES: Record<string, { bg: string; fg: string }> = {
  paid: { bg: '#ecfdf5', fg: '#047857' },
  accepted: { bg: '#ecfdf5', fg: '#047857' },
  active: { bg: '#ecfdf5', fg: '#047857' },
  overdue: { bg: '#fef2f2', fg: '#b91c1c' },
  declined: { bg: '#fef2f2', fg: '#b91c1c' },
  sent: { bg: '#eff6ff', fg: '#1d4ed8' },
  issued: { bg: '#eff6ff', fg: '#1d4ed8' },
  expired: { bg: '#fff7ed', fg: '#c2410c' },
};

export function StatusPill({ status }: { status: string }) {
  const key = status.trim().toLowerCase().replace(/\s+/g, '_');
  const tone = PILL_STYLES[key] ?? { bg: '#f4f4f5', fg: '#71717a' };
  return (
    <div
      style={{
        display: 'flex',
        padding: '2px 8px',
        borderRadius: 9999,
        backgroundColor: tone.bg,
      }}
    >
      <span style={{ fontSize: 8, fontWeight: 500, color: tone.fg }}>{status}</span>
    </div>
  );
}

export interface DocumentHeaderProps {
  org: OrgDetails;
  /** e.g. Statement, Invoice, Quotation, Receipt, Credit Note */
  title: string;
  number: string;
  status?: string;
  /** Optional prominent amount under the status pill (statements). */
  amountDue?: number;
  amountDueFormatted?: string;
  /** Prefix the document number with `#` (default true; receipts omit it). */
  prefixHash?: boolean;
}

function OrgLine({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <span style={{ fontSize: 9, color: DOC_COLORS.subtle, lineHeight: 1.35, ...style }}>
      {children}
    </span>
  );
}

export function DocumentHeader({
  org,
  title,
  number,
  status,
  amountDue,
  amountDueFormatted,
  prefixHash = true,
}: DocumentHeaderProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          width: '100%',
          paddingBottom: 18,
        }}
      >
        {/* Left: organisation */}
        <div style={{ display: 'flex', flexDirection: 'column', width: '36%' }}>
          <span style={{ fontSize: 13.5, fontWeight: 700, color: DOC_COLORS.text }}>
            {org.name}
          </span>
          {org.divisionOf && (
            <OrgLine style={{ fontStyle: 'italic' }}>A division of {org.divisionOf}</OrgLine>
          )}
          {org.registrationNumber && <OrgLine>Reg: {org.registrationNumber}</OrgLine>}
          {org.vatNumber && <OrgLine>VAT: {org.vatNumber}</OrgLine>}
          {org.address && <OrgLine style={{ marginTop: 2 }}>{org.address}</OrgLine>}
          {org.email && <OrgLine>{org.email}</OrgLine>}
          {org.phone && <OrgLine>{org.phone}</OrgLine>}
          {org.website && <OrgLine>{org.website}</OrgLine>}
          {org.salesRep && <OrgLine>Rep: {org.salesRep}</OrgLine>}
        </div>

        {/* Center: logo */}
        <div
          style={{
            display: 'flex',
            width: '24%',
            height: 48,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {org.logoDataUri ? (
            <img
              src={org.logoDataUri}
              alt={org.name}
              style={{ width: 90, height: 48, objectFit: 'contain' }}
            />
          ) : (
            <span style={{ fontSize: 9, fontWeight: 700, color: DOC_COLORS.textSoft }}>
              {org.name.slice(0, 3).toUpperCase()}
            </span>
          )}
        </div>

        {/* Right: title, number, status, amount due */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            width: '36%',
          }}
        >
          <span
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: DOC_COLORS.title,
              textTransform: 'uppercase',
              letterSpacing: '2px',
            }}
          >
            {title}
          </span>
          <span
            style={{ fontSize: 10.5, fontWeight: 600, color: DOC_COLORS.textSoft, marginTop: 5 }}
          >
            {prefixHash ? '#' : ''}
            {number}
          </span>
          {status && (
            <div style={{ display: 'flex', marginTop: 6 }}>
              <StatusPill status={status} />
            </div>
          )}
          {amountDueFormatted !== undefined && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                marginTop: 12,
              }}
            >
              <SectionLabel style={{ letterSpacing: '1.4px' }}>Amount Due</SectionLabel>
              <span
                style={{
                  fontSize: 13.5,
                  fontWeight: 700,
                  marginTop: 2,
                  fontVariantNumeric: 'tabular-nums',
                  color: (amountDue ?? 0) <= 0 ? DOC_COLORS.emerald : DOC_COLORS.red,
                }}
              >
                {amountDueFormatted}
              </span>
            </div>
          )}
        </div>
      </div>
      <div
        style={{ display: 'flex', width: '100%', height: 1, backgroundColor: DOC_COLORS.border }}
      />
    </div>
  );
}

export interface MetaRowItem {
  label: string;
  value: string;
  valueStyle?: CSSProperties;
}

export interface DocumentMetaRowProps {
  /** Uppercase label: ACCOUNT, BILL TO, RECEIVED FROM, CREDIT TO */
  partyLabel: string;
  party: {
    name: string;
    contactName?: string | null;
    address?: string | null;
    email?: string | null;
    phone?: string | null;
  };
  /** Inline right-aligned label/value pairs (dates, amounts). */
  rows?: MetaRowItem[];
  /** Optional full-width reference/reason block below. */
  referenceLabel?: string;
  reference?: string | null;
}

export function DocumentMetaRow({
  partyLabel,
  party,
  rows = [],
  referenceLabel = 'Reference',
  reference,
}: DocumentMetaRowProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          width: '100%',
          paddingTop: 18,
          paddingBottom: 18,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', width: '50%' }}>
          <SectionLabel>{partyLabel}</SectionLabel>
          <span style={{ fontSize: 10.5, fontWeight: 600, color: DOC_COLORS.text, marginTop: 4 }}>
            {party.name}
          </span>
          {party.contactName && party.contactName !== party.name && (
            <OrgLine>{party.contactName}</OrgLine>
          )}
          {party.address && <OrgLine>{party.address}</OrgLine>}
          {party.email && <OrgLine>{party.email}</OrgLine>}
          {party.phone && <OrgLine>{party.phone}</OrgLine>}
        </div>

        {rows.length > 0 && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              width: '50%',
            }}
          >
            {rows.map((row) => (
              <div
                key={row.label}
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginBottom: 4,
                }}
              >
                <SectionLabel style={{ marginRight: 10 }}>{row.label}</SectionLabel>
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 500,
                    color: DOC_COLORS.textSoft,
                    ...row.valueStyle,
                  }}
                >
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {reference && (
        <div style={{ display: 'flex', flexDirection: 'column', paddingBottom: 14 }}>
          <SectionLabel>{referenceLabel}</SectionLabel>
          <span style={{ fontSize: 9, color: DOC_COLORS.muted, marginTop: 2 }}>{reference}</span>
        </div>
      )}
    </div>
  );
}

/* ── Table ─────────────────────────────────────────────────────────────── */

export interface DocColumn {
  key: string;
  label: string;
  width: string;
  align?: 'left' | 'right' | 'center';
}

export function DocTable({ columns, children }: { columns: DocColumn[]; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          width: '100%',
          backgroundColor: DOC_COLORS.tableHeaderBg,
          borderTop: `1px solid ${DOC_COLORS.border}`,
          borderBottom: `1px solid ${DOC_COLORS.border}`,
        }}
      >
        {columns.map((col) => (
          <div
            key={col.key}
            style={{
              display: 'flex',
              width: col.width,
              flex: `0 0 ${col.width}`,
              padding: '7px 4px',
              justifyContent:
                col.align === 'right'
                  ? 'flex-end'
                  : col.align === 'center'
                    ? 'center'
                    : 'flex-start',
            }}
          >
            <span
              style={{
                fontSize: 7.5,
                fontWeight: 600,
                color: DOC_COLORS.label,
                textTransform: 'uppercase',
                letterSpacing: '1px',
                whiteSpace: 'nowrap',
              }}
            >
              {col.label}
            </span>
          </div>
        ))}
      </div>
      {children}
    </div>
  );
}

export function DocRow({
  columns,
  cells,
  muted = false,
}: {
  columns: DocColumn[];
  /** `span` merges following columns into this cell (like colSpan). */
  cells: Array<{ content: ReactNode; style?: CSSProperties; span?: number }>;
  muted?: boolean;
}) {
  const rendered: ReactNode[] = [];
  let colIndex = 0;
  for (const cell of cells) {
    const span = Math.max(1, cell.span ?? 1);
    const group = columns.slice(colIndex, colIndex + span);
    const first = group[0];
    if (!first) break;
    const width = `${group.reduce((sum, c) => sum + parseFloat(c.width), 0)}%`;
    rendered.push(
      <div
        key={first.key}
        style={{
          display: 'flex',
          flexDirection: 'column',
          width,
          flex: `0 0 ${width}`,
          padding: '6px 4px',
          alignItems:
            first.align === 'right'
              ? 'flex-end'
              : first.align === 'center'
                ? 'center'
                : 'flex-start',
        }}
      >
        {typeof cell.content === 'string' || typeof cell.content === 'number' ? (
          <span
            style={{
              fontSize: 8.5,
              color: DOC_COLORS.muted,
              fontVariantNumeric: 'tabular-nums',
              ...cell.style,
            }}
          >
            {cell.content}
          </span>
        ) : (
          cell.content
        )}
      </div>,
    );
    colIndex += span;
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        width: '100%',
        borderBottom: `1px solid ${DOC_COLORS.border}`,
        backgroundColor: muted ? DOC_COLORS.tableHeaderBg : 'transparent',
        breakInside: 'avoid',
      }}
    >
      {rendered}
    </div>
  );
}

/* ── Totals ────────────────────────────────────────────────────────────── */

export interface TotalsRow {
  label: string;
  value: string;
  color?: string;
  bold?: boolean;
  /** Draw a separator above this row (used for the final due/total line). */
  divider?: boolean;
  emphasize?: boolean;
}

export function DocumentTotalsBlock({ rows }: { rows: TotalsRow[] }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'flex-end',
        width: '100%',
        marginTop: 14,
        marginBottom: 14,
        breakInside: 'avoid',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', width: 200 }}>
        {rows.map((row) => (
          <div
            key={row.label}
            style={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingTop: row.divider ? 7 : 3,
              paddingBottom: 3,
              marginTop: row.divider ? 4 : 0,
              borderTop: row.divider ? `1px solid ${DOC_COLORS.borderStrong}` : 'none',
            }}
          >
            <span
              style={{
                fontSize: row.emphasize ? 10 : 9,
                fontWeight: row.bold ? 700 : 400,
                color: row.bold ? DOC_COLORS.text : (row.color ?? DOC_COLORS.muted),
              }}
            >
              {row.label}
            </span>
            <span
              style={{
                fontSize: row.emphasize ? 10 : 9,
                fontWeight: row.bold ? 700 : 400,
                color: row.color ?? DOC_COLORS.muted,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Banking, notes, ageing, footer ────────────────────────────────────── */

export interface DocumentBanking {
  bankName: string;
  accountName: string;
  accountNumber: string;
  branchCode: string;
}

export function DocumentBankingSection({
  banking,
  paymentReference,
  showPaymentInstructions = false,
  contactEmail,
}: {
  banking: DocumentBanking;
  paymentReference: string;
  /** Statement-style EFT + proof-of-payment instructions. */
  showPaymentInstructions?: boolean;
  contactEmail?: string;
}) {
  const fields = [
    { label: 'Bank:', value: banking.bankName },
    { label: 'Account Name:', value: banking.accountName },
    { label: 'Account Number:', value: banking.accountNumber },
    { label: 'Branch Code:', value: banking.branchCode },
    { label: 'Payment Reference:', value: paymentReference },
  ];
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        borderTop: `1px solid ${DOC_COLORS.border}`,
        paddingTop: 14,
        paddingBottom: 12,
        breakInside: 'avoid',
      }}
    >
      <SectionLabel style={{ marginBottom: 8 }}>Banking Details</SectionLabel>
      {fields.map((f) => (
        <div
          key={f.label}
          style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}
        >
          <span style={{ fontSize: 9, color: DOC_COLORS.label, width: 110 }}>{f.label}</span>
          <span style={{ fontSize: 9, fontWeight: 700, color: DOC_COLORS.textSoft }}>
            {f.value}
          </span>
        </div>
      ))}
      {showPaymentInstructions && (
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 8 }}>
          <span style={{ fontSize: 9, color: DOC_COLORS.subtle, lineHeight: 1.4 }}>
            <span style={{ fontWeight: 700, color: DOC_COLORS.textSoft }}>Payment Reference: </span>
            Please use{' '}
            <span style={{ fontWeight: 700, color: DOC_COLORS.text }}>{paymentReference}</span> as
            your EFT deposit reference.
          </span>
          {contactEmail && (
            <span style={{ fontSize: 9, color: DOC_COLORS.subtle, lineHeight: 1.4 }}>
              <span style={{ fontWeight: 700, color: DOC_COLORS.textSoft }}>
                Proof of Payment (POP):{' '}
              </span>
              Please email POP to{' '}
              <span style={{ fontWeight: 500, color: DOC_COLORS.link }}>{contactEmail}</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export function DocumentNotesSection({
  notes,
  terms,
}: {
  notes?: string | null;
  terms?: string | null;
}) {
  if (!notes && !terms) return null;
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        borderTop: `1px solid ${DOC_COLORS.border}`,
        paddingTop: 12,
        paddingBottom: 12,
        breakInside: 'avoid',
      }}
    >
      {notes && (
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: terms ? 10 : 0 }}>
          <SectionLabel>Notes</SectionLabel>
          <span style={{ fontSize: 9, color: DOC_COLORS.muted, marginTop: 3, lineHeight: 1.4 }}>
            {notes}
          </span>
        </div>
      )}
      {terms && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <SectionLabel>Terms &amp; Conditions</SectionLabel>
          <span style={{ fontSize: 9, color: DOC_COLORS.muted, marginTop: 3, lineHeight: 1.4 }}>
            {terms}
          </span>
        </div>
      )}
    </div>
  );
}

export function DocumentFooter({
  reference,
  centerLines,
}: {
  reference?: string | null;
  /** Receipt-style centered footer lines instead of the default row. */
  centerLines?: string[];
}) {
  const trimmedRef = reference
    ? `Reference: ${reference.length > 30 ? `${reference.slice(0, 30)}...` : reference}`
    : '';
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: centerLines ? 'column' : 'row',
        justifyContent: 'space-between',
        alignItems: centerLines ? 'center' : 'center',
        width: '100%',
        marginTop: 'auto',
        paddingTop: 12,
        borderTop: `1px solid ${DOC_COLORS.border}`,
      }}
    >
      {centerLines ? (
        centerLines.map((line) => (
          <span key={line} style={{ fontSize: 7.5, color: DOC_COLORS.label, marginTop: 2 }}>
            {line}
          </span>
        ))
      ) : (
        <>
          <span style={{ fontSize: 7.5, color: DOC_COLORS.label }}>{trimmedRef}</span>
          <span style={{ fontSize: 7.5, color: DOC_COLORS.label }}>
            Thank you for your business.
          </span>
        </>
      )}
    </div>
  );
}

export interface AgeingBuckets {
  current: number;
  days1_14: number;
  days15_30: number;
  days31_60: number;
  days61plus: number;
}

export function DocumentAgeingSummary({
  ageing,
  totalDue,
  format,
}: {
  ageing: AgeingBuckets;
  totalDue: number;
  format: (amount: number) => string;
}) {
  const cols: Array<{ label: string; value: number; color: string; bold?: boolean }> = [
    {
      label: '61+ Days',
      value: ageing.days61plus,
      color: ageing.days61plus > 0 ? '#dc2626' : DOC_COLORS.subtle,
    },
    {
      label: '31–60 Days',
      value: ageing.days31_60,
      color: ageing.days31_60 > 0 ? '#ef4444' : DOC_COLORS.subtle,
    },
    {
      label: '15–30 Days',
      value: ageing.days15_30,
      color: ageing.days15_30 > 0 ? DOC_COLORS.amber : DOC_COLORS.subtle,
    },
    {
      label: '1–14 Days',
      value: ageing.days1_14,
      color: ageing.days1_14 > 0 ? DOC_COLORS.amber : DOC_COLORS.subtle,
    },
    { label: 'Current', value: ageing.current, color: DOC_COLORS.muted },
    { label: 'Total Due', value: totalDue, color: DOC_COLORS.text, bold: true },
  ];
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        paddingTop: 12,
        paddingBottom: 12,
        breakInside: 'avoid',
      }}
    >
      <SectionLabel style={{ marginBottom: 8 }}>Ageing Summary</SectionLabel>
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          width: '100%',
          border: `1px solid ${DOC_COLORS.borderStrong}`,
        }}
      >
        {cols.map((col, i) => (
          <div
            key={col.label}
            style={{
              display: 'flex',
              flexDirection: 'column',
              width: '16.66%',
              flex: '1 1 0%',
              borderLeft: i === 0 ? 'none' : `1px solid ${DOC_COLORS.borderStrong}`,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                padding: '6px 2px',
                backgroundColor: DOC_COLORS.tableHeaderBg,
                borderBottom: `1px solid ${DOC_COLORS.borderStrong}`,
              }}
            >
              <span
                style={{
                  fontSize: 7,
                  fontWeight: 500,
                  color: DOC_COLORS.subtle,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  whiteSpace: 'nowrap',
                }}
              >
                {col.label}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 2px' }}>
              <span
                style={{
                  fontSize: 8.5,
                  fontWeight: col.bold ? 700 : 600,
                  color: col.color,
                  fontVariantNumeric: 'tabular-nums',
                  whiteSpace: 'nowrap',
                }}
              >
                {format(col.value)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
