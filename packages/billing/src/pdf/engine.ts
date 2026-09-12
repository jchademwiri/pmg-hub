import "server-only";

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
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
 * Robustly discovers the absolute path to takumi_pdf_wasm_bg.wasm across
 * Turbopack (dev/prod), Next.js Server Actions, Bun, and standalone Node.js.
 */
function resolveWasmPath(): string {
  let dir = process.cwd();
  for (let i = 0; i < 6; i++) {
    const direct = join(dir, "node_modules/takumi-pdf/pkg/takumi_pdf_wasm_bg.wasm");
    if (existsSync(direct)) return direct;

    const bunDir = join(dir, "node_modules/.bun");
    if (existsSync(bunDir)) {
      try {
        const entries = readdirSync(bunDir);
        for (const entry of entries) {
          if (entry.startsWith("takumi-pdf@")) {
            const candidate = join(bunDir, entry, "node_modules/takumi-pdf/pkg/takumi_pdf_wasm_bg.wasm");
            if (existsSync(candidate)) return candidate;
          }
        }
      } catch {}
    }

    const parent = dirname(dir);
    if (!parent || parent === dir) break;
    dir = parent;
  }

  try {
    const globalObj = globalThis as unknown as Record<string, unknown>;
    const customReq = (typeof globalObj.__non_webpack_require__ === "function"
      ? globalObj.__non_webpack_require__
      : null) as { resolve?: (id: string) => string } | null;
    if (customReq?.resolve) {
      const resolved = customReq.resolve("takumi-pdf/pkg/takumi_pdf_wasm_bg.wasm");
      if (existsSync(resolved)) return resolved;
    }
  } catch {}

  throw new Error("Unable to locate takumi_pdf_wasm_bg.wasm in node_modules or .bun store.");
}

/**
 * Initializes the Takumi WASM engine. Cached after first load.
 * Compatible with Node.js and Bun runtimes without requiring headless Chromium.
 */
export function ensureWasmInitialized(): void {
  if (isInitialized) return;

  const wasmPath = resolveWasmPath();
  const wasmBytes = readFileSync(/*turbopackIgnore: true*/ wasmPath);

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
