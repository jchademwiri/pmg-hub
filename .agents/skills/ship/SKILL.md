---
name: ship
description: |
  Ship / Pull Request workflow. Use when user says "/ship", "ship", "/pr", "pr", "/submit", "submit", "/done", "done", or "ship it".
metadata:
  author: custom
  version: '1.0.0'
---

# Ship (Feature Pull Request & Quality Gate)

Pre-flight verification, commit, PR creation targeting `dev`, and CI monitoring.

## Steps

### 1. Pre-Flight Quality Gate

```bash
bun run check-types
npx prettier --check .
bun run test
bun run build
```

### 2. Detect Branch

- Feature branch (`feat/*`, `fix/*`, `chore/*`) → PR targeting `dev`
- `dev` → PR targeting `master`

### 3. Commit & Push

```bash
git add .
git commit -m "<type>(<scope>): <summary>"
git push origin <branch>
```

### 4. Create Pull Request

```bash
gh pr create --base <target> --head <branch> --title "..." --body "..."
```

### 5. Monitor CI Checks

```bash
gh pr checks
```

Fix any failures until all checks are green.

### 6. Summary & Next Step Guidance

Present the PR link and remind the user of the next pipeline command:

```
✅ Pull Request #<number> created: <url>
All CI checks passed!

👉 Next Step: Review & merge the PR into dev (or run `/release` to auto-merge and prepare release).
```

## Rules

- Never push to `master` directly.
- Use conventional commits (`feat:`, `fix:`, `chore:`).
- Always provide the PR link and clear next-step reminder in the summary.
