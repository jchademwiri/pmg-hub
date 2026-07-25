# Admin Site Audit: Tech Debt Resolution Plan

This plan details the implementation steps for resolving the highest-priority technical debt identified in the `@admin` application audit.

## Proposed Changes

---

### React Hooks Anti-Patterns
Fixing synchronous state updates inside `useEffect` which cause double-rendering jank.

#### [MODIFY] `apps/admin/src/hooks/use-mobile.ts`
- **Change:** Refactor the hook to use standard state-setting patterns. Specify an SSR-safe initial state that produces the correct mobile or desktop value on the first render, rather than simply removing the synchronous `setIsMobile` call from the effect. Define and test both initial viewport outcomes, while retaining effect-driven updates for subsequent media-query changes.
- **Rationale:** `react-hooks/set-state-in-effect` is triggered when `setIsMobile()` is called synchronously inside `useEffect`.

#### [MODIFY] `apps/admin/src/components/projects/task-board.tsx`
- **Change:** Define TaskBoard state ownership and specify when `initialSections` changes reset or reconcile local sections without overwriting in-progress drag state.

---

### Type Safety in Financial Core
The financial module `posting.ts` uses `any` for Drizzle ORM transactions, defeating TypeScript's protections in a critical system.

#### [MODIFY] `apps/admin/src/lib/accounting/posting.ts`
- **Change:** Replace all `any` types (mostly `tx: any` and `externalTx?: any`) with strongly-typed generic parameters or appropriate Drizzle transaction types.

---

### Tooling & Code Cleanliness
Setting up standard CI checks and cleaning up unused code.

#### [MODIFY] `apps/admin/package.json`
- **Change:** Add `"check-types": "tsc --noEmit"` to the scripts.
- **Rationale:** The workspace uses **Bun** (`bun run check-types`), but `apps/admin` doesn't expose the script locally. Adding this makes CI/CD and developer workflows standardized.

#### [COMMAND] Automated Cleanup
- **Change:** Run `bun run lint --fix` inside `apps/admin` to automatically strip out unused variables and fix minor formatting issues. 
- **Rationale:** Require a clean lint rerun, review of the resulting diff to catch unrelated changes, and an explicit documented count of any remaining warnings or errors, including semantic hook and explicit-any diagnostics.

## Verification Plan

### Automated Tests
- Run `bun run lint` inside `apps/admin` to verify that the `react-hooks/set-state-in-effect` and `@typescript-eslint/no-explicit-any` errors are eliminated.
- Run `bun run check-types` from the root workspace to verify `posting.ts` passes strict TypeScript checks.

### Manual Verification
- Render the `TaskBoard` component visually and verify concrete acceptance scenarios covering initial loading, server refreshes, optimistic drag/drop, and failed saves.
