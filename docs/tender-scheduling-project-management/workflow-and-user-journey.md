# Workflow & User Journey — Tender Scheduling

## Current Manual Workflow (Excel-Based)

Based on the "Tender Schedule Timetable.xlsx" spreadsheet, the current manual workflow is:

### Spreadsheet Structure
The Excel file captures tender scheduling using the following columns:

| Field | Description |
|---|---|
| **Client** | Name of the client requesting the tender |
| **Tender Number** | Reference number or description of the tender opportunity |
| **Closing Date** | The hard deadline when the tender must be submitted |
| **Effort** | Estimated number of days required to complete the preparation |
| **Duration** | The total calendar duration (may account for weekends or non-working days) |
| **Start Date** | When Jacob plans to begin working on this tender |
| **End Date** | When Jacob expects to complete the preparation (before or on the closing date) |

### Current Process Flow

```
1. IDENTIFY
   └── Tender opportunity found → entered into spreadsheet
       (Client, Tender Number, Closing Date)

2. ESTIMATE
   └── Jacob assesses requirements → estimates effort in days
       (Effort, Duration entered)

3. SCHEDULE
   └── Jacob picks a start date based on current workload and closing date
       (Start Date, End Date entered)

4. EXECUTE
   └── Jacob works on the tender (outside the spreadsheet)
       * Spreadsheet is not updated mid-preparation *

5. SUBMIT
   └── Tender is submitted before closing date
       * No formal "completed" or "submitted" tracking in spreadsheet *

6. REVIEW (if needed)
   └── Jacob may manually check the spreadsheet for:
       - Upcoming deadlines
       - Whether to accept or decline new tenders
```

### Problems with the Current Workflow

1. **No status tracking** — The spreadsheet has no status column. There's no way to distinguish planned tenders from in-progress or completed ones without looking at dates.
2. **No WIP awareness** — There's no enforcement or visual cue when too many tenders overlap.
3. **No deadline risk detection** — Without automatic calculations, Jacob must manually check if a tender is at risk.
4. **No "current workload" view** — You can't glance at the sheet and immediately see "what am I working on now?"
5. **Manual date calculations** — Start/end dates, duration, and effort are all manually entered; there's no auto-computation of the recommended start date based on closing date - effort.
6. **No integration with PMG Hub** — The schedule lives in a separate Excel file, disconnected from clients, billing, and other business data in PMG Hub.
7. **No audit trail** — When was a tender started? Submitted? Cancelled? The spreadsheet only shows planned vs. actual dates with no status history.

## Proposed App Workflow

### Lifecycle States

```
planned ──→ in_progress ──→ completed ──→ submitted
   │                              │
   └──→ cancelled                 └──→ (terminal)
```

| Status | Meaning |
|---|---|
| `planned` | Tender has been captured and is in the queue awaiting work |
| `in_progress` | Jacob has started working on this tender |
| `completed` | Preparation work is finished (before submission) |
| `submitted` | Tender has been formally submitted on or before closing date |
| `cancelled` | Tender was withdrawn, lost, or is no longer being pursued |

### Valid Status Transitions

```
planned        → in_progress, cancelled
in_progress    → completed, cancelled
completed      → submitted, cancelled
submitted      → (terminal)
cancelled      → (terminal — can be re-entered as a new planned entry if needed)
```

### App-Enforced Rules

- A tender cannot transition directly from `planned` to `submitted` (skipping work).
- Attempting to set a second tender to `in_progress` while one is already in progress triggers a WIP warning (not a hard block — Jacob may have valid reasons for juggling two).
- Marking a tender as `completed` records the actual completion date.
- Marking as `submitted` records the submission date.
- Cancelling preserves the record for historical reference.

## Tender Scheduling Lifecycle

### From Tender Captured → Scheduled → In Progress → Completed → Submitted

