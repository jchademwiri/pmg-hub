# 2. Treasury Reserves & Savings

> Learn how to track emergency cash buffers, tax reserves, notice deposits, and interest yield in PMG Hub.

---

## Why Manage Treasury Reserves?

Sound financial governance requires separating daily operating cash flow from long-term reserves:

1. **Tax & VAT Reserve**: Setting aside 15% VAT and 27% provisional corporate income tax immediately when client invoices are paid.
2. **Emergency Runway**: Maintaining 3 to 6 months of fixed overhead (salaries, software, hosting) in liquid reserve.
3. **Growth & Capital Expansion**: Allocating retained earnings for hardware upgrades or strategic domain acquisitions.

---

## Navigating The Savings Subsystem

In `apps/admin -> /savings`:

- **Total Vault Balance**: Aggregated cash value stored across all interest-bearing reserve accounts.
- **Account List**: Shows each individual savings vault (e.g. _FNB Money Maximiser_, _Standard Bank 32-Day Notice_, _Investec Treasury_).
- **Target Progress**: Visual progress bars tracking accumulated savings toward financial reserve goals.
- **Interest Earned**: Tracks monthly yield distributions credited to the business.

---

## Recording Transfers & Interest

1. **Transfer to Savings**: When moving operating funds to a savings account, record a transfer:
   ```text
   DR 1050 Savings & Reserve Vault (Asset)
      CR 1000 Bank Operating Account (Asset)
   ```
2. **Recording Interest Received**: When the bank pays monthly interest yield:
   ```text
   DR 1050 Savings & Reserve Vault (Asset)
      CR 4900 Finance & Interest Income (Revenue)
   ```
