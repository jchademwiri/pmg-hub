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

Write a clean, well-structured Markdown PR description (using headings, bullet points, code spans, and a verification checklist). **Always pass the PR body via `--body-file` (e.g. a UTF-8 `.md` file or stdin) instead of inline `--body "..."`** so PowerShell/shell escaping never mangles backticks or turns `\b`/`\f`/`\t`/`\a` into control characters.

Recommended PR Markdown template:

```markdown
## Summary
- <concise bullet describing the main change and affected modules>
- <additional bullets for secondary changes>

## Verification
- [x] `bun run check-types`
- [x] `bunx prettier --check` on changed files
- [x] `bun run test`
- [x] `bun run build`
```

```bash
gh pr create --base <target> --head <branch> --title "<type>(<scope>): <summary>" --body-file <pr-body.md>
```
(Remove any temporary `<pr-body.md>` file after `gh pr create` completes.)

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
