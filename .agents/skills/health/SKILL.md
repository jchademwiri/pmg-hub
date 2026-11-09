---
name: health
description: |
  Standalone production endpoint, database connectivity, and CI health check. Use when user says "/health", "health check", "check endpoints", "ping production", or "status check".
metadata:
  author: custom
  version: '1.0.0'
---

# Health (Production, Database & CI Smoke Check)

Verifies live HTTP status and response latency across all 6 production domains, checks database connectivity, and inspects the latest CI check-runs on `dev` and `master`.

## Steps

### 1. Ping All 6 Production Endpoints

Measure HTTP status and response time (following redirects) for:
- `https://admin.playhousemedia.co.za` (`apps/admin`)
- `https://portal.playhousemedia.co.za` (`apps/portal` — PMG)
- `https://portal.tenderedgesolutions.co.za` (`apps/portal` — TES)
- `https://tenderedgesolutions.co.za` (`apps/tes`)
- `https://apexwebsolutions.co.za` (`apps/aws`)
- `https://playhousemedia.co.za` (`apps/pmg`)

### 2. Check Database Connectivity

Run the `@pmg/db` connectivity check:

```bash
bun --filter @pmg/db db:check
```

### 3. Check Latest Release Tag & CI Status

1. Inspect current release version and latest tag on `origin/master`:
   ```bash
   git fetch origin
   git describe --tags --abbrev=0 origin/master
   ```
2. Query GitHub API check-runs for the latest commit on `origin/master` and `origin/dev`:
   `https://api.github.com/repos/jchademwiri/pmg-hub/commits/<sha>/check-runs`

### 4. Output Health Report

Present a structured table with:
- Endpoint domain, target app, HTTP status, and latency (`ms`).
- Database status (`Connected` / `Error`).
- Latest `master` tag (`vX.Y.Z`), `dev` ahead/behind count, and CI check status.
- If any endpoint fails, recommend `/incident "<domain> failing"` or `/rollback`.
