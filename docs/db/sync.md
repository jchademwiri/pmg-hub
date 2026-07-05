CI/CD Migration Automation for PMG Hub
Automatically run Drizzle migrations on every push to dev (staging) and master (production), so the DB is always in sync before Vercel deploys the app.

Proposed Approach
A GitHub Actions workflow that runs bun src/migrate.ts against the correct DB before (or alongside) each Vercel deployment. Since you have two Neon branches:

Git branch	Neon DB	Vercel env
master	ep-mute-truth-a4a8304i (prod)	Production
dev	ep-withered-sea-a4kq5mlk (staging)	Preview
The workflow will detect which branch triggered it and use the matching DATABASE_URL_UNPOOLED.

Proposed Changes
GitHub Actions
[NEW] .github/workflows/migrate.yml
A single workflow triggered on push to dev or master.

Checks out the repo
Sets up Bun
Installs dependencies (bun install --frozen-lockfile)
Runs bun src/migrate.ts from packages/db
Uses branch-conditional env vars:
master → DATABASE_URL_UNPOOLED_PROD secret
dev → DATABASE_URL_UNPOOLED_STAGING secret
GitHub Secrets Required
You'll need to add two secrets in GitHub → repo → Settings → Secrets and variables → Actions:

Secret name	Value
DATABASE_URL_UNPOOLED_PROD	postgresql://neondb_owner:...@ep-mute-truth-a4a8304i-pooler...
DATABASE_URL_UNPOOLED_STAGING	postgresql://neondb_owner:...@ep-withered-sea-a4kq5mlk-pooler...
Fix: migrate.ts dotenv path
The migrate script currently reads from packages/db/.env (via resolve(import.meta.dir, "../.env")), which doesn't exist. In CI, env vars come from GitHub Secrets so dotenv isn't needed — but it causes a silent no-op locally. We'll add a fallback so it also checks the root .env.

[MODIFY] packages/db/src/migrate.ts
Update config() to try packages/db/.env first, then fall back to the root .env.

Verification Plan
Automated
The workflow itself will fail loudly if migrations error — blocking the push feedback loop.
Manual
Push a test commit to dev → confirm workflow runs green in GitHub Actions → confirm column appears in staging Neon branch.