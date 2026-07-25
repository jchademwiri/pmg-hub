# Research Summary — Tender Scheduling & Solo-Worker Project Management

## Overview

This document summarises the web research conducted to inform the design of the Tender Scheduling feature. Research covered four areas: lightweight project management for solo workers, tender/bid preparation workflows, waterfall scheduling with WIP limits, and deadline risk assessment.

---

## 1. Solo-Worker Project Management

### Key Findings

**Hybrid Waterfall + Kanban is the recommended approach for solo tender preparation.**

- **Waterfall** works for the *overall tender timeline* because tenders have fixed, sequential phases: Requirements → Solution Design → Writing/Drafting → Review → Submission.
- **Kanban** (with WIP limits) works for *daily task execution* because it prevents context-switching and keeps the solo worker focused.
- **WIP Limit of 1–2 items** is the strongest recommendation across multiple sources. For a knowledge worker doing deep-focus tasks (like tender writing), more than 2 concurrent items significantly reduces quality and completion rate.

### Key Ideas to Use

| Idea | Applies to PMG Hub? | How |
|---|---|---|
| WIP limit of 1–2 items | ✅ Yes | Warning when >1 tender is `in_progress` + overlap detection |
| Backward planning from deadline | ✅ Yes | Auto-calculate recommended start date from closing date - effort - buffer |
| Internal deadlines before closing date | ✅ Yes | `target_completion_date` = start date + effort (before closing date) |
| Personal Kanban (Backlog → Doing → Done) | ✅ Yes | The status flow maps directly: planned → in_progress → completed → submitted |

