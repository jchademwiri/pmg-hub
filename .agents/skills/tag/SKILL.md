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

### 2. Ensure on `master`

```bash
git checkout master && git pull origin master
```

### 3. Check Existing Tag

```bash
git tag -l "vX.Y.Z"
```

Abort if exists.

### 4. Create & Push

```bash
git tag -a vX.Y.Z -m "Production Release vX.Y.Z"
git push origin vX.Y.Z
```

### 5. Health Check

```bash
echo "tenderedgesolutions.co.za: $(curl -sI https://tenderedgesolutions.co.za | head -1)"
echo "apexwebsolutions.co.za: $(curl -sI https://apexwebsolutions.co.za | head -1)"
echo "playhousemedia.co.za: $(curl -sI https://playhousemedia.co.za | head -1)"
```

### 6. Summary

```
🏷️  Tagged vX.Y.Z on master
📤  Pushed to origin
🏥  Health check: all endpoints responding
```

## Rules

- Never force-push tags.
- Fix forward, don't rewrite history.
