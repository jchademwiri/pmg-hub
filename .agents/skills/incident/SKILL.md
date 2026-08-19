---
name: incident
description: |
  Production incident diagnosis. Use when user says "incident", "site is down",
  "500 error", "/incident", or "outage".
metadata:
  author: custom
  version: "1.0.0"
---

# Incident (Production Diagnosis)

Pulls deployment history, correlates with commits, suggests fix.

## Steps

### 1. Identify App
- `tenderedgesolutions.co.za` → `apps/admin`
- `apexwebsolutions.co.za` → `apps/portal`
- `playhousemedia.co.za` → `apps/tes`
- `apps/aws`
- `apps/pmg`

### 2. Pull Recent Deploys
```bash
gh api repos/jchademwiri/pmg-hub/deployments --jq '.[0:10] | .[] | "\(.created_at) | \(.sha[0:7]) | \(.status)"'
```

### 3. Pull Recent Commits
```bash
git log --oneline -10 origin/master
```

### 4. Correlate & Suggest
```
🔴 INCIDENT REPORT
App: <affected>
Trigger: <suspect>

Options:
  1. /rollback vX.Y.Z
  2. /start hotfix/<slug>
  3. Investigate deeper
```
