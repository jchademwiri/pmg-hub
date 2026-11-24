# Product Requirements Document (PRD): Personal Leave Tracker (`pmg-hub/leave`)

**Version:** 1.1 (Updated to Match Final Prototype)  
**Target Platform:** `pmg-hub` Monorepo (Next.js App Router, Drizzle ORM, Neon Postgres, Tailwind CSS, Bun)  
**Route:** `/leave`  
**Owner:** Jacob Chademwiri  
**Date:** November 20, 2026  

---

## 1. Purpose & Scope
A single-user personal leave management module embedded inside `pmg-hub` at `/leave`. It allows the user to plan future leave, log past/taken leave, monitor real-time balances across all three South African statutory and company leave types in compact cards, track February 28 carry-over forfeiture risk, and view an integrated, sticky South African Public Holidays calendar so holiday-bridging opportunities and non-deductible dates are visible at a glance.

### Out of Scope (MVP)
* Multi-user/team approval workflows, HR admin views, or role-based permissions.
* Half-day (`0.5`) leave entries or weekend/shift overrides.
* Historical backfilling prior to the October 31, 2026 anchor date.
* Payroll integration or payslip PDF export.

---

## 2. User Persona & Baseline Configuration

### Primary User
* **User:** Jacob Chademwiri (Single authenticated owner of `pmg-hub`).
* **Employment Start Date:** 1 January 2022.
* **Work Schedule:** Monday – Friday (5-day workweek), whole integer days only (`1`, `2`, `3`...).
* **Balance Anchor Date:** 31 October 2026.

### Pre-Seeded Baseline Parameters (Configurable via Settings Modal)
| Parameter | Default Value | Rule / Governance |
| :--- | :--- | :--- |
| **Annual Leave Opening Balance** | `16.50` days | Verified balance as of 31 October 2026 |
| **Annual Monthly Accrual** | `1.75` days/month | `21` days/year, credited on the 1st of each month |
| **Annual Financial Year End** | `28 February` (`29 Feb` leap years) | Cycle runs `1 March – 28/29 February` |
| **Annual Carry-Over Cap** | `5` days maximum | Unbooked excess forfeits on 1 March; **pre-booked (`PLANNED`) leave for dates after 28 Feb is exempt and preserved** |
| **Sick Leave Cycle Start** | `1 January 2025` | SA BCEA 36-month cycle (`1 Jan 2025 – 31 Dec 2027`, Cycle 2 since Jan 2022 hire) |
| **Sick Leave Opening Balance** | `25` days | `30` days statutory allowance minus `5` days already taken in 2026 |
| **Family Responsibility Opening** | `0` days | `3` days per 12-month cycle (resets to `3` days on 1 January) |

---

## 3. Core Functional Requirements

### FR-1: Always-Visible Compact Balance Cards
The `/leave` view displays three compact, high-density balance cards at the top of the primary workspace at all times, updating immediately whenever an entry is added, converted from `PLANNED` to `TAKEN`, or deleted.

1. **Annual Leave Card:**
   * **Primary Metric:** `Available Now` (`Opening Balance 16.50 + Accrued Months Since Oct 2026 × 1.75 − Taken Days`, showing `18.25` days in November 2026) with `+1.75 d/mo` accrual pill.
   * **Compact 3-Column Metric Strip:**
     * `FY Plan`: Planned days on or before `28 Feb 2027`.
     * `Post-Feb`: Planned days after `28 Feb 2027` (protected from carry-over forfeiture).
     * `28 Feb`: Projected balance at financial year-end.
   * **Carry-Over Forfeiture Alert:** Displays a compact amber alert banner whenever `Projected Feb 28 Balance − 5 days − Post-Feb Planned Days > 0`, stating the exact number of days at risk unless booked in advance.
2. **Sick Leave Card (`BCEA 36-Mo`):**
   * **Primary Metric:** `Remaining / 30 days left` (`25` days remaining).
   * **Compact 2-Column Metric Strip:** `2026 Taken` (`5 d`) and `Planned` (`0 d`), plus footer showing active cycle (`Jan 2025 – Dec 2027`).
3. **Family Responsibility Card (`3 Days / Yr`):**
   * **Primary Metric:** `Remaining days left` (`0` days in 2026).
   * **Compact 2-Column Metric Strip:** `2026 Taken` (`0 d`) and `2027 Plan` (`0 d`), plus footer showing next reset (`01 Jan 2027 (+3 d)`).

