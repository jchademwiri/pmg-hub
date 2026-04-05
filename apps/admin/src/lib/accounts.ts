export const ACCOUNT_KEYS = ['salary', 'pmg_share', 'reinvest', 'reserve', 'flex'] as const
export type AccountKey = typeof ACCOUNT_KEYS[number]

export const ACCOUNT_LABELS: Record<string, string> = {
  salary:    'Salary',
  pmg_share: 'PMG Share',
  reinvest:  'Reinvest',
  reserve:   'Reserve',
  flex:      'Flex',
}

/** YTD profit pool share per account (must sum to 1.0) */
export const ACCOUNT_RATES: Record<AccountKey, number> = {
  salary:    0.35,
  pmg_share: 0.20,
  reinvest:  0.30,
  reserve:   0.30,
  flex:      0.05,
}

// Note: pmg_share is 20% of revenue (not profit pool).
// salary, reinvest, reserve, flex are % of profit pool.
// The page handles this distinction when computing balances.
