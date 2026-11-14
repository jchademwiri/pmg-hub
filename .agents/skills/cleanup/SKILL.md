---
name: cleanup
description: |
  Branch, remote tracking, and git stash hygiene workflow. Use when user says "/cleanup", "cleanup", "clean branches", "prune branches", or "/sync".
metadata:
  author: custom
  version: '1.0.0'
---

# Cleanup (Branch & Stash Hygiene)

Syncs `dev` and `master` with `origin`, prunes stale remote-tracking references, deletes local and remote feature branches already merged into `dev`, and reports any saved git stashes.

## Steps

### 1. Check Working Tree

```bash
git status --porcelain
```

If dirty, ask the user whether to stash changes before switching branches.

### 2. Sync `master` and `dev` & Prune Remote Refs

```bash
git fetch origin --prune
git checkout master; git pull origin master
git checkout dev; git pull origin dev
```

### 3. Delete Merged Local Branches

List local branches (`feat/*`, `fix/*`, `chore/*`) already merged into `dev` (never delete `dev` or `master`):

```bash
git branch --merged dev
```

Delete each merged `feat/*`, `fix/*`, or `chore/*` local branch with `git branch -d <branch>`.

### 4. Delete Merged Remote Feature Branches

List remote branches (`origin/feat/*`, `origin/fix/*`, `origin/chore/*`) already merged into `origin/dev`:

```bash
git branch -r --merged origin/dev
```

Delete merged remote feature branches on `origin`:

```bash
git push origin --delete <branch>
```

### 5. Delete Merged Neon Feature Branches

> **Protected branches:** NEVER delete `main`, `master`, `dev`, or `preview/dev` in Neon.

List existing Neon branches:

```bash
bunx neon@latest branches list --project-id raspy-dawn-56455281
```

For each merged `feat/*`, `fix/*`, or `chore/*` branch deleted above, delete its matching Neon branch (`<branch>` and `preview/<branch>` if present):

```bash
bunx neon@latest branches delete <branch> --project-id raspy-dawn-56455281
```

### 6. Inspect Stashes

```bash
git stash list
```

Report any remaining stashes (do not drop stashes automatically without user confirmation).

### 7. Summary & Next Step Guidance

```
🧹 Workspace Cleanup Complete!
- Active branch: dev (up to date with origin/dev)
- Pruned local branches: <list or None>
- Pruned remote branches: <list or None>
- Pruned Neon branches: <list or None>
- Active stashes: <count>

👉 Next Step: Run `/start <task>` to begin your next feature on a fresh branch.
```
