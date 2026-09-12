import React, {
  type CSSProperties,
  type ReactNode,
  type ImgHTMLAttributes,
  type AnchorHTMLAttributes,
} from "react";
import { resolveColor } from "./resolve-color";
import { usePdfTheme } from "./theme-provider";

export const StyleSheet = {
  create<T extends Record<string, CSSProperties>>(styles: T): T {
    return styles;
  },
};

export interface ViewProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
  style?: CSSProperties;
  className?: string;
  wrap?: boolean;
  break?: boolean;
  fixed?: boolean;
}

export function View({ children, style, className, wrap, break: br, fixed, ...rest }: ViewProps) {
  const merged: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    boxSizing: "border-box",
    ...(br ? { breakBefore: "page" } : {}),
    ...(wrap === false ? { breakInside: "avoid" } : {}),
    ...(fixed ? { position: "fixed" } : {}),
    ...style,
  };

  return (
    <div className={className} style={merged} {...rest}>
      {children}
    </div>
  );
}

export interface TextProps extends React.HTMLAttributes<HTMLSpanElement> {
  children?: ReactNode;
  style?: CSSProperties;
  className?: string;
  variant?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "body" | "sm" | "xs";
  color?: string;
  weight?: "normal" | "medium" | "semibold" | "bold" | number;
  tabular?: boolean;
  align?: "left" | "center" | "right";
  transform?: "uppercase" | "lowercase" | "capitalize" | "none";
}

export function Text({
  children,
  style,
  className,
  variant = "body",
  color,
  weight,
  tabular = false,
  align,
  transform,
  ...rest
}: TextProps) {
  const theme = usePdfTheme();

  let fontSize = theme.typography.body.fontSize;
  let lineHeight = theme.typography.body.lineHeight;
  let fontWeight: number | string = 400;

  switch (variant) {
    case "h1":
      fontSize = theme.typography.heading.fontSize.h1;
      lineHeight = theme.typography.heading.lineHeight;
      fontWeight = 700;
      break;
    case "h2":
      fontSize = theme.typography.heading.fontSize.h2;
      lineHeight = theme.typography.heading.lineHeight;
      fontWeight = 700;
      break;
    case "h3":
      fontSize = theme.typography.heading.fontSize.h3;
      lineHeight = theme.typography.heading.lineHeight;
      fontWeight = 600;
      break;
    case "h4":
      fontSize = theme.typography.heading.fontSize.h4;
      lineHeight = theme.typography.heading.lineHeight;
      fontWeight = 600;
      break;
    case "sm":
      fontSize = theme.typography.body.fontSize - 1;
      break;
    case "xs":
      fontSize = theme.typography.body.fontSize - 2.5;
      break;
    default:
      break;
  }

  if (weight) fontWeight = typeof weight === "number" ? weight : weight === "bold" ? 700 : weight === "semibold" ? 600 : weight === "medium" ? 500 : 400;

  const resolvedColor = color ? resolveColor(color, theme.colors) : theme.colors.foreground;

  const merged: CSSProperties = {
    fontFamily: theme.typography.body.fontFamily,
    fontSize,
    lineHeight,
    fontWeight,
    color: resolvedColor,
    ...(tabular ? { fontVariantNumeric: "tabular-nums" } : {}),
    ...(align ? { textAlign: align } : {}),
    ...(transform ? { textTransform: transform } : {}),
    ...style,
  };

  return (
    <span className={className} style={merged} {...rest}>
      {children}
    </span>
  );
}

export function Document({
  children,
  title,
  style,
}: {
  children?: ReactNode;
  title?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      data-pdf-document={title}
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Page({
  children,
  size = "a4",
  orientation,
  style,
}: {
  children?: ReactNode;
  size?: string | { width: number; height: number };
  orientation?: "portrait" | "landscape";
  style?: CSSProperties;
}) {
  const theme = usePdfTheme();

  return (
    <div
      data-pdf-page={typeof size === "string" ? size : undefined}
      data-pdf-orientation={orientation}
      style={{
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
        minHeight: orientation === "landscape" ? "185mm" : "270mm",
        paddingTop: theme.spacing.page.marginTop,
        paddingRight: theme.spacing.page.marginRight,
        paddingBottom: theme.spacing.page.marginBottom,
        paddingLeft: theme.spacing.page.marginLeft,
        backgroundColor: theme.colors.background,
        color: theme.colors.foreground,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function KeepTogether({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ breakInside: "avoid", pageBreakInside: "avoid", ...style }}>
      {children}
    </div>
  );
}

export function PageBreak() {
  return <div style={{ breakBefore: "page", pageBreakBefore: "always" }} />;
}

export function Image({
  src,
  style,
  alt = "",
  ...rest
}: {
  src: string;
  style?: CSSProperties;
  alt?: string;
} & Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "style">) {
  return (
    <img
      src={src}
      alt={alt}
      style={{
        display: "block",
        maxWidth: "100%",
        objectFit: "contain",
        ...style,
      }}
      {...rest}
    />
  );
}

export function Link({
  href,
  children,
  style,
  ...rest
}: {
  href: string;
  children?: ReactNode;
  style?: CSSProperties;
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "style">) {
  return (
    <a
      href={href}
      style={{
        color: "inherit",
        textDecoration: "none",
        ...style,
      }}
      {...rest}
    >
      {children}
    </a>
  );
}
