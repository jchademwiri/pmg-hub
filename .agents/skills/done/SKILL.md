---
name: done
description: |
  Ship workflow. Use when user says "/done", "done", or "ship it".
metadata:
  author: custom
  version: "1.0.0"
---

# Done (Ship Workflow)

Pre-flight, commit, PR, monitor CI.

## Steps

### 1. Pre-Flight
```bash
bun run check-types
echo 'No linter configured'
npx prettier --check .
bun run test
bun run db:check 2>/dev/null || echo 'No db:check script'
bun run build
```

### 2. Detect Branch
- Feature branch → PR to `dev`
- `dev` → PR to `master`

### 3. Commit & Push
```bash
git add .
git commit -m "<type>(<scope>): <summary>"
git push origin <branch>
```

### 4. Create PR
```bash
gh pr create --base <target> --head <branch> --title "..." --body "..."
```

### 5. Monitor CI
```bash
gh pr checks
```
Fix failures until all green.

## Rules
- Never push to `master` directly.
- Use conventional commits.
