import type { SpendMatchConfig } from '@pmg/db';

/**
 * Spend trackers a savings goal can attach to, to show what a purchase would
 * replace and how fast it pays for itself.
 *
 * Trackers are code, not data - a new one is a few lines here plus the keyword
 * lists. `savings_goals.spend_tracker_key` holds the key; an unknown key simply
 * renders no tracker rather than erroring, so removing one is safe.
 */
export type SpendTracker = {
  key: string;
  label: string;
  /** What the primary rows represent, shown as a table badge. */
  primaryLabel: string;
  /** What the companion rows represent, shown as a table badge. */
  companionLabel: string;
  /** Explains the matching rule to the reader, so the numbers are auditable. */
  caveat: string;
  match: SpendMatchConfig;
};

export const SPEND_TRACKERS: Record<string, SpendTracker> = {
  scanning: {
    key: 'scanning',
    label: 'Document scanning',
    primaryLabel: 'Scanning',
    companionLabel: 'Transport',
    caveat:
      'Scanning runs are matched on the word "scan" in the description or category. Transport counts only when the description names the destination ("cafe", "print shop"), so a trip logged without one is missed.',
    match: {
      primaryKeywords: ['scan'],
      companionCategories: ['transport', 'travel', 'shipment'],
      companionKeywords: ['cafe', 'print shop', 'printshop'],
    },
  },
};

export function getSpendTracker(key: string | null | undefined): SpendTracker | null {
  if (!key) return null;
  return SPEND_TRACKERS[key] ?? null;
}

export const SPEND_TRACKER_OPTIONS = Object.values(SPEND_TRACKERS).map((t) => ({
  value: t.key,
  label: t.label,
}));
