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
  Camera, BarChart3, Settings, UserCog, PiggyBank,
  Package, Shield, Database,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

export type NavItem = {
  title: string
  url: string
  icon: LucideIcon
}

export type GroupKey = 'finance' | 'billing' | 'relationships' | 'insights' | 'system'

export type NavGroup = {
  key: GroupKey
  label: string
  icon: LucideIcon
  items: NavItem[]
}

// ── Overview (non-grouped) ────────────────────────────────────────────────────

export const OVERVIEW: NavItem[] = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
]

// ── Groups ────────────────────────────────────────────────────────────────────

export const GROUPS: NavGroup[] = [
  {
    key: 'finance',
    label: 'Finance',
    icon: Banknote,
    items: [
      { title: 'Income',     url: '/income',             icon: TrendingUp   },
      { title: 'Expenses',   url: '/expenses',           icon: TrendingDown },
      { title: 'Categories', url: '/expense-categories', icon: Tags         },
      { title: 'Ledger',     url: '/ledger',             icon: BookOpen     },
      { title: 'Accounts',   url: '/accounts',           icon: PiggyBank    },
    ],
  },
  {
    key: 'billing',
    label: 'Billing',
    icon: FileSpreadsheet,
    items: [
      { title: 'Quotations', url: '/billing/quotes',     icon: FileText   },
      { title: 'Invoices',   url: '/billing/invoices',   icon: Receipt    },
      { title: 'Statements', url: '/billing/statements', icon: ScrollText },
      { title: 'Items',      url: '/billing/items',      icon: Package    },
    ],
  },
  {
    key: 'relationships',
    label: 'Relationships',
    icon: Network,
    items: [
      { title: 'Clients',   url: '/clients',   icon: Users     },
      { title: 'Leads',     url: '/leads',     icon: UserPlus  },
      { title: 'Divisions', url: '/divisions', icon: Building2 },
    ],
  },
  {
    key: 'insights',
    label: 'Insights',
    icon: LineChart,
    items: [
      { title: 'Snapshots', url: '/snapshots', icon: Camera   },
      { title: 'Reports',   url: '/reports',   icon: BarChart3 },
    ],
  },
  {
    key: 'system',
    label: 'System',
    icon: Cog,
    items: [
      { title: 'Settings',       url: '/settings',              icon: Settings  },
      { title: 'Users',          url: '/settings/users',        icon: UserCog   },
      { title: 'Organisation',   url: '/settings/organisation', icon: Building2 },
      { title: 'Billing',        url: '/settings/billing',      icon: Receipt   },
      { title: 'Security',       url: '/settings/security',     icon: Shield    },
      { title: 'Data & Exports', url: '/settings/data',         icon: Database  },
    ],
  },
]

// ── Route labels (derived — do not edit manually) ─────────────────────────────
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
}

export const ROUTE_LABELS: Record<string, string> = {
  ...derivedLabels,
  ...EXTRA_LABELS,
}
