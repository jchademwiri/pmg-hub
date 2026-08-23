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
3. Report in summary: `Merged feature PR #<number> into dev before release.`

### 2. Sync & Audit

```bash
git fetch origin
git checkout dev && git pull origin dev
git log --oneline origin/master..origin/dev
```

### 3. Pre-Flight

```bash
bun run check-types
echo 'No linter configured'
bun run test
bun run build
```

### 4. Create Release PR

```bash
gh pr create --base master --head dev \
  --title "release: vX.Y.Z" --body "<changelog>"
```

### 5. Monitor CI

```bash
gh pr checks
```

### 6. Summary & Next Step Guidance

Present the release summary and next step reminder:
```
📦 Release PR #<number> created: <url>
CI checks passing!

👉 Next Step: Review & merge the Release PR into master (or ask me to merge it), then run `/tag vX.Y.Z`.
```