### FR-2: Leave Entry Logging (`Planned` vs. `Taken` Date Direction Rules)
Users log entries via a unified form with a **Planned (Future)** / **Taken (Back-Date)** mode toggle that enforces strict temporal validation:
* **Status Date Direction Constraints:**
  * **Planned (`PLANNED`):** Accepts **future dates only** (`start_date > today` and `end_date > today`). Past or current dates are blocked in the date picker and rejected by validation.
  * **Taken (`TAKEN`):** Accepts **current or past/back dates only** (`start_date <= today` and `end_date <= today`). Future dates are blocked in the date picker and rejected by validation.
  * Switching between `Planned` and `Taken` automatically updates `min`/`max` date constraints and clears incompatible dates.
* **Leave Type:** `ANNUAL`, `SICK`, or `FAMILY_RESPONSIBILITY`.
* **Real-Time Working Day Preview:** Calculates exact deductible working days (Monday–Friday, excluding South African public holidays) before submission, explicitly listing any excluded SA public holidays inside the chosen range.
* **Notes:** Optional text field (e.g., *"Festive break"*, *"Manica Bridge trip"*).
* **Validation:** Rejects entries with `0` working days (weekends or public holidays only) and enforces whole integer day counts (`>= 1`).

### FR-3: Leave Schedule & History Table (`Mark Taken` Eligibility Rule)
A filterable table (`All`, `Planned`, `Taken`) displaying all logged entries sorted chronologically (newest first):
* **Date-Gated `"Mark Taken"` Action:**
  * The **"Mark Taken"** button **only renders and executes** on `PLANNED` entries whose `start_date` is on or before the current date (`start_date <= today`).
  * Future `PLANNED` entries (`start_date > today`) hide the **"Mark Taken"** button until their start date arrives, preventing premature conversion of future bookings.
* **Delete Action:** Removes any entry and immediately recalculates all balances and February 28 forfeiture projections.

### FR-4: Sticky South African Public Holidays Sidebar
The `/leave` workspace features a **2-column desktop split (`8 cols` primary left / `4 cols` sticky right)** where the **SA Public Holidays** panel starts at the top of the workspace and remains pinned (`sticky top-20`) while scrolling:
* **No Internal Scrollbar:** Renders cleanly in natural page flow without nested scrollbars.
* **Next Upcoming Holiday Highlight:** Displays a prominent banner at the top of the card showing the next upcoming holiday, full date, and day countdown (e.g., *"In 26 days — Day of Reconciliation, Wednesday, 16 December 2026"*).
* **Progressive Disclosure (`Next 10` + `Show All`):**
  * Displays the **next 10 upcoming holidays** by default to keep the sticky sidebar compact.
  * Includes a **"Show All (N more)" / "Show Next 10 Only"** toggle button at the bottom of the card to expand or collapse the full 2026–2027 statutory holiday list.
* **Statutory Rules & Bridge Hints:**
  * Computes all 12 South African statutory holidays per year (including Easter-linked *Good Friday* and *Family Day*, plus the **Public Holidays Act Monday-observance rule** when a fixed holiday falls on a Sunday).
  * Displays a **`Bridge`** badge on Tuesday and Thursday holidays where taking 1 leave day creates a 4-day long weekend.

### FR-5: Configurable Settings Modal
Accessible from the top header **Settings** button, allowing updates to:
* `31 Oct Annual Balance` (`16.50`), `Monthly Accrual` (`1.75`), `Max Feb 28 Carry-Over` (`5`), `Sick Remaining (of 30)` (`25`), and `Family Resp. (2026)` (`0`), plus a one-click **Reset to Oct 31 Baseline** option.

---

## 4. Data Model (Drizzle ORM / PostgreSQL)

