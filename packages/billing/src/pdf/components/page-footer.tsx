import React, { type CSSProperties } from "react";
import { usePdfTheme } from "../theme-provider";

export interface PageFooterProps {
  leftText?: string;
  rightText?: string;
  pageNumber?: number;
  totalPages?: number;
  style?: CSSProperties;
}

export function PageFooter({
  leftText = "Thank you for your business. Payment is due according to agreed terms.",
  rightText,
  pageNumber = 1,
  totalPages = 1,
  style,
}: PageFooterProps) {
  const theme = usePdfTheme();
  const pageLabel = rightText || `Page ${pageNumber} of ${totalPages}`;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 20,
        left: theme.spacing.page.marginLeft,
        right: theme.spacing.page.marginRight,
        paddingTop: 8,
        borderTop: `1px solid ${theme.colors.border}`,
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        boxSizing: "border-box",
        ...style,
      }}
    >
      <span style={{ fontSize: 7, color: theme.colors.mutedForeground }}>
        {leftText}
      </span>
      <span style={{ fontSize: 7, color: theme.colors.mutedForeground, fontVariantNumeric: "tabular-nums" }}>
        {pageLabel}
      </span>
    </div>
  );
}
