import React, { type CSSProperties } from "react";
import { usePdfTheme } from "../theme-provider";

export interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "destructive" | "muted" | "outline";
  style?: CSSProperties;
}

export function Badge({ children, variant = "default", style }: BadgeProps) {
  const theme = usePdfTheme();

  let bg = theme.colors.primary;
  let text = theme.colors.primaryForeground;
  let border = "transparent";

  switch (variant) {
    case "success":
      bg = "#dcfce7"; // green-100
      text = "#15803d"; // green-700
      border = "#bbf7d0";
      break;
    case "warning":
      bg = "#fef3c7"; // amber-100
      text = "#b45309"; // amber-700
      border = "#fde68a";
      break;
    case "destructive":
      bg = "#fee2e2"; // red-100
      text = "#b91c1c"; // red-700
      border = "#fecaca";
      break;
    case "muted":
      bg = theme.colors.muted;
      text = theme.colors.mutedForeground;
      border = theme.colors.border;
      break;
    case "outline":
      bg = "transparent";
      text = theme.colors.foreground;
      border = theme.colors.border;
      break;
    default:
      bg = theme.colors.primary;
      text = theme.colors.primaryForeground;
      break;
  }

  const badgeStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "3px 8px",
    borderRadius: theme.primitives.borderRadius.sm,
    backgroundColor: bg,
    color: text,
    fontSize: 7.5,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    border: `1px solid ${border}`,
    ...style,
  };

  return <span style={badgeStyle}>{children}</span>;
}
