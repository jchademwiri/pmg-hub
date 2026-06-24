# 2. Creating And Editing Tenders

> Learn how to add new tenders to your schedule and update them as work progresses.

## Creating A New Tender

1. Navigate to **Scheduling → List**
2. Click **"Add to Schedule"** to open the new tender dialog
3. Fill in the form fields:

### Required Fields

| Field | What To Enter |
|-------|---------------|
| **Client** | Select the client from the dropdown. Only clients from **Relationships** appear here. |
| **Tender Reference** | A unique identifier for the tender, e.g. `T12/2026` or `RFP-2026-042` |
| **Closing Date** | The deadline for submission — this drives all date auto-calculations |
| **Effort (days)** | How many working days you estimate the tender response will take |
| **Start Date** | Auto-calculated from closing date − effort − buffer. You can override this manually. |

### Optional Fields

| Field | What It's For |
|-------|---------------|
| **Priority** | Urgency level: Low, Normal (default), High, or Urgent |
| **Division** | Which team owns the tender. Leave as "Default division" to auto-detect from the client. |
| **Buffer Days** | Extra padding before closing (default 2). More buffer = earlier start date. |
| **Notes** | Requirements, special instructions, or key details about the tender |
| **Blockers** | Any issues that could delay progress |

### Date Auto-Calculation

As soon as you enter a closing date and effort days, the system calculates:

```text
Start Date = Closing Date − Effort Days − Buffer Days
Target Completion = Start Date + Effort Days
```

These dates update live as you type. You can override the start date manually — click into the Start Date field and the auto-calculation stops, letting you set your own date. The Target Completion is always read-only.

**Example:** A tender closing on 14 July with 5 days of effort and 2 days buffer:

```text
Start = 14 Jul − 5 − 2 = 7 Jul
Target Completion = 7 Jul + 5 = 12 Jul
```

### Completing The Creation

4. Click **"Add to Schedule"** to save
5. The tender appears in the list with status **Planned**
6. A success toast confirms the tender was added

---

## Finding Tenders

Once tenders are created, use the **List** page to find them:

| Filter | What It Does |
|--------|--------------|
| **Search** | Type a client name or reference to narrow results |
| **Status** | Filter by Planned, In Progress, Completed, Submitted, or Cancelled |
| **Priority** | Filter by Urgent, High, Normal, or Low |
| **Date** | Filter by Overdue, This Week, This Month, or Future |
| **Clear** | Reset all filters with one click |

---

## Editing A Tender

Click the pencil icon (✏️) next to any tender in the List to open the edit dialog.

The edit dialog has two tabs:

### Details Tab

Change the core tender information:

- **Client** — Changing the selection updates the state immediately
- **Tender Reference**, **Closing Date**, **Effort Days**, **Start Date**
- **Buffer Days**, **Priority**
- **Division** — Remembers your selection even when switching tabs

Click **"Save Changes"** to apply updates.

### Tracking & Outcome Tab

Record progress and results:

| Field | What To Enter |
|-------|---------------|
| **Actual Effort (days)** | How many days it actually took (useful for future estimates) |
| **Outcome** | Won, Lost, or Pending |
| **Notes** | Observations and learnings from this tender |
| **Blockers** | Issues that delayed progress |

The tracking tab also shows the current **status badge** so you know where the tender is at a glance.

---

## Changing Status

Use the **List** page to change a tender's status:

1. Find the tender in the list
2. Use the status buttons or dropdown to transition to the next stage
3. Available transitions depend on the current status:

| Current Status | Can Transition To |
|----------------|-------------------|
| **Planned** | In Progress, Cancelled |
| **In Progress** | Completed, Cancelled |
| **Completed** | Submitted, Cancelled |
| **Submitted** | Planned (reopen if needed) |
| **Cancelled** | — (dead end) |

---

## Cancelling A Tender

1. Find the tender in the List
2. Click **"Cancel"** in the Actions column
3. Confirm in the dialog that appears
4. The tender's status changes to **Cancelled** and it becomes dimmed in the list

---

## Deleting vs Cancelling

| Action | What Happens | When To Use |
|--------|-------------|-------------|
| **Cancel** | Status changes to cancelled; data is preserved | Tender is abandoned or won't be pursued |
| **Delete** (bulk) | Permanently removes cancelled tenders | Cleaning up old data |

Only already-cancelled tenders can be permanently deleted. Use the bulk action bar after selecting multiple tenders.
