import React, { type CSSProperties } from "react";
import { usePdfTheme } from "../theme-provider";

export interface KeyValueItem {
  key: string;
  value: React.ReactNode;
  keyStyle?: CSSProperties;
  valueStyle?: CSSProperties;
}

export interface KeyValueProps {
  items: KeyValueItem[];
  divided?: boolean;
  size?: "sm" | "md" | "lg";
  style?: CSSProperties;
}

export function KeyValue({ items, divided = false, size = "md", style }: KeyValueProps) {
  const theme = usePdfTheme();

  const fontSize = size === "sm" ? 7.5 : size === "lg" ? 9.5 : 8.5;
  const paddingY = size === "sm" ? 3 : size === "lg" ? 6 : 4;

  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%", ...style }}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <div
            key={item.key}
            style={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              paddingTop: paddingY,
              paddingBottom: paddingY,
              borderBottom: divided && !isLast ? `1px solid ${theme.colors.border}` : "none",
            }}
          >
            <span
              style={{
                fontSize,
                fontWeight: 500,
                color: theme.colors.mutedForeground,
                ...item.keyStyle,
              }}
            >
              {item.key}
            </span>
            <span
              style={{
                fontSize,
                fontWeight: 600,
                color: theme.colors.foreground,
                fontVariantNumeric: "tabular-nums",
                textAlign: "right",
                ...item.valueStyle,
              }}
            >
              {item.value}
            </span>
          </div>
        );
      })}
    </div>
  );
}
