---
name: tag
description: |
  Production release git tagging. Use when the user says "tag", "tag release",
  "tag v1.2.3", "create tag", or "/tag v1.2.3".
metadata:
  author: custom
  version: '1.0.0'
---

# Tag (Production Release)

Creates annotated git tag on `master`, pushes, runs health checks.

## Steps

### 1. Validate Version

Ensure format is `vX.Y.Z`. Ask user if not provided.

### 2. Check & Merge Open Release PR (if applicable)

Check if an open release PR is pending against `master`:

```bash
gh pr list --base master --state OPEN
```

If an open Release PR exists:

1. Verify its CI checks pass:
   ```bash
   gh pr checks <pr-number>
   ```
2. Merge into `master`:
   ```bash
   gh pr merge <pr-number> --merge
   ```
3. Report in summary: `Merged Release PR #<number> into master before tagging.`

### 3. Ensure on `master` & Sync

```bash
git checkout master && git pull origin master
```

### 4. Check Existing Tag

```bash
git tag -l "vX.Y.Z"
```

Abort if exists.

### 5. Create & Push

```bash
git tag -a vX.Y.Z -m "Production Release vX.Y.Z"
git push origin vX.Y.Z
```

### 6. Health Check

```bash
echo "tenderedgesolutions.co.za: $(curl -sI https://tenderedgesolutions.co.za | head -1)"
echo "apexwebsolutions.co.za: $(curl -sI https://apexwebsolutions.co.za | head -1)"
echo "playhousemedia.co.za: $(curl -sI https://playhousemedia.co.za | head -1)"
echo "admin.playhousemedia.co.za: $(curl -sI https://admin.playhousemedia.co.za | head -1)"
echo "portal.playhousemedia.co.za: $(curl -sI https://portal.playhousemedia.co.za | head -1)"
echo "portal.tenderedgesolutions.co.za: $(curl -sI https://portal.tenderedgesolutions.co.za | head -1)"
```

### 7. Summary & Next Step Guidance

```
🏷️  Tagged vX.Y.Z on master
📤  Pushed to origin
🏥  Health check: all 6 endpoints responding 200 OK

👉 Next Step: Production release vX.Y.Z is live. For your next task, run `/start <task>`.
```

## Rules

- Never force-push tags.
- Fix forward, don't rewrite history.
- Always perform health check across all 6 live production endpoints.
