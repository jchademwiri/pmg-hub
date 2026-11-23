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

Write a clean, well-structured Markdown PR description matching `.github/pull_request_template.md` — **never leave empty `<!-- ... -->` placeholder comments or unchecked boxes**. **Always pass the PR body via `--body-file` (e.g. a UTF-8 `.md` file or stdin) instead of inline `--body "..."`** so PowerShell/shell escaping never mangles backticks or turns `\b`/`\f`/`\t`/`\a` into control characters.

Required PR Markdown template:

```markdown
## Summary
<1–2 sentences explaining what this PR does and why>

## Changes
- **<Area / Module>** (`path/to/file.ts`): <concise description of change>
- **<Area / Module>** (`path/to/file.tsx`): <concise description of change>

## Test plan
- [x] `bun run check-types` clean
- [x] `bunx prettier --check` clean on changed files
- [x] `bun run test` passed (<test count / suites>)
- [x] `bun run build` succeeded locally
- [ ] Staging verification on `dev` (<what to click & verify after merging to `dev`>)

## Related
- Target branch: `dev` (staging)
```

```bash
gh pr create --base <target> --head <branch> --title "<type>(<scope>): <summary>" --body-file <pr-body.md>
```
(Remove any temporary `<pr-body.md>` file after `gh pr create` completes.)

### 5. Monitor CI Checks

```bash
gh pr checks <pr-number> --watch --interval 10
```

Fix any failures until all core checks are green.

### 6. Summary & Next Step Guidance

Once CI is green and the PR is ready to merge, **always return the full clickable PR URL prominently** (same as `/release`) and clearly distinguish merging to `dev` (staging) vs. `/release` (production):

```
✅ Pull Request #<number> ready to merge: <url>
All CI checks passed!

👉 Next Step: Merge PR #<number> into `dev` to deploy to staging for testing (click Merge on GitHub or tell me "merge to dev"). Only run `/release` later when you are ready to promote `dev` → `master` (production).
```

## Rules

- Never push to `master` directly.
- Use conventional commits (`feat:`, `fix:`, `chore:`).
- Always provide the PR link and clear next-step reminder in the summary.
