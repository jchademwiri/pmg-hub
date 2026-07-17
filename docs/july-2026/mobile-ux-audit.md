# Deep Mobile UX Audit: PMG Hub

This audit evaluates the **Admin App** and **Client Portal** within the PMG Hub ecosystem, prioritizing **user intent** on mobile devices over simple responsiveness. 

---

## 1. Overall UX Score

> **Note:** This document is **Preliminary/Superseded**. Please refer to `mobile-ux-audit-report.md` for the authoritative audit and scoring.

### Admin App
**Score: 6/10**
- **Mobile Usability (5/10):** Currently relies on stacking desktop tables and complex forms. High cognitive load on small screens.
- **Navigation (6/10):** Sidebars typically collapse to a hamburger menu, which is slow for quick, frequent actions.
- **Information Hierarchy (5/10):** Too much data density. Staff checking quick statuses are overwhelmed by full datasets.
- **Performance Perception (7/10):** Next.js handles routing well, but rendering heavy tables on mobile feels sluggish.
- **Ease of Use (6/10):** Good for desktop, but mobile requires too much panning and zooming or vertical scrolling.

### Client Portal
**Score: 7.5/10**
- **Mobile Usability (8/10):** Better baseline. The use of cards and simple grids translates well to mobile.
- **Navigation (7/10):** Standard routing, but could benefit from a bottom navigation bar for a more "app-like" feel.
- **Information Hierarchy (8/10):** The dashboard clearly prioritizes outstanding balances and payment progress.
- **Performance Perception (8/10):** Fast and lightweight.
- **Ease of Use (7/10):** Invoices and quotes are easy to access, but complex documents might still be hard to read on mobile.

---

## 2. Page-by-Page Audit

### Admin App

#### Dashboard
- **Current Purpose:** Overview of financials, projects, and leads.
- **Mobile Pain Points:** Charts and large summary tables (YTD, MoM deltas) stack endlessly, requiring massive vertical scrolling.
- **Mobile Recommendations:** 
  - **Remove:** Complex budget charts, aging reports, and full MoM deltas.
  - **Prioritize:** "Today's Tasks", "Urgent Alerts", and a simple "Revenue vs. Target" progress bar.
- **Suggested Redesign:** A vertically scrolling feed of "Action Items" (e.g., "3 Projects need approval", "5 Outstanding Invoices").

#### Projects & Billing
- **Mobile Pain Points:** Data tables with 8+ columns become unreadable horizontal scrolls.
- **Mobile Recommendations:** Convert tables to **Summary Cards**. Only show Project Name, Status Badge, and Primary Action (e.g., "Update Status"). Move deep edits to desktop.

### Client Portal

#### Dashboard
- **Current Purpose:** Overview of billing relationship and project progress.
- **Mobile Pain Points:** The "Payment Progress" and "Payment Reminder" banners are good, but Recent Invoices and Quotes lists can get long.
- **Mobile Recommendations:**
  - **Prioritize:** The outstanding balance alert and a massive "Pay Now" or "View Statement" button.
  - **Hide:** Detailed quote history (keep only "Pending Quotes" requiring action).
- **Suggested Redesign:** A banking-app style interface. Big balance at the top, a simple progress ring for the project, and 3-4 quick action buttons below.

#### Invoices & Statements
- **Mobile Pain Points:** Viewing a PDF invoice on a phone requires pinching and zooming.
- **Mobile Recommendations:** Provide a "Mobile Summary" view of the invoice (Total, Due Date, Line Items in a simple list) with a secondary "Download PDF" option. Implement a mobile-specific or conditionally rendered chart implementation rather than just hiding desktop charts with CSS.

---

## 3. Component Audit

- **Data Tables:** 
  - *Desktop:* Full width, sortable, filterable.
  - *Mobile:* **Do not use.** Replace with stacked cards showing only 3-4 key data points. Implement a "Tap to expand" pattern for more details.
- **Forms:**
  - *Desktop:* Multi-column layouts.
  - *Mobile:* Strictly single-column. Use native date pickers and large touch targets for dropdowns. Avoid complex multi-step wizards unless broken into separate, distinct screens.
- **Navigation (Sidebar):**
  - *Desktop:* Persistent left sidebar.
  - *Mobile:* Switch to a **Bottom Navigation Bar** for the 4-5 most used routes (Dashboard, Projects, Alerts, Profile) to enable one-handed use.
- **Dialogs/Modals:**
  - *Desktop:* Centered popups.
  - *Mobile:* Use **Bottom Sheets** (slide up from the bottom) for actions like filtering or quick edits. They are easier to reach with a thumb.

---

## 4. Mobile Dashboard Redesign

### Admin Mobile Dashboard: "The Daily Briefing"
*Optimized for Productivity & Triage*
1. **Header:** Greeting & Date.
2. **Alerts Ribbon:** High-priority items only (e.g., "🚨 2 Tenders due today").
3. **Quick Actions Grid:** 2x2 grid of primary actions (e.g., "Log Update", "Approve Invoice").
4. **My Focus Today:** A swipeable carousel of active projects the user is assigned to.
5. *(Everything else is hidden behind navigation tabs)*

### Client Mobile Dashboard: "The Command Center"
*Optimized for Clarity & Transparency*
1. **Hero Section:** Big, bold Outstanding Balance with a primary "Make Payment" CTA.
2. **Project Status Ring:** A visual circular progress indicator of their current main project.
3. **Action Required:** A specific card if a document needs signing or a quote needs approval.
4. **Recent Activity Feed:** A Twitter-style feed of updates from TenderEdge ("Document uploaded", "Phase 1 complete").

---

## 5. Navigation Audit

- **Admin:** The current hamburger menu is inefficient for quick checks. **Recommendation:** Implement a mobile Bottom Navigation Bar with `[ Dashboard | Projects | Tasks | Menu ]`.
- **Portal:** **Recommendation:** Bottom Navigation with `[ Home | Projects | Billing | Profile ]`.
- **Floating Action Buttons (FAB):** Add a persistent FAB on mobile for core actions. For Admin: `+ New Update`. For Portal: `Contact Us`.

---

## 6. Information Hierarchy

### Must Always Be Visible (Mobile)
- **Admin:** Alerts, pending approvals, search bar.
- **Portal:** Outstanding balance, current project phase, urgent actions.

### Secondary Information (One tap away)
- **Admin:** Project details, contact information, task lists.
- **Portal:** Past invoices, quote history, downloaded documents.

### Advanced Information (Desktop only / Deeply hidden)
- **Admin:** Financial forecasting, complex reporting, bulk user management.
- **Portal:** Detailed line-item breakdowns of historical projects.

---

## 7. Desktop vs Mobile Strategy

**The Golden Rule:** Feature parity is a trap. 
- **Desktop** is the workspace. It requires high information density, multi-tasking capabilities, and robust editing tools.
- **Mobile** is the remote control. It requires immediacy, status updates, and simple binary decisions (Approve/Reject).

*Do not attempt to make the Desktop UI responsive by simply squishing it.* Serve different layouts or hide complex components entirely when the viewport is small.

---

## 8. Quick Wins (Under 1 Day)

1. **Hide Complex Charts on Mobile:** Wrap the `budgetChartSeries` and `MoMChartData` in a `<div className="hidden md:block">`.
2. **Typography & Touch Targets:** Ensure all buttons and links are at least `44x44px`. Increase body text to `16px` minimum to prevent iOS auto-zoom on inputs.
3. **Card Redesign:** Update the Portal Dashboard `Recent Invoices` list to ensure the tap target covers the entire row, not just the text.
4. **Spacing:** Add extra `pb-24` padding to the bottom of mobile layouts so content isn't obscured by the OS home bar or Safari UI.

---

## 9. Long-Term Improvements

1. **Mobile-Specific Routing:** Consider detecting user-agent and routing to `/m/dashboard` if the experience needs to be fundamentally different from the desktop `/dashboard`.
2. **Bottom Sheets:** Replace all mobile modals/dialogs with draggable bottom sheets (e.g., using `vaul`).
3. **PWA Capabilities:** Add a Web App Manifest and Service Worker to allow clients and admins to "Install to Home Screen".
4. **Offline Support:** Cache the latest project status so the Client Portal loads instantly even on bad cellular connections.
5. **Push Notifications:** Implement Web Push for urgent tender updates or invoice reminders, bypassing the need for email checks.
