---
name: release
description: |
  Production release. Use when user says "/release", "release", or "promote".
metadata:
  author: custom
  version: '1.0.0'
---

# Release (Production Promotion)

Promotes `dev` → `master` via release PR.

## Steps

### 1. Check & Merge Open Feature PRs (if applicable)

If there is an open PR targeting `dev` from the working branch or recent task:

1. Verify its CI checks pass:
   ```bash
   gh pr checks <pr-number>
   ```
2. If open and green, merge into `dev`:
   ```bash
   gh pr merge <pr-number> --merge
   ```
3. If the merged PR touched `packages/db/src/migrations/**` or `packages/db/src/schema/**`, verify the post-merge `DB Migrate` workflow run on `dev` succeeded before proceeding:
   ```bash
   gh run list --workflow=db-migrate.yml --branch dev --limit 1
   ```
   (And remind the developer to verify the post-merge `DB Migrate` run on `master` after the Release PR is merged.)
4. Report in summary: `Merged feature PR #<number> into dev before release.`

### 2. Sync & Audit

```bash
git fetch origin
git checkout dev && git pull origin dev
git log --oneline origin/master..origin/dev
```

### 3. Pre-Flight & Version Sync

1. Run quality gates:
   ```bash
   bun run check-types
   echo 'No linter configured'
   bun run test
   bun run build
   ```

2. Determine next release version (`vX.Y.Z`) and sync `packages/utils/src/document-helpers.ts`:
   - Set `APP_VERSION = 'vX.Y.Z'`
   - Set `APP_RELEASE_NAME = 'Release vX.Y.Z'`
   - Commit & push directly on `dev` before creating Release PR:
     ```bash
     git add packages/utils/src/document-helpers.ts
     git commit -m "chore(release): bump APP_VERSION to vX.Y.Z"
     git push origin dev
     ```

### 4. Create Release PR

Write a clean, well-structured Markdown Release PR body (using `## Release vX.Y.Z`, grouped changelog bullets, and a checked `## Verification` checklist — **always pass via `--body-file`** so shell escaping never mangles backticks):

```bash
gh pr create --base master --head dev \
  --title "release: vX.Y.Z" --body-file <release-pr-body.md>
```
(Remove the temporary `<release-pr-body.md>` file after `gh pr create` completes.)

### 5. Monitor CI & Triage AI Bot Reviews (CodeRabbit & Codex)

1. Wait for all CI checks to pass (including `Security / Dependency audit`):
   ```bash
   gh pr checks <pr-number> --watch --interval 10
   ```
   Fix any failing checks until all checks are green.

2. Fetch and evaluate all review comments from **CodeRabbit** (`coderabbitai[bot]`) and **ChatGPT Codex Connector** (`chatgpt-codex-connector[bot]`):
   ```bash
   gh api repos/{owner}/{repo}/pulls/<pr-number>/comments --jq '.[] | {user: .user.login, path: .path, line: .line, body: .body}'
   ```
   - **Evaluate critically:** Fix any valid P1/P2 bugs, regressions, or security/accounting issues on `dev`, push, and re-verify CI before promoting to `master`.
   - **Skip noise:** Briefly note any stylistic nitpicks intentionally skipped.

### 6. Summary & Next Step Guidance

Present the clickable Release PR link, brief bot-review triage note, and next step reminder:

```
📦 Release PR #<number> created: <url>
All CI checks passed & AI bot reviews triaged!

👉 Next Step: Review & merge the Release PR into master (or run `/tag vX.Y.Z` to auto-merge, tag, push, and health-check all 6 production endpoints).
```
