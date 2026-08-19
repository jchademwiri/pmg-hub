---
name: changelog
description: |
  Auto-generate changelog. Use when user says "changelog", "release notes",
  "/changelog", or "what changed".
metadata:
  author: custom
  version: '1.0.0'
---

# Changelog (Release Notes)

Generates changelog from conventional commits.

## Steps

### 1. Resolve Range

```bash
tags=($(git tag -l "v*" --sort=-v:refname | head -2))
TO_TAG="${tags[0]}"
FROM_TAG="${tags[1]}"
```

### 2. Fetch & Categorize

```bash
git log --oneline --no-merges "${FROM_TAG}..${TO_TAG}"
```

| Prefix      | Section             |
| ----------- | ------------------- |
| `feat:`     | 🚀 Features         |
| `fix:`      | 🐛 Bug Fixes        |
| `perf:`     | ⚡ Performance      |
| `refactor:` | ♻️ Refactoring      |
| `chore:`    | 🔧 Maintenance      |
| `BREAKING`  | ⚠️ Breaking Changes |

### 3. Output

```markdown
# Release vX.Y.Z

**Compare:** [vA.B.C...vX.Y.Z](https://github.com/jchademwiri/pmg-hub/compare/vA.B.C...vX.Y.Z)

## 🚀 Features

- ...

## 🐛 Bug Fixes

- ...
```
