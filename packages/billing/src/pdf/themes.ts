import type { PdfTheme, PrimitiveTokens } from "./types";

export const defaultPrimitives: PrimitiveTokens = {
  borderRadius: {
    none: 0,
    sm: 3,
    md: 6,
    lg: 8,
    full: 9999,
  },
};

/** Playhouse Media Group (Corporate / Default) */
export const pmgTheme: PdfTheme = {
  name: "pmg",
  displayName: "Playhouse Media Group",
  primitives: defaultPrimitives,
  colors: {
    foreground: "#0f172a", // slate-900
    background: "#ffffff",
    primary: "#1d4ed8", // blue-700
    primaryForeground: "#ffffff",
    accent: "#3b82f6", // blue-500
    muted: "#f8fafc", // slate-50
    mutedForeground: "#475569", // slate-600 (contrast > 5.5:1)
    border: "#e2e8f0", // slate-200
    destructive: "#dc2626", // red-600
    success: "#16a34a", // green-600
    warning: "#d97706", // amber-600
    info: "#0284c7", // sky-600
  },
  typography: {
    body: {
      fontFamily: "Helvetica, Arial, sans-serif",
      fontSize: 9,
      lineHeight: 1.45,
    },
    heading: {
      fontFamily: "Helvetica, Arial, sans-serif",
      fontWeight: 700,
      lineHeight: 1.25,
      fontSize: {
        h1: 22,
        h2: 15,
        h3: 11,
        h4: 10,
        h5: 9,
        h6: 8,
      },
    },
  },
  spacing: {
    page: {
      marginTop: 40,
      marginRight: 36,
      marginBottom: 40,
      marginLeft: 36,
    },
    sectionGap: 18,
    paragraphGap: 8,
    componentGap: 12,
  },
  page: { size: "a4", orientation: "portrait" },
};

/** TenderEdge Solutions (Emerald / Institutional) */
export const tesTheme: PdfTheme = {
  name: "tes",
  displayName: "TenderEdge Solutions",
  primitives: defaultPrimitives,
  colors: {
    foreground: "#18181b", // zinc-900
    background: "#ffffff",
    primary: "#047857", // emerald-700
    primaryForeground: "#ffffff",
    accent: "#059669", // emerald-600
    muted: "#f4fdf8", // emerald-50
    mutedForeground: "#52525b", // zinc-600
    border: "#d1fae5", // emerald-100
    destructive: "#dc2626",
    success: "#059669",
    warning: "#d97706",
    info: "#0284c7",
  },
  typography: {
    body: {
      fontFamily: "Helvetica, Arial, sans-serif",
      fontSize: 9,
      lineHeight: 1.45,
    },
    heading: {
      fontFamily: "Helvetica, Arial, sans-serif",
      fontWeight: 700,
      lineHeight: 1.25,
      fontSize: {
        h1: 22,
        h2: 15,
        h3: 11,
        h4: 10,
        h5: 9,
        h6: 8,
      },
    },
  },
  spacing: {
    page: {
      marginTop: 40,
      marginRight: 36,
      marginBottom: 40,
      marginLeft: 36,
    },
    sectionGap: 18,
    paragraphGap: 8,
    componentGap: 12,
  },
  page: { size: "a4", orientation: "portrait" },
};

/** Apex Web Solutions (Sky / Tech) */
export const awsTheme: PdfTheme = {
  name: "aws",
  displayName: "Apex Web Solutions",
  primitives: defaultPrimitives,
  colors: {
    foreground: "#18181b", // zinc-900
    background: "#ffffff",
    primary: "#0284c7", // sky-600
    primaryForeground: "#ffffff",
    accent: "#0ea5e9", // sky-500
    muted: "#f0f9ff", // sky-50
    mutedForeground: "#52525b", // zinc-600
    border: "#e0f2fe", // sky-100
    destructive: "#dc2626",
    success: "#16a34a",
    warning: "#d97706",
    info: "#0284c7",
  },
  typography: {
    body: {
      fontFamily: "Helvetica, Arial, sans-serif",
      fontSize: 9,
      lineHeight: 1.45,
    },
    heading: {
      fontFamily: "Helvetica, Arial, sans-serif",
      fontWeight: 700,
      lineHeight: 1.25,
      fontSize: {
        h1: 22,
        h2: 15,
        h3: 11,
        h4: 10,
        h5: 9,
        h6: 8,
      },
    },
  },
  spacing: {
    page: {
      marginTop: 40,
      marginRight: 36,
      marginBottom: 40,
      marginLeft: 36,
    },
    sectionGap: 18,
    paragraphGap: 8,
    componentGap: 12,
  },
  page: { size: "a4", orientation: "portrait" },
};

/**
 * Resolves the appropriate theme based on organization or division name.
 */
export function resolveDivisionTheme(orgName?: string | null): PdfTheme {
  if (!orgName) return pmgTheme;
  const normalized = orgName.toLowerCase();
  if (/tender\s*edge|tes/i.test(normalized)) return tesTheme;
  if (/apex|aws/i.test(normalized)) return awsTheme;
  return pmgTheme;
}
