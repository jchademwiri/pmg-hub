# Dependency Maintenance (Weekly Bot PRs)

The [`dependency-maintenance.yml`](../../.github/workflows/dependency-maintenance.yml) workflow runs **every Monday at 06:00 UTC** (and on demand via *Run workflow* on the [Actions page](https://github.com/jchademwiri/pmg-hub/actions/workflows/dependency-maintenance.yml)). It regenerates `bun.lock` from the manifests, verifies the result, and opens a PR to `dev` with a table of every updated package — so upstream drift and fresh advisories surface as a small reviewed PR instead of a release-day CI fire.

See the [v1.43.1 release](https://github.com/jchademwiri/pmg-hub/pull/220) for the incident that motivated this: react-email lockfile drift plus same-week Next.js/Astro CVEs failed every CI job at install/audit time.

## Why MAINTENANCE_TOKEN matters

GitHub blocks workflow-triggered workflows to prevent recursion. The practical effect:

| Secret configured | PR created with | `pull_request` CI runs on bot PRs? | Verification |
|---|---|---|---|
| `MAINTENANCE_TOKEN` (recommended) | PAT | ✅ Yes — full CI | In-workflow suite **and** CI |
| None (default) | `GITHUB_TOKEN` | ❌ No | In-workflow suite only |

The workflow never opens an unverified PR either way — it runs frozen-install sanity, `check-types`, `test`, and `build` before creating the PR. Adding the token additionally gets you `lint`, `format`, `e2e`, `db-validate`, the `Dependency audit` gate, and Vercel previews on the bot's PRs.

## Setup (one time, ~5 minutes)

1. Go to **GitHub → Settings → Developer settings → [Fine-grained personal access tokens](https://github.com/settings/personal-access-tokens/new)** (or use a classic PAT with the `repo` scope).
2. Configure the fine-grained token:
   - **Token name**: `pmg-hub-maintenance-bot`
   - **Expiration**: 90 days (calendar a rotation reminder; see below)
   - **Resource owner**: `jchademwiri`
   - **Repository access**: *Only select repositories* → `jchademwiri/pmg-hub`
   - **Permissions → Repository permissions**:
     - **Contents**: *Read and write* (push the branch, commit the lockfile)
     - **Pull requests**: *Read and write* (open the weekly PR)
   - Everything else: *No access*
3. Generate the token and copy it (you won't see it again).
4. Go to **pmg-hub → Settings → Secrets and variables → Actions → [New repository secret](https://github.com/jchademwiri/pmg-hub/settings/secrets/actions)**:
   - **Name**: `MAINTENANCE_TOKEN`
   - **Secret**: paste the token
5. Verify: run the workflow manually via *Run workflow* on the Actions page. If drift exists, a `chore/dep-maintenance-*` PR appears — open its *Checks* tab and confirm the full CI suite is running on it.

## Rotation & revocation

- **Rotate every ~90 days**: create a fresh token, update the `MAINTENANCE_TOKEN` secret, then delete the old token. The workflow picks up the new secret on its next run — nothing else to change.
- **Revoke immediately** if the token ever leaks: GitHub → Developer settings → token → *Revoke*. The worst case while revoked is that bot PRs lose `pull_request` CI until a new secret is set (the in-workflow verification keeps running).

## Troubleshooting

- **No PR appears on Monday**: check the workflow run log for `An open dependency-maintenance PR already exists` (one PR at a time by design), or `No dependency drift this week` (healthy lockfile — a good outcome, not a failure).
- **PR created but no CI checks on it**: the token was missing at PR-creation time, or it lacks `pull_requests:write`/`contents:write`. Re-check step 2 and 4 above.
- **PR is open but the branch is behind `dev`**: close it; the next scheduled run (or a manual *Run workflow*) will recreate it from fresh `dev`.
- **Workflow fails at checkout/push with 403**: the token expired — rotate it (above).
