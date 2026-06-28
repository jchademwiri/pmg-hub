# PRD — Client Portal: Project List Page

**Route:** `/scheduling/list` (Client Portal)  
**Status:** Draft  
**Target Audience:** Portal Clients (Read-Only)  

---

## 1. Objective
The **Project List Page** allows the client to view the complete history of all their tenders (past, present, and upcoming). It provides search and status filtering, along with a detailed slide-over drawer to inspect the granular checklist progress of any specific project.

---

## 2. Page Layout & Wireframe
The page consists of a filter bar, a project list table, and a detailed slide-over drawer:

```
+-------------------------------------------------------------------------+
| [Sub-nav: Overview | All Projects | Visual Timeline]                    |
|                                                                         |
|  [ Search projects... ] [ Filter: All Statuses ▾ ]                      |
|                                                                         |
|  +--------------------------------------------------------------------+ |
|  | Project Reference   | Status        | Progress     | Closing Date  | |
|  +---------------------+---------------+--------------+---------------+ |
|  | TES-INV-2026-019    | In Progress   | [====---] 60%| 15 Jun 2026   | |
|  | TES-INV-2026-017    | Planned       | [-------]  0%| 28 Jun 2026   | |
|  | TES-INV-2026-016    | Completed     | [=======]100%| 06 Jun 2026   | |
|  +--------------------------------------------------------------------+ |
+-------------------------------------------------------------------------+

  SLIDE-OVER DRAWER (When clicking a row):
  +------------------------------------------+
  | TES-INV-2026-019 — Progress Details     |
  | Status: In Progress  |  Progress: 60%     |
  |                                          |
  | 📋 Document Progress                     |
  |   ✔ Document created                     |
  |   ✔ Document initialised                 |
  |   ☐ Document inked                       |
  |                                          |
  | 📁 Returnable List Progress              |
  |   ✔ Company experience completed         |
  |   ☐ Key personnel CV completed           |
  |   ☐ Pricing schedule completed           |
  +------------------------------------------+
```

---

## 3. Detailed Component Specifications

### 3.1 Search & Filter Bar
- **Search Input**: Real-time filtering by tender reference name.
- **Status Filter**: Dropdown to filter by `Planned`, `In Progress`, `Completed`, `Submitted`, or `Cancelled`.
- **Clear Filters Button**: Visible only when filters are active.

### 3.2 Projects Table
A responsive data table displaying:
- **Project Reference**: Bold title.
- **Status**: Renders the client-friendly `TenderStatusBadge` (read-only, no chevron or dropdown).
- **Progress**: Renders the percentage and a mini progress bar.
- **Closing Date**: Formatted date (e.g., `15 Jun 2026`).
- Clicking on any row opens the **Progress Details Drawer**.

### 3.3 Progress Details Drawer (Slide-Over)
A slide-over panel that opens from the right side of the screen:
- **Header**: Shows the project name, status badge, and progress bar.
- **Checklist Sections**: Renders the custom sections (e.g., "Document Progress") and their checklist items.
- **Completed Items**: Displayed with a green checkmark icon and line-through text.
- **Pending Items**: Displayed with an empty checkbox icon and regular text.
- **Blockers Callout**: If the project has active blockers, they are listed at the top of the drawer in a warning banner.

---

## 4. Security & Data Isolation
- The API route `/api/portal/projects` must validate the client's session and restrict results to `clientId = session.clientId`.
- The slide-over drawer fetches checklist items from `/api/portal/projects/[id]/checklist` which must also verify that the requested project belongs to the authenticated client.
