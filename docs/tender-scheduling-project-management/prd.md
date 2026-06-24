# Tender Scheduling — Product Requirements Document

## User Roles

| Role | Description | Permissions |
|---|---|---|
| **Admin (Jacob)** | Primary user. Manages tender preparation for Tender Edge Solutions. Creates, updates, and tracks tenders. | Full CRUD, reorder queue, mark complete/submitted. |

*Note: MVP targets a single-user workflow. Permission level is implicit (only the logged-in admin user can access).*

## Core User Stories

### US-01: Capture a tender
> *As Jacob, I want to add a new tender to my schedule so I know I have work coming up.*

**Acceptance Criteria:**
- I can enter: client name, tender number/description, closing date, estimated effort (days), and optional notes.
- The tender is created with status `planned` and an auto-computed start date and target completion date.
- The tender appears in the schedule list immediately after creation.

### US-02: See my current workload
> *As Jacob, I want to see a "current workload" view that shows what I am working on now and what is coming next.*

**Acceptance Criteria:**
- The view shows at most 1–2 tenders in `in_progress` status.
- The next `planned` tender in the queue is shown below the current work.
- Empty states are shown when there are no active or upcoming tenders.

### US-03: Update tender progress
> *As Jacob, I want to move a tender through statuses (planned → in_progress → completed → submitted) so I can track where I am.*

**Acceptance Criteria:**
- Status transitions are restricted to valid paths.
- Moving a tender to `in_progress` when another tender is already in progress shows a warning about WIP limits.
- Moving to `completed` marks the actual completion date.
- Moving to `submitted` marks the submission date.

### US-04: See deadline risk
> *As Jacob, I want visual indicators that show when a tender is at risk of missing its closing date.*

**Acceptance Criteria:**
- If today is past the recommended start date but the tender is still `planned`, show a "start overdue" warning.
- If the target completion date is within 2 days of the closing date (or past it), show a "tight buffer" or "at risk" warning.
- If two or more tenders have overlapping active periods, show a "workload overlap" warning.
- Warnings use the existing design system (Badge variants: warning/amber, destructive/red, secondary/green).

### US-05: Record outcome after submission
> *As Jacob, I want to mark a tender as Won, Lost, or Pending after submission so I can keep a record.*

**Acceptance Criteria:**
- After submitting a tender, I can set the outcome: Won, Lost, or Pending.
- The outcome field is visible in the schedule table.
- Outcome does not affect scheduling logic — it is purely informational.

### US-06: Track actual effort
> *As Jacob, I want to record how many days a tender actually took so I can improve my future estimates.*

**Acceptance Criteria:**
- When completing a tender, I can optionally enter the actual days spent.
- The actual effort field is visible in the tender detail/edit view.
- Actual effort is not used for scheduling calculations — purely for reference.

### US-07: Add structured blockers
> *As Jacob, I want a separate field for blockers so I can track what's holding up progress.*

**Acceptance Criteria:**
- The tender form has a separate "Blockers" textarea alongside "Notes."
- Blockers are displayed in the workload card when present.

### US-08: Delete or cancel a tender
> *As Jacob, I want to cancel or remove a tender from my schedule if it is no longer relevant.*

**Acceptance Criteria:**
- A cancelled/removed tender is moved to `cancelled` status (not hard-deleted).
- Cancelled tenders are hidden from the active schedule but visible in a filterable list.

### US-09: Edit schedule details
> *As Jacob, I want to update any schedule field (effort, dates, notes, status) if things change.*

**Acceptance Criteria:**
- All fields are editable after creation.
- Updating effort, start date, or closing date recalculates warnings and dependent dates.

## Functional Requirements

### F-01: Tender Schedule CRUD
| ID | Requirement | Priority |
|---|---|---|
| F-01.1 | Create a new tender schedule entry with: client (linked to existing clients table — must select from existing records), tender reference, closing date, estimated effort (days), priority, notes, blockers | P0 |
| F-01.2 | Read/List all tender schedule entries with filtering and sorting | P0 |
| F-01.3 | Update any field on a tender schedule entry | P0 |
| F-01.4 | Soft-delete (cancel) a tender schedule entry | P1 |

