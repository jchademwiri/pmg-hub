# 📄 PMG Billing System — Complete Guide

> **Billing 101 for non-accountants.** This guide explains how invoicing, quotes, payments, and client billing work in plain language — with real examples from your business.

---

## What Is the Billing Module?

The **Billing** module is where you:
- Send **quotes** to potential clients
- Issue **invoices** for work completed
- Record **payments** clients send you
- Issue **credit notes** when you need to refund or adjust
- Manage **billing accounts** and client statements

Think of it as your **cash register** — this is where money starts its journey into the accounting system.

---

## Table of Contents

| # | Topic | What It Covers |
|---|-------|----------------|
| 1 | **Invoices** | Creating, issuing, and managing invoices — the core of your billing |
| 2 | **Quotes** | Sending price estimates to clients before work starts |
| 3 | **Payments** | Recording money received from clients |
| 4 | **Credit Notes** | Adjusting invoices when things change |
| 5 | **Billing Accounts** | Per-client accounts that track what each client owes |
| 6 | **Items** | Your product/service catalogue — reusable line items |
| 7 | **Statements** | A summary of all activity for a client over time |

---

## 1. Invoices

### What Is an Invoice?

An invoice is a **bill you send to a client** for work performed. It says: "Here's what we did, here's what it costs, please pay by this date."

### Invoice Statuses

| Status | Meaning | What You Should Do |
|--------|---------|-------------------|
| **Draft** | Not yet sent to the client | Finish editing, then issue it |
| **Issued** | Sent to the client, awaiting payment | Wait for payment |
| **Paid** | The client has paid the full amount | Nothing — it's complete ✅ |
| **Partially Paid** | Some money received, not the full amount | Follow up for the balance |
| **Overdue** | Past the due date, not yet paid | Send a reminder to the client |
| **Void** | Cancelled — no longer valid | Keep for audit trail |

### How Invoices Flow Into Accounting

When you **issue** an invoice, the system automatically creates a journal entry:

```
DR  Accounts Receivable (1100)  →  R5,000  (the client owes you)
CR  Sales Revenue (4010)        →  R5,000  (you earned it)
```

When the client **pays**, another entry is created:

```
DR  Business Cheque Account (1010)  →  R5,000  (money arrived in bank)
CR  Accounts Receivable (1100)      →  R5,000  (the client no longer owes)
```

**You don't need to create these entries manually.** The system handles it.

### Invoice Numbering

Invoices are auto-numbered: `DIV-INV-YYYY-NNN` (e.g., `PMG-INV-2026-001`).

---

## 2. Quotes

### What Is a Quote?

A **quote** (or quotation) is a price estimate you send to a potential client **before** they commit to work. It lists the services, quantities, and prices.

### Quote Statuses

| Status | Meaning |
|--------|---------|
| **Draft** | Being prepared, not yet sent |
| **Sent** | Sent to the client, awaiting their decision |
| **Accepted** | The client agreed — now create an invoice from this quote |
| **Declined** | The client said no |
| **Expired** | The quote's validity period has passed |

### Quotes vs Invoices

| Quote | Invoice |
|-------|---------|
| Sent **before** work starts | Sent **after** work is done or agreed |
| An estimate, not a demand for payment | A demand for payment |
| No accounting impact | Creates journal entries |
| Can be declined | Must be paid or disputed |

### Quick Workflow

```
Create Quote → Send to Client → Client Accepts → Convert to Invoice → Client Pays
```

---

## 3. Payments

### What Is a Payment?

A **payment** is money received from a client. You record it against an invoice.

### How It Works

1. Client sends money to your bank account (EFT, cash, card)
2. You go to **Payments** and record it
3. You allocate the payment to one or more invoices
4. The system updates the invoice status (paid, partially paid)
5. The system creates the journal entries automatically

### Payment Allocation

If a client owes on multiple invoices, one payment can be split across them:

