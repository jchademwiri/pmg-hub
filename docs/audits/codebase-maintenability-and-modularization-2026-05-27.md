# PMG Hub Codebase Maintainability & Modularization Audit

**Date:** 2026-05-27  
**Scope:** Monorepo-wide (`apps/*`, `packages/*`, `docs/*`)  
**Focus:** maintainability, modular boundaries, ownership clarity, and refactor roadmap.

---

## Executive Assessment

PMG Hub has a strong monorepo base and healthy package-sharing patterns, but maintainability currently depends too much on informal conventions. The codebase can scale faster and safer by formalizing module contracts, reducing duplicate app-level patterns, and enforcing cross-app quality invariants.

### Overall Scorecard

- **Repository structure:** Good
- **Reuse strategy:** Moderate (shared packages exist, but app-level duplication remains)
- **Boundary enforcement:** Moderate-to-low (limited explicit module contracts)
- **Testability per module:** Uneven across apps
- **Operational maintainability:** Moderate (tooling inconsistency is a drag)

---

## Current Structure & Maintainability Implications

## App Layer

- `apps/admin` is the largest and most domain-heavy app (finance, billing, reports, users, divisions, etc.).
- `apps/aws`, `apps/tes`, and `apps/pmg` follow similar Astro site structures with overlapping concerns (layout patterns, content pages, forms/actions, analytics).

**Implication:** there is clear opportunity to extract and standardize common website concerns from Astro apps into shared modules to cut drift and maintenance cost.

## Package Layer

- Existing shared packages (`@pmg/db`, `@pmg/emails`, `@pmg/tailwind-config`, `@pmg/ui`) are good foundations.

**Implication:** shared package strategy is present, but not yet fully leveraged for domain contracts (e.g., shared validation schemas, feature interfaces, analytics adapters, form contracts).

## Tooling Layer

- Root workflows rely on Turbo + Bun.
- App-level script parity is inconsistent.

**Implication:** maintainability suffers when contributors cannot assume consistent lifecycle commands across all apps.

---

## Key Maintainability Findings

## 1) Module Boundaries Are Implicit Instead of Enforced

### Finding
Domain boundaries in larger apps (especially `apps/admin`) are represented by folders, but there is limited evidence of strict import constraints or explicit module APIs.

### Impact
- Higher regression risk when internal details are imported across domains.
- Harder refactors due to hidden coupling.

### Recommendation
- Introduce “public API per module” pattern (`index.ts` exports only supported surface).
- Enforce boundaries with lint rules (e.g., domain import restrictions).
- Add Architecture Decision Records (ADRs) for critical domains.

---

## 2) Cross-App Duplication in Astro Sites

### Finding
`apps/aws`, `apps/tes`, and `apps/pmg` likely duplicate patterns around page composition, form handling, and instrumentation.

### Impact
- Fixes/features require multi-app repetitive edits.
- Divergent behavior increases QA and release complexity.

### Recommendation
- Create shared site-oriented packages:
  - `packages/site-core` (layout utilities, SEO primitives, metadata helpers)
  - `packages/site-forms` (validation + submission helpers)
  - `packages/site-analytics` (provider-agnostic wrappers)
- Keep app-specific branding/content local; move behavior primitives shared.

---

## 3) Inconsistent Quality Contracts Across Apps

### Finding
Not all apps expose equivalent quality scripts or minimum checks.

### Impact
- Uneven confidence when changing shared dependencies.
- Inconsistent contributor expectations.

### Recommendation
- Define required script contract for each app:
  - `build`, `test`, `lint`, `check-types`
- Add CI policy to enforce script presence and pass/fail per app.

---

## 4) Domain Logic and UI Risk Being Co-located

### Finding
Large UI apps frequently accumulate business logic in UI layer over time.

### Impact
- Harder testing (logic coupled to framework runtime).
- Lower reuse and slower refactors.

### Recommendation
- Move business rules into framework-agnostic modules:
  - `src/domain/*` (pure logic)
  - `src/application/*` (use-case orchestration)
  - `src/infrastructure/*` (DB, email, external integrations)
  - UI consumes application services only.

