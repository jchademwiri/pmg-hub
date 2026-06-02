# PMG Hub Application Portfolio Audit

**Date:** 2026-05-27  
**Scope:** `apps/admin`, `apps/aws`, `apps/pmg`, `apps/tes`  
**Method:** repository structure review, package/script review, and runnable check attempts.

---

## Executive Summary

The monorepo has a strong foundation with clear app boundaries and shared workspace packages (`@pmg/db`, `@pmg/emails`, `@pmg/tailwind-config`). The **Admin app** is currently the most mature and operationally rich product. The **AWS** and **TES** apps are moderately mature marketing/business sites with some test coverage. The **PMG** app is lightweight and currently lacks testing and quality gates.

Key cross-portfolio gap: **execution reliability in local/CI workflows**. Root-level commands are configured to use `turbo`, but current environment execution fails due missing global binary or blocked registry fetch; app-level test commands fail due unresolved `vitest` executable. This suggests dependency/bootstrap and CI hardening should be prioritized.

---

## App-by-App Findings

## 1) `apps/admin` (Next.js 16)

### What is working well
- Highest feature breadth: finance, leads, reports, billing, users, divisions, clients, and auth routes.
- Strongest codebase depth: **248 src files**, **40 test files**.
- Includes lint/test scripts and modern stack (React 19, Next 16, better-auth).

### Findings / Risks
- New major framework version (`next@16.2.1`) increases migration/change risk if upgrade policies are not enforced.
- Script reliability depends on workspace dependency install quality (tests currently not runnable in this environment).
- Broad domain scope suggests need for stricter architectural boundaries to reduce regression risk.

### Improvements
- Add/verify CI matrix for `lint`, `test`, `build` specifically scoped to admin.
- Introduce module-level ownership and ADRs for high-risk domains (billing, reports, ledgers).
- Add contract tests for API routes and server actions.

---

## 2) `apps/aws` (Astro 6)

### What is working well
- Solid site architecture: layouts/components/sections/forms/data model.
- Has testing hooks in place and a modern Astro + React stack.
- Includes email-related capability paths (`email` script and shared email package usage).

### Findings / Risks
- Moderate footprint (**41 src files**, **3 tests**) suggests coverage may not match user-facing surface area.
- Form/action flows can be fragile without robust validation and submission observability.
- Requires Node >=22.12; ensure this is consistent in CI and deployment runners.

### Improvements
- Expand tests around forms/actions and SEO-critical pages.
- Add synthetic checks for form submissions and page rendering in preview deployments.
- Standardize content/SEO schema validations via lightweight automated checks.

---

## 3) `apps/tes` (Astro 6)

### What is working well
- Similar modern baseline to AWS with analytics/speed insights integrations.
- Has tests and structured data/actions organization.

### Findings / Risks
- Mid-size app (**28 src files**, **4 tests**): likely under-tested for production confidence.
- Shared patterns with AWS may drift over time without convergence strategy.

### Improvements
- Create shared “site app standards” for Astro apps (tes/aws/pmg) covering actions, SEO metadata, forms, and analytics.
- Add route-level smoke tests and action validation tests.
- Align dependency and script conventions with AWS to reduce operational entropy.

---

## 4) `apps/pmg` (Astro 6)

### What is working well
- Lean structure suitable for fast iteration.
- Uses shared packages and same framework family as AWS/TES.

### Findings / Risks
- Lowest maturity: **16 src files**, **0 tests**, and no app-level `test` script.
- Higher risk of silent breakage due absent quality gates.

### Improvements
- Add baseline quality scripts (`test`, `check-types`, `lint`) and first smoke tests.
- Add minimal route rendering and content assertions.
- Reuse proven components/patterns from AWS/TES where possible.

---

## Cross-App Platform Findings

1. **Tooling bootstrap inconsistency**
   - Root lint pipeline (`turbo run lint`) fails due missing command in current env.
   - `bunx turbo` installation fetch blocked (registry access denied), indicating brittle setup path.