| Invoice | Amount Owed | Paid | Remaining |
|---------|-------------|------|-----------|
| PMG-INV-2026-001 | R2,000 | R2,000 | R0 ✅ |
| PMG-INV-2026-002 | R1,500 | R500 | R1,000 |
| PMG-INV-2026-003 | R850 | R0 | R850 |

Total payment: **R2,500**

### What Gets Posted to Accounting

For every payment, the system creates **2 journal entries**:

**Entry 1 — Cash received:**
```
DR  Business Cheque Account (1010)  →  full amount
CR  Accounts Receivable (1100)      →  full amount
```

**Entry 2 — PMG Share allocation (25% to savings):**
```
DR  Savings Account (1020)          →  25% of amount
CR  Business Cheque Account (1010)  →  25% of amount
```

---

## 4. Credit Notes

### What Is a Credit Note?

A **credit note** (or credit memo) is a document that reduces the amount a client owes. You issue one when:
- You overcharged a client
- The client returned goods or cancelled a service
- You need to write off an unpaid amount

### Accounting Impact

A credit note reverses the original invoice:

```
CR  Accounts Receivable (1100)      →  R500  (client owes less)
DR  Sales Revenue (4010)            →  R500  (revenue reduced)
```

---

## 5. Billing Accounts

### What Is a Billing Account?

Each client has a **billing account** that tracks:
- All invoices sent to them
- All payments received from them
- Their current balance (what they owe)
- Their payment history

### Aging Report

The aging report shows **who owes you what, and for how long**:

| Bucket | Meaning | Risk |
|--------|---------|------|
| **Current** | Less than 30 days old | Low |
| **30 Days** | 31–60 days overdue | Medium |
| **60 Days** | 61–90 days overdue | Medium-High |
| **90 Days** | 91+ days overdue | High — follow up urgently |

---

## 6. Items

### What Are Items?

**Items** are your reusable product/service catalogue. When you create an invoice or quote, you select items from this list instead of typing everything from scratch.

Example items:
- `Website Design — R5,000`
- `Monthly SEO — R1,500`
- `Tender Document Review — R2,500`
- `Graphic Design per hour — R350`

### Why Use Items?

- **Consistency** — Same prices every time
- **Speed** — No retyping descriptions
- **Reporting** — See which services make the most money

---

## 7. Statements

### What Is a Statement?

A **statement** is a summary of all activity for a client during a period. It shows:
- Opening balance (what they owed at the start)
- New invoices
- Payments received
- Credit notes
- Closing balance (what they owe now)

Statements are useful for:
- Sending to clients who ask "what do I owe?"
- Your own record-keeping
- Following up on overdue amounts

---

## How Billing Connects to the Rest of the System

```
Quotes → (accepted) → Invoices ← Payments → Income (Finance)
                                                 ↓
                                          Accounting Module
                                     (journal entries created)
                                                 ↓
                                          Trial Balance
                                          Profit & Loss
                                          Financial Reports
```

Everything flows from **Billing → Income → Accounting** automatically.

---

## Quick Reference

| I want to... | Go to... | Notes |
|-------------|----------|-------|
| Send a quote | `/billing/quotes` | Create, then mark as Sent |
| Issue an invoice | `/billing/invoices` | Create from quote or from scratch |
| Record a payment | `/billing/payments` | Allocate to the correct invoice(s) |
| Refund a client | `/billing/credits` | Create a credit note |
| See what a client owes | `/billing/accounts` | Check their billing account |
| View payment history | `/billing/statements` | Generate a client statement |
| Manage your service catalogue | `/billing/items` | Add/edit your products/services |
| Check who's overdue | Billing Overview | Aging report on the overview page |

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "I issued an invoice with the wrong amount" | Void the invoice and create a new one |
| "A client paid but the invoice still shows issued" | Record the payment and allocate it to the invoice |
| "I need to split a payment across invoices" | Use the payment allocation screen |
| "A client wants a refund" | Create a credit note against the original invoice |
| "My quote was accepted, now what?" | Convert the quote to an invoice from the quotes page |
| "The aging report doesn't look right" | Check that all payments are allocated correctly |
