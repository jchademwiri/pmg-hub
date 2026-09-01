# 3. Expenses, Categories & Receipt Attachments

> Expenses represent all operational and capital expenditures. Attaching verifiable receipts ensures seamless tax compliance and audit readiness.

---

## When To Record An Expense

Record an expense as soon as business funds leave any bank account, corporate card, or petty cash:

- Software subscriptions (GitHub, Vercel, Resend, Claude/OpenAI, Figma)
- Cloud infrastructure & domain renewals
- Travel, vehicle fuel, and client meetings
- Office supplies and printing
- Subcontractor and freelance developer payments
- Banking fees and statutory compliance costs

---

## The Expense Workflow & Cloudflare R2 Receipt Uploads

```text
1. Open Finance -> Expenses -> Add Expense
2. Enter Date, Amount (ZAR), Division (PMG/TES/AWS), and Category
3. Attach Proof of Payment / Supplier Invoice / Receipt (PDF or Image)
4. File is securely uploaded to Cloudflare R2 with session authorization
5. Double-entry accounting journal is generated automatically
```

---

## Attaching Receipts (Cloudflare R2 Object Storage)

- **Supported Formats**: PDF, PNG, JPG, WebP.
- **Secure Access**: Receipts are stored in Cloudflare R2 and protected by session-guarded routes. Only authenticated team members with valid permissions can preview or download attached receipts.
- **Tax Compliance**: In SARS audits, every claimed business expense must have an accompanying invoice or receipt reflecting VAT and supplier details.

---

## Why Categories Matter

Expense categories map directly to the **Chart of Accounts** and determine how costs appear in the **Profit & Loss Statement** and tax reports:

| Category                     | Typical Items                           | Accounting Account            |
| :--------------------------- | :-------------------------------------- | :---------------------------- |
| **Hosting & Infrastructure** | Vercel, AWS, Cloudflare, Domains        | `5010 Cloud & Hosting`        |
| **Software & Subscriptions** | Google Workspace, Figma, JetBrains      | `5020 Software & SaaS`        |
| **Contractor & Freelance**   | External designers, developers, writers | `5030 Subcontractor Fees`     |
| **Travel & Transport**       | Petrol, Uber, flights, parking          | `5040 Travel & Accommodation` |
| **Office & Printing**        | Paper, ink, tender binding              | `5050 Office Supplies`        |
| **Professional & Legal**     | Accountant fees, legal retainers, CIPC  | `5060 Professional Fees`      |
| **Bank Charges**             | Account maintenance fees, EFT fees      | `5070 Bank Fees`              |

---

## Double-Entry Accounting Entry

When an expense is recorded, the system automatically posts:

```text
DR 5010 Cloud & Hosting Expense (Expense)     R 1,500.00
   CR 1000 Bank Operating Account (Asset)         R 1,500.00
```
