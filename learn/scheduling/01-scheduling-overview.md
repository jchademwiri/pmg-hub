# 1. Scheduling Overview

> Scheduling helps you plan, track, and manage tender submissions so deadlines are never missed.

## What Scheduling Is For

Use Scheduling to:

- Plan tender work before the closing date
- Auto-calculate start dates based on effort and buffer days
- Track progress through stages: Planned → In Progress → Completed → Submitted
- Identify at-risk and overdue tenders at a glance
- Manage workload by reordering the priority queue
- Record outcomes (won / lost / pending) and actual effort for future estimates

## How Scheduling Connects To The Business

```text
Client -> Tender -> Schedule -> Track -> Outcome -> Invoice
```

Tenders are linked to clients from the **Relationships** module. A tender that is **won** typically leads to an invoice in **Billing**. The effort estimates and actuals help you improve future planning.

## Scheduling vs Billing

| Concept | Scheduling | Billing |
|---------|-----------|---------|
| What it tracks | Tender deadlines, effort, risk | Quotes, invoices, payments |
| Statuses | Planned → In Progress → Completed → Submitted | Draft → Issued → Paid / Overdue |
| Outcome | Won / Lost / Pending | Paid / Written off |
| Division | Affects which team owns the tender | Affects document numbers and branding |

## Page Guide

| Page | What It Shows | Use It When |
|------|---------------|-------------|
| **Overview** (Dashboard) | Current workload, at-risk tenders, upcoming deadlines | Starting your day |
| **List** | All tenders with filters, bulk actions, risk badges | Managing the full pipeline |
| **Timeline** | Visual calendar view of all active tenders | Checking date overlaps |

---

## Key Concepts

### Tender Statuses

```text
Planned ──► In Progress ──► Completed ──► Submitted
   │             │               │
   └── Cancelled └── Cancelled   └── Cancelled
                                  Submitted ──► Planned (reopen)
```

| Status | Meaning |
|--------|---------|
| **Planned** | Tender is identified and scheduled but not started yet |
| **In Progress** | Work on the tender response has begun |
| **Completed** | Response is finished and ready for review |
| **Submitted** | Tender has been submitted to the client |
| **Cancelled** | Tender was abandoned or won't be pursued |

### Risk Levels

The system calculates risk automatically based on dates and status:

| Badge | Meaning |
|-------|---------|
| **On Track** | All dates are healthy |
| **Tight** | Target completion is within 2 days of closing |
| **Start Due** | Start date has passed but status is still Planned |
| **At Risk** | Target completion has passed but still In Progress |
| **Overdue** | Closing date has passed and not yet submitted |
| **Done** | Submitted or Completed — no risk |
| **Cancelled** | Tender is no longer active |

### Date Auto-Calculation

When you create a tender:

```text
Start Date = Closing Date - Effort Days - Buffer Days
Target Completion = Start Date + Effort Days
```

- **Effort Days**: How many working days the tender will take
- **Buffer Days**: Extra padding (default 2) before the closing date
- **Start Date**: Auto-calculated, but you can override it manually
- **Target Completion**: Auto-calculated read-only field

Example: Closing date is 14 July, effort is 5 days, buffer is 2 days:

```text
Start = 14 July - 5 - 2 = 7 July
Target Completion = 7 July + 5 = 12 July
```
