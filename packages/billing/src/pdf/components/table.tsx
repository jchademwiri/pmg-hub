import React, { type CSSProperties, type ReactNode } from 'react';
import { usePdfTheme } from '../theme-provider';

export interface TableProps {
  children: ReactNode;
  variant?: 'default' | 'compact' | 'striped' | 'bordered';
  style?: CSSProperties;
}

export function Table({ children, style }: TableProps) {
  return (
    <div
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function TableHeader({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        backgroundColor: '#f9fafb',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function TableBody({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        ...style,
      }}
    >
      {children}
    </div>
  );
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
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    backgroundColor: header ? '#f9fafb' : 'transparent',
    borderBottom: header ? `1px solid ${theme.colors.border}` : '1px solid #f4f4f5',
    boxSizing: 'border-box',
    ...style,
  };

  return <div style={rowStyle}>{children}</div>;
}

export interface TableCellProps {
  children?: ReactNode;
  align?: 'left' | 'center' | 'right';
  width?: string | number;
  colSpan?: number;
  header?: boolean;
  bold?: boolean;
  tabular?: boolean;
  style?: CSSProperties;
}

export function TableCell({
  children,
  align = 'left',
  width,
  colSpan,
  header = false,
  bold = false,
  tabular = false,
  style,
}: TableCellProps) {
  const theme = usePdfTheme();

  const cellStyle: CSSProperties = {
    boxSizing: 'border-box',
    width: width || (colSpan ? '100%' : undefined),
    flex: width ? `0 0 ${width}` : colSpan ? '1 1 100%' : '1 1 0%',
    padding: header ? '5px 4px' : '6px 4px',
    textAlign: align,
    fontSize: header ? 7.5 : 8.5,
    fontWeight: header ? 700 : bold ? 600 : 400,
    color: header ? theme.colors.mutedForeground : theme.colors.foreground,
    textTransform: header ? 'uppercase' : 'none',
    ...(tabular ? { fontVariantNumeric: 'tabular-nums' } : {}),
    overflow: 'hidden',
    ...style,
  };

  return <div style={cellStyle}>{children}</div>;
}

export function TableHead(props: TableCellProps) {
  return <TableCell header {...props} />;
}
