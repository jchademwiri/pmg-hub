export interface ColorTokens {
  foreground: string;
  background: string;
  muted: string;
  mutedForeground: string;
  primary: string;
  primaryForeground: string;
  border: string;
  accent: string;
  destructive: string;
  success: string;
  warning: string;
  info: string;
}

export interface TypographyTokens {
  body: {
    fontFamily: string;
    fontSize: number;
    lineHeight: number;
  };
  heading: {
    fontFamily: string;
    fontWeight: number;
    lineHeight: number;
    fontSize: {
      h1: number;
      h2: number;
      h3: number;
      h4: number;
      h5: number;
      h6: number;
    };
  };
}

export interface SpacingTokens {
  page: {
    marginTop: number;
    marginRight: number;
    marginBottom: number;
    marginLeft: number;
  };
  sectionGap: number;
  paragraphGap: number;
  componentGap: number;
}

export interface PrimitiveTokens {
  borderRadius: {
    none: number;
    sm: number;
    md: number;
    lg: number;
    full: number;
  };
}

export interface PdfTheme {
  name: string;
  displayName: string;
  colors: ColorTokens;
  typography: TypographyTokens;
  spacing: SpacingTokens;
  primitives: PrimitiveTokens;
  page: {
    size: "a4" | "letter";
    orientation: "portrait" | "landscape";
  };
}
