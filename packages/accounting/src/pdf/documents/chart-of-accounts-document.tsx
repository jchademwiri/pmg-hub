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
import type { ChartAccount } from "@pmg/db";
import { type PdfOrgHeader } from "@pmg/billing/pdf-shell";
import { AccountingReportLayout } from "../components/report-layout";

const ACCOUNT_GROUPS = [
  { key: "asset", label: "Assets" },
  { key: "liability", label: "Liabilities" },
  { key: "equity", label: "Equity" },
  { key: "revenue", label: "Revenue" },
  { key: "expense", label: "Expenses" },
] as const;

export interface ChartOfAccountsDocumentProps {
  grouped: Record<string, ChartAccount[]>;
  org: PdfOrgHeader;
  generatedAt: string;
}

export function ChartOfAccountsDocument({
  grouped,
  org,
  generatedAt,
}: ChartOfAccountsDocumentProps) {
  return (
    <AccountingReportLayout
      title="Chart of Accounts"
      periodLabel="Master Ledger Configuration"
      generatedAt={generatedAt}
      org={org}
    >
      {ACCOUNT_GROUPS.map((group) => {
        const accounts = grouped[group.key] ?? [];
        if (accounts.length === 0) return null;

        return (
          <KeepTogether key={`group-${group.key}`}>
            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  padding: "6px 10px",
                  backgroundColor: "#f1f5f9",
                  borderLeft: "4px solid #1e3a8a",
                  marginBottom: 6,
                }}
              >
                <span style={{ fontSize: 9, fontWeight: 700, color: "#1e3a8a", textTransform: "uppercase" }}>
                  {group.label} ({accounts.length})
                </span>
              </div>

              <Table>
                <TableHeader style={{ backgroundColor: "#f8fafc" }}>
                  <TableRow>
                    <TableHead style={{ width: "20%", fontSize: 7.5, fontWeight: 700, color: "#64748b" }}>
                      ACCOUNT CODE
                    </TableHead>
                    <TableHead style={{ width: "65%", fontSize: 7.5, fontWeight: 700, color: "#64748b" }}>
                      ACCOUNT NAME
                    </TableHead>
                    <TableHead style={{ width: "15%", textAlign: "right", fontSize: 7.5, fontWeight: 700, color: "#64748b" }}>
                      STATUS
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map((account) => (
                    <TableRow key={`acc-${account.id}`}>
                      <TableCell style={{ width: "20%", fontSize: 8, fontWeight: 600, color: "#0f172a" }}>
                        {account.code}
                      </TableCell>
                      <TableCell style={{ width: "65%", fontSize: 8, color: "#18181b" }}>
                        {account.name}
                      </TableCell>
                      <TableCell style={{ width: "15%", textAlign: "right" }}>
                        <Badge variant={account.isActive ? "success" : "muted"}>
                          {account.isActive ? "ACTIVE" : "INACTIVE"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </KeepTogether>
        );
      })}
    </AccountingReportLayout>
  );
}
