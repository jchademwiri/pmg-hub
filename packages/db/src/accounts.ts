export const ACCOUNT_KEYS = ['salary', 'reinvest', 'reserve', 'flex', 'pmg_share'] as const
export type AccountKey = typeof ACCOUNT_KEYS[number]

export const ACCOUNT_LABELS: Record<string, string> = {
  salary:    'Salary',
  reinvest:  'Reinvest',
  reserve:   'Reserve',
  flex:      'Flex',
  pmg_share: 'PMG Share',
}

/** YTD profit pool share per account (must sum to 1.0) */
export const PROFIT_POOL_RATES = {
  salary:   0.35,
  reinvest: 0.30,
  reserve:  0.30,
  flex:     0.05,
} as const

// Note: pmg_share is 25% of revenue (not profit pool).
// It is intentionally excluded from PROFIT_POOL_RATES.
export const ACCOUNT_RATES: Record<AccountKey, number> = {
  ...PROFIT_POOL_RATES,
  pmg_share: 0.25,
}

// TODO: make this dynamic — admin should be able to lock/unlock any account
// from settings without a code change.
export const LOCKED_ACCOUNTS = ['pmg_share', 'flex'] as const
