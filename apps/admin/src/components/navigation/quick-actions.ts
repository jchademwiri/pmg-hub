import {
  FileText,
  Receipt,
  Banknote,
  TrendingDown,
  Wallet,
  Package,
  Users,
  Building2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface QuickAction {
  label: string;
  href: string;
  icon: LucideIcon;
}

/**
 * Route-scoped quick-create actions rendered in the TopNav bar.
 * Keys are exact pathnames (no trailing slash).
 *
 * - /dashboard: cross-cutting daily creation actions (Quote, Invoice, Payment, Expense)
 * - Group overview pages (/billing, /relationships, /finance): actions scoped directly to that group
 * - /insights: intentionally omitted (no direct entity creation)
 */
export const QUICK_ACTIONS_BY_ROUTE: Record<string, QuickAction[]> = {
  '/dashboard': [
    { label: 'Quote', href: '/billing/quotes/new', icon: FileText },
    { label: 'Invoice', href: '/billing/invoices/new', icon: Receipt },
    { label: 'Payment', href: '/billing/payments/add', icon: Banknote },
    { label: 'Expense', href: '/finance/expenses?new=1', icon: TrendingDown },
  ],
  '/billing': [
    { label: 'Quote', href: '/billing/quotes/new', icon: FileText },
    { label: 'Invoice', href: '/billing/invoices/new', icon: Receipt },
    { label: 'Payment', href: '/billing/payments/add', icon: Banknote },
    { label: 'Credit', href: '/billing/credits?new=1', icon: Wallet },
    { label: 'Item', href: '/billing/items?new=1', icon: Package },
  ],
  '/relationships': [
    { label: 'Client', href: '/relationships/clients?new=1', icon: Users },
    { label: 'Division', href: '/relationships/divisions?new=1', icon: Building2 },
  ],
  '/finance': [{ label: 'Expense', href: '/finance/expenses?new=1', icon: TrendingDown }],
};

export function getQuickActionsForPath(pathname: string): QuickAction[] {
  const normalized = pathname !== '/' ? pathname.replace(/\/+$/, '') : pathname;
  return QUICK_ACTIONS_BY_ROUTE[normalized] ?? [];
}
