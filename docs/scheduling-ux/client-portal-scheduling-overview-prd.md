# PRD — Client Portal: Scheduling Overview Page

**Route:** `/scheduling` (Client Portal)  
**Status:** Draft  
**Target Audience:** Portal Clients (Read-Only)  

---

## 1. Objective
The **Scheduling Overview Page** is the client's operational dashboard. It provides an immediate, high-level summary of all their active tenders, what the PMG team is working on right now, what is coming up next, and any blockers requiring the client's attention.

---

## 2. Page Layout & Wireframe
The page follows a clean, widget-based dashboard layout:

```
+-------------------------------------------------------------------------+
| [Sub-nav: Overview | All Projects | Visual Timeline]                    |
|                                                                         |
|  +------------------+  +------------------+  +------------------+       |
|  | Active Projects  |  | Next Closing     |  | Pending Actions  |       |
|  |       3          |  |   15 Jul 2026    |  |       1          |       |
|  +------------------+  +------------------+  +------------------+       |
|                                                                         |
|  +--------------------------------+  +--------------------------------+ |
|  | ⚡ Currently Working On        |  | 📅 Upcoming Milestones (Queue) | |
|  | "TES-INV-2026-019"             |  | 1. "TES-INV-2026-017"          | |
|  | Progress: [======----] 60%     |  |    Starts: 10 Jul 2026         | |
|  | Closes: 15 Jun 2026 (Overdue)  |  | 2. "TES-INV-2026-016"          | |
|  |                                |  |    Starts: 18 Jul 2026         | |
|  | [!] Action Required:           |  |                                | |
|  | Awaiting client's CV.          |  |                                | |
|  +--------------------------------+  +--------------------------------+ |
|                                                                         |
|  +--------------------------------------------------------------------+ |
|  | ⚠️ Action Required (Blockers)                                      | |
|  | • "TES-INV-2026-019" — Awaiting Key Personnel CVs                  | |
|  +--------------------------------------------------------------------+ |
+-------------------------------------------------------------------------+
```

---

## 3. Detailed Component Specifications

### 3.1 KPI Summary Cards
A row of three compact, dark-mode cards:
- **Active Projects**: Count of tenders with status `planned` or `in_progress`.
- **Next Closing**: Date of the nearest upcoming tender deadline (excluding `completed` and `submitted`).
- **Pending Actions**: Count of active blockers assigned to the client.

### 3.2 "Currently Working On" Card (Hero Card)
Shows the single tender that is currently `in_progress`.
- **Tender Reference**: Bold title.
- **Client-Friendly Progress Bar**: Renders a glowing green progress bar showing the percentage of completed checklist items.
- **Deadline Indicators**: Displays the closing date and a relative time counter (e.g., `5 days remaining`, `Closing today`, or `Overdue by 2 days` in red).
- **Blocker Alert**: If there is an active blocker, it displays an amber alert box inside this card highlighting what document/info the client needs to provide.

### 3.3 "Upcoming Milestones" Card (Queue)
A read-only list of tenders in the `planned` state, sorted by their scheduled start date.
- Shows the next 3 planned tenders.
- Displays the tender reference, scheduled start date, and estimated effort (e.g., `5 days effort`).
- Clicking an item opens a read-only drawer showing its planned details (without editing capabilities).

### 3.4 "Action Required" (Blockers Panel)
This panel is only visible if there are active blockers.
- Groups all outstanding blockers across all the client's tenders.
- Renders as a warning card with a list of actionable items (e.g., `Please upload the Pricing Schedule for TES-INV-2026-019`).

---

## 4. Security & Data Isolation
- Enforce `clientId = session.clientId` on all database queries.
- If the logged-in user is an admin impersonating a client, use the `impersonate_client_id` cookie to filter the data.
