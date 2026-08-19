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

- `/start <task>` — Create branch, audit, plan
- `/done` — Pre-flight, commit, PR, CI
- `/release` — Promote dev → master
- `/tag vX.Y.Z` — Tag production release
- `/rollback` — Revert to previous release
- `/incident "desc"` — Diagnose production issues
- `/changelog` — Generate release notes

## Skills

All skills in `.agents/skills/`. See each SKILL.md for details.

## Conventions

- Branches: `feat/<slug>`, `fix/<slug>`, `chore/<slug>`
- Commits: Conventional commits (`feat:`, `fix:`, `chore:`)
- PRs: Target `dev` for features, `master` for releases
