#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────
# setup-pipeline.sh — Intelligent pipeline scaffolding for any project
#
# Auto-detects tech stack, suggests pre-flight commands, recommends
# additional skills, and generates fully customized pipeline skills.
#
# Usage:
#   bash scripts/setup-pipeline.sh
#   bash scripts/setup-pipeline.sh --repo "owner/repo" --apps "web,api"
# ──────────────────────────────────────────────────────────────────────
set -euo pipefail

# ── Colors ────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m'

# ── Defaults ──────────────────────────────────────────────────────────
REPO=""
APPS=""
URLS=""
BRANCH_DEV="dev"
BRANCH_PROD="main"
SKILL_DIR=".agents/skills"
PACKAGE_MANAGER="npm"

# ── Parse args ────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case $1 in
    --repo)    REPO="$2"; shift 2 ;;
    --apps)    APPS="$2"; shift 2 ;;
    --urls)    URLS="$2"; shift 2 ;;
    --branch-dev)  BRANCH_DEV="$2"; shift 2 ;;
    --branch-prod) BRANCH_PROD="$2"; shift 2 ;;
    -h|--help)
      echo "Usage: $0 [--repo owner/repo] [--apps web,api] [--urls example.com] [--branch-dev develop] [--branch-prod main]"
      exit 0 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

# ── Banner ────────────────────────────────────────────────────────────
echo -e "\n${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}${CYAN}  🔧 Pipeline Setup — Intelligent Project Scaffolding${NC}"
echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# ══════════════════════════════════════════════════════════════════════
# PHASE 1: DETECT TECH STACK
# ══════════════════════════════════════════════════════════════════════
echo -e "${BOLD}${MAGENTA}Phase 1: Detecting Tech Stack${NC}\n"

detect_package_manager() {
  if [[ -f "bun.lock" ]] || [[ -f "bun.lockb" ]]; then
    echo "bun"
  elif [[ -f "pnpm-lock.yaml" ]]; then
    echo "pnpm"
  elif [[ -f "yarn.lock" ]]; then
    echo "yarn"
  else
    echo "npm"
  fi
}

