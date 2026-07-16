/**
 * Centralised billing status styles and label formatting.
 * Import from here instead of defining STATUS_STYLES / STATUS_TEXT_COLORS locally.
 */

export const STATUS_STYLES: Record<string, string> = {
  paid: 'bg-emerald-500/10 text-emerald-600',
  partially_paid: 'bg-amber-500/10 text-amber-600',
  issued: 'bg-blue-500/10 text-blue-600',
  overdue: 'bg-red-500/10 text-red-600',
  draft: 'bg-zinc-500/10 text-zinc-600',
  void: 'bg-zinc-500/10 text-zinc-600',
  written_off: 'bg-slate-500/10 text-slate-600',
}

export const STATUS_TEXT_COLORS: Record<string, string> = {
  paid: 'text-emerald-600',
  partially_paid: 'text-amber-600',
  issued: 'text-blue-600',
  overdue: 'text-red-600',
  draft: 'text-zinc-600',
  void: 'text-zinc-600 line-through',
  written_off: 'text-slate-600 line-through',
}

/**
 * Format a status string into a human-readable label.
 * e.g. "partially_paid" → "Partially Paid", "converted" → "Invoiced"
 */
export function formatStatusLabel(status: string): string {
  if (status === 'converted') return 'Invoiced'
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}
