# Tender Scheduling Project Management — Objective

## Why This Feature Is Needed

PMG Hub currently helps manage business/admin workflows — billing, finance, accounting, relationships, and insights. However, there is **no mechanism to plan, track, or visualise** the tender preparation process itself.

Tender preparation is the primary revenue-generating activity for **Tender Edge Solutions (TES)**, one of the core PMG divisions. Each tender is a time-sensitive, deadline-driven project with a fixed closing date. Missing a tender deadline means a lost business opportunity, often with no second chance.

Currently, tender scheduling is managed manually via an Excel spreadsheet ("Tender Schedule Timetable.xlsx"). While functional, this approach has significant limitations (see below). Bringing tender scheduling into PMG Hub would:

1. **Eliminate context-switching** — plan and execute from the same system used for billing and finance.
2. **Provide real-time workload visibility** — instantly answer "What am I working on now? What's next? Am I overcommitted?"
3. **Reduce deadline risk** — flag impending or overlapping deadlines before they become crises.
4. **Enable data-driven estimation** — track actual effort vs. estimated effort to improve future planning.

## Business Problem

**The "Solo-Operator" Scheduling Problem:**

Jacob operates Tender Edge Solutions alone for the most part. Tender preparation follows a largely waterfall workflow:

1. Receive tender documents / identify opportunity.
2. Assess requirements and estimate effort.
3. Schedule preparation work around existing commitments.
4. Execute preparation (compliance, documentation, pricing, formatting).
5. Submit before the closing date.

The core difficulty is **capacity planning** — with only one person available:

- **WIP (Work In Progress) is naturally low**: Jacob can usually work on only 1 tender at a time, sometimes 2 in parallel when deadlines allow.
- **Each tender has a hard external deadline** (the closing date) that cannot be negotiated.
- **Effort estimation is manual and inconsistent**: without tracking actual hours spent vs. estimated, it's hard to improve accuracy.
- **Overlap risk**: two tenders with overlapping effort windows and tight closing dates can create a crisis.
- **No early warning system**: if a tender is behind schedule, there is currently no automatic flag to prompt re-prioritisation or escalation.

## Desired Outcome

A minimal, practical scheduling feature within PMG Hub that enables Jacob to:

- ✅ **See what tender is currently being worked on** — a "now" view.
- ✅ **See what tender is next in the queue** — an "up next" view.
- ✅ **Know when to start each tender** — scheduling based on closing date and estimated effort.
- ✅ **Know when to finish** — target completion date that is before the closing date.
- ✅ **Assess deadline risk** — flag if a tender is at risk of missing its closing date (e.g., buffer too small, start date has passed without starting, or effort overlaps with other commitments).
- ✅ **Manage workload** — avoid scheduling more tenders than can realistically be handled (WIP limit enforcement, or at least visual warnings).

The feature should answer these questions at a glance:

> *What tender am I working on now? What tender is next? When should I start? When should I finish? Am I at risk of missing the closing date? Do I have too many tenders scheduled at once?*

## Scope

| In Scope (MVP) | Out of Scope (Future / Avoid for Now) |
|---|---|
| Tender schedule CRUD (create, read, update, delete) | Full project management (tasks, subtasks, milestones, Gantt charts) |
| Status tracking (planned → in progress → completed → submitted) | Team collaboration / multi-user assignments |
| Effort estimation (days) + actual effort tracking | Automated notifications / email reminders (future enhancement) |
| Start date, target completion date, closing date tracking | Kanban board with drag-and-drop |
| Basic workload view (current, next, queue) | Calendar integration (Google Calendar, Outlook) |
| Deadline risk indicators (buffer warnings, overlap detection) | File uploads / document management per tender |
| Integration with existing clients (must link to client record) | Resource leveling / auto-scheduling |
| Structured notes and blockers (separate fields) | Reporting / historical analysis |
| Overdue/warning states in UI | Public client-facing portal |
| Mobile-friendly responsive layout (desktop primary) | Time tracking / timesheets |
| Priority levels (urgent/high first, then by closing date) | |
| Outcome tracking (won / lost / pending after submission) | |
| Fixed 2-day buffer (global default, not configurable per tender) | |

## Non-Scope (Explicitly Avoided)

- Building a full project management system (Gantt charts, critical path, resource management, etc.)
- Multi-user collaboration (Jacob works solo on tender prep — others are only involved in waiting periods)
- Time tracking (effort is estimated and tracked in days, not hours)
- Notification/reminder system (future enhancement — MVP uses in-app visual flags only)
- File storage/management within PMG Hub (tender documents are managed externally in Google Drive / file system)
- Integration with tender portals or external APIs
- Historical analytics or win/loss analysis (beyond basic outcome tracking)
