import 'server-only';

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import * as wasm from 'takumi-pdf/no-init';

let isInitialized = false;

export interface RenderPdfOptions {
  size?: 'a4' | 'a5' | 'letter' | 'legal' | { width: number; height: number };
  landscape?: boolean;
  margin?: number | 'auto' | { top?: number; right?: number; bottom?: number; left?: number };
  backgroundColor?: string;
  dpi?: number;
}

function fileExists(path: string): boolean {
  try {
    return existsSync(/*turbopackIgnore: true*/ path);
  } catch {
    return false;
  }
}

function findWasmInAssets(assetsDir: string): string | null {
  if (!fileExists(assetsDir)) return null;
  try {
    const entries = readdirSync(/*turbopackIgnore: true*/ assetsDir);
    for (const entry of entries) {
      if (entry.startsWith('takumi_pdf_wasm_bg') && entry.endsWith('.wasm')) {
        return join(assetsDir, entry);
      }
    }
  } catch {}
  return null;
}

/**
 * Robustly discovers the absolute path to takumi_pdf_wasm_bg.wasm across
 * Turbopack (dev/prod), Next.js Server Actions, Vercel Serverless / AWS Lambda, Bun, and Node.js.
 */
function resolveWasmPath(): string {
  // 1. Direct co-located asset in packages/billing/src/pdf
  try {
    const collocated = fileURLToPath(new URL('./takumi_pdf_wasm_bg.wasm', import.meta.url));
    if (fileExists(collocated)) return collocated;
  } catch {}

  // 2. Next.js production server assets (.next/server/assets)
  let scanDir = process.cwd();
  for (let i = 0; i < 4; i++) {
    const inAssets = findWasmInAssets(join(scanDir, '.next/server/assets'));
    if (inAssets) return inAssets;

    const inAppAssets = findWasmInAssets(join(scanDir, 'apps/admin/.next/server/assets'));
    if (inAppAssets) return inAppAssets;

    const parent = dirname(scanDir);
    if (!parent || parent === scanDir) break;
    scanDir = parent;
  }

  // 3. Dynamic Node module resolution (dynamic string prevents Turbopack synthetic wasm loader)
  try {
    const req = createRequire(import.meta.url);
    const subpath = ['takumi-pdf', 'takumi_pdf_wasm_bg.wasm'].join('/');
    const resolved = req.resolve(subpath);
    if (fileExists(resolved)) return resolved;
  } catch {}

  // 4. Webpack runtime require fallback
  try {
    const globalObj = globalThis as unknown as Record<string, unknown>;
    const customReq = (
      typeof globalObj.__non_webpack_require__ === 'function'
        ? globalObj.__non_webpack_require__
        : null
    ) as { resolve?: (id: string) => string } | null;
    if (customReq?.resolve) {
      const subpath = ['takumi-pdf', 'takumi_pdf_wasm_bg.wasm'].join('/');
      const resolved = customReq.resolve(subpath);
      if (fileExists(resolved)) return resolved;
    }
  } catch {}

  // 5. Vercel Serverless / AWS Lambda environment root
  const lambdaRoot = process.env.LAMBDA_TASK_ROOT || '/var/task';
  const lambdaInAssets = findWasmInAssets(join(lambdaRoot, '.next/server/assets'));
  if (lambdaInAssets) return lambdaInAssets;

  const lambdaAppInAssets = findWasmInAssets(join(lambdaRoot, 'apps/admin/.next/server/assets'));
  if (lambdaAppInAssets) return lambdaAppInAssets;

  const lambdaCandidates = [
    join(lambdaRoot, 'packages/billing/src/pdf/takumi_pdf_wasm_bg.wasm'),
    join(lambdaRoot, 'apps/admin/packages/billing/src/pdf/takumi_pdf_wasm_bg.wasm'),
    join(lambdaRoot, 'node_modules/takumi-pdf/pkg/takumi_pdf_wasm_bg.wasm'),
    join(lambdaRoot, 'apps/admin/node_modules/takumi-pdf/pkg/takumi_pdf_wasm_bg.wasm'),
    join(lambdaRoot, 'apps/portal/node_modules/takumi-pdf/pkg/takumi_pdf_wasm_bg.wasm'),
  ];
  for (const candidate of lambdaCandidates) {
    if (fileExists(candidate)) return candidate;
  }

  // 6. CWD and ancestor directory traversal (monorepo, bun store, local dev)
  let dir = process.cwd();
  for (let i = 0; i < 6; i++) {
    const billingCollocated = join(dir, 'packages/billing/src/pdf/takumi_pdf_wasm_bg.wasm');
    if (fileExists(billingCollocated)) return billingCollocated;

    const direct = join(dir, 'node_modules/takumi-pdf/pkg/takumi_pdf_wasm_bg.wasm');
    if (fileExists(direct)) return direct;

    const bunDir = join(dir, 'node_modules/.bun');
    if (fileExists(bunDir)) {
      try {
        const entries = readdirSync(/*turbopackIgnore: true*/ bunDir);
        for (const entry of entries) {
          if (entry.startsWith('takumi-pdf@')) {
            const candidate = join(
              bunDir,
              entry,
              'node_modules/takumi-pdf/pkg/takumi_pdf_wasm_bg.wasm',
            );
            if (fileExists(candidate)) return candidate;
          }
        }
      } catch {}
    }

    const parent = dirname(dir);
    if (!parent || parent === dir) break;
    dir = parent;
  }

  throw new Error('Unable to locate takumi_pdf_wasm_bg.wasm in node_modules or .bun store.');
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
 * Sanitizes an HTML string to prevent Takumi WASM font rasterization crashes
 * (e.g. U+FFFD replacement characters, zero-width spaces, exotic unicode dashes/slashes).
 */
export function sanitizeHtmlForPdf(html: string): string {
  if (!html) return '';
  return html
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[\uFFFD]/g, '-')
    .replace(/[\u2010-\u2015]/g, '-')
    .replace(/[\u2044\u2215\uFF0F]/g, '/');
}

/**
 * Renders an HTML string or JSX node tree into high-fidelity PDF bytes (Uint8Array).
 */
export async function renderPdf(
  content: string | unknown,
  options?: RenderPdfOptions,
): Promise<Uint8Array> {
  ensureWasmInitialized();
  const sanitized = typeof content === 'string' ? sanitizeHtmlForPdf(content) : content;
  return wasm.render(sanitized as string, options);
}

export { wasm };
