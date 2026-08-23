# pmg-hub — AI Agent Instructions

## Tech Stack

- **Frameworks:** Next.js Astro Turborepo
- **Database:** Drizzle PostgreSQL
- **Auth:** Better Auth
- **Email:** Resend React Email
- **Hosting:** Vercel
- **Testing:** Vitest Playwright
- **Linting:** Prettier

## Workflow Commands

- `/start <task>` — Create branch from `dev`, audit codebase, plan implementation
- `/bug-hunter` — Multi-phase systematic bug audit, logic check, and hardening
- `/ship` (or `/pr`, `/done`) — Pre-flight, commit, push, PR to `dev`, CI checks, next-step reminder
- `/release` — Check/merge open feature PRs, run audit, PR `dev` → `master`, CI checks
- `/tag vX.Y.Z` — Check/merge release PR to `master`, tag, push, health check 6 endpoints
- `/rollback` — Revert to previous release tag on `master`
- `/incident "desc"` — Diagnose production issues across apps and deployments
- `/changelog` — Generate release notes from conventional commits

## Auto-Merge & Next Step Conventions

- **Auto-Merge Check**: Commands that depend on an open PR (`/release`, `/tag`) check if the PR is open, verify CI passed, merge it, pull latest, and explicitly report the merge in the summary.
- **Next Step Reminders**: Every workflow command (`/ship`, `/release`, `/tag`) must conclude by reminding the developer of the exact next command in the pipeline.

## Production Endpoints & Domains

- `admin.playhousemedia.co.za` → `apps/admin` (Operations / Billing / Accounting)
- `portal.playhousemedia.co.za` → `apps/portal` (Client Portal)
- `portal.tenderedgesolutions.co.za` → `apps/portal` (TES Portal)
- `tenderedgesolutions.co.za` → `apps/tes` (TenderEdge Solutions Website)
- `apexwebsolutions.co.za` → `apps/aws` (Apex Web Solutions Website)
- `playhousemedia.co.za` → `apps/pmg` (Playhouse Media Group Website)

## Conventions

- Branches: `feat/<slug>`, `fix/<slug>`, `chore/<slug>`
- Commits: Conventional commits (`feat:`, `fix:`, `chore:`)
- PRs: Target `dev` for features, `master` for releases
