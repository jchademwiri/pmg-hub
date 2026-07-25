# PMG Hub — Phase 8 Revision: AR-Based Journal Posting & Backfill

**Repository:** `jchademwiri/pmg-hub` (dev branch, commit `2f8db49`)
**Supersedes:** the cash-basis description of Phase 8 in `docs/finance/pmg-hub-finance-billing-accounting-implementation-plan-v2.md`
**Status:** ready for a decision (section 1), then ready to hand to Kiro phase by phase (section 10)

This revision was produced by cloning the dev branch and reading the actual files, not by re-describing the prior brief. Several things in the prior brief turned out not to match what's in the repo — those are called out explicitly below so nothing gets implemented against a false premise.

---

## 0. What's actually in the dev branch right now

- **No journal posting code exists for invoices or payments yet.** `billing-invoices.ts` and `billing-payments.ts` contain zero references to `journal`, `chartAccounts`, or `accounting`. The accounting module (`chart_accounts`, `journal_entries`, `journal_lines`, `accounting_periods`, manual entry CRUD, trial balance, P&L, general ledger, period locking) is real and already built — but it is a **manual-entry-only** system today. Nothing in billing talks to it.
- **Migration `0022_reclassify_pmg_share_revenue.sql` does not exist.** The newest migration is `0021_old_vapor.sql`. There has been no reclassification commit.
- **The current seed (`packages/db/src/seed-accounting.ts`) has the opposite of what the prior brief assumed:** `1020` is a generic `"Savings Account"`, and `4020` is `"PMG Share Revenue"` with **type `revenue`** — i.e. PMG Share is still mis-classified as income today, not as an asset. This is the bug the prior brief said was already fixed; it isn't yet.
- **VAT Output (`2020`) and VAT Input (`2030`) are seeded active** (`isActive` defaults to `true` and the seed never overrides it). This confirms issue #7 from the prior brief — it's a real, present gap, not a hypothetical.
- **Three invoice paths transition `draft → issued`**, confirmed by reading the code, not by guessing: `issueInvoice()`, `bulkIssueInvoices()` (both in `billing-invoices.ts`), and an auto-issue-on-successful-send block in `email-delivery.ts` (~line 287).
- **There are more money-affecting payment paths than the prior brief scoped.** `billing-payments.ts` has `recordClientPayment` (create), `adjustClientPayment` (LIFO/FIFO reallocation when the amount changes), `updateClientPayment`, and `deleteClientPayment` → `deleteIncome` (delete, with invoice-status reversion). The prior brief only talked about "record." Any plan that posts journals on create but ignores adjust/update/delete will drift out of sync the first time a payment is corrected.
- **`markInvoicePaid` is a separate shortcut** that inserts an `income` row directly for the full invoice total and can move an invoice straight from `draft` to `paid` — it never requires the invoice to have passed through `issued` first. This matters once AR posting exists (section 4).
- **The DB client cannot run transactions.** `packages/db/src/client.ts` builds `drizzle(sql, { schema })` from `drizzle-orm/neon-http`. I installed that exact package version and read the source: `NeonHttpSession.transaction()` and `NeonTransaction.transaction()` both literally do `throw new Error("No transactions support in neon-http driver")`. Phase 5 of the prior brief ("wrap billing and journal posting writes in database transactions") cannot be implemented as written on this stack — see section 7 for the actual mechanism this codebase already uses instead.
- **A working atomic pattern already exists in the codebase** and should be reused, not reinvented: `packages/db/src/lib/document-numbers.ts` generates invoice/quote numbers with a single `INSERT ... ON CONFLICT (...) DO UPDATE ... RETURNING` round trip, with a comment explicitly noting it's "compatible with the neon-http driver." Journal entry numbering (`getNextJournalEntryNumber` in `queries/accounting.ts`) does **not** use this pattern — it does a plain `SELECT ... ORDER BY DESC LIMIT 1` and is racy under concurrent posts.
- **A separate, already-shipped PMG Share mechanism exists and is unrelated to the chart of accounts.** `packages/db/src/accounts.ts` defines `ACCOUNT_RATES.pmg_share = 0.25` (25%, confirmed correct per `docs/finance/.../v2.md` section 6.1 — an earlier 20% figure was a draft, not current). `apps/admin/src/lib/financial.ts` computes `pmgShare = totalRevenue(cash-basis, from the income table) * 0.25` and tracks "spent" amounts against it via a separate `ledger` table (`salary`/`reinvest`/`reserve`/`flex`/`pmg_share` buckets). This is a virtual envelope-budgeting system, not double-entry bookkeeping, and it has no connection to `chart_accounts`/`journal_entries`. Section 5 covers how the new work should relate to it.
- **The master plan's Phase 8, as currently written, is cash-basis only** (`Dr Bank / Cr Sales Revenue` straight from `income`, no AR involved at all) — and `packages/db/src/backfill-accounting.ts` already implements exactly that for `income` and `expenses`. It posts every income row at face value to the single generic `4010 Sales Revenue` account, with no division split and no PMG transfer. This is the most important finding in this review — see section 1.