### F-02: Status Management
| ID | Requirement | Priority |
|---|---|---|
| F-02.1 | Statuses: `planned` → `in_progress` → `completed` → `submitted` (with `cancelled` as a terminal state) | P0 |
| F-02.2 | Validate status transitions (no skipping from `planned` to `submitted`) | P1 |
| F-02.3 | Auto-set `started_at` when moving to `in_progress` | P1 |
| F-02.4 | Auto-set `completed_at` when moving to `completed` | P1 |
| F-02.5 | Auto-set `submitted_at` when moving to `submitted` | P1 |

### F-03: Date Calculations
| ID | Requirement | Priority |
|---|---|---|
| F-03.1 | Auto-calculate `target_completion_date` as `start_date + effort_days` (excluding weekends optionally — keep simple: calendar days) | P1 |
| F-03.2 | Auto-calculate recommended `start_date` as `closing_date - effort_days - buffer_days` | P1 |
| F-03.3 | Allow manual override of start date and target completion date | P1 |
| F-03.4 | Default buffer: 2 days (global fixed default, not configurable per tender) | P1 |

### F-04: Warnings and Risk Indicators
| ID | Requirement | Priority |
|---|---|---|
| F-04.1 | Show "start overdue" warning if today > recommended start date and status is `planned` | P1 |
| F-04.2 | Show "tight buffer" warning if target completion date is within 2 days of closing date | P1 |
| F-04.3 | Show "overdue" warning if today > closing date and status is not `submitted` or `completed` | P1 |
| F-04.4 | Show "workload overlap" warning if 2+ tenders have overlapping `in_progress` periods | P2 |
| F-04.5 | Priority ordering: urgent > high > normal > low, then by closing date ascending within tier | P1 |

### F-05: UI/Data Views
| ID | Requirement | Priority |
|---|---|---|
| F-05.1 | Current Workload card — shows what's in progress now | P0 |
| F-05.2 | Tender Schedule table — all active tenders with sorting (includes outcome column) | P0 |
| F-05.3 | Timeline/Gantt-style visualisation — simplified horizontal bar view | P2 |
| F-05.4 | Queue view — list of planned tenders sorted by priority (urgent > high > normal > low), then by closing date ascending | P1 |

### F-06: Additional Fields
| ID | Requirement | Priority |
|---|---|---|
| F-06.1 | Actual effort (days) — optional, filled on completion | P1 |
| F-06.2 | Structured blockers field — separate from notes | P1 |
| F-06.3 | Outcome tracking — Won / Lost / Pending after submission | P1 |

## Non-Functional Requirements

| ID | Requirement | Priority |
|---|---|---|
| NFR-01 | The feature must use the existing PMG Hub design system (shadcn/ui components, same layout patterns) | P0 |
| NFR-02 | All pages must be responsive and usable on mobile | P1 |
| NFR-03 | Page load time must be < 2s for the schedule list view | P1 |
| NFR-04 | Data is stored in PostgreSQL via Drizzle ORM (existing pattern) | P0 |
| NFR-05 | Server Actions must be used for all mutations (existing pattern) | P0 |
| NFR-06 | Navigation is added via the existing `nav-data.ts` single source of truth | P0 |

## Acceptance Criteria Summary

| Scenario | Criterion |
|---|---|
| Create tender | Form validates required fields, must select an existing client, tender appears in list |
| View workload | Current in-progress tender is prominently displayed |
| Status transition | Valid transitions work, invalid ones are blocked |
| Deadline warnings | Warnings appear based on real-time date comparisons |
| Overlap detection | Visual warning when WIP limit exceeds 2 with overlapping dates |
| Outcome tracking | Won/Lost/Pending can be set after submission |
| Actual effort | Days can be recorded when completing a tender |
| Queue ordering | Urgent and high priority tenders appear first, then by closing date |
| Responsive | All pages usable at 375px width (desktop primary) |
| Data persistence | Refresh preserves state, dates are stored in correct timezone (SAST) |