detect_framework() {
  local frameworks=()
  
  # Check root package.json
  if [[ -f "package.json" ]]; then
    local deps=$(cat package.json | grep -oE '"(next|nuxt|astro|remix|sveltekit|gatsby|vite|webpack|react|vue|angular|svelte)"' 2>/dev/null | sort -u || true)
    
    if echo "$deps" | grep -q '"next"'; then frameworks+=("Next.js"); fi
    if echo "$deps" | grep -q '"astro"'; then frameworks+=("Astro"); fi
    if echo "$deps" | grep -q '"nuxt"'; then frameworks+=("Nuxt"); fi
    if echo "$deps" | grep -q '"remix"'; then frameworks+=("Remix"); fi
    if echo "$deps" | grep -q '"sveltekit"'; then frameworks+=("SvelteKit"); fi
    if echo "$deps" | grep -q '"gatsby"'; then frameworks+=("Gatsby"); fi
    if echo "$deps" | grep -q '"react"' && [[ ${#frameworks[@]} -eq 0 ]]; then frameworks+=("React"); fi
    if echo "$deps" | grep -q '"vue"' && [[ ${#frameworks[@]} -eq 0 ]]; then frameworks+=("Vue"); fi
  fi
  
  # Check for monorepo
  if [[ -f "turbo.json" ]]; then frameworks+=("Turborepo"); fi
  if [[ -f "nx.json" ]]; then frameworks+=("Nx"); fi
  if [[ -f "lerna.json" ]]; then frameworks+=("Lerna"); fi
  
  echo "${frameworks[@]}"
}

detect_database() {
  local dbs=()
  
  if [[ -f "package.json" ]]; then
    local deps=$(cat package.json 2>/dev/null || true)
    local all_deps=$(find . -name "package.json" -not -path "*/node_modules/*" -exec cat {} \; 2>/dev/null || true)
    
    if echo "$all_deps" | grep -q '"drizzle-orm"'; then dbs+=("Drizzle"); fi
    if echo "$all_deps" | grep -q '"prisma"'; then dbs+=("Prisma"); fi
    if echo "$all_deps" | grep -q '"mongoose"'; then dbs+=("MongoDB"); fi
    if echo "$all_deps" | grep -q '"pg"'; then dbs+=("PostgreSQL"); fi
    if echo "$all_deps" | grep -q '"mysql2"'; then dbs+=("MySQL"); fi
    if echo "$all_deps" | grep -q '"better-sqlite3"'; then dbs+=("SQLite"); fi
    if echo "$all_deps" | grep -q '"@neondatabase"'; then dbs+=("Neon"); fi
    if echo "$all_deps" | grep -q '"@planetscale"'; then dbs+=("PlanetScale"); fi
    if echo "$all_deps" | grep -q '"@upstash"'; then dbs+=("Upstash"); fi
  fi
  
  echo "${dbs[@]}"
}

detect_auth() {
  local auths=()
  
  local all_deps=$(find . -name "package.json" -not -path "*/node_modules/*" -exec cat {} \; 2>/dev/null || true)
  
  if echo "$all_deps" | grep -q '"better-auth"'; then auths+=("Better Auth"); fi
  if echo "$all_deps" | grep -q '"next-auth"'; then auths+=("NextAuth"); fi
  if echo "$all_deps" | grep -q '"@clerk"'; then auths+=("Clerk"); fi
  if echo "$all_deps" | grep -q '"@supabase/auth"'; then auths+=("Supabase Auth"); fi
  if echo "$all_deps" | grep -q '"lucia"'; then auths+=("Lucia"); fi
  
  echo "${auths[@]}"
}

detect_email() {
  local emails=()
  
  local all_deps=$(find . -name "package.json" -not -path "*/node_modules/*" -exec cat {} \; 2>/dev/null || true)
  
  if echo "$all_deps" | grep -q '"resend"'; then emails+=("Resend"); fi
  if echo "$all_deps" | grep -q '"@sendgrid"'; then emails+=("SendGrid"); fi
  if echo "$all_deps" | grep -q '"react-email"'; then emails+=("React Email"); fi
  if echo "$all_deps" | grep -q '"@react-email"'; then emails+=("React Email"); fi
  if echo "$all_deps" | grep -q '"nodemailer"'; then emails+=("Nodemailer"); fi
  
  echo "${emails[@]}"
}

detectHosting() {
  local hosts=()
  
  if [[ -f "vercel.json" ]] || [[ -d ".vercel" ]]; then hosts+=("Vercel"); fi
  if [[ -f "netlify.toml" ]] || [[ -d ".netlify" ]]; then hosts+=("Netlify"); fi
  if [[ -f "wrangler.toml" ]]; then hosts+=("Cloudflare"); fi
  if [[ -f "fly.toml" ]]; then hosts+=("Fly.io"); fi
  if [[ -f "Dockerfile" ]]; then hosts+=("Docker"); fi
  if [[ -f "docker-compose.yml" ]] || [[ -f "docker-compose.yaml" ]]; then hosts+=("Docker Compose"); fi
  
  echo "${hosts[@]}"
}

detect_testing() {
  local tests=()
  
  local all_deps=$(find . -name "package.json" -not -path "*/node_modules/*" -exec cat {} \; 2>/dev/null || true)
  
  if echo "$all_deps" | grep -q '"vitest"'; then tests+=("Vitest"); fi
  if echo "$all_deps" | grep -q '"jest"'; then tests+=("Jest"); fi
  if echo "$all_deps" | grep -q '"@playwright/test"'; then tests+=("Playwright"); fi
  if echo "$all_deps" | grep -q '"cypress"'; then tests+=("Cypress"); fi
  
  echo "${tests[@]}"
}

detect_linting() {
  local lints=()
  
  if [[ -f ".eslintrc.js" ]] || [[ -f ".eslintrc.json" ]] || [[ -f ".eslintrc.yml" ]] || [[ -f "eslint.config.js" ]] || [[ -f "eslint.config.mjs" ]] || find . -name ".eslintrc*" -not -path "*/node_modules/*" 2>/dev/null | head -1 | grep -q .; then
    lints+=("ESLint")
  fi
  if [[ -f ".prettierrc" ]] || [[ -f ".prettierrc.js" ]] || [[ -f ".prettierrc.json" ]] || [[ -f "prettier.config.js" ]]; then
    lints+=("Prettier")
  fi
  if [[ -f "biome.json" ]]; then
    lints+=("Biome")
  fi
  
  echo "${lints[@]}"
}

# Run detection
PACKAGE_MANAGER=$(detect_package_manager)
FRAMEWORKS=$(detect_framework)
DATABASES=$(detect_database)
AUTHS=$(detect_auth)
EMAILS=$(detect_email)
HOSTING=$(detectHosting)
TESTING=$(detect_testing)
LINTING=$(detect_linting)

# Display detection results
echo -e "${CYAN}Detected:${NC}"
echo -e "  ${YELLOW}Package Manager:${NC} ${PACKAGE_MANAGER}"
echo -e "  ${YELLOW}Frameworks:${NC}      ${FRAMEWORKS:-None detected}"
echo -e "  ${YELLOW}Database:${NC}        ${DATABASES:-None detected}"
echo -e "  ${YELLOW}Auth:${NC}            ${AUTHS:-None detected}"
echo -e "  ${YELLOW}Email:${NC}           ${EMAILS:-None detected}"
echo -e "  ${YELLOW}Hosting:${NC}         ${HOSTING:-None detected}"
echo -e "  ${YELLOW}Testing:${NC}         ${TESTING:-None detected}"
echo -e "  ${YELLOW}Linting:${NC}         ${LINTING:-None detected}"
echo ""

# ══════════════════════════════════════════════════════════════════════
# PHASE 2: INTERACTIVE CONFIGURATION
# ══════════════════════════════════════════════════════════════════════
echo -e "${BOLD}${MAGENTA}Phase 2: Configuration${NC}\n"

if [[ -z "$REPO" ]]; then
  read -rp "$(echo -e "${CYAN}GitHub repo (owner/repo):${NC} ")" REPO
fi
if [[ -z "$APPS" ]]; then
  read -rp "$(echo -e "${CYAN}App/module names (comma-separated):${NC} ")" APPS
fi
if [[ -z "$URLS" ]]; then
  read -rp "$(echo -e "${CYAN}Production URLs (comma-separated, or enter to skip):${NC} ")" URLS
fi

# Derived values
REPO_OWNER=$(echo "$REPO" | cut -d'/' -f1)
REPO_NAME=$(echo "$REPO" | cut -d'/' -f2)

IFS=',' read -ra APP_ARRAY <<< "$APPS"
IFS=',' read -ra URL_ARRAY <<< "$URLS"

# ══════════════════════════════════════════════════════════════════════
# PHASE 3: GENERATE PRE-FLIGHT COMMANDS
# ══════════════════════════════════════════════════════════════════════
echo -e "\n${BOLD}${MAGENTA}Phase 3: Generating Pre-Flight Commands${NC}\n"

# Build pre-flight commands based on detected stack
build_typecheck_cmd() {
  if [[ -f "turbo.json" ]]; then
    echo "${PACKAGE_MANAGER} run check-types"
  elif echo "$FRAMEWORKS" | grep -q "Next.js"; then
    echo "${PACKAGE_MANAGER} run build"  # Next.js build includes type checking
  else
    echo "${PACKAGE_MANAGER} run typecheck 2>/dev/null || npx tsc --noEmit"
  fi
}

build_lint_cmd() {
  if echo "$LINTING" | grep -q "ESLint"; then
    if [[ -f "turbo.json" ]]; then
      echo "${PACKAGE_MANAGER} run lint"
    else
      echo "npx eslint ."
    fi
  else
    echo "echo 'No linter configured'"
  fi
}

build_format_cmd() {
  if echo "$LINTING" | grep -q "Prettier"; then
    echo "npx prettier --check ."
  else
    echo "echo 'No formatter configured'"
  fi
}

build_test_cmd() {
  if echo "$TESTING" | grep -q "Vitest"; then
    if [[ -f "turbo.json" ]]; then
      echo "${PACKAGE_MANAGER} run test"
    else
      echo "npx vitest run"
    fi
  elif echo "$TESTING" | grep -q "Jest"; then
    echo "npx jest"
  elif echo "$TESTING" | grep -q "Playwright"; then
    echo "npx playwright test"
  else
    echo "echo 'No test framework configured'"
  fi
}

build_db_check_cmd() {
  if echo "$DATABASES" | grep -q "Drizzle"; then
    if [[ -f "turbo.json" ]]; then
      echo "${PACKAGE_MANAGER} run db:check 2>/dev/null || echo 'No db:check script'"
    else
      echo "npx drizzle-kit check 2>/dev/null || echo 'No drizzle-kit check'"
    fi
  elif echo "$DATABASES" | grep -q "Prisma"; then
    echo "npx prisma migrate status"
  else
    echo "echo 'No database migration tool detected'"
  fi
}

build_build_cmd() {
  if [[ -f "turbo.json" ]]; then
    echo "${PACKAGE_MANAGER} run build"
  elif echo "$FRAMEWORKS" | grep -q "Next.js"; then
    echo "npx next build"
  elif echo "$FRAMEWORKS" | grep -q "Astro"; then
    echo "npx astro build"
  elif echo "$FRAMEWORKS" | grep -q "Nuxt"; then
    echo "npx nuxt build"
  elif echo "$FRAMEWORKS" | grep -q "Remix"; then
    echo "npx remix build"
  else
    echo "${PACKAGE_MANAGER} run build 2>/dev/null || echo 'No build script'"
  fi
}

TYPECHECK_CMD=$(build_typecheck_cmd)
LINT_CMD=$(build_lint_cmd)
FORMAT_CMD=$(build_format_cmd)
TEST_CMD=$(build_test_cmd)
DB_CHECK_CMD=$(build_db_check_cmd)
BUILD_CMD=$(build_build_cmd)

echo -e "${CYAN}Pre-flight commands:${NC}"
echo -e "  Typecheck:   ${YELLOW}${TYPECHECK_CMD}${NC}"
echo -e "  Lint:        ${YELLOW}${LINT_CMD}${NC}"
echo -e "  Format:      ${YELLOW}${FORMAT_CMD}${NC}"
echo -e "  Test:        ${YELLOW}${TEST_CMD}${NC}"
echo -e "  DB Check:    ${YELLOW}${DB_CHECK_CMD}${NC}"
echo -e "  Build:       ${YELLOW}${BUILD_CMD}${NC}"
echo ""

# ══════════════════════════════════════════════════════════════════════
# PHASE 4: SUGGEST ADDITIONAL SKILLS
# ══════════════════════════════════════════════════════════════════════
echo -e "${BOLD}${MAGENTA}Phase 4: Recommended Additional Skills${NC}\n"

SUGGESTED_SKILLS=()

# Database skills
if echo "$DATABASES" | grep -q "Drizzle"; then
  SUGGESTED_SKILLS+=("drizzle-orm-best-practices")
fi
if echo "$DATABASES" | grep -q "PostgreSQL" || echo "$DATABASES" | grep -q "Neon"; then
  SUGGESTED_SKILLS+=("postgres-best-practices")
fi

# Auth skills
if echo "$AUTHS" | grep -q "Better Auth"; then
  SUGGESTED_SKILLS+=("better-auth-best-practices")
  SUGGESTED_SKILLS+=("better-auth-security-best-practices")
fi

# Email skills
if echo "$EMAILS" | grep -q "Resend"; then
  SUGGESTED_SKILLS+=("resend")
  SUGGESTED_SKILLS+=("resend-cli")
fi
if echo "$EMAILS" | grep -q "React Email"; then
  SUGGESTED_SKILLS+=("react-email")
fi

# Frontend skills
if echo "$FRAMEWORKS" | grep -q "Next.js"; then
  SUGGESTED_SKILLS+=("vercel-composition-patterns")
fi
if echo "$FRAMEWORKS" | grep -q "Astro" || echo "$FRAMEWORKS" | grep -q "Next.js"; then
  SUGGESTED_SKILLS+=("frontend-design")
  SUGGESTED_SKILLS+=("ui-ux-pro-max")
fi

# Monorepo skills
if echo "$FRAMEWORKS" | grep -q "Turborepo"; then
  SUGGESTED_SKILLS+=("turborepo")
fi

# Hosting skills
if echo "$HOSTING" | grep -q "Vercel"; then
  SUGGESTED_SKILLS+=("seo-audit")
fi

if [[ ${#SUGGESTED_SKILLS[@]} -gt 0 ]]; then
  echo -e "${GREEN}Based on your tech stack, we recommend:${NC}"
  for skill in "${SUGGESTED_SKILLS[@]}"; do
    echo -e "  ${GREEN}+${NC} ${skill}"
  done
else
  echo -e "${YELLOW}No additional skills recommended for this stack.${NC}"
fi
echo ""

# ══════════════════════════════════════════════════════════════════════
# PHASE 5: GENERATE SKILLS
# ══════════════════════════════════════════════════════════════════════
echo -e "${BOLD}${MAGENTA}Phase 5: Generating Pipeline Skills${NC}\n"

mkdir -p "${SKILL_DIR}"

# Build health checks
HEALTH_CHECKS=""
for url in "${URL_ARRAY[@]}"; do
  url=$(echo "$url" | xargs)
  if [[ -n "$url" ]]; then
    HEALTH_CHECKS="${HEALTH_CHECKS}echo \"${url}: \$(curl -sI https://${url} | head -1)\"\n"
  fi
done

# Build app mapping
APP_MAP=""
for i in "${!APP_ARRAY[@]}"; do
  app=$(echo "${APP_ARRAY[$i]}" | xargs)
  url=$(echo "${URL_ARRAY[$i]:-}" | xargs)
  if [[ -n "$url" ]]; then
    APP_MAP="${APP_MAP}- \`${url}\` → \`apps/${app}\`\n"
  else
    APP_MAP="${APP_MAP}- \`apps/${app}\`\n"
  fi
done

# Generate each skill
PIPELINE_SKILLS=("tag" "rollback" "incident" "changelog" "start" "done" "release")

for skill in "${PIPELINE_SKILLS[@]}"; do
  mkdir -p "${SKILL_DIR}/${skill}"
done

# ── tag ───────────────────────────────────────────────────────────────
cat > "${SKILL_DIR}/tag/SKILL.md" << SKILLEOF
---
name: tag
description: |
  Production release git tagging. Use when the user says "tag", "tag release",
  "tag v1.2.3", "create tag", or "/tag v1.2.3".
metadata:
  author: custom
  version: "1.0.0"
---

# Tag (Production Release)

Creates annotated git tag on \`${BRANCH_PROD}\`, pushes, runs health checks.

## Steps

### 1. Validate Version
Ensure format is \`vX.Y.Z\`. Ask user if not provided.

### 2. Ensure on \`${BRANCH_PROD}\`
\`\`\`bash
git checkout ${BRANCH_PROD} && git pull origin ${BRANCH_PROD}
\`\`\`

### 3. Check Existing Tag
\`\`\`bash
git tag -l "vX.Y.Z"
\`\`\`
Abort if exists.

### 4. Create & Push
\`\`\`bash
git tag -a vX.Y.Z -m "Production Release vX.Y.Z"
git push origin vX.Y.Z
\`\`\`

### 5. Health Check
\`\`\`bash
$(echo -e "$HEALTH_CHECKS")
\`\`\`

### 6. Summary
\`\`\`
🏷️  Tagged vX.Y.Z on ${BRANCH_PROD}
📤  Pushed to origin
🏥  Health check: all endpoints responding
\`\`\`

## Rules
- Never force-push tags.
- Fix forward, don't rewrite history.
SKILLEOF

echo -e "  ${GREEN}✓${NC} tag"

# ── rollback ──────────────────────────────────────────────────────────
cat > "${SKILL_DIR}/rollback/SKILL.md" << SKILLEOF
---
name: rollback
description: |
  Production rollback. Use when user says "rollback", "revert", "/rollback",
  "undo deploy", or "production is broken".
metadata:
  author: custom
  version: "1.0.0"
---

# Rollback (Production Revert)

Reverts to previous tagged release. Auto-detects version if not provided.

## Steps

### 1. Resolve Version
**If provided** (\`/rollback vX.Y.Z\`): validate and verify tag exists.
**If not provided** (\`/rollback\`): auto-detect from tags.

\`\`\`bash
ALL_TAGS=(\$(git tag -l "v*" --sort=-v:refname))
CURRENT="\${ALL_TAGS[0]}"
PREVIOUS="\${ALL_TAGS[1]}"
\`\`\`

Show:
\`\`\`
Current: v1.34.0
Suggested: v1.33.0 (previous)

Available:
  1. v1.33.0 ← recommended
  2. v1.32.0
  3. Pick different
\`\`\`

### 2. Revert on \`${BRANCH_PROD}\`
\`\`\`bash
git checkout ${BRANCH_PROD} && git pull origin ${BRANCH_PROD}
git log --oneline ${BRANCH_PROD} | head -20
git revert --no-edit <merge-commit>
git push origin ${BRANCH_PROD}
\`\`\`

### 3. Health Check
\`\`\`bash
$(echo -e "$HEALTH_CHECKS")
\`\`\`

### 4. Summary
\`\`\`
🔄 Rollback Complete
  Reverted: vX.Y.Z → vA.B.C
  Pushed: ${BRANCH_PROD} → redeploying
  Next: /start hotfix/<slug>
\`\`\`

## Rules
- NEVER force-push. Use \`git revert\`.
- NEVER delete tags.
- Always health check after.
SKILLEOF

echo -e "  ${GREEN}✓${NC} rollback"

# ── incident ──────────────────────────────────────────────────────────
cat > "${SKILL_DIR}/incident/SKILL.md" << SKILLEOF
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
$(echo -e "$APP_MAP")

### 2. Pull Recent Deploys
\`\`\`bash
gh api repos/${REPO}/deployments --jq '.[0:10] | .[] | "\\(.created_at) | \\(.sha[0:7]) | \\(.status)"'
\`\`\`

### 3. Pull Recent Commits
\`\`\`bash
git log --oneline -10 origin/${BRANCH_PROD}
\`\`\`

### 4. Correlate & Suggest
\`\`\`
🔴 INCIDENT REPORT
App: <affected>
Trigger: <suspect>

Options:
  1. /rollback vX.Y.Z
  2. /start hotfix/<slug>
  3. Investigate deeper
\`\`\`
SKILLEOF

echo -e "  ${GREEN}✓${NC} incident"

# ── changelog ─────────────────────────────────────────────────────────
cat > "${SKILL_DIR}/changelog/SKILL.md" << SKILLEOF
---
name: changelog
description: |
  Auto-generate changelog. Use when user says "changelog", "release notes",
  "/changelog", or "what changed".
metadata:
  author: custom
  version: "1.0.0"
---

# Changelog (Release Notes)

Generates changelog from conventional commits.

## Steps

### 1. Resolve Range
\`\`\`bash
tags=(\$(git tag -l "v*" --sort=-v:refname | head -2))
TO_TAG="\${tags[0]}"
FROM_TAG="\${tags[1]}"
\`\`\`

### 2. Fetch & Categorize
\`\`\`bash
git log --oneline --no-merges "\${FROM_TAG}..\${TO_TAG}"
\`\`\`

| Prefix | Section |
|--------|---------|
| \`feat:\` | 🚀 Features |
| \`fix:\` | 🐛 Bug Fixes |
| \`perf:\` | ⚡ Performance |
| \`refactor:\` | ♻️ Refactoring |
| \`chore:\` | 🔧 Maintenance |
| \`BREAKING\` | ⚠️ Breaking Changes |

### 3. Output
\`\`\`markdown
# Release vX.Y.Z
**Compare:** [vA.B.C...vX.Y.Z](https://github.com/${REPO}/compare/vA.B.C...vX.Y.Z)

## 🚀 Features
- ...

## 🐛 Bug Fixes
- ...
\`\`\`
SKILLEOF

echo -e "  ${GREEN}✓${NC} changelog"

# ── start ─────────────────────────────────────────────────────────────
cat > "${SKILL_DIR}/start/SKILL.md" << SKILLEOF
---
name: start
description: |
  Task initialization. Use when user says "/start <task>", "start", or "new task".
metadata:
  author: custom
  version: "1.0.0"
---

# Start (Task Init)

Creates isolated branch from \`${BRANCH_DEV}\`, audits, plans.

## Steps

### 1. Stash if Dirty
\`\`\`bash
git status --porcelain
git stash push -u -m "stash-before-start-\$(date +%s)"
\`\`\`

### 2. Sync \`${BRANCH_DEV}\`
\`\`\`bash
git checkout ${BRANCH_DEV} && git pull origin ${BRANCH_DEV}
\`\`\`

### 3. Create Branch
\`\`\`bash
git checkout -b feat/<task-slug>
\`\`\`

### 4. Audit & Plan
Inspect codebase, identify risks, generate \`implementation_plan.md\`.

### 5. Wait for Approval
Present summary, wait for "proceed".
SKILLEOF

echo -e "  ${GREEN}✓${NC} start"

# ── done ──────────────────────────────────────────────────────────────
cat > "${SKILL_DIR}/done/SKILL.md" << SKILLEOF
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
\`\`\`bash
${TYPECHECK_CMD}
${LINT_CMD}
${FORMAT_CMD}
${TEST_CMD}
${DB_CHECK_CMD}
${BUILD_CMD}
\`\`\`

### 2. Detect Branch
- Feature branch → PR to \`${BRANCH_DEV}\`
- \`${BRANCH_DEV}\` → PR to \`${BRANCH_PROD}\`

### 3. Commit & Push
\`\`\`bash
git add .
git commit -m "<type>(<scope>): <summary>"
git push origin <branch>
\`\`\`

### 4. Create PR
\`\`\`bash
gh pr create --base <target> --head <branch> --title "..." --body "..."
\`\`\`

### 5. Monitor CI
\`\`\`bash
gh pr checks
\`\`\`
Fix failures until all green.

## Rules
- Never push to \`${BRANCH_PROD}\` directly.
- Use conventional commits.
SKILLEOF

echo -e "  ${GREEN}✓${NC} done"

# ── release ───────────────────────────────────────────────────────────
cat > "${SKILL_DIR}/release/SKILL.md" << SKILLEOF
---
name: release
description: |
  Production release. Use when user says "/release", "release", or "promote".
metadata:
  author: custom
  version: "1.0.0"
---

# Release (Production Promotion)

Promotes \`${BRANCH_DEV}\` → \`${BRANCH_PROD}\` via release PR.

## Steps

### 1. Sync & Audit
\`\`\`bash
git fetch origin
git checkout ${BRANCH_DEV} && git pull origin ${BRANCH_DEV}
git log --oneline origin/${BRANCH_PROD}..origin/${BRANCH_DEV}
\`\`\`

### 2. Pre-Flight
\`\`\`bash
${TYPECHECK_CMD}
${LINT_CMD}
${TEST_CMD}
${BUILD_CMD}
\`\`\`

### 3. Create Release PR
\`\`\`bash
gh pr create --base ${BRANCH_PROD} --head ${BRANCH_DEV} \\
  --title "release: vX.Y.Z" --body "<changelog>"
\`\`\`

### 4. Monitor CI
\`\`\`bash
gh pr checks
\`\`\`

### 5. After Merge
Tell user: "Merge PR, then run \`/tag vX.Y.Z\`"
SKILLEOF

echo -e "  ${GREEN}✓${NC} release"

# ══════════════════════════════════════════════════════════════════════
# PHASE 6: GENERATE AGENT CONFIG FILES
# ══════════════════════════════════════════════════════════════════════
echo -e "\n${BOLD}${MAGENTA}Phase 6: Generating Agent Config Files${NC}\n"

# ── AGENTS.md ─────────────────────────────────────────────────────────
cat > "AGENTS.md" << AGENTSEOF
# ${REPO_NAME} — AI Agent Instructions

## Tech Stack
- **Frameworks:** ${FRAMEWORKS:-TBD}
- **Database:** ${DATABASES:-None detected}
- **Auth:** ${AUTHS:-None detected}
- **Email:** ${EMAILS:-None detected}
- **Hosting:** ${HOSTING:-TBD}
- **Testing:** ${TESTING:-TBD}
- **Linting:** ${LINTING:-TBD}

## Workflow Commands
- \`/start <task>\` — Create branch, audit, plan
- \`/done\` — Pre-flight, commit, PR, CI
- \`/release\` — Promote ${BRANCH_DEV} → ${BRANCH_PROD}
- \`/tag vX.Y.Z\` — Tag production release
- \`/rollback\` — Revert to previous release
- \`/incident "desc"\` — Diagnose production issues
- \`/changelog\` — Generate release notes

## Skills
All skills in \`.agents/skills/\`. See each SKILL.md for details.

## Conventions
- Branches: \`feat/<slug>\`, \`fix/<slug>\`, \`chore/<slug>\`
- Commits: Conventional commits (\`feat:\`, \`fix:\`, \`chore:\`)
- PRs: Target \`${BRANCH_DEV}\` for features, \`${BRANCH_PROD}\` for releases
AGENTSEOF

echo -e "  ${GREEN}✓${NC} AGENTS.md"

# ── .cursorrules ──────────────────────────────────────────────────────
cat > ".cursorrules" << CURSOREOF
# ${REPO_NAME} — Cursor Rules

## Stack
${FRAMEWORKS:-TBD} | ${DATABASES:-TBD} | ${HOSTING:-TBD}

## Commands
- /start <task> — Branch, audit, plan
- /done — Pre-flight, PR, CI
- /release — Release PR
- /tag vX.Y.Z — Tag production
- /rollback — Revert
- /incident — Diagnose
- /changelog — Release notes

## Rules
- Never push to ${BRANCH_PROD} directly
- Conventional commits
- See AGENTS.md for full reference
CURSOREOF

echo -e "  ${GREEN}✓${NC} .cursorrules"

# ── .github/copilot-instructions.md ───────────────────────────────────
mkdir -p .github
cat > ".github/copilot-instructions.md" << COPILOTEOF
# ${REPO_NAME} — Copilot Instructions

## Workflow
- /start <task> — Initialize
- /done — Ship
- /release — Promote
- /tag — Tag
- /rollback — Revert
- /incident — Diagnose
- /changelog — Notes

## Rules
- Conventional commits
- Never push to ${BRANCH_PROD} directly
- See AGENTS.md for full reference
COPILOTEOF

echo -e "  ${GREEN}✓${NC} .github/copilot-instructions.md"

# ══════════════════════════════════════════════════════════════════════
# PHASE 7: SUMMARY & RECOMMENDATIONS
# ══════════════════════════════════════════════════════════════════════
echo -e "\n${BOLD}${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}${GREEN}  ✅ Pipeline Setup Complete!${NC}"
echo -e "${BOLD}${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

echo -e "${BOLD}Files created:${NC}"
echo -e "  ${GREEN}✓${NC} ${SKILL_DIR}/tag/SKILL.md"
echo -e "  ${GREEN}✓${NC} ${SKILL_DIR}/rollback/SKILL.md"
echo -e "  ${GREEN}✓${NC} ${SKILL_DIR}/incident/SKILL.md"
echo -e "  ${GREEN}✓${NC} ${SKILL_DIR}/changelog/SKILL.md"
echo -e "  ${GREEN}✓${NC} ${SKILL_DIR}/start/SKILL.md"
echo -e "  ${GREEN}✓${NC} ${SKILL_DIR}/done/SKILL.md"
echo -e "  ${GREEN}✓${NC} ${SKILL_DIR}/release/SKILL.md"
echo -e "  ${GREEN}✓${NC} AGENTS.md"
echo -e "  ${GREEN}✓${NC} .cursorrules"
echo -e "  ${GREEN}✓${NC} .github/copilot-instructions.md"

if [[ ${#SUGGESTED_SKILLS[@]} -gt 0 ]]; then
  echo -e "\n${BOLD}Recommended skills to install:${NC}"
  echo -e "${YELLOW}  npx skills find <skill-name>${NC}"
  for skill in "${SUGGESTED_SKILLS[@]}"; do
    echo -e "    → ${skill}"
  done
fi

echo -e "\n${BOLD}Next steps:${NC}"
echo -e "  1. Review generated skills in ${SKILL_DIR}/"
echo -e "  2. Install recommended skills (see above)"
echo -e "  3. Push to repo: ${YELLOW}git add . && git commit -m 'chore: add pipeline skills'${NC}"
echo -e "  4. Start using: ${YELLOW}/start <task>${NC}"
echo ""
