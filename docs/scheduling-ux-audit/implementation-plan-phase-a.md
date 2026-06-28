# Implementation Plan — Project Scheduling UX Improvements (Phase A)

This plan details the changes to implement the 10 UX improvements for the Project Scheduling module (`/scheduling`, `/scheduling/list`, `/scheduling/timeline`) in the `admin` application.

## User Review Required

We are introducing a shared layout for the `/scheduling` routes. This will move the main page header into the layout and add a tabbed sub-navigation bar (`Overview | All Projects | Timeline`) at the top of all three pages. The "Back to Overview" button on the list page will be removed since the sub-navigation replaces it.

## Proposed Changes

We will modify and create files across the scheduling route group in the `admin` app.

---

### 1. Navigation & Layout (Items 3.1, 3.10)

#### [NEW] [layout.tsx](file:///d:/websites/pmg-hub/apps/admin/src/app/(admin)/scheduling/layout.tsx)
- Create a shared layout for the `/scheduling` route group.
- Renders the main page header: "Project Scheduling" and description.
- Renders a tabbed sub-navigation bar using Next.js `Link` elements styled as tabs, highlighting the active route based on the current path (`Overview`, `All Projects`, `Timeline`).

#### [MODIFY] [page.tsx](file:///d:/websites/pmg-hub/apps/admin/src/app/(admin)/scheduling/page.tsx)
- Remove the duplicate page header (since the layout now handles it).
- Fetch the next 5 upcoming active projects (planned or in-progress, sorted by `closingDate`) and pass them to the client component.

#### [MODIFY] [page.tsx](file:///d:/websites/pmg-hub/apps/admin/src/app/(admin)/scheduling/list/page.tsx)
- Remove the duplicate page header.
- Remove the "Back to Overview" button (with the wrong Plus icon) entirely, since the sub-navigation layout makes it obsolete.

#### [MODIFY] [page.tsx](file:///d:/websites/pmg-hub/apps/admin/src/app/(admin)/scheduling/timeline/page.tsx)
- Remove the duplicate page header.

---

### 2. Overview Page Zones & Warnings (Items 3.2, 3.3, 3.9)

#### [MODIFY] [scheduling-overview-shell.tsx](file:///d:/websites/pmg-hub/apps/admin/src/components/scheduling/scheduling-overview-shell.tsx)
- **Upcoming Deadlines Panel (Item 3.2)**: Add a read-only list at the bottom of the overview page showing the next 5 closing projects.
- **Client Names in Workload Card (Item 3.9)**: Ensure the `CurrentWorkloadCard` renders the client's name as a secondary line under the project reference.
- **Warnings Panel (Item 3.3)**: Ensure the `WarningsPanel` uses a single card with a clean list of grouped issues.

---

### 3. Standardize Status Transitions (Item 3.4)

#### [MODIFY] [tender-status-badge.tsx](file:///d:/websites/pmg-hub/apps/admin/src/components/scheduling/tender-status-badge.tsx)
- Export the `STATUS_TRANSITIONS` mapping and a `getNextStatuses` helper function so they can be reused.
- Ensure the status badge colors use the semantic Tailwind color classes specified in the audit:
  - `planned` → `bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30`
  - `in_progress` → `bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30`
  - `completed` → `bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30`
  - `submitted` → `bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30`
  - `cancelled` → `bg-muted text-muted-foreground border-border`

#### [MODIFY] [draggable-up-next.tsx](file:///d:/websites/pmg-hub/apps/admin/src/components/scheduling/draggable-up-next.tsx)
- Remove the "Start" button from the list items.
- Wrap the `TenderStatusBadge` in a `DropdownMenu` (similar to the list page) allowing users to select "Start Work" or "Cancel" directly on the badge.
- Render the client's name as a secondary line under the project reference (Item 3.9).

#### [MODIFY] [scheduling-overview-shell.tsx](file:///d:/websites/pmg-hub/apps/admin/src/components/scheduling/scheduling-overview-shell.tsx)
- In `CurrentWorkloadCard`, keep the primary "Mark Complete" button, but replace the "Cancel" button with an "Other Actions" dropdown containing the remaining status options.

---

### 4. Timeline Scroll & Badge Colors (Items 3.5, 3.6)

#### [MODIFY] [tender-risk-badge.tsx](file:///d:/websites/pmg-hub/apps/admin/src/components/scheduling/tender-risk-badge.tsx)
- Update the risk badge colors to use semantic classes (emerald, amber, orange, red) instead of the generic shadcn variants:
  - `On Track` → `bg-emerald-500/15 text-emerald-700`
  - `Tight` / `Start Due` → `bg-amber-500/15 text-amber-700`
  - `At Risk` → `bg-orange-500/15 text-orange-700`
  - `Impossible` / `Overdue` → `bg-red-500/15 text-red-700`
  - `Done` → `bg-muted text-muted-foreground`

#### [MODIFY] [timeline-client.tsx](file:///d:/websites/pmg-hub/apps/admin/src/app/(admin)/scheduling/timeline/timeline-client.tsx)
- Change the outer scroll container from `overflow-hidden` to `overflow-x-auto`.
- Add `min-w-[800px]` (or `style={{ minWidth: '${Math.max(totalDays * 8, 600)}px' }}`) to the inner Gantt-chart container so it scrolls horizontally on smaller screens.
- Add a subtle fade gradient on the right edge to indicate that content continues.

---

### 5. Forms & Dialogs (Items 3.7, 3.8)

#### [MODIFY] [tender-form-dialog.tsx](file:///d:/websites/pmg-hub/apps/admin/src/components/scheduling/tender-form-dialog.tsx)
- Remove the two read-only date inputs ("Scheduled Start" and "Target Completion").
- Replace them with a styled callout box (`col-span-2 rounded-md border border-dashed bg-muted/30 px-4 py-3`) displaying the calculated schedule preview:
  - `Start Date` → `Target Completion Date` → `Closing Date`
- Pass the calculated start/target dates directly in the server action payload.

#### [MODIFY] [tender-edit-dialog.tsx](file:///d:/websites/pmg-hub/apps/admin/src/components/scheduling/tender-edit-dialog.tsx)
- Replace the custom, hand-rolled tab buttons and border manipulation with the standard shadcn `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, and `<TabsContent>` components.

---

## Verification Plan

### Automated Tests
- Run `bun --filter admin test` to ensure that existing scheduling tests continue to pass.

### Manual Verification
- Navigate to `/scheduling` and verify the shared tabbed sub-navigation bar (`Overview | All Projects | Timeline`).
- Verify that the "Back to Overview" button is gone from `/scheduling/list`.
- On the Overview page, verify:
  - The **Upcoming Deadlines** panel is displayed at the bottom.
  - The **Now Working** card has a "Mark Complete" button and an "Other Actions" dropdown.
  - The **Up Next** list items have a clickable status badge instead of the "Start" button.
- On the Timeline page, verify that the Gantt chart can be scrolled horizontally when the screen width is narrow.
