/**
 * Single source of truth for all navigation routes.
 *
 * - GROUPS drives the sidebar structure (links, icons, grouping)
 * - ROUTE_LABELS is derived from GROUPS so the top-nav breadcrumb
 *   never drifts out of sync with the sidebar.
 *
 * To add, remove, or rename a route: edit this file only.
 */

import {
  Banknote,
  FileSpreadsheet,
  Network,
  LineChart,
  Cog,
  LayoutDashboard,
  TrendingDown,
  FileText,
  Receipt,
  ScrollText,
  Users,
  UserPlus,
  BarChart3,
  Settings,
  Shield,
  Wallet,
  Calculator,
  BookMarked,
  LayoutGrid,
  CalendarClock,
  CalendarRange,
  UserCheck,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Role } from '@/lib/roles';

// ── Types ─────────────────────────────────────────────────────────────────────

export type NavItem = {
  title: string;
  url: string;
  icon: LucideIcon;
  /** Hide this item from the sidebar unless the current user meets this role. */
  minRole?: Role;
};

export type GroupKey =
  | 'billing'
  | 'finance'
  | 'accounting'
  | 'relationships'
  | 'insights'
  | 'system'
  | 'projects'
  | 'advanced';

export type NavGroup = {
  key: GroupKey;
  label: string;
  icon: LucideIcon;
  items: NavItem[];
};

// ── Overview (non-grouped) ────────────────────────────────────────────────────

export const OVERVIEW: NavItem[] = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
];

// ── Groups ────────────────────────────────────────────────────────────────────
// Order here is the sidebar's rendered order (top to bottom), prioritized around
// daily workflow: revenue ops and client relationships first, periodic
// accounting/reporting work further down, System pinned in the footer.

export const GROUPS: NavGroup[] = [
  {
    key: 'billing',
    label: 'Billing',
    icon: FileSpreadsheet,
    items: [
      { title: 'Overview', url: '/billing', icon: LayoutGrid },
      { title: 'Quotations', url: '/billing/quotes', icon: FileText },
      { title: 'Invoices', url: '/billing/invoices', icon: Receipt },
      { title: 'Payments', url: '/billing/payments', icon: Banknote },
      { title: 'Credits', url: '/billing/credits', icon: Wallet },
      { title: 'Statements', url: '/billing/statements', icon: ScrollText },
      { title: 'Reports', url: '/billing/reports', icon: BarChart3 },
    ],
  },
  {
    key: 'relationships',
    label: 'Relationships',
    icon: Network,
    items: [
      { title: 'Overview', url: '/relationships', icon: LayoutGrid },
      { title: 'Clients', url: '/relationships/clients', icon: Users },
      { title: 'Leads', url: '/relationships/leads', icon: UserPlus },
      { title: 'Onboarding', url: '/relationships/onboarding', icon: UserCheck },
      { title: 'Compliance Radar', url: '/insights/compliance-radar', icon: Shield },
      { title: 'Public Documents', url: '/documents', icon: FileText },
    ],
  },
  {
    key: 'projects',
    label: 'Projects',
    icon: CalendarClock,
    items: [
      { title: 'Overview', url: '/projects', icon: LayoutGrid },
      { title: 'Timeline', url: '/projects/timeline', icon: CalendarRange },
    ],
  },
  {
    key: 'finance',
    label: 'Finance',
    icon: Banknote,
    items: [
      { title: 'Overview', url: '/finance', icon: LayoutGrid },
      { title: 'Expenses', url: '/finance/expenses', icon: TrendingDown },
      { title: 'Recurring', url: '/finance/recurring', icon: CalendarClock },
    ],
  },
  {
    key: 'accounting',
    label: 'Accounting',
    icon: Calculator,
    items: [
      { title: 'Overview', url: '/accounting', icon: LayoutGrid },
      { title: 'Profit & Loss', url: '/accounting/profit-and-loss', icon: LineChart },
      { title: 'General Ledger', url: '/accounting/general-ledger', icon: BookMarked },
    ],
  },
  {
    key: 'system',
    label: 'System',
    icon: Cog,
    items: [{ title: 'Settings', url: '/settings', icon: Settings }],
  },
];

// ── Route labels (derived - do not edit manually) ─────────────────────────────
// Built from GROUPS + OVERVIEW so top-nav breadcrumbs always match the sidebar.

const derivedLabels: Record<string, string> = {};

for (const item of OVERVIEW) {
  derivedLabels[item.url] = item.title;
}
for (const group of GROUPS) {
  for (const item of group.items) {
    derivedLabels[item.url] = item.title;
  }
}

// Extra routes that exist in the app but are not sidebar items
const EXTRA_LABELS: Record<string, string> = {
  // Billing
  '/billing/aging': 'AR Aging',
  '/billing/items': 'Billing Items',
  '/billing/payments/add': 'Record Payment',

  // Relationships
  '/relationships/divisions': 'Divisions',

  // Projects
  '/projects/list': 'Schedule List',
  '/projects/timeline': 'Timeline',

  // Finance
  '/finance/income': 'Income',
  '/finance/categories': 'Finance Categories',
  '/assets': 'Assets Register',
  '/savings': 'Savings Goals',

  // Accounting
  '/accounting/chart-of-accounts': 'Chart of Accounts',
  '/accounting/periods': 'Accounting Periods',
  '/accounting/journals': 'Journals',
  '/accounting/journals/new': 'New Journal Entry',
  '/accounting/trial-balance': 'Trial Balance',

  // Insights (deferred)
  '/insights': 'Reports & Insights',
  '/insights/financial-reports': 'Financial Reports',
  '/insights/analysis': 'Business Analysis',
  '/insights/reports': 'Performance Reports',
  '/insights/snapshots': 'Snapshots',

  // Settings
  '/settings/organisation': 'Organisation',
  '/settings/billing': 'Billing Settings',
  '/settings/users': 'Users',
  '/settings/users/invite': 'Invite User',
  '/settings/security': 'Security',
  '/settings/data': 'Data & Exports',
};

export const ROUTE_LABELS: Record<string, string> = {
  ...derivedLabels,
  ...EXTRA_LABELS,
};