---

## 1. Decision required before any code changes

The document under review asks for **accrual-basis** posting: `Dr AR / Cr Revenue` at invoice **issuance**, regardless of whether cash has been received, with AR tracking issued/unpaid/partially-paid balances. The **existing, already-implemented** `backfill-accounting.ts` and the master plan's Phase 8 are **cash-basis**: journal entries only exist for `income` rows, posted at receipt, with no AR account ever touched.

These are two different accounting models, not an implementation detail. Accrual basis is the right fit for a tender/services business that issues invoices with 30-day terms and needs to know what's outstanding — and it's what the document under review explicitly asks for ("Accounts Receivable must show balances for issued, unpaid, and partially paid invoices"). My recommendation is to go accrual, and to treat this document as a deliberate supersession of the cash-basis Phase 8 description, not a misunderstanding to reconcile away.

If that's confirmed, two things need to happen before Kiro touches code:

1. `docs/finance/pmg-hub-finance-billing-accounting-implementation-plan-v2.md` section 6.4 and Phase 8 need to be rewritten to describe the AR-based model (this doc can be merged into it once approved).
2. If `backfill-accounting.ts` has already been run against any real environment, every journal entry it created with `source_table = 'income'` was posted under the cash-basis rule and will double-count revenue once the accrual-basis entries exist alongside them. These need to be voided before the new backfill runs (section 8 has the pre-flight check).

If accrual basis is *not* what's wanted after all, most of sections 2–6 below still apply (account mapping, atomicity, idempotency, VAT fix) — only section 4's AR-specific posting calls and section 8's backfill design would change to mirror the existing cash-basis pattern instead.

---

## 2. Revenue account mapping (corrects the prior brief's account-code conflict)

The prior brief's Phase 4 proposed `4010 TES / 4020 AWS / 4030 PMG`. That collides directly with what's actually seeded: `4020` already means "PMG Share Revenue" (the very account being reclassified away from revenue), and `4030` is already "Interest Income," a real, distinct account. Reusing those codes for something else would make every historical journal line pointing at them report under the wrong label.

Recommended mapping, using only currently-unused codes:

```
4010  Sales Revenue            → retire (isActive: false). Legacy, pre-division-split catch-all.
4011  TES Revenue               → new
4012  AWS Revenue                → new
4013  PMG Professional Services Revenue → new (also the default/fallback bucket)
4020  PMG Share Revenue          → retire (isActive: false, isPostingAccount: false).
                                    Rename to "PMG Share Revenue (legacy — superseded by 1020)" so anyone
                                    looking at old reports understands why it's dead, not just inactive.
4030  Interest Income            → unchanged
4040  Other Income               → unchanged, catch-all for non-division income
1020  Savings Account            → target of the PMG 25% transfer (Dr here / Cr 1010).
                                    Open question for Jacob, not Kiro: is 1020 meant to be PMG-share-only,
                                    or a shared savings account for other purposes too? If shared, the
                                    transfer entries' description should make clear which portion is PMG
                                    share so the account can still be filtered/reported separately.
```