### Sources
- [Project Management for Freelancers: The 2026 Playbook (Plutio)](https://www.plutio.com/freelancer-magazine/freelance-project-management) — scoping, task breakdown, scope prevention
- [The Ultimate Guide to WIP Limits in Kanban (Businessmap)](https://businessmap.io/kanban-resources/getting-started/what-is-wip) — WIP limits prevent multitasking
- [How to Be Productive: A Guide to Personal Kanban (Zenkit)](https://zenkit.com/en/blog/how-to-be-productive-a-guide-to-personal-kanban/) — practical personal Kanban setup
- [What Is Waterfall Project Management? (Wrike)](https://www.wrike.com/project-management-guide/faq/what-is-waterfall-project-management/) — sequential approach for deadline-driven projects

---

## 2. Tender/Bid Preparation Management

### Key Findings

**Consultants and small businesses face three core challenges in tender management:**

1. **Information coordination** — managing multiple documents, requirements, and versions across different tenders.
2. **Deadline pressure** — tender closing dates are hard, external deadlines that cannot be negotiated.
3. **Capacity management** — solo workers must balance preparation time with other business activities.

**Common fields used in tender tracking systems:**
- Tender Name/ID, Submission Deadline (actual + internal), Lead Owner, Qualification Score
- Tender Value & Sector, Compliance Matrix Link

**Common statuses in the tender lifecycle:**
- Discovery → Qualification → Planning → Drafting → Review → Finalization → Submitted → Post-Submission

**Key piece of advice:** Establish "internal deadlines" 2–3 days before the actual closing date. This provides a safety buffer for quality assurance, printing, and last-minute fixes.

### Key Ideas to Use

| Idea | Applies to PMG Hub? | How |
|---|---|---|
| Internal deadline before closing date | ✅ Yes | Buffer days concept — target completion < closing date |
| Essential tracking fields (client, reference, dates) | ✅ Yes | `tender_reference`, `closing_date`, `start_date`, etc. |
| Status lifecycle (triage → work → done → submit) | ✅ Yes | Simplified to planned → in_progress → completed → submitted |
| Compliance matrix / content library | ❌ Avoid for now | Out of MVP scope — too heavy for a solo scheduling feature |

### Sources
- [SiftHub - Tender Management: Process, Best Practices & Tools](https://www.sifthub.io/blog/tender-management) — comprehensive tender management lifecycle
- [Cube RM - Tender Management Lifecycle and Features](https://www.cuberm.com/tender-management/) — enterprise features for context
- [XAIT - Bid Process Management](https://www.xait.com/blog/bid-process-management) — bid management strategy

---

## 3. Deadline Risk Assessment & Scheduling Logic

### Key Findings

**Effort estimation is notoriously inaccurate for solo workers.**

- The "Rule of 1.5x–2x" recommends estimating 50–100% more time than initially felt. A task that feels like 2 days should be estimated at 3–4 days.
- Building an explicit buffer between target completion and the hard deadline is essential. 2 days is a reasonable starting point for tender preparation.
- Overlap detection should be date-range based, not just count-based. Two tenders whose active periods overlap create more risk than the raw count suggests.

### Key Ideas to Use

| Idea | Applies to PMG Hub? | How |
|---|---|---|
| Buffer days between completion and deadline | ✅ Yes | `buffer_days` field (default 2) |
| Overlap detection based on date ranges | ✅ Yes | Application query that checks date range intersections |
| Effort estimation with room for error | ✅ Yes | Users enter effort; system calculates dates and warns if tight |
| No complex critical path or resource leveling | ❌ Avoid | Too complex for MVP |

### Source
- [General project estimation best practices](https://www.forbes.com/sites/forbesbusinesscouncil/2021/09/22/why-accurate-estimation-is-key-to-successful-project-management/) — estimation accuracy for small teams

---

## 4. UI/UX Patterns for Lightweight Scheduling

### Key Findings

**Minimal scheduling interfaces share common patterns:**

- **"Now / Next" layout** — prominently shows what's active, then the queue. This is the most common pattern for solo-worker tools.
- **Status badges with colour** — quick visual scan of where things stand. Green/amber/red is universally understood.
- **Table view for details** — the standard data table works well for schedule data.
- **Timeline bars (stretch goal)** — horizontal bar charts work well for showing date ranges and overlaps.

### What to Avoid (For Now)

| Concept | Why Avoid |
|---|---|
| Full Gantt charts | Over-engineered for a solo user with 2–5 concurrent items |
| Drag-and-drop Kanban boards | Adds significant UI complexity; buttons work fine for 1 person |
| Time tracking / timesheets | Overkill for effort estimated in days, not hours |
| Multi-user collaboration | Jacob works alone on tender prep |
| Resource leveling / auto-scheduling | Complex algorithm with minimal benefit for single-worker scenarios |
| Notification system | MVP uses in-app warnings only; email notifications can be added later |
| Integration with tender portals | High complexity, low MVP value |
| Compliance matrices / document checklists | Shifts feature from "scheduling" to "full bid management" |

---

## 5. PMG Hub Codebase Patterns Discovered

During the codebase audit, the following patterns were confirmed and should be followed for this feature:

| Pattern | Location | Details |
|---|---|---|
| Navigation single source of truth | `apps/admin/src/components/navigation/nav-data.ts` | All nav items defined in one file; GROUPS + OVERVIEW + derived ROUTE_LABELS |
| Database schema (Drizzle ORM) | `packages/db/src/schema/*.ts` | pgTable definitions with enums, indexes, relations |
| Query helpers | `packages/db/src/queries/*.ts` | Pure async functions that export query results |
| Server Actions | `apps/admin/src/app/actions/*.ts` | `'use server'` with Zod validation, error handling, revalidatePath |
| Page components | `apps/admin/src/app/(admin)/**/page.tsx` | Async server component, dynamic fetch, SetPageTotal, returns JSX |
| UI components | `apps/admin/src/components/ui/*.tsx` | shadcn/ui components (card, table, button, badge, dialog, form, etc.) |
| Dashboard layout | `apps/admin/src/app/(admin)/layout.tsx` | SidebarProvider + AppSidebar + TopNav + main content area |
| Database client | `packages/db/src/client.ts` | Drizzle client setup |

---

## 6. Cross-Cutting Recommendations

1. **Start small, then expand.** The MVP should be a single page with a "current workload" card, "up next" card, and a schedule table. Add the timeline view later.
2. **Favour simplicity over flexibility.** For a solo user, it's better to auto-calculate start dates and let the user override than to leave every field blank.
3. **Make warnings visible but non-blocking.** The app should inform, not restrict. Jacob is the best judge of his own capacity.
4. **Design for mobile from the start.** Jacob may check his schedule on a phone while on the go. The schedule should be usable at 375px width.
5. **Reuse existing patterns aggressively.** No new dependencies, no new UI paradigms. Stick to the existing shadcn/ui components and Next.js App Router patterns.
