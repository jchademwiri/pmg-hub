import React, { type CSSProperties, type ReactNode } from "react";
import { usePdfTheme } from "../theme-provider";

export interface TableProps {
  children: ReactNode;
  variant?: "default" | "compact" | "striped" | "bordered";
  style?: CSSProperties;
}

export function Table({ children, style }: TableProps) {
  return (
    <table
      style={{
        width: "100%",
        borderCollapse: "collapse",
        borderSpacing: 0,
        tableLayout: "fixed",
        ...style,
      }}
    >
      {children}
    </table>
  );
}

export function TableHeader({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <thead style={style}>{children}</thead>;
}

export function TableBody({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <tbody style={style}>{children}</tbody>;
}

export interface TableRowProps {
  children: ReactNode;
  header?: boolean;
  striped?: boolean;
  style?: CSSProperties;
}

export function TableRow({ children, header, striped, style }: TableRowProps) {
  const theme = usePdfTheme();

  const rowStyle: CSSProperties = {
    backgroundColor: header
      ? theme.colors.muted
      : striped
        ? "#fcfcfd"
        : "transparent",
    borderBottom: header
      ? `1px solid ${theme.colors.border}`
      : "1px solid #f4f4f5",
    ...style,
  };

  return <tr style={rowStyle}>{children}</tr>;
}

export interface TableCellProps {
  children?: ReactNode;
  align?: "left" | "center" | "right";
  width?: string | number;
  colSpan?: number;
  header?: boolean;
  bold?: boolean;
  tabular?: boolean;
  style?: CSSProperties;
}

export function TableCell({
  children,
  align = "left",
  width,
  colSpan,
  header = false,
  bold = false,
  tabular = false,
  style,
}: TableCellProps) {
  const theme = usePdfTheme();

  const cellStyle: CSSProperties = {
    boxSizing: "border-box",
    padding: header ? "5px 3px" : "6px 4px",
    textAlign: align,
    width,
    fontSize: header ? 7.5 : 8.5,
    fontWeight: header ? 700 : bold ? 600 : 400,
    color: header ? theme.colors.mutedForeground : theme.colors.foreground,
    textTransform: header ? "uppercase" : "none",
    ...(tabular ? { fontVariantNumeric: "tabular-nums" } : {}),
    verticalAlign: "middle",
    ...(header ? {} : { overflow: "hidden" }),
    ...style,
  };

  if (header) {
    return (
      <th colSpan={colSpan} style={cellStyle}>
        {children}
      </th>
    );
  }

  return (
    <td colSpan={colSpan} style={cellStyle}>
      {children}
    </td>
  );
}

export function TableHead(props: TableCellProps) {
  return <TableCell header {...props} />;
}
