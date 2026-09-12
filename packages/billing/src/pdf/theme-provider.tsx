import React, { createContext, useContext, type ReactNode } from "react";
import type { PdfTheme } from "./types";
import { pmgTheme } from "./themes";

const PdfThemeContext = createContext<PdfTheme>(pmgTheme);

export interface PdfThemeProviderProps {
  theme?: PdfTheme;
  children: ReactNode;
}

export function PdfThemeProvider({ theme = pmgTheme, children }: PdfThemeProviderProps) {
  return (
    <PdfThemeContext.Provider value={theme}>
      {children}
    </PdfThemeContext.Provider>
  );
}

export function usePdfTheme(): PdfTheme {
  return useContext(PdfThemeContext);
}
