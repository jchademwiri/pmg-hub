import type { NextConfig } from 'next';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = dirname(fileURLToPath(import.meta.url));
const monorepoRoot = resolve(appDir, '../..');

const nextConfig: NextConfig = {
  serverExternalPackages: ['takumi-pdf', '@takumi-rs/helpers', '@takumi-rs/core'],
  outputFileTracingRoot: monorepoRoot,
  outputFileTracingIncludes: {
    '/**': [
      './node_modules/takumi-pdf/pkg/takumi_pdf_wasm_bg.wasm',
      '../../node_modules/takumi-pdf/pkg/takumi_pdf_wasm_bg.wasm',
      '../../node_modules/.bun/takumi-pdf@*/node_modules/takumi-pdf/pkg/takumi_pdf_wasm_bg.wasm',
      '../../packages/billing/src/pdf/takumi_pdf_wasm_bg.wasm',
      '../../packages/billing/node_modules/takumi-pdf/pkg/takumi_pdf_wasm_bg.wasm',
    ],
  },
  outputFileTracingExcludes: {
    '*': [
      'node_modules/@swc/core-linux-x64-gnu/**',
      'node_modules/@swc/core-linux-x64-musl/**',
      'node_modules/@swc/core-win32-x64-msvc/**',
      'node_modules/@esbuild/**',
      'node_modules/@playwright/**',
      'node_modules/playwright/**',
      'node_modules/@testing-library/**',
      'node_modules/vitest/**',
    ],
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'radix-ui', '@radix-ui/react-select'],
    serverActions: {
      allowedOrigins: [
        'localhost:3000',
        'localhost:3001',
        '192.168.0.190:3000',
        '192.168.0.190:3001',
      ],
    },
  },
  allowedDevOrigins: ['192.168.0.190', '192.168.0.190:3000', '192.168.0.190:3001'],
};

export default nextConfig;
