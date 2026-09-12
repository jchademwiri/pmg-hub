import React from "react";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  Badge,
  KeepTogether,
} from "@pmg/billing/pdf";
import { formatZAR, fmtDate } from "@pmg/billing/format";
import type { JournalEntry, JournalEntryLineRow } from "@pmg/db";
import { type PdfOrgHeader } from "@pmg/billing/pdf-shell";
import { AccountingReportLayout } from "../components/report-layout";

export interface JournalEntriesDocumentProps {
  entries: JournalEntry[];
  linesByEntry: Record<string, JournalEntryLineRow[]>;
  totalCount: number;
  org: PdfOrgHeader;
  periodLabel: string;
  divisionLabel?: string;
  generatedAt: string;
}

export function JournalEntriesDocument({
  entries,
  linesByEntry,
  totalCount,
  org,
  periodLabel,
  divisionLabel,
  generatedAt,
}: JournalEntriesDocumentProps) {
  const isTruncated = totalCount > entries.length;

  return (
    <AccountingReportLayout
      title="Journal Entries Report"
      periodLabel={periodLabel}
      divisionLabel={divisionLabel}
      generatedAt={generatedAt}
      org={org}
    >
      {isTruncated && (
        <div
          style={{
            padding: "6px 10px",
            backgroundColor: "#fef2f2",
            border: "1px solid #fca5a5",
            borderRadius: 4,
            marginBottom: 10,
          }}
        >
          <span style={{ fontSize: 7.5, color: "#b91c1c", fontWeight: 600 }}>
            Showing {entries.length} of {totalCount} journal entries. Narrow your filters to view more.
          </span>
        </div>
      )}

      {entries.length === 0 ? (
        <div style={{ padding: 16, textAlign: "center", color: "#a1a1aa", fontSize: 9 }}>
          No journal entries recorded for this period.
        </div>
      ) : (
        entries.map((entry) => {
          const lines = linesByEntry[entry.id] ?? [];
          const statusVariant =
            entry.status === "posted"
              ? "success"
              : entry.status === "void"
                ? "destructive"
                : "muted";

          let entryDebits = 0;
          let entryCredits = 0;
          for (const l of lines) {
            entryDebits += l.debit;
            entryCredits += l.credit;
          }

          return (
            <KeepTogether key={`entry-${entry.id}`}>
              <div
                style={{
                  marginBottom: 14,
                  border: "1px solid #e4e4e7",
                  borderRadius: 6,
                  overflow: "hidden",
                }}
              >
                {/* Entry Header */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 12px",
                    backgroundColor: "#f8fafc",
                    borderBottom: "1px solid #e4e4e7",
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 8.5, fontWeight: 700, color: "#0f172a" }}>
                      {entry.entryNumber}
                    </span>
                    <span style={{ fontSize: 8, color: "#52525b" }}>
                      {fmtDate(entry.entryDate)}
                    </span>
                    <span style={{ fontSize: 8, color: "#27272a" }}>
                      {entry.description}
                    </span>
                  </div>
                  <Badge variant={statusVariant}>
                    {entry.status.toUpperCase()}
                  </Badge>
                </div>

                {/* Entry Lines */}
                <Table>
                  <TableHeader style={{ backgroundColor: "#ffffff" }}>
                    <TableRow>
                      <TableHead style={{ width: "20%", fontSize: 7, fontWeight: 700, color: "#64748b" }}>
                        ACCOUNT CODE
                      </TableHead>
                      <TableHead style={{ width: "50%", fontSize: 7, fontWeight: 700, color: "#64748b" }}>
                        ACCOUNT NAME / DESCRIPTION
                      </TableHead>
                      <TableHead style={{ width: "15%", textAlign: "right", fontSize: 7, fontWeight: 700, color: "#64748b" }}>
                        DEBIT (ZAR)
                      </TableHead>
                      <TableHead style={{ width: "15%", textAlign: "right", fontSize: 7, fontWeight: 700, color: "#64748b" }}>
                        CREDIT (ZAR)
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lines.map((line, lIdx) => (
                      <TableRow key={`line-${line.id || lIdx}`}>
                        <TableCell style={{ width: "20%", fontSize: 7.5, fontWeight: 600, color: "#0f172a" }}>
                          {line.accountCode}
                        </TableCell>
                        <TableCell style={{ width: "50%", fontSize: 7.5, color: "#18181b" }}>
                          {line.accountName}
                          {line.description ? ` — ${line.description}` : ""}
                        </TableCell>
                        <TableCell style={{ width: "15%", textAlign: "right", fontSize: 7.5, fontVariantNumeric: "tabular-nums" }}>
                          {line.debit > 0 ? formatZAR(line.debit) : "—"}
                        </TableCell>
                        <TableCell style={{ width: "15%", textAlign: "right", fontSize: 7.5, fontVariantNumeric: "tabular-nums" }}>
                          {line.credit > 0 ? formatZAR(line.credit) : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow style={{ backgroundColor: "#fafafa", borderTop: "1px solid #e4e4e7" }}>
                      <TableCell style={{ width: "20%", fontWeight: 700, fontSize: 7.5, color: "#0f172a" }}>
                        Entry Total
                      </TableCell>
                      <TableCell style={{ width: "50%" }} />
                      <TableCell style={{ width: "15%", textAlign: "right", fontWeight: 700, fontSize: 7.5, color: "#0f172a", fontVariantNumeric: "tabular-nums" }}>
                        {formatZAR(entryDebits)}
                      </TableCell>
                      <TableCell style={{ width: "15%", textAlign: "right", fontWeight: 700, fontSize: 7.5, color: "#0f172a", fontVariantNumeric: "tabular-nums" }}>
                        {formatZAR(entryCredits)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </KeepTogether>
          );
        })
      )}
    </AccountingReportLayout>
  );
}
