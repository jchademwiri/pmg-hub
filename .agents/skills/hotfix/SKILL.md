---
name: hotfix
description: |
  Emergency production hotfix workflow for urgent bugs. Use when user says "/hotfix <bug>", "hotfix", "urgent fix", or "production hotfix".
metadata:
  author: custom
  version: '1.0.0'
---

# Hotfix (Fast-Track Production Patch)

Creates an isolated `fix/<slug>` branch, applies a minimal targeted fix with regression test coverage, bumps the patch version (`vX.Y.Z+1`), promotes to `master`, tags, verifies all 6 endpoints, and back-merges into `dev`.

## Steps

### 1. Prepare Clean Hotfix Branch

Stash any uncommitted local work and branch from `master` (or `dev` if `dev` matches `master`):

```bash
git status --porcelain
git fetch origin
git checkout -b fix/<bug-slug> origin/master
```

### 2. Diagnose & Apply Minimal Fix

1. Locate the root cause of the bug.
2. Implement the minimal, surgical fix without unrelated refactoring.
3. Add or update a regression unit test covering the exact failure condition.

### 3. Targeted Pre-Flight Quality Gate

Run fast checks on affected packages plus workspace typecheck:

```bash
bun run check-types
npx prettier --write <modified-files>
bun --filter <affected-app> test
bun --filter <affected-app> build
```

### 4. Bump Patch Version (`vX.Y.Z+1`)

1. Check latest tag on `origin/master`:
   ```bash
   git describe --tags --abbrev=0 origin/master
   ```
2. Increment the patch number `Z` (e.g., `v1.54.0` → `v1.54.1`) in `packages/utils/src/document-helpers.ts`:
   - `APP_VERSION = 'vX.Y.Z+1'`
   - `APP_RELEASE_NAME = 'Release vX.Y.Z+1'`

### 5. Commit, Promote to `master` & Tag

```bash
git add .
git commit -m "fix(<scope>): <summary> (vX.Y.Z+1)"
git push origin fix/<bug-slug>
```

Merge into `master`, tag, and sync `dev`:

```bash
git checkout master; git pull origin master
git merge fix/<bug-slug> --no-ff -m "hotfix: vX.Y.Z+1 - <summary>"
git push origin master
git tag -a vX.Y.Z+1 -m "Production Hotfix vX.Y.Z+1"
git push origin vX.Y.Z+1
git checkout dev; git pull origin dev
git merge master --no-ff -m "chore: back-merge hotfix vX.Y.Z+1 into dev"
git push origin dev
```

If a `fix/<bug-slug>` Neon branch was created for the hotfix, delete it now (never delete `main`, `master`, or `dev`):

```bash
bunx neon@latest branches delete fix/<bug-slug> --project-id raspy-dawn-56455281
```

### 6. Live Production Health Check

Verify all 6 endpoints respond `200 OK`:
- `https://tenderedgesolutions.co.za`
- `https://apexwebsolutions.co.za`
- `https://playhousemedia.co.za`
- `https://admin.playhousemedia.co.za`
- `https://portal.playhousemedia.co.za`
- `https://portal.tenderedgesolutions.co.za`

### 7. Summary & Next Step Guidance

```
🚑 Hotfix vX.Y.Z+1 Live in Production!
- Fix: <summary>
- Tagged on master & back-merged into dev
- Health check: All 6 endpoints 200 OK

👉 Next Step: For your next feature or task, run `/start <task>`.
```