```
STAGE 1: CAPTURE
─────────────────────────────────────────────────────────────────
Action:       Jacob enters tender details
Trigger:      New tender opportunity identified
User input:   Client, tender reference, closing date, 
              estimated effort (days), notes
Auto calc:    Recommended start date = closing_date - effort_days - buffer
              Target completion date = start_date + effort_days
Result:       Tender status = "planned", visible in queue

STAGE 2: SCHEDULE / QUEUE
─────────────────────────────────────────────────────────────────
Action:       Jacob reviews the queue and decides ordering
Trigger:      Reviewing the "Up Next" or schedule table
User input:   May override auto-calculated dates, set priority flag
Auto calc:    Warnings shown if:
              - Recommended start date has passed (start overdue)
              - Multiple tenders have overlapping active windows
Result:       Queue is ordered by priority then by closing date

STAGE 3: START WORK
─────────────────────────────────────────────────────────────────
Action:       Jacob starts working on a planned tender
Trigger:      Jacob clicks "Start" or changes status to in_progress
User input:   (None — system records started_at timestamp)
Auto calc:    started_at = now
              If WIP limit would be exceeded: warning displayed
Result:       Tender moves to in_progress, appears in "Now Working" card

STAGE 4: EXECUTE
─────────────────────────────────────────────────────────────────
Action:       Jacob works on tender preparation (external to app)
Trigger:      Daily work
User input:   May update notes, blockers, or adjust dates
Auto calc:    Warnings update in real-time:
              - If today > target completion: "At risk" warning
              - If today > closing date: "Overdue" warning
Result:       Warnings keep Jacob informed of deadline pressure

STAGE 5: COMPLETE
─────────────────────────────────────────────────────────────────
Action:       Jacob finishes preparation work
Trigger:      Jacob clicks "Mark Complete" or changes status
User input:   (Optional: actual effort in days)
Auto calc:    completed_at = now
Result:       Tender status = "completed"
              Next planned tender can now be started

STAGE 6: SUBMIT
─────────────────────────────────────────────────────────────────
Action:       Jacob submits the tender
Trigger:      Formal submission to client/portal
User input:   (Optional: submission notes)
Auto calc:    submitted_at = now
Result:       Tender status = "submitted" — terminal state
```

## User Journey Walkthrough

### Monday Morning — Weekly Planning

1. Jacob opens PMG Hub → navigates to "Scheduling" section.
2. The **Current Workload** card shows "1 tender in progress — ABC Tender Corp (due in 4 days)."
3. The **Up Next** queue shows 3 planned tenders sorted by closing date.
4. A warning badge on Tender B says "Start overdue — recommended start was 2 days ago."
5. Jacob decides: finish the current tender today, start Tender B tomorrow.
6. Jacob clicks the "Start" button on Tender B to confirm the plan.

### Mid-Week — New Tender Opportunity

1. A client sends a new tender opportunity with a tight closing date.
2. Jacob opens the app → clicks "New Tender" → fills in client name, reference, closing date (Friday), effort (3 days).
3. The system auto-calculates: recommended start date = Tuesday (closing - 3 effort - 2 buffer), which is today.
4. A WIP warning appears: "Starting this tender overlaps with Tender B (also in progress). Estimated completion dates compete."
5. Jacob decides to pause Tender B and start this urgent tender instead → updates Tender B status to `planned`, starts the new one.

### Friday — Deadline Day

1. Jacob opens the schedule to check status.
2. The urgent tender shows a green status: "Target completion: today ✅"
3. Jacob confirms completion, then clicks "Mark Submitted."
4. Jacob looks at the queue to decide what to work on next week.

## Key Design Decisions

| Decision | Rationale |
|---|---|
| Soft-delete (cancel status) | Preserves data for future analysis (what tenders were pursued vs. declined) |
| WIP warnings, not hard blocks | Jacob is the best judge of his own capacity; the app should inform, not restrict |
| Auto-calculated dates with manual override | Reduces manual data entry while preserving flexibility |
| Buffer days default of 2 | Provides a safety margin for unexpected delays without being overly conservative |
| Calendar-day calculations (not business days) | Simpler to implement and reason about; weekends can be accounted for in effort estimates |
