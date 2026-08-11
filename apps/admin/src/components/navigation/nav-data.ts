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
  Banknote, FileSpreadsheet, Network, LineChart, Cog,
  LayoutDashboard, TrendingUp, TrendingDown, Tags, BookOpen,
  FileText, Receipt, ScrollText, Users, UserPlus, Building2,
  Camera, BarChart3, Settings, UserCog,
  Package, Shield, Database, Wallet, ArrowDownLeft,
  PieChart, Calculator, BookMarked, NotebookPen, Scale,
  Calendar, LayoutGrid, CalendarClock, ListTodo, CalendarRange,
  Landmark,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Role } from '@/lib/roles'

// ── Types ─────────────────────────────────────────────────────────────────────

export type NavItem = {
  title: string
  url: string
  icon: LucideIcon
  /** Hide this item from the sidebar unless the current user meets this role. */
  minRole?: Role
}

export type GroupKey = 'billing' | 'finance' | 'accounting' | 'relationships' | 'insights' | 'system' | 'projects' | 'advanced'

export type NavGroup = {
  key: GroupKey
  label: string
  icon: LucideIcon
  items: NavItem[]
}


// ── Overview (non-grouped) ────────────────────────────────────────────────────

export const OVERVIEW: NavItem[] = [
  { title: 'Dashboard',  url: '/dashboard',       icon: LayoutDashboard },
]

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
      { title: 'Overview',      url: '/billing',            icon: LayoutGrid },
      { title: 'Quotations',    url: '/billing/quotes',     icon: FileText   },
      { title: 'Invoices',      url: '/billing/invoices',   icon: Receipt    },
      { title: 'Payments',      url: '/billing/payments',   icon: Banknote   },
      { title: 'Credits',       url: '/billing/credits',    icon: Wallet     },
      { title: 'Statements',    url: '/billing/statements', icon: ScrollText },
      { title: 'Aging Report',  url: '/billing/aging',      icon: Calendar   },
      { title: 'Billing Items', url: '/billing/items',     icon: Package    },
    ],
  },
  {
    key: 'relationships',
    label: 'Clients',
    icon: Network,
    items: [
      { title: 'Overview',  url: '/relationships',           icon: LayoutGrid },
      { title: 'Clients',   url: '/relationships/clients',   icon: Users      },
      { title: 'Leads',     url: '/relationships/leads',     icon: UserPlus   },
      { title: 'Divisions', url: '/relationships/divisions', icon: Building2  },
    ],
  },
  {
    key: 'projects',
    label: 'Projects',
    icon: CalendarClock,
    items: [
      { title: 'Overview',      url: '/projects',          icon: LayoutGrid },
      { title: 'Schedule List', url: '/projects/list',     icon: ListTodo },
      { title: 'Timeline',      url: '/projects/timeline', icon: CalendarRange },
    ],
  },
  {
    key: 'finance',
    label: 'Finance',
    icon: Banknote,
    items: [
      { title: 'Overview',           url: '/finance',            icon: LayoutGrid    },
      { title: 'Income',             url: '/finance/income',     icon: ArrowDownLeft },
      { title: 'Expenses',           url: '/finance/expenses',   icon: TrendingDown  },
      { title: 'Finance Categories', url: '/finance/categories', icon: Tags          },
      { title: 'Assets Register',    url: '/assets',             icon: Landmark      },
    ],
  },
  {
    key: 'accounting',
    label: 'Accounting',
    icon: Calculator,
    items: [
      { title: 'Overview',           url: '/accounting',                    icon: LayoutGrid    },
      { title: 'Chart of Accounts',  url: '/accounting/chart-of-accounts',  icon: BookOpen      },
      { title: 'General Ledger',     url: '/accounting/general-ledger',     icon: BookMarked    },
      { title: 'Journals',           url: '/accounting/journals',           icon: NotebookPen   },
      { title: 'Trial Balance',      url: '/accounting/trial-balance',      icon: Scale         },
      { title: 'Profit & Loss',      url: '/accounting/profit-and-loss',    icon: LineChart     },
      { title: 'Accounting Periods', url: '/accounting/periods',            icon: Calendar      },
    ],
  },
  {
    key: 'insights',
    label: 'Reports',
    icon: BarChart3,
    items: [
      { title: 'Overview',           url: '/insights',                   icon: LayoutGrid },
      { title: 'Financial Reports',  url: '/insights/financial-reports', icon: PieChart   },
      { title: 'Business Analysis',  url: '/insights/analysis',          icon: TrendingUp },
      { title: 'Performance Reports', url: '/insights/reports',          icon: BarChart3  },
      { title: 'Snapshots',          url: '/insights/snapshots',         icon: Camera     },
      { title: 'Compliance Radar',   url: '/insights/compliance-radar',  icon: Shield     },
    ],
  },
  {
    key: 'system',
    label: 'System',
    icon: Cog,
    items: [
      { title: 'Overview',       url: '/settings',              icon: Settings  },
      { title: 'Organisation',   url: '/settings/organisation', icon: Building2 },
      { title: 'Billing',        url: '/settings/billing',      icon: Receipt   },
      { title: 'Users',          url: '/settings/users',        icon: UserCog, minRole: 'super_admin' },
      { title: 'Security',       url: '/settings/security',     icon: Shield    },
      { title: 'Data & Exports', url: '/settings/data',         icon: Database  },
    ],
  },
]

// ── Route labels (derived - do not edit manually) ─────────────────────────────
// Built from GROUPS + OVERVIEW so top-nav breadcrumbs always match the sidebar.

const derivedLabels: Record<string, string> = {}

for (const item of OVERVIEW) {
  derivedLabels[item.url] = item.title
}
for (const group of GROUPS) {
  for (const item of group.items) {
    derivedLabels[item.url] = item.title
  }
}

// Extra routes that exist in the app but are not sidebar items
const EXTRA_LABELS: Record<string, string> = {
  '/settings/users/invite': 'Invite User',
  '/billing/payments/add': 'Record Payment',
  '/projects/list': 'Schedule List',
  '/projects/timeline': 'Timeline',
}

export const ROUTE_LABELS: Record<string, string> = {
  ...derivedLabels,
  ...EXTRA_LABELS,
}
