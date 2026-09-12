import React, { type CSSProperties, type ReactNode } from "react";
import { Document, Page, View, Text } from "@pmg/billing/pdf";
import { type PdfOrgHeader } from "@pmg/billing/pdf-shell";

export interface AccountingReportLayoutProps {
  title: string;
  periodLabel?: string;
  divisionLabel?: string;
  generatedAt?: string;
  org: PdfOrgHeader;
  children: ReactNode;
  orientation?: "portrait" | "landscape";
  style?: CSSProperties;
}

export function AccountingReportLayout({
  title,
  periodLabel,
  divisionLabel,
  generatedAt,
  org,
  children,
  orientation = "portrait",
  style,
}: AccountingReportLayoutProps) {
  const fullTitle = divisionLabel ? `${title} — ${divisionLabel}` : title;

  return (
    <Document>
      <Page size="A4" orientation={orientation} style={{ padding: 28, backgroundColor: "#ffffff", ...style }}>
        {/* Top Brand Accent Bar */}
        <div style={{ width: "100%", height: 3, backgroundColor: "#0f172a", marginBottom: 14 }} />

        {/* Report Header Band */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-start",
            paddingBottom: 12,
            borderBottom: "1px solid #e4e4e7",
            marginBottom: 16,
          }}
        >
          {/* Company Info */}
          <div style={{ display: "flex", flexDirection: "column", maxWidth: "55%" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 2 }}>
              {org.name}
            </span>
            {org.divisionOf && (
              <span style={{ fontSize: 7.5, color: "#71717a" }}>
                A division of {org.divisionOf}
              </span>
            )}
            {org.registrationNumber && (
              <span style={{ fontSize: 7.5, color: "#71717a" }}>
                Reg: {org.registrationNumber}
              </span>
            )}
            {org.vatNumber && (
              <span style={{ fontSize: 7.5, color: "#71717a" }}>
                VAT: {org.vatNumber}
              </span>
            )}
            {org.email && (
              <span style={{ fontSize: 7.5, color: "#71717a" }}>
                {org.email}
              </span>
            )}
            {org.phone && (
              <span style={{ fontSize: 7.5, color: "#71717a" }}>
                {org.phone}
              </span>
            )}
            {org.website && (
              <span style={{ fontSize: 7.5, color: "#71717a" }}>
                {org.website}
              </span>
            )}
            {org.address && (
              <span style={{ fontSize: 7.5, color: "#71717a", marginTop: 2 }}>
                {org.address}
              </span>
            )}
          </div>

          {/* Report Title & Metadata */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", maxWidth: "45%" }}>
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "#1e3a8a",
                textAlign: "right",
                letterSpacing: "0.4px",
                marginBottom: 4,
              }}
            >
              {fullTitle}
            </span>
            {periodLabel && (
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 600,
                  color: "#27272a",
                  textAlign: "right",
                  marginBottom: 2,
                }}
              >
                {periodLabel}
              </span>
            )}
            {generatedAt && (
              <span style={{ fontSize: 7.5, color: "#71717a", textAlign: "right" }}>
                Generated {generatedAt}
              </span>
            )}
          </div>
        </div>

        {/* Report Body */}
        <div style={{ display: "flex", flexDirection: "column", width: "100%", flexGrow: 1 }}>
          {children}
        </div>

        {/* Report Footer */}
        <div
          style={{
            marginTop: 20,
            paddingTop: 10,
            borderTop: "1px solid #e4e4e7",
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: 7, color: "#71717a" }}>
            {org.divisionOf ? `A division of ${org.divisionOf}` : "Playhouse Media Group (Pty) Ltd — Confidential Accounting Report"}
          </span>
          <span style={{ fontSize: 7, color: "#71717a" }}>
            Official Financial Record
          </span>
        </div>
      </Page>
    </Document>
  );
}
