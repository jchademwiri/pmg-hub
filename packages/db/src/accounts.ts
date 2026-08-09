export const ACCOUNT_KEYS = ['pmg_share'] as const
export type AccountKey = typeof ACCOUNT_KEYS[number]

export const ACCOUNT_LABELS: Record<string, string> = {
  pmg_share: 'PMG Share',
}

// Note: pmg_share is 25% of revenue.
export const ACCOUNT_RATES: Record<AccountKey, number> = {
  pmg_share: 0.25,
}

// TODO: make this dynamic - admin should be able to lock/unlock any account
// from settings without a code change.
export const LOCKED_ACCOUNTS = ['pmg_share'] as const
