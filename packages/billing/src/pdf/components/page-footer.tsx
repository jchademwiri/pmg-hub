import React, { type CSSProperties } from "react";
import { usePdfTheme } from "../theme-provider";

export interface PageFooterProps {
  leftText?: string;
  rightText?: string;
  style?: CSSProperties;
}

export function PageFooter({
  leftText = "Thank you for your business. Payment is due according to agreed terms.",
  rightText,
  style,
}: PageFooterProps) {
  const theme = usePdfTheme();

  return (
    <div
      style={{
        marginTop: "auto",
        paddingTop: 12,
        borderTop: `1px solid ${theme.colors.border}`,
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        ...style,
      }}
    >
      <span style={{ fontSize: 7, color: theme.colors.mutedForeground }}>
        {leftText}
      </span>
      {rightText && (
        <span style={{ fontSize: 7, color: theme.colors.mutedForeground, fontVariantNumeric: "tabular-nums" }}>
          {rightText}
        </span>
      )}
    </div>
  );
}
