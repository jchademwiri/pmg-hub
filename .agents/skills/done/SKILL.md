---
name: done
description: |
  Alias for /ship. Use when the user says "/done". Always read and follow `.agents/skills/ship/SKILL.md` as the single source of truth.
metadata:
  author: custom
  version: '2.0.0'
---

# Done (Alias for `/ship`)

This skill is a thin slash-command alias for `/ship`.

**Action:** Immediately read `.agents/skills/ship/SKILL.md` and execute every step, rule, PR template, CI watch, AI bot review triage, and post-merge `DB Migrate` check defined there without deviation.
