# PRD — Client Portal: Visual Timeline Page

**Route:** `/scheduling/timeline` (Client Portal)  
**Status:** Draft  
**Target Audience:** Portal Clients (Read-Only)  

---

## 1. Objective
The **Visual Timeline Page** provides the client with a Gantt-style visual timeline of their projects. It helps them visualize the working windows (start to target completion) and closing dates for all their active projects in a single, intuitive chart.

---

## 2. Page Layout & Wireframe
The page renders a simplified Gantt chart with a horizontal scrollbar on smaller screens:

```
+-------------------------------------------------------------------------+
| [Sub-nav: Overview | All Projects | Visual Timeline]                    |
|                                                                         |
|  Timeline Legend:   ■ Planned   ■ In Progress   ■ Completed   | Closing  |
|                                                                         |
|  +--------------------------------------------------------------------+ |
|  | Project            | Jun 01     Jun 08     Jun 15     Jun 22       | |
|  +--------------------+-----------------------------------------------+ |
|  | TES-INV-2026-019   | [=== In Progress ===].................|       | |
|  | TES-INV-2026-017   |            [====== Planned ======]....|       | |
|  |                    |                       |                       | |
|  |                    |                     Today                     | |
|  +--------------------------------------------------------------------+ |
+-------------------------------------------------------------------------+
```

---

## 3. Detailed Component Specifications

### 3.1 Timeline Header & Legend
- **Page Header**: Explains the timeline (e.g. `Bars show the preparation window; vertical lines show the submission deadline`).
- **Legend**: Colored badges indicating status colors:
  - **Planned**: Sky Blue (`bg-sky-500/70`)
  - **In Progress**: Blue (`bg-blue-600/80`)
  - **Completed / Submitted**: Emerald Green (`bg-emerald-500/60`)
  - **Closing Date**: Red vertical dashed line.

### 3.2 Gantt Chart Grid
- **X-Axis**: Represents time, divided into weekly columns covering the range of all active projects (starting 5 days before the first project's start date and ending 5 days after the last project's closing date).
- **Y-Axis**: Lists the client's active projects.
- **Preparation Bar**: A colored horizontal bar spanning from `startDate` to `targetCompletionDate`. The bar is colored according to the project's current status.
- **Closing Date Marker**: A red vertical line or icon at the `closingDate` position on the grid.
- **Today Marker**: A vertical dashed line representing the current date.

### 3.3 Responsive Scroll & Usability
- **Horizontal Scroll**: The timeline container uses `overflow-x-auto` to allow horizontal scrolling on tablets and mobile screens.
- **Minimum Width**: The inner grid has a minimum width calculated dynamically (`totalDays * 8px`, minimum `600px`) to prevent bars from shrinking and becoming unreadable on narrow viewports.
- **Subtle Right Fade**: A CSS gradient overlay on the right edge of the scroll container to signal to the user that more timeline content is available by scrolling.

---

## 4. Security & Data Isolation
- The timeline query must restrict data to `clientId = session.clientId`.
- Unlike the admin timeline, no interactive features (such as dragging bars to change dates, double-clicking to edit, or clicking status badges to change status) are enabled.
- Hovering over a project bar displays a tooltip with exact dates and progress:
  - `Preparation: 10 Jun → 20 Jun (10 days)`
  - `Closing Date: 25 Jun`
  - `Progress: 60% Complete`
