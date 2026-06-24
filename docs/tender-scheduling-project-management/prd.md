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

### US-05: Delete or cancel a tender
> *As Jacob, I want to cancel or remove a tender from my schedule if it is no longer relevant.*

**Acceptance Criteria:**
- A cancelled/removed tender is moved to `cancelled` status (not hard-deleted).
- Cancelled tenders are hidden from the active schedule but visible in a filterable list.

### US-06: Edit schedule details
> *As Jacob, I want to update any schedule field (effort, dates, notes, status) if things change.*

**Acceptance Criteria:**
- All fields are editable after creation.
- Updating effort, start date, or closing date recalculates warnings and dependent dates.

## Functional Requirements

### F-01: Tender Schedule CRUD
| ID | Requirement | Priority |
|---|---|---|
| F-01.1 | Create a new tender schedule entry with: client (free-text or linked to clients table), tender reference, closing date, estimated effort (days), priority flag, notes | P0 |
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
| F-03.4 | Default buffer: 2 days (configurable per tender) | P2 |

### F-04: Warnings and Risk Indicators
| ID | Requirement | Priority |
|---|---|---|
| F-04.1 | Show "start overdue" warning if today > recommended start date and status is `planned` | P1 |
| F-04.2 | Show "tight buffer" warning if target completion date is within 2 days of closing date | P1 |
| F-04.3 | Show "overdue" warning if today > closing date and status is not `submitted` or `completed` | P1 |
| F-04.4 | Show "workload overlap" warning if 2+ tenders have overlapping `in_progress` periods | P2 |

### F-05: UI/Data Views
| ID | Requirement | Priority |
|---|---|---|
| F-05.1 | Current Workload card — shows what's in progress now | P0 |
| F-05.2 | Tender Schedule table — all active tenders with sorting | P0 |
| F-05.3 | Timeline/Gantt-style visualisation — simplified horizontal bar view | P2 |
| F-05.4 | Queue view — list of planned tenders in priority order | P1 |

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
| Create tender | Form validates required fields, tender appears in list |
| View workload | Current in-progress tender is prominently displayed |
| Status transition | Valid transitions work, invalid ones are blocked |
| Deadline warnings | Warnings appear/disappear based on real-time date comparisons |
| Overlap detection | Visual warning when WIP limit exceeds 2 with overlapping dates |
| Responsive | All pages usable at 375px width |
| Data persistence | Refresh preserves state, dates are stored in correct timezone (SAST) |
