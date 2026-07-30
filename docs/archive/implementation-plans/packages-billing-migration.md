# Implementation Plan - Shared Billing Package Migration

This plan outlines the steps to extract the duplicated billing and PDF generation code from `apps/admin` and `apps/portal` into a new shared package `packages/billing`.

## Proposed Changes

### 1. Create a New Workspace Package: `packages/billing`

We will initialize a new package under the `packages` directory:

#### [NEW] [package.json](file:///d:/websites/pmg-hub/packages/billing/package.json)
```json
{
  "name": "@pmg/billing",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "dependencies": {
    "@pmg/db": "workspace:*",
    "@pmg/utils": "workspace:*",
    "jspdf": "^4.2.1",
    "server-only": "^0.0.1"
  },
  "devDependencies": {
    "@pmg/typescript-config": "workspace:*",
    "typescript": "^5.4.0"
  }
}
```

#### [NEW] [tsconfig.json](file:///d:/websites/pmg-hub/packages/billing/tsconfig.json)
```json
{
  "extends": "@pmg/typescript-config/base.json",
  "compilerOptions": {
    "outDir": "./dist"
  },
  "include": ["src/**/*"]
}
```

#### [NEW] [index.ts](file:///d:/websites/pmg-hub/packages/billing/src/index.ts)
Expose the public APIs of the billing package:
```typescript
export * from './server-billing-pdf';
export * from './client-billing-helpers';
export * from './billing-ageing';
export * from './format';
export * from './document-logo';
```

---

### 2. Move Duplicated Files

We will move the 5 identical files from `apps/portal/src/lib/` into `packages/billing/src/`:

*   [NEW] [server-billing-pdf.ts](file:///d:/websites/pmg-hub/packages/billing/src/server-billing-pdf.ts)
*   [NEW] [client-billing-helpers.ts](file:///d:/websites/pmg-hub/packages/billing/src/client-billing-helpers.ts)
*   [NEW] [billing-ageing.ts](file:///d:/websites/pmg-hub/packages/billing/src/billing-ageing.ts)
*   [NEW] [format.ts](file:///d:/websites/pmg-hub/packages/billing/src/format.ts)
*   [NEW] [document-logo.ts](file:///d:/websites/pmg-hub/packages/billing/src/document-logo.ts)

Then, we will delete the duplicates from:
*   `apps/admin/src/lib/`
*   `apps/portal/src/lib/`

---

### 3. Update Dependencies and Imports

1.  **Add `@pmg/billing` to App Dependencies**:
    *   In [apps/admin/package.json](file:///d:/websites/pmg-hub/apps/admin/package.json), add `"@pmg/billing": "workspace:*"`
    *   In [apps/portal/package.json](file:///d:/websites/pmg-hub/apps/portal/package.json), add `"@pmg/billing": "workspace:*"`

2.  **Update Imports**:
    Update all references in both `admin` and `portal` apps from:
    *   `import { ... } from '@/lib/server-billing-pdf'`
    *   `import { ... } from '@/lib/client-billing-helpers'`
    *   `import { ... } from '@/lib/billing-ageing'`
    *   `import { ... } from '@/lib/format'`
    *   `import { ... } from '@/lib/document-logo'`
    
    To:
    *   `import { ... } from '@pmg/billing'`

---

## Verification Plan

1.  Run `bun install` at the root to register the new `@pmg/billing` package in the monorepo workspace.
2.  Run `bun --filter admin build` and `bun --filter portal build` to verify everything compiles and builds successfully.
