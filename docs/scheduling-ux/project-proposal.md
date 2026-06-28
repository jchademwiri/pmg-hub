# Project Proposal — Client-Facing Tender Scheduling & Progress Tracking

**Prepared For:** Playhouse Media Group (PMG)  
**Date:** 2026-06-28  
**Status:** Proposed  
**Author:** Antigravity (AI Coding Assistant)  

---

## 1. Executive Summary
Playhouse Media Group (PMG) manages complex, high-stakes tender preparations for its clients. Currently, managing these schedules is confined to the admin panel, leaving clients in the dark regarding the progress of their projects. This leads to frequent manual status updates (via email/calls) and delays in acquiring critical returnable documents from clients.

This proposal outlines a three-phase initiative to **consolidate the admin scheduling module**, **introduce granular checklist tracking**, and **expose a read-only progress dashboard and timeline directly in the Client Portal**. 

By giving clients real-time visibility into their project's progress and active blockers, we will streamline collaboration, accelerate document collection, and provide a premium, transparent customer experience.

---

## 2. The Problem Statement
1.  **Fragmented Admin UX**: The current admin scheduling module has navigation gaps, duplicate tables, and inconsistent status controls, making it harder for PMG staff to manage schedules efficiently.
2.  **No Client Visibility**: Clients have zero visibility into their tender preparation. They do not know what tasks are completed, what is currently being worked on, or how close they are to the deadline.
3.  **Inefficient Document Collection**: Gathering "returnables" (CVs, company profiles, method statements) relies on manual email follow-ups. There is no central, visual indicator of outstanding client-side blockers.

---

## 3. The Proposed Solution
We propose a structured, three-phase roadmap to enhance the scheduling module and extend it to clients:

```
+-----------------------------------------------------------------------+
|  PHASE A: Admin UX Polish                                             |
|  - Shared sub-navigation (Overview | Tenders | Timeline)              |
|  - Simplified dashboard & condensed warnings                          |
|  - Standardized status badges & timeline scroll                       |
+-----------------------------------+-----------------------------------+
                                    |
                                    v
+-----------------------------------+-----------------------------------+
|  PHASE B: Progress Checklists                                         |
|  - Custom checklist sections & items per tender                       |
|  - Dynamic progress bar calculation (e.g. 15/20 = 75%)                |
|  - Decoupled overall status (Not Started | In Progress | Completed)   |
+-----------------------------------+-----------------------------------+
                                    |
                                    v
+-----------------------------------+-----------------------------------+
|  PHASE C: Client Portal Integration                                   |
|  - Secure, read-only client dashboard (/scheduling)                   |
|  - Interactive checklist slide-over drawer                            |
|  - Simplified visual timeline (Gantt chart)                           |
+-----------------------------------------------------------------------+
```

---

## 4. Detailed Project Phases

### Phase A: Admin Scheduling UX Consolidation
*Focus: Clean up the admin scheduling experience to make it a fast, coherent control center.*
- Create a shared sub-navigation layout (`Overview | All Tenders | Timeline`).
- Remove duplicate tables from the overview and add a read-only **Upcoming Deadlines** widget.
- Group and condense the warnings panel.
- Standardize status transitions via a clickable badge dropdown.
- Enable horizontal scrolling and a clean layout on the Gantt timeline.
- Replace hand-rolled tabs in dialogs with standard shadcn components.

### Phase B: Granular Progress Checklists & Progress Bars
*Focus: Implement the data structure and admin UI to track granular tasks within each tender.*
- Extend the database schema with `tender_progress_sections` and `tender_progress_items` tables.
- Add a **"Progress" Tab** to the Tender Edit Dialog in the admin panel.
- Allow admins to create custom sections (e.g., "Document Progress", "Returnable List Progress") and add specific checklist items.
- Automatically calculate the overall progress percentage based on checked items and display it on all dashboard cards, lists, and timelines.

### Phase C: Client Portal Integration
*Focus: Expose the scheduling data to the client portal in a secure, read-only, dark-themed dashboard.*
- Add a **"Schedules" / "Project Progress"** tab to the client portal.
- **Client Overview Page**: Show active projects, next closing date, the current "In Progress" project (with a progress bar), and any active client-side blockers.
- **Project List Page**: Allow clients to view all past/present projects, complete with a slide-over drawer showing the checklist progress of each.
- **Visual Timeline**: A read-only, simplified Gantt chart showing their active project windows and closing dates.
- **Tenant Isolation**: Apply strict session-level database filters (`clientId = session.clientId`) to ensure clients can never see other clients' data.

---

## 5. Business Value & Benefits
- **Improved Client Experience**: Clients see a modern, interactive dashboard showing exactly how their projects are progressing, reinforcing PMG's professionalism.
- **Faster Project Turnaround**: Highlighting outstanding client-side documents as "Active Blockers" on their dashboard encourages faster uploads.
- **Operational Efficiency**: Reduces the time PMG staff spends writing status update emails, allowing them to focus on compiling the tenders.
- **Single Source of Truth**: All progress, timelines, and checklists are stored in a single database, eliminating out-of-sync spreadsheets.