---

## 5) Ownership & Change Surface Are Not Explicit Enough

### Finding
As app/domain count grows, ownership ambiguity becomes a scaling bottleneck.

### Impact
- Longer review cycles.
- Cross-team merge friction.

### Recommendation
- Add `CODEOWNERS` (or per-module ownership map docs).
- Require architectural checklist for high-impact PRs.

---

## Target Modular Architecture (Pragmatic)

## Admin App (Domain-Driven Vertical Slices)

Suggested slice shape:

- `src/modules/<domain>/`
  - `api/` (route handlers / server action adapters)
  - `application/` (use-cases)
  - `domain/` (entities, rules, policies)
  - `infrastructure/` (db/repo integrations)
  - `ui/` (domain-specific components)
  - `index.ts` (public module contract)

Benefits:
- Higher locality of changes
- Better test partitioning
- Safer domain evolution

## Astro Apps (Shared Platform + App-Specific Content)

- App-specific files keep:
  - brand styling, copy, route-specific content
- Shared packages own:
  - SEO schema builders
  - form validation and action wrappers
  - analytics abstraction
  - shared section/layout primitives where appropriate

Benefits:
- Faster rollout of fixes
- Less duplication, less drift

---

## Phased Plan (Starts with Quick Wins)

## Phase 0 — Quick Wins (Week 1–2)

1. **Create maintainability standards doc**
   - Define required app scripts, folder conventions, module API pattern.
2. **Script contract normalization**
   - Ensure every app has `build/lint/test/check-types` (or documented exceptions).
3. **Introduce module API barriers**
   - Start with one or two admin domains using `index.ts` public exports.
4. **Inventory duplication across Astro apps**
   - Identify first 3 shared primitives to extract.

**Exit Criteria**
- Standards doc merged.
- Script contract validated in CI.
- At least one domain in admin converted to explicit module contract.

## Phase 1 — Structural Hardening (Week 3–6)

1. **Admin vertical slice migration (incremental)**
   - Migrate highest-churn domains first (billing, reports, leads).
2. **Extract `site-core` package**
   - Move SEO + metadata helpers and common composition utilities.
3. **Introduce lint boundary rules**
   - Restrict cross-domain deep imports.

**Exit Criteria**
- 30–40% of admin high-churn domains migrated.
- AWS/TES/PMG consume shared `site-core` primitives.

## Phase 2 — Testability & Operational Maturity (Week 7–10)

1. **Domain-level tests for admin modules**
   - Focus on pure domain/application layers.
2. **Shared test helpers for Astro apps**
   - Common fixtures and smoke test utilities.
3. **Architectural CI checks**
   - Detect dependency drift and forbidden import patterns.

**Exit Criteria**
- Critical admin domains have isolated tests.
- Shared app primitives tested once and reused many times.

## Phase 3 — Scale & Governance (Quarter+)

1. **Ownership and review policy enforcement**
   - CODEOWNERS + architectural PR checklist.
2. **Dependency/version governance cadence**
   - Scheduled updates with compatibility matrix.
3. **Maintainability dashboards**
   - Track module churn, coupling hotspots, and test stability.

**Exit Criteria**
- Predictable multi-app release quality.
- Lower refactor cost and faster onboarding.

---

## High-Impact Quick-Win Backlog (Actionable)

1. Add `docs/architecture/modularization-standards.md` with required module conventions.
2. Create CI job `validate:app-contracts` to assert app script parity.
3. Pilot admin modularization in one domain (`billing` or `reports`).
4. Extract shared SEO helper package consumed by `aws`, `tes`, `pmg`.
5. Add dependency graph checks for forbidden cross-domain imports.

---

## Suggested Maintainability Metrics

- **Module Coupling Index:** cross-domain import count trend.
- **Refactor Safety Index:** % of domain logic covered by isolated tests.
- **Duplication Reduction:** shared package adoption vs duplicated local utilities.
- **Contributor Friction:** bootstrap + time-to-first-green in CI.
- **Change Lead Time:** PR open-to-merge duration for medium changes.