Divisions are free-text (`divisions.name`, no category enum), so account resolution should reuse the **same substring-matching convention already used elsewhere in this codebase** (`billing-payments.ts` and `email-delivery.ts` both already do `name.toLowerCase().includes('tender')` / `includes('apex')` to pick a Resend API key) rather than inventing a new mapping mechanism or adding a schema column:

```ts
function resolveRevenueAccountCode(divisionName: string): string {
  const n = divisionName.toLowerCase();
  if (n.includes('tender')) return '4011'; // TES
  if (n.includes('apex'))   return '4012'; // AWS
  return '4013';                            // PMG Professional Services (default)
}
```

Pre-flight check before retiring `4010`: if `backfill-accounting.ts` has ever run, `4010` will have real posted lines. Section 8 covers voiding those as part of the cash→accrual transition — don't just flip `isActive` on an account with live balances without also dealing with what's posted to it.

---

## 3. Shared posting module

`apps/admin/src/lib/accounting/posting.ts` — build this **before** wiring any caller (this reorders the prior brief's Phase 1/Phase 2, which had Kiro route every issue path through a posting function *before* that function existed, guaranteeing rework).

Exports:

- `resolveRevenueAccountForDivision(divisionId)` — looks up the division name once, applies the mapping in section 2, returns the chart account id.
- `postInvoiceIssuedEntry({ invoiceId, divisionId, amount, documentNumber, entryDate, userId })` — `Dr 1100 AR / Cr <division revenue>`.
- `postPaymentReceiptEntry({ incomeId, allocations, totalAmount, entryDate, userId })` — `Dr 1010 Bank / Cr 1100 AR (sum of allocations) / Cr 2200 Client Credits (unallocated remainder, if any)`.
- `postPmgShareTransferEntry({ incomeId, totalAmount, entryDate, userId })` — `Dr 1020 Savings / Cr 1010 Bank`, for `totalAmount * getActiveRates(entryDate).pmg_share`. **Pull the rate from the existing `getActiveRates()` function, don't hardcode `0.25`.** The master plan's section 6.3 already establishes that distribution rates are effective-dated and can change mid-month; a hardcoded 25% in the new posting code would silently ignore that rule the next time the rate changes, while `financial.ts` honors it correctly.
- `voidEntryForSource(sourceTable, sourceId, reason, userId)` — for invoice void and payment delete/adjust paths (section 4).
- `journalEntryExistsForSource(sourceModule, sourceTable, sourceId)` — existence check, but see section 7 for why this alone isn't sufficient for duplicate prevention.
- `getNextJournalEntryNumberAtomic()` — replacement for the racy current implementation (section 7).

---

## 4. Wiring every status-change and money-mutation path

In this order, once the module above exists and has its own unit tests:

- **`issueInvoice`** — call `postInvoiceIssuedEntry` after (or batched with, see section 7) the status update.
- **`bulkIssueInvoices`** — loop the same call per eligible invoice. This is sequential admin-triggered work, not a hot path, so N separate atomic batches is fine; don't try to merge N invoices into one journal entry.
- **`email-delivery.ts`'s auto-issue-on-send block** — same call, same place the status flip already happens.
- **`markInvoicePaid`** — this one needs a decision, not just a wire-up. It currently allows `draft → paid` in a single step with no issuance event in between. Once AR posting exists, either (a) require the invoice to already be `issued`/`overdue` before this function will mark it paid — the clean option, keeps "issue then pay" as the only path and gives every invoice exactly one AR-creation moment — or (b) have the posting module synthesize the AR-then-receipt pair atomically when this shortcut is used on a still-draft invoice. (a) is recommended; it's a small UI/validation change versus a special-cased posting branch that's easy to forget about later.
- **`recordClientPayment`** — see section 7 for the required refactor (read-all-then-write-all) before this can be safely batched with `postPaymentReceiptEntry` and `postPmgShareTransferEntry`.
- **`adjustClientPayment`** — must post a correcting entry (or a void + repost pair), never mutate the lines of an already-posted entry in place. This path exists specifically to change a payment's amount after the fact with LIFO/FIFO reallocation; the prior brief didn't account for it at all.
- **`updateClientPayment`** — same treatment as `adjustClientPayment`. Worth Kiro reading this function's actual diff against `recordClientPayment` before assuming it needs identical handling — it wasn't in the original scope and may have different semantics.
- **`deleteClientPayment` → `deleteIncome`** — must void the payment-receipt entry and the PMG-transfer entry for that `income.id`, in the same operation that already reverts invoice statuses. Don't hard-delete posted journal entries; void them with a reason referencing the deletion.
- **`voidInvoice`** — already calls `reverseCreditApplication`; add a step to void the AR/Revenue entry for that invoice if one exists (only relevant once the invoice has passed `issued` — draft invoices never get one).

---

## 5. Relationship to the existing PMG-share envelope system

`financial.ts`/`ledger`/`ACCOUNT_RATES` already compute "expected PMG share" (25% of cash-basis revenue) and track withdrawals against it. That system is not being replaced by this work and shouldn't be — it answers a different question ("how much is available to spend from this bucket right now") than the books answer ("what actually happened, in order, with an audit trail"). Two things to do so they don't quietly drift apart:

1. Both systems should read the PMG rate from the same place (`getActiveRates()`), which section 3 already requires for the new posting code.
2. The `1020` Savings Account's posted balance and `financial.ts`'s `pmgShare.expected` figure will not always match exactly, and that's expected, not a bug: the posted balance reflects cash actually transferred via `postPmgShareTransferEntry`, while the envelope figure is a running entitlement calculation that doesn't require the transfer to have physically happened. Wherever Jacob ends up looking at both numbers side by side (likely the existing distributions/dashboard pages), a one-line note explaining the difference will save a future "why don't these match" investigation.

Out of scope here, but worth recording rather than silently dropping: `account-withdrawal.ts` currently only writes to the `ledger` table for salary/reinvest/reserve/flex withdrawals — none of that posts to `journal_entries` either. The master plan's stated end goal is a real accounting system, which implies those withdrawals eventually need `Dr Owner's Drawings / Cr Bank`-style entries too. That's a future phase, not this one.

---

## 6. VAT safety fix

`seed-accounting.ts` seeds `2020 VAT Output` and `2030 VAT Input` with no `isActive: false` override, so they come in active. Fix the seed, and add a one-off migration to deactivate them in any environment where the seed has already run (the seed script is idempotent-skip on existing codes, so re-running it after the fix won't touch rows that already exist). `vatEnabled` on quotes/invoices already defaults to `false` at the schema level — that part's fine, no change needed there.

---

## 7. Atomicity and idempotency mechanics

Since `db.transaction()` is unavailable (section 0), use the pattern this codebase already trusts in `document-numbers.ts`, extended one step further with `drizzle`'s `db.batch()`, which **is** supported on `neon-http` (it compiles down to Neon's own HTTP batch-transaction endpoint — confirmed by reading `node_modules/drizzle-orm/neon-http/session.js`). The catch: every query in a batch must be fully built before any of them run, so nothing in the batch can depend on a `.returning()` result from an earlier query in the *same* batch.

The fix is to generate IDs in application code instead of relying on the DB's `defaultRandom()`:

```ts
import { randomUUID } from 'crypto';

const entryId = randomUUID();
const lineIds = lines.map(() => randomUUID());

await db.batch([
  db.insert(journalEntries).values({ id: entryId, entryNumber, /* ... */ }),
  ...lines.map((line, i) =>
    db.insert(journalLines).values({ id: lineIds[i], journalEntryId: entryId, ...line })
  ),
  db.update(invoices).set({ status: 'issued' /* etc. */ }).where(eq(invoices.id, invoiceId)),
]);
```

This gives true all-or-nothing atomicity for "post the entry + its lines + flip the related status" in one HTTP round trip, with no driver migration required.

**`recordClientPayment` needs a structural change before it fits this pattern**, because today it reads an invoice's allocation sum, decides the resulting status, and writes — per invoice, in a loop — meaning later writes depend on earlier reads within the same operation. Refactor it to: (1) fetch all relevant invoices and their existing allocation sums up front in one or two queries, (2) compute every resulting status and the receipt/PMG-transfer journal entries entirely in memory, (3) issue one `db.batch()` with all the inserts and updates. This is a real refactor, not a one-line wrapper — flag it as such when scoping the work, it's the most involved piece of this plan.

**Idempotency** needs a database-level backstop, not just an application-level "check then insert," because that check-then-insert has a race (two near-simultaneous calls can both pass the check before either commits). Add a migration:

```sql
ALTER TABLE journal_entries
  ADD CONSTRAINT journal_entries_source_unique
  UNIQUE (source_module, source_table, source_id);
```

Use distinct `source_module` values for distinct logical events on the same row (e.g. `'invoice_issue'` vs `'invoice_void_reversal'`) so a legitimate reversal entry doesn't collide with the original — while two redundant issue-postings against the same invoice correctly do collide and get rejected. Posting functions should catch the resulting unique-violation (Postgres error `23505`) and treat it as "already posted, nothing to do" rather than surfacing an error to the user.

**Journal entry numbering** (`getNextJournalEntryNumber`) should move to the same atomic-upsert idiom as `getNextDocumentNumber` — a small dedicated sequence table keyed by year, incremented via `INSERT ... ON CONFLICT ... DO UPDATE ... RETURNING` — rather than the current `SELECT ... ORDER BY DESC LIMIT 1`, which two concurrent posts (e.g. bulk issue firing in quick succession) can both read identically and then both increment to the same next number.

---

## 8. Backfill — extend the existing script, don't fork a new one

`backfill-accounting.ts` already has the right shape (idempotent via `source_table`/`source_id` check, account lookup by code, period auto-creation) — extend it rather than creating a second, parallel backfill file as the prior brief suggested.

1. **Pre-flight cleanup.** Check whether any `journal_entries` rows exist with `source_table = 'income'` from a previous run of the cash-basis logic. If so, void them (`status = 'void'`, `voidReason = 'superseded by accrual-basis Phase 8 revision'`) before posting anything new, so revenue isn't counted twice under two different models.
2. **Add invoice backfill.** For every invoice with status `issued`, `overdue`, `partially_paid`, or `paid` that has no `source_table = 'invoices'` entry, post `Dr AR / Cr <division revenue>` dated at `invoiceDate`, using the mapping in section 2.
3. **Replace the income backfill's posting logic.** Instead of a flat `Dr Bank / Cr 4010` per income row, use `payment_allocations` to post `Dr Bank / Cr AR (per allocated invoice) / Cr Client Credits (unallocated remainder)`, plus the PMG transfer entry — using `getActiveRates(row.date).pmg_share` for the rate **as of that historical date**, which matters if the rate has ever changed (section 6.3 of the master plan already requires effective-dated rates; the backfill needs to honor that for old data, not just apply today's rate retroactively).
4. **Leave expense backfill untouched** — out of scope for this revision.
5. **Document, in the script's own header comment, whether historical PMG transfers are included** in a given backfill run, since that's exactly the kind of thing someone re-reading this script in six months will need to know without re-deriving it.

---

## 9. Tests

New file: `apps/admin/src/__tests__/accounting-posting.test.ts`, following the existing mock-`db` Vitest convention used in `billing-invoices.test.tsx` (`vi.fn()` spies on insert/select/update, no real database). Minimum coverage:

- Issuing an invoice posts a balanced `Dr AR / Cr <correct division revenue>` entry.
- Bulk issue posts one entry per eligible invoice; re-running it doesn't double-post the ones already issued.
- The email-delivery auto-issue path posts the identical entry shape as `issueInvoice`.
- A full payment posts `Dr Bank / Cr AR` plus a PMG transfer using whatever `getActiveRates()` returns for that date (not a hardcoded 25%).
- A partial payment reduces AR by the allocated amount only, leaving the correct remaining balance.
- An overpayment posts `Cr Client Credits` for the unallocated portion.
- `adjustClientPayment` and `deleteClientPayment` post correcting/void entries and never mutate an existing posted entry's lines.
- Calling issue or payment-recording twice for the same source row does not create a second entry (exercises the unique constraint path, not just the app-level check).
- Trial balance continues to exclude `draft`/`void` entries post-change (regression test pinning existing, correct behavior in `getTrialBalance`).
- VAT-disabled invoices never produce a line against `2020` or `2030`.

---

## 10. Delivery order

**Phase A — Decision sign-off.** Confirm accrual basis with Jacob (section 1). Update `docs/finance/.../v2.md` section 6.4 and Phase 8 to match. No code yet.

**Phase B — Chart of accounts correction.** Add `4011`/`4012`/`4013`, retire `4010`/`4020` per section 2, fix the VAT seed (section 6). Migration + updated seed script.

**Phase C — Shared posting module.** Build `posting.ts` (section 3) with the atomicity/idempotency mechanics from section 7, including its own unit tests, before touching any caller.

**Phase D — Wire invoice-issue paths.** `issueInvoice`, `bulkIssueInvoices`, `email-delivery.ts`, and the `markInvoicePaid` draft-skip decision (section 4).

**Phase E — Refactor and wire payment paths.** Read-all-then-write-all refactor of `recordClientPayment` (section 7), then wire `recordClientPayment`, `adjustClientPayment`, `updateClientPayment`, `deleteClientPayment`/`deleteIncome`, and `voidInvoice` (section 4).

**Phase F — Backfill.** Pre-flight void of any stale cash-basis entries, then run the extended `backfill-accounting.ts` (section 8) against a copy of production data first.

**Phase G — Verification.** Full test suite, typecheck, lint. Update the master plan doc to mark this phase done. PR summary covering before/after accounting flow, AR behavior, PMG savings behavior, migration/backfill notes, and any manual steps required after deploy (run the migration, run the backfill once).

---

## Done when

- AR shows correct outstanding balances for issued/overdue/partially-paid invoices, reconciling against `payment_allocations` totals.
- Trial balance balances after backfill.
- Re-running backfill, or re-triggering any issue/payment action, never creates a duplicate entry.
- The `1020` Savings Account balance reflects 25%-of-receipts transfers using the live (and, for backfilled data, historically correct) distribution rate.
- VAT accounts are inactive and no VAT lines are posted anywhere.
- `docs/finance/pmg-hub-finance-billing-accounting-implementation-plan-v2.md` section 6.4 / Phase 8 is updated to match what was actually implemented.

## Explicitly deferred (not dropped, just not this phase)

- Posting salary/reinvest/reserve/flex withdrawals (`account-withdrawal.ts`) to the formal books.
- Unifying or deprecating the `financial.ts` envelope system once the books are trustworthy enough to replace it.
- Rounding rule for the PMG transfer when an amount isn't evenly divisible (round to the nearest cent and let small remainders accumulate, unless Jacob wants something stricter).
- VAT-aware posting variant for if/when VAT registration happens — already flagged in the master plan's section 6.4/8.2, no new decision needed here.
