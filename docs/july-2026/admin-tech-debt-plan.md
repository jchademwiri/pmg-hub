# Admin Site Audit: Tech Debt Resolution Plan

This plan details the implementation steps for resolving the highest-priority technical debt identified in the `@admin` application audit.

## Proposed Changes

---

### React Hooks Anti-Patterns
Fixing synchronous state updates inside `useEffect` which cause double-rendering jank.

#### [MODIFY] `apps/admin/src/hooks/use-mobile.ts`
- **Change:** Refactor the hook to use standard state setting patterns or remove the synchronous update inside the effect. 
- **Rationale:** `react-hooks/set-state-in-effect` is triggered when `setIsMobile()` is called synchronously inside `useEffect`.

#### [MODIFY] `apps/admin/src/components/projects/task-board.tsx`
- **Change:** Remove `setSections(initialSections)` from inside the `useEffect`. Instead, use standard React patterns to derive state from props or synchronize it properly.

---

### Type Safety in Financial Core
The financial module `posting.ts` uses `any` for Drizzle ORM transactions, defeating TypeScript's protections in a critical system.

#### [MODIFY] `apps/admin/src/lib/accounting/posting.ts`
- **Change:** Replace all `any` types (mostly `tx: any` and `externalTx?: any`) with strongly-typed generic parameters or appropriate Drizzle transaction types.

---

### Tooling & Code Cleanliness
Setting up standard CI checks and cleaning up unused code.

#### [MODIFY] `apps/admin/package.json`
- **Change:** Add `"typecheck": "tsc --noEmit"` to the scripts.
- **Rationale:** The workspace uses **Bun** (`bun run typecheck`), but `apps/admin` doesn't expose the script locally. Adding this makes CI/CD and developer workflows standardized.

#### [COMMAND] Automated Cleanup
- **Change:** Run `bun run lint --fix` inside `apps/admin` to automatically strip out unused variables and fix minor formatting issues. 
- **Rationale:** This instantly resolves the 165 ESLint warnings without manual intervention.

## Verification Plan

### Automated Tests
- Run `bun run lint` inside `apps/admin` to verify that the `react-hooks/set-state-in-effect` and `@typescript-eslint/no-explicit-any` errors are eliminated.
- Run `bun run check-types` from the root workspace to verify `posting.ts` passes strict TypeScript checks.

### Manual Verification
- Render the `TaskBoard` component visually (if possible) or review the refactored code to ensure optimistic UI dragging and dropping still functions perfectly.
