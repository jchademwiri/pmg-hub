import "server-only";

import React, { type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { renderPdf, type RenderPdfOptions } from "./engine";
import { PdfThemeProvider } from "./theme-provider";
import { resolveDivisionTheme } from "./themes";
import type { PdfTheme } from "./types";

export interface RenderDocumentOptions extends RenderPdfOptions {
  theme?: PdfTheme;
  divisionName?: string | null;
}

/**
 * Renders a declarative React PDF component into a production-grade PDF Uint8Array buffer
 * using React DOM Server static markup compilation and Takumi WASM layout engine.
 */
export async function renderDocumentToPdf(
  element: ReactElement,
  options?: RenderDocumentOptions,
): Promise<Uint8Array> {
  const theme = options?.theme ?? resolveDivisionTheme(options?.divisionName);

  const wrapped = (
    <PdfThemeProvider theme={theme}>
      {element}
    </PdfThemeProvider>
  );

  const markup = renderToStaticMarkup(wrapped);

  return renderPdf(markup, {
    size: options?.size ?? theme.page.size,
    landscape: options?.landscape ?? (theme.page.orientation === "landscape"),
    margin: options?.margin,
    backgroundColor: options?.backgroundColor ?? theme.colors.background,
  });
}
