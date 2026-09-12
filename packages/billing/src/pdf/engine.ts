import "server-only";

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import * as wasm from "takumi-pdf/no-init";

let isInitialized = false;

export interface RenderPdfOptions {
  size?: "a4" | "a5" | "letter" | "legal" | { width: number; height: number };
  landscape?: boolean;
  margin?: number | "auto" | { top?: number; right?: number; bottom?: number; left?: number };
  backgroundColor?: string;
  dpi?: number;
}

/**
 * Initializes the Takumi WASM engine. Cached after first load.
 * Compatible with Node.js and Bun runtimes without requiring headless Chromium.
 */
export function ensureWasmInitialized(): void {
  if (isInitialized) return;

  const require = createRequire(import.meta.url);
  const wasmPath = require.resolve("takumi-pdf/takumi_pdf_wasm_bg.wasm");
  const wasmBytes = readFileSync(wasmPath);

  wasm.initSync({ module: wasmBytes });
  isInitialized = true;
}

/**
 * Renders an HTML string or JSX node tree into high-fidelity PDF bytes (Uint8Array).
 */
export async function renderPdf(
  content: string | unknown,
  options?: RenderPdfOptions,
): Promise<Uint8Array> {
  ensureWasmInitialized();
  return wasm.render(content as string, options);
}

export { wasm };
