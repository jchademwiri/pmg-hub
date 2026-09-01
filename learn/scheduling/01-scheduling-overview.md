# 1. Scheduling & Projects Overview

> Scheduling and Project Management help your team plan, track, and deliver client projects and tender bids so deadlines are never missed.

---

## What Scheduling Is For

Use the Scheduling and Projects subsystem to:

- Plan tender bids and technical milestones well before submission deadlines.
- Automatically calculate start dates based on estimated effort days and safety buffers.
- Track progress through sequential stages: `Planned` → `In Progress` → `Completed` → `Submitted`.
- Spot at-risk and overdue deliverables at a glance.
- Connect deliverables directly to client records in **Relationships** and deliverables displayed in the **Client Portal**.
- Record outcomes (`Won`, `Lost`, `Pending`) to refine future estimation models.

---

## The Delivery Lifecycle

```text
Client (Relationships)
    └─► Project / Tender (Scheduling)
            ├─► Milestones & Deadlines (Timeline / Gantt)
            ├─► Action Items & Deliverables (Task Board)
            └─► Client Portal Tracking (portal.playhousemedia.co.za)
                    └─► Outcome (Won / Completed) ──► Invoice (Billing)
```

---

## Page Navigation Guide

| Section               | Route                | What It Shows                                                     | When To Use                       |
| :-------------------- | :------------------- | :---------------------------------------------------------------- | :-------------------------------- |
| **Projects Overview** | `/projects`          | Active projects, tender pipeline summary, and workload metrics    | Starting your morning standup     |
| **Tender Pipeline**   | `/projects/list`     | All tenders with filters, risk badges, and bulk actions           | Managing tender bid schedules     |
| **Timeline View**     | `/projects/timeline` | Visual Gantt calendar showing date overlaps and deadline clusters | Planning team capacity            |
| **Task Board**        | `/projects/[id]`     | Kanban & list task management for actionable deliverables         | Daily execution & sprint planning |

---

## Risk Calculation Engine

Risk levels are dynamically computed by the system every time dates or statuses change:

| Badge         | Condition                                                      | Action Required                                               |
| :------------ | :------------------------------------------------------------- | :------------------------------------------------------------ |
| **On Track**  | Timeline is healthy; target completion is well before closing. | Continue normal work.                                         |
| **Tight**     | Target completion is within 2 days of closing deadline.        | Prioritize; assign extra review capacity.                     |
| **Start Due** | Start date has passed, but status remains `Planned`.           | Immediately assign staff and transition to `In Progress`.     |
| **At Risk**   | Target completion date has passed while still `In Progress`.   | High alert; expedite reviews or request submission extension. |
| **Overdue**   | Closing date has passed without submission.                    | Critical failure; perform post-mortem or record as cancelled. |
| **Done**      | Status is `Submitted` or `Completed`.                          | Zero risk; awaiting outcome from bid committee.               |

---

## Date Auto-Calculation Logic

```text
Start Date = Closing Date - Effort Days - Buffer Days (default 2 days)
Target Completion = Start Date + Effort Days
```

_Example_: If a tender closes on 25 October, estimated effort is 7 days, and buffer is 2 days:

- **Start Date**: 16 October
- **Target Completion**: 23 October (providing 2 clear buffer days before submission)
