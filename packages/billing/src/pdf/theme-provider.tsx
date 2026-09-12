import React, { type ReactNode } from "react";
import { AsyncLocalStorage } from "node:async_hooks";
import type { PdfTheme } from "./types";
import { pmgTheme } from "./themes";

const themeStorage = new AsyncLocalStorage<PdfTheme>();

export interface PdfThemeProviderProps {
  theme?: PdfTheme;
  children: ReactNode;
}

export function PdfThemeProvider({ theme = pmgTheme, children }: PdfThemeProviderProps) {
  return <>{children}</>;
}

export function runWithPdfTheme<T>(theme: PdfTheme, fn: () => T): T {
  return themeStorage.run(theme, fn);
}

export function usePdfTheme(): PdfTheme {
  return themeStorage.getStore() ?? pmgTheme;
}