### Table 1: `leave_settings` (Single-Row Configuration)
| Column | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `id` | `serial` (PK) | Auto | Primary key |
| `employment_start_date` | `date` | `'2022-01-01'` | Hire date reference |
| `anchor_date` | `date` | `'2026-10-31'` | Date of verified opening balances |
| `annual_opening_balance` | `numeric(5,2)` | `'16.50'` | Annual balance on anchor date |
| `annual_monthly_accrual` | `numeric(4,2)` | `'1.75'` | Monthly accrual rate |
| `annual_max_carry_over` | `integer` | `5` | Unbooked carry-over cap on Feb 28 |
| `sick_cycle_start_date` | `date` | `'2025-01-01'` | Start of active 36-month BCEA cycle |
| `sick_cycle_entitlement` | `integer` | `30` | Statutory 36-month allowance |
| `sick_opening_balance` | `integer` | `25` | Remaining sick days on anchor date |
| `family_opening_balance` | `integer` | `0` | Remaining family days on anchor date |
| `family_annual_entitlement`| `integer` | `3` | Annual BCEA family leave allowance |
| `family_reset_month` | `integer` | `1` | Month family leave resets (`1` = Jan) |
| `updated_at` | `timestamp` | `now()` | Last modification timestamp |

### Table 2: `leave_entries`
| Column | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `id` | `serial` (PK) | Auto | Primary key |
| `type` | `enum` | Required | `'ANNUAL' \| 'SICK' \| 'FAMILY_RESPONSIBILITY'` |
| `status` | `enum` | `'PLANNED'` | `'PLANNED' \| 'TAKEN' \| 'CANCELLED'` |
| `start_date` | `date` | Required | First day of leave (`YYYY-MM-DD`); must be `> today` for `PLANNED` or `<= today` for `TAKEN` |
| `end_date` | `date` | Required | Last day of leave (`YYYY-MM-DD`); must be `>= start_date` |
| `days_count` | `integer` | Required | Whole working days (excl. weekends & SA holidays) |
| `notes` | `text` | `null` | Optional context or reason |
| `created_at` | `timestamp` | `now()` | Record creation timestamp |
| `updated_at` | `timestamp` | `now()` | Record update timestamp |

---

## 5. Business Logic & Validation Rules

1. **Working Days Calculation (`calculateWorkingDays`):**
   * Iterate inclusively from `start_date` to `end_date` in UTC.
   * Exclude Saturdays (`day === 6`) and Sundays (`day === 0`).
   * Exclude any date matching the South African Public Holiday set for that calendar year (including Monday observance if a fixed holiday falls on Sunday).
2. **Annual Accrual (`completedMonthsSinceAnchor`):**
   * On the 1st of each month after `October 2026`, increment `completedMonthsSinceAnchor` by `1`.
   * `Available_Now = Opening_Balance + (completedMonthsSinceAnchor × 1.75) − Taken_Annual_Days`.
3. **February 28 Carry-Over & Protection Logic:**
   * Let `FY_End` be `28 February` (or `29 February` in leap years).
   * `Projected_FY_End_Balance = Available_Now + (Remaining_Months_To_Feb × 1.75) − Planned_Annual_On_Or_Before_Feb_28`.
   * `At_Risk_Of_Forfeiture = max(0, Projected_FY_End_Balance − 5 − Planned_Annual_After_Feb_28)`.
4. **Temporal & Lifecycle Guards:**
   * `PLANNED` creation requires `start_date > today && end_date > today`.
   * `TAKEN` creation requires `start_date <= today && end_date <= today`.
   * Transitioning `PLANNED -> TAKEN` ("Mark Taken") requires `entry.start_date <= today`.

---

## 6. Acceptance Criteria & Verification
1. Opening `/leave` seeds `leave_settings` with `16.50` Annual, `25` Sick, and `0` Family Responsibility as of `2026-10-31`, displaying `18.25` Annual days available in November 2026 inside compact summary cards.
2. Selecting **Planned (Future)** restricts the date picker to dates strictly after today; selecting **Taken (Back-Date)** restricts the date picker to dates on or before today.
3. Selecting a date range spanning `16 December 2026` (Day of Reconciliation) deducts `0` days for that date and notes the excluded holiday in the form preview.
4. Logging `PLANNED` Annual Leave for dates after `28 Feb 2027` reduces `At Risk of Forfeiture` on `28 Feb 2027` without deducting from the `5`-day unbooked carry-over cap.
5. The **"Mark Taken"** button only appears on `PLANNED` rows whose `start_date` is today or in the past, remaining hidden for future `PLANNED` bookings.
6. The **SA Public Holidays** card stays pinned (`sticky`) at the top right of the desktop layout without an internal scrollbar, displaying the next 10 upcoming holidays by default with a working **Show All** toggle.