# Implementation Plan: dashboard-ui

## Overview

Build the admin shell layout (sidebar + top nav) and the financial overview dashboard for
the PMG Control Center. All components are React Server Components except `NavLink` and
`AllocationTooltipBar`. Data is fetched server-side via `Promise.all` from the existing
Financial Engine.

## Tasks

- [x] 1. Install shadcn components and configure test environment
  - Run `npx shadcn@latest add sidebar-08 --cwd apps/admin` (installs sidebar + deps)
  - Run `npx shadcn@latest add progress scroll-area sonner breadcrumb --cwd apps/admin`
  - Verify `card` and `badge` are already installed
  - Install `@testing-library/react` and `@testing-library/jest-dom` as devDependencies
  - Update `apps/admin/vitest.config.ts` to use `environment: 'jsdom'` and add `setupFiles`
  - Create `apps/admin/src/__tests__/setup.ts` importing `@testing-library/jest-dom`
  - _Requirements: 1.1, 1.2, 13.1_

- [x] 2. Set up proxy auth guard and root layout
  - [x] 2.1 Create `apps/admin/src/proxy.ts` with the `proxy` function and `config` matcher
    - Export `proxy` (not `middleware`), check `better-auth.session_token` cookie only
    - Exclude `/login` paths to prevent redirect loop
    - _Requirements: 22.1–22.5, 27.1–27.7_

  - [ ]* 2.2 Write property test for proxy cookie check
    - **Property 6: Proxy cookie check**
    - **Validates: Requirements 22.3, 22.4, 27.3, 27.4, 27.6**

  - [x] 2.3 Update `apps/admin/src/app/layout.tsx` (root layout)
    - Add `className="dark"` and `lang="en"` to `<html>`, replace Geist with Noto Sans
    - Export `metadata` with title template, description, and noindex robots
    - Retain `suppressHydrationWarning` on `<body>`
    - _Requirements: 10.9, 25.1–25.7_

  - [x] 2.4 Replace `apps/admin/src/app/page.tsx` with root redirect to `/dashboard`
    - _Requirements: 23.2, 23.3_

- [x] 3. Build the admin layout shell
  - [x] 3.1 Create `apps/admin/src/components/layout/nav-link.tsx`
    - `'use client'` directive, use `usePathname` for active state detection
    - Active: `bg-sidebar-accent text-sidebar-accent-foreground`
    - Hover: `hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground`
    - Active condition: `pathname === href || pathname.startsWith(href + '/')`
    - _Requirements: 2.7, 2.8, 9.10, 11.5_

  - [x] 3.2 Customise `apps/admin/src/components/layout/app-sidebar.tsx` (scaffolded by sidebar-08)
    - Replace placeholder nav items with five PMG routes using lucide-react icons
    - Replace brand label with "PMG / Control Center" two-line header
    - Replace user footer with minimal "PMG Admin" label
    - Use `NavLink` as the link renderer inside nav item slots
    - _Requirements: 2.2, 2.5, 2.6, 11.1–11.7_

  - [x] 3.3 Create `apps/admin/src/components/layout/top-nav.tsx`
    - Server Component: `SidebarTrigger` + `Separator` (vertical, h-4) + `Breadcrumb`
    - Root `className="h-12 flex items-center gap-2 px-4 border-b border-border bg-card"`
    - Static "Dashboard" breadcrumb text for Phase 2
    - _Requirements: 2.3, 2.9, 9.4, 14.1–14.5_

  - [x] 3.4 Create `apps/admin/src/app/(admin)/layout.tsx`
    - Server Component wrapping `SidebarProvider` > `AppSidebar` + `SidebarInset` > `TopNav` + `<main>`
    - `Toaster` as sibling to `SidebarProvider` with `theme="dark" position="bottom-right"`
    - `<main className="flex-1 overflow-y-auto p-6 bg-background">`
    - _Requirements: 2.1, 2.4, 9.2, 20.1–20.4, 21.1–21.6_

- [x] 4. Checkpoint — verify layout shell renders
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Build dashboard presentational components
  - [x] 5.1 Create `apps/admin/src/components/dashboard/kpi-card.tsx`
    - Props: `label`, `value`, `sub?`, `icon?`
    - Use `Card`, `CardHeader`, `CardDescription`, `CardContent` shadcn primitives
    - Format value with `formatZAR` from `@/lib/financial`
    - No `'use client'`
    - _Requirements: 4.1–4.6, 9.5, 15.1–15.6_

  - [ ]* 5.2 Write property test for formatZAR output correctness
    - **Property 1: formatZAR output correctness**
    - **Validates: Requirements 4.3, 5.1, 15.5**

  - [x] 5.3 Create `apps/admin/src/components/dashboard/salary-card.tsx`
    - Props: `salary: number`
    - Use `Card`, `CardHeader`, `CardTitle`, `CardContent`, `CardDescription`
    - chart-1 color scheme throughout; sub-label "35% of profit pool · calculated, not guessed"
    - No `'use client'`
    - _Requirements: 5.1–5.5, 9.6, 16.1–16.4_

  - [x] 5.4 Create `apps/admin/src/components/dashboard/allocation-tooltip-bar.tsx`
    - `'use client'` directive
    - Props: `allocations: AllocationItem[]`
    - Outer container: `className="flex h-3 w-full overflow-hidden rounded-full bg-muted"`
    - Each segment: raw `div` with `style={{ width: '${pct}%' }}` wrapped in `TooltipProvider > Tooltip > TooltipTrigger > TooltipContent`
    - Tooltip text: `"{label}: {formatZAR(amount)} ({pct}%)"`
    - _Requirements: 6.4, 9.11, 17.4, 28.1–28.9_

  - [ ]* 5.5 Write property test for AllocationTooltipBar tooltip content
    - **Property 7: AllocationTooltipBar tooltip content**
    - **Validates: Requirements 17.4, 28.7**

  - [x] 5.6 Create `apps/admin/src/components/dashboard/allocation-bar.tsx`
    - Props: `summary: FinancialSummary`
    - Define `ALLOCATIONS` constant with four entries (salary 35%, reinvest 30%, reserve 30%, flex 5%)
    - Use `Card`, `CardHeader`, `CardTitle`, `CardContent`; render `AllocationTooltipBar` + legend grid
    - No `'use client'`
    - _Requirements: 6.1–6.6, 9.7, 17.1–17.7_

  - [ ]* 5.7 Write unit test for allocation percentages sum to 100
    - **Property 5: Allocation percentages sum to 100**
    - **Validates: Requirements 6.1, 17.6**

  - [x] 5.8 Create `apps/admin/src/components/dashboard/division-revenue.tsx`
    - Props: `divisions: DivisionRevenue[]`
    - Use `Card`, `CardHeader`, `CardTitle`, `CardContent`, `ScrollArea`, `Progress`
    - Bar width: `Math.round((total / max) * 100)`, max fallback of 1 to prevent division-by-zero
    - Empty state: "No income recorded yet." in `text-muted-foreground/50 text-xs`
    - No `'use client'`
    - _Requirements: 7.1–7.7, 9.8, 18.1–18.7_

  - [ ]* 5.9 Write property test for proportional bar width invariant (DivisionRevenue)
    - **Property 2: Proportional bar width invariant**
    - **Validates: Requirements 7.2, 8.3**

  - [ ]* 5.10 Write property test for array length preservation (DivisionRevenue)
    - **Property 3: Array length preservation**
    - **Validates: Requirements 7.1, 8.1**

  - [ ]* 5.11 Write unit tests for DivisionRevenue empty state
    - **Property 4: Empty state rendering (DivisionRevenue)**
    - **Validates: Requirements 7.5**

  - [x] 5.12 Create `apps/admin/src/components/dashboard/leads-summary.tsx`
    - Props: `leads: LeadStatusCount[]`
    - Use `Card`, `CardHeader`, `CardTitle`, `CardContent`, `ScrollArea`, `Progress`, `Badge`
    - Define `BADGE_CLASS` and `PROGRESS_CLASS` maps; fallback to `lost` for unknown statuses
    - Empty state: "No leads yet." in `text-muted-foreground/50 text-xs`
    - No `'use client'`
    - _Requirements: 8.1–8.6, 9.9, 19.1–19.6_

  - [ ]* 5.13 Write unit tests for LeadsSummary empty state and unknown status fallback
    - **Property 4: Empty state rendering (LeadsSummary)**
    - **Validates: Requirements 8.4**

- [x] 6. Checkpoint — ensure all component tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [~] 7. Build dashboard page and login placeholder
  - [~] 7.1 Create `apps/admin/src/app/(admin)/dashboard/page.tsx`
    - Async Server Component; `Promise.all([getFinancialSummary(), getDivisionRevenue(), getLeadCounts()])`
    - Export `metadata: Metadata = { title: 'Dashboard' }`
    - KPI grid (`grid-cols-2 lg:grid-cols-4`), salary+allocation row (`grid-cols-1 lg:grid-cols-3`), divisions+leads row (`grid-cols-1 lg:grid-cols-2`)
    - No `'use client'`; errors propagate to Next.js error boundary
    - _Requirements: 3.1–3.6, 9.1, 12.1–12.4, 23.1_

  - [~] 7.2 Create `apps/admin/src/app/(auth)/login/page.tsx`
    - Server Component placeholder; centred card with PMG brand and placeholder text
    - Export `metadata: Metadata = { title: 'Login' }`
    - No `'use client'`, no auth form
    - _Requirements: 26.1–26.7_

- [~] 8. Verify color token compliance
  - Search codebase for any raw palette utilities (`zinc-`, `amber-`, `blue-`, `teal-`, `purple-`, `gray-`, `slate-`) in component classNames
  - Replace any found instances with the correct semantic token from Requirement 24
  - _Requirements: 10.8, 24.1–24.4_

- [~] 9. Final checkpoint — ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests use `fast-check` (already installed); component render tests require `@testing-library/react`
- If `@testing-library` setup is out of scope, Properties 3, 4, and 7 can be deferred to Phase 9
- All color tokens must come from `globals.css` semantic variables — no raw Tailwind palette utilities
