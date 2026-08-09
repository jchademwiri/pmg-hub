// Regression test for the "303% of total" bug — totalExpenses used to be passed
// in from a different period than expensesByDivision, so percentages could exceed
// 100%. See docs/audits/full-portfolio-audit-2026-07-25.md.

import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import * as fc from 'fast-check'
import { ExpenseSnapshot } from '@/components/dashboard/expense-snapshot'

const divisionArb = fc.record({
  divisionName: fc.string({ minLength: 1, maxLength: 20 }),
  total: fc.integer({ min: 1, max: 1_000_000 }),
})

describe('ExpenseSnapshot percentage invariant', () => {
  it('percentages always sum to ~100% and never exceed 100%, regardless of totals', () => {
    fc.assert(
      fc.property(
        fc.array(divisionArb, { minLength: 1, maxLength: 6 }).map((rows) => {
          // divisionName must be unique — it's used as the React key.
          const seen = new Set<string>()
          return rows
            .map((r, i) => ({ ...r, divisionName: seen.has(r.divisionName) ? `${r.divisionName}-${i}` : r.divisionName }))
            .filter((r) => (seen.has(r.divisionName) ? false : (seen.add(r.divisionName), true)))
        }),
        (expensesByDivision) => {
          const { container, unmount } = render(
            <ExpenseSnapshot divisions={[]} expensesByDivision={expensesByDivision} pmgShareRate={0.25} />,
          )

          const pctMatches = [...container.textContent!.matchAll(/(\d+)% of total/g)].map((m) =>
            Number(m[1]),
          )

          expect(pctMatches).toHaveLength(expensesByDivision.length)
          for (const pct of pctMatches) {
            expect(pct).toBeLessThanOrEqual(100)
          }
          // Rounding each row independently can drift the sum by up to ~1% per row.
          const sum = pctMatches.reduce((a, b) => a + b, 0)
          expect(sum).toBeGreaterThanOrEqual(100 - expensesByDivision.length)
          expect(sum).toBeLessThanOrEqual(100 + expensesByDivision.length)

          unmount()
        },
      ),
    )
  })

  it('shows an empty-state message when there are no divisions', () => {
    const { container } = render(<ExpenseSnapshot divisions={[]} expensesByDivision={[]} pmgShareRate={0.25} />)
    expect(container.textContent).toContain('No expenses recorded yet.')
  })
})