2. **Test runtime inconsistency**
   - App tests invoke `vitest run`, but executable not resolved in this environment.
   - Suggests lockfile/dependency install/bootstrap process is not deterministic across environments.

3. **Quality gate standardization gap**
   - Apps differ in availability of lint/test scripts (e.g., PMG has no tests).
   - No consistent maturity baseline enforced across all apps.

4. **Node engine divergence risk**
   - Astro apps require Node >=22.12 while root declares >=20; may cause subtle runtime/build differences.

---

## Prioritized Improvement Backlog

### Quick Wins (Week 1–2)
1. **Standardize bootstrap docs and scripts**
   - Add a single `setup` command that installs dependencies and validates binaries (`turbo`, `vitest`).
2. **Establish minimum quality gate per app**
   - Every app must support `build` + at least one smoke test command.
3. **Add PMG baseline tests**
   - Introduce 2–3 smoke tests and a `test` script.
4. **Pin runtime expectations**
   - Harmonize root/app Node requirements and enforce with CI checks.

### Near-Term (Week 3–6)
1. **CI hardening per app**
   - Run app-scoped pipelines (`lint`, `test`, `build`) with caching and failure visibility.
2. **Coverage floor policy**
   - Define minimal practical thresholds by app type (admin higher, sites moderate).
3. **Shared Astro app checklist**
   - Reusable standards for SEO metadata, forms validation, analytics instrumentation, and page performance.
4. **Observability basics**
   - Add error telemetry + route/action health checks for all production apps.

### Mid-Term (Quarter)
1. **Architectural governance**
   - Domain boundaries and ownership maps for admin modules.
2. **Test portfolio expansion**
   - Contract tests for server actions/APIs and cross-app regression smoke suites.
3. **Dependency governance**
   - Scheduled dependency update cadence with staged verification.
4. **Developer productivity**
   - DX metrics (time-to-green, flaky tests, failed bootstrap rate) and remediation loops.

---

## Phased Development Plan (Starting with Quick Wins)

## Phase 0 — Stabilize Foundations (Quick Wins, 1–2 weeks)
**Goal:** make every app build/test entrypoint deterministic.

- Deliverables:
  - Unified setup and verification script.
  - PMG test script + initial smoke tests.
  - CI preflight validating Node/Bun/toolchain versions.
- Exit Criteria:
  - All apps execute at least one automated check successfully in CI.
  - New contributors can bootstrap from clean machine using one documented flow.

## Phase 1 — Enforce Baseline Quality (3–6 weeks)
**Goal:** prevent regressions across all app types.

- Deliverables:
  - App-specific CI jobs with fail-fast reporting.
  - Minimum coverage and smoke checks for critical routes/actions.
  - Shared lint/type/test conventions documented and automated.
- Exit Criteria:
  - Merge gates enforced on all apps.
  - Regression rate drops and flaky checks are tracked.

## Phase 2 — Reliability and Observability (6–10 weeks)
**Goal:** improve runtime confidence and operational debugging.

- Deliverables:
  - Production error tracking and synthetic route checks.
  - Form/action monitoring for AWS/TES/PMG.
  - Admin API/action contract test suite.
- Exit Criteria:
  - Mean time to detect failures reduced.
  - Core business journeys covered by automated monitoring.

## Phase 3 — Architecture & Scale (Quarter+)
**Goal:** sustain growth without compounding technical debt.

- Deliverables:
  - Domain ownership matrix and ADRs for admin.
  - Cross-app shared standards package/playbook.
  - Scheduled dependency and framework upgrade program.
- Exit Criteria:
  - Predictable upgrade cycles.
  - Reduced change-failure rate in multi-app releases.

---

## Suggested Success Metrics

- Build/Test pass rate per app (weekly trend).
- Bootstrap success rate from clean environment.
- Change failure rate by app.
- Flaky test count and mean time to resolve.
- Time from PR open to merge for each app pipeline.

