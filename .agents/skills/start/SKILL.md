---
name: start
description: |
  Task initialization. Use when user says "/start <task>", "start", or "new task".
metadata:
  author: custom
  version: '1.0.0'
---

# Start (Task Init)

Creates isolated branch from `dev`, audits, plans.

## Steps

### 1. Stash if Dirty

```bash
git status --porcelain
git stash push -u -m "stash-before-start-$(date +%s)"
```

### 2. Sync `dev`

```bash
git checkout dev && git pull origin dev
```

### 3. Create Branch

```bash
git checkout -b feat/<task-slug>
```

### 4. Audit & Plan

Inspect codebase, identify risks, generate `implementation_plan.md`.

### 5. Wait for Approval

Present summary, wait for "proceed".
