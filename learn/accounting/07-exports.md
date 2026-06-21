# 7. Exports — Getting Your Data Out

> **In plain English:** Exports let you download your accounting data as files you can share with your accountant, give to SARS, or use in Excel for your own analysis.

---

## What Are Exports?

Sometimes you need your accounting data outside of this system:
- Your accountant needs it to prepare your annual financial statements
- SARS requires it for tax submissions
- You want to do your own analysis in Excel or Google Sheets
- You need to keep offline backups

**Navigate to:** `/accounting/exports`

For full database backups and restore points, use **Settings -> Data**. Accounting exports are readable CSV files; database backups are recoverable system backups.

---

## What Can You Export?

The Exports page lets you export:

| Data | Format | Use Case |
|------|--------|----------|
| **Chart of Accounts** | CSV/Excel | Share your account structure with your accountant |
| **Journal Entries** | CSV/Excel | Complete record of all transactions |
| **General Ledger** | CSV/Excel | Detailed transaction lines for auditing |
| **Trial Balance** | CSV/Excel | Period-end balance summary |
| **Profit & Loss** | CSV/Excel | Income statement for tax or reporting |

---

## When to Export

| Situation | What to Export |
|-----------|---------------|
| **Tax season** | Trial Balance + P&L + Journal Entries |
| **Accountant review** | Everything (full export) |
| **Monthly reporting** | P&L for the month |
| **Bank reconciliation** | General Ledger filtered to bank account |
| **Audit preparation** | General Ledger + Journal Entries |
| **Personal records** | Full backup periodically |
| **Disaster recovery** | Database backup from Settings -> Data |

---

## How to Use Exports

1. **Navigate to** `/accounting/exports`
2. **Select** the data you want to export
3. **Set any filters** (date range, specific accounts, etc.)
4. **Download** the file
5. **Share** with your accountant or import into Excel

---

## Tips for Working with Exports And Backups

1. **Always export in CSV format** — CSV is universal and opens in any spreadsheet software
2. **Add filters before exporting** — Export only what you need to keep files manageable
3. **Label your files** — Name them clearly (e.g., "PMG_TrialBalance_June2026.csv")
4. **Keep backups** — Confirm automatic database backups are running in Settings -> Data
5. **Share securely** — When sending to your accountant, use encrypted email or a secure file sharing service

---

## For Your Accountant

When sharing data with your accountant, they'll typically want:

1. **Chart of Accounts** — So they understand your account structure
2. **General Ledger** — The complete transaction history
3. **Trial Balance** — The period-end summary
4. **Profit & Loss** — The income statement

This gives them everything they need to prepare your annual financial statements and tax returns.

---

## Common Questions

**Q: What format are the exports in?**
A: CSV (Comma-Separated Values), which opens in Excel, Google Sheets, Numbers, and any spreadsheet application.

**Q: Can I export for a specific period only?**
A: Yes. Use the date range or period filters before exporting to limit the data to what you need.

**Q: Is there an automatic backup feature?**
A: Yes, if Cloudflare R2 backup storage is configured. Check Settings -> Data to confirm backups and retention.

**Q: Can I restore data back into the system?**
A: Exports are not restore files. Use a database backup from Settings -> Data if an admin needs to restore the system.

---

## Recommended Export Schedule

| Frequency | What | Why |
|-----------|------|-----|
| **Monthly** | Trial Balance + P&L | Keep readable monthly records |
| **Quarterly** | Full accounting export | Shareable accountant backup |
| **Annually** | Everything | Year-end records for accountant |
| **On demand** | As needed | Ad-hoc requests from accountant/SARS |
| **Daily, automated** | Database backup | Recovery point, configured in Settings -> Data |
