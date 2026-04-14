export const ACCOUNT_KEYS = ['salary', 'reinvest', 'reserve', 'flex'] as const
export type AccountKey = typeof ACCOUNT_KEYS[number]

export const ACCOUNT_LABELS: Record<string, string> = {
  salary:    'Salary',
  reinvest:  'Reinvest',
  reserve:   'Reserve',
  flex:      'Flex',
}

export const REVENUE_RATES = {} as const

/** YTD profit pool share per account (must sum to 1.0) */
export const PROFIT_POOL_RATES = {
  salary:    0.35,
  reinvest:  0.30,
  reserve:   0.30,
  flex:      0.05,
} as const

// Note: pmg_share is 20% of revenue (not profit pool).
// salary, reinvest, reserve, flex are % of profit pool.
// We export ACCOUNT_RATES for backwards compatibility but typing it carefully.
export const ACCOUNT_RATES: Record<AccountKey, number> = {
  ...REVENUE_RATES,
  ...PROFIT_POOL_RATES,
}
