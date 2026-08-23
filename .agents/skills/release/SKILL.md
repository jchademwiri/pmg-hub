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

### 1. Sync & Audit

```bash
git fetch origin
git checkout dev && git pull origin dev
git log --oneline origin/master..origin/dev
```

### 2. Pre-Flight

```bash
bun run check-types
echo 'No linter configured'
bun run test
bun run build
```

### 3. Create Release PR

```bash
gh pr create --base master --head dev \
  --title "release: vX.Y.Z" --body "<changelog>"
```

### 4. Monitor CI

```bash
gh pr checks
```

### 5. After Merge

Tell user: "Merge PR, then run `/tag vX.Y.Z`"
