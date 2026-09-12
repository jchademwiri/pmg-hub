import React, { type CSSProperties } from "react";
import { usePdfTheme } from "../theme-provider";
import { Badge } from "./badge";

export interface OrgDetails {
  name: string;
  divisionOf?: string;
  registrationNumber?: string;
  vatNumber?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  salesRep?: string;
  logoDataUri?: string | null;
}

export interface PageHeaderProps {
  org: OrgDetails;
  title: string;
  number: string;
  status?: string;
  style?: CSSProperties;
}

export function PageHeader({ org, title, number, status, style }: PageHeaderProps) {
  const theme = usePdfTheme();

  const statusVariant =
    status?.toLowerCase() === "paid"
      ? "success"
      : status?.toLowerCase() === "overdue"
        ? "destructive"
        : status?.toLowerCase() === "draft"
          ? "muted"
          : "default";

  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%", marginBottom: theme.spacing.sectionGap, ...style }}>
      {/* Top brand accent bar */}
      <div style={{ width: "100%", height: 3, backgroundColor: theme.colors.primary, marginBottom: 16 }} />

      <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
        {/* Left: Org Details */}
        <div style={{ display: "flex", flexDirection: "column", maxWidth: "45%" }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: theme.colors.foreground, marginBottom: 2 }}>
            {org.name}
          </span>
          {org.divisionOf && (
            <span style={{ fontSize: 7.5, color: theme.colors.mutedForeground }}>
              A division of {org.divisionOf}
            </span>
          )}
          {org.registrationNumber && (
            <span style={{ fontSize: 7.5, color: theme.colors.mutedForeground }}>
              Reg: {org.registrationNumber}
            </span>
          )}
          {org.vatNumber && (
            <span style={{ fontSize: 7.5, color: theme.colors.mutedForeground }}>
              VAT: {org.vatNumber}
            </span>
          )}
          {org.email && (
            <span style={{ fontSize: 7.5, color: theme.colors.mutedForeground }}>
              {org.email}
            </span>
          )}
          {org.phone && (
            <span style={{ fontSize: 7.5, color: theme.colors.mutedForeground }}>
              {org.phone}
            </span>
          )}
          {org.website && (
            <span style={{ fontSize: 7.5, color: theme.colors.mutedForeground }}>
              {org.website}
            </span>
          )}
          {org.address && (
            <span style={{ fontSize: 7.5, color: theme.colors.mutedForeground, marginTop: 2 }}>
              {org.address}
            </span>
          )}
        </div>

        {/* Center: Optional Logo */}
        {org.logoDataUri && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
            <img src={org.logoDataUri} alt={org.name} style={{ width: 44, height: 44, objectFit: "contain" }} />
          </div>
        )}

        {/* Right: Document Title, Number & Status */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", maxWidth: "45%" }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: theme.colors.primary, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            {title}
          </span>
          <span style={{ fontSize: 10, fontWeight: 600, color: theme.colors.foreground, marginTop: 2, fontVariantNumeric: "tabular-nums" }}>
            #{number}
          </span>
          {status && (
            <div style={{ marginTop: 6 }}>
              <Badge variant={statusVariant}>{status}</Badge>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
