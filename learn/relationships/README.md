# 🤝 PMG Relationships Module — Complete Guide

> **Relationships 101 for non-accountants.** This guide explains how clients, leads, and divisions work in plain language.

---

## What Is the Relationships Module?

The **Relationships** module is your **address book and sales pipeline** combined. It tracks:

- **Clients** — People and businesses you work with (past and present)
- **Leads** — Potential clients you're trying to win
- **Divisions** — Your business units (PMG, TES, etc.)

Think of it as **your business's relationship brain** — knowing who you work with, who you want to work with, and how each part of your business is performing.

---

## Table of Contents

| # | Topic | What It Covers |
|---|-------|----------------|
| 1 | **Clients** | Managing your active client relationships |
| 2 | **Leads** | Tracking potential clients through your sales pipeline |
| 3 | **Divisions** | Understanding your business units and their performance |

---

## 1. Clients

### What Is a Client?

A **client** is any person or business you've done work for. They're the reason your business exists.

### What You Can See About a Client

Each client record contains:
- **Name** and **contact details**
- **Division** they belong to (PMG, TES, etc.)
- **Billing history** — invoices, payments, outstanding balances
- **Activity timeline** — quotes sent, work done, communications

### Client Financial Health

A client's financial dashboard shows you at a glance:

| Metric | What It Tells You |
|--------|-------------------|
| Total Invoiced | How much you've billed this client |
| Total Paid | How much they've paid |
| Outstanding Balance | What they still owe |
| Last Activity | When you last interacted with them |
| Payment History | Their payment patterns over time |

### Client Statuses

| Status | Meaning |
|--------|---------|
| **Active** | Currently working with them |
| **Inactive** | No current work, but keep the record |
| **Archived** | No longer relevant, but data preserved |

### Why Client Management Matters

- **Know who owes you money** — See outstanding balances at a glance
- **Track payment behaviour** — Who pays on time, who doesn't
- **Improve relationships** — Know when you last engaged with each client

---

## 2. Leads

### What Is a Lead?

A **lead** is a potential client who hasn't bought from you yet. They might have:
- Asked for a quote
- Contacted you through your website
- Been referred by another client
- Met you at a networking event

### Lead Pipeline Stages

| Stage | Meaning | What To Do |
|-------|---------|------------|
| **New** | Just came in | Reach out and introduce yourself |
| **Contacted** | You've reached out | Follow up if no response |
| **Qualified** | They're interested | Send a quote or proposal |
| **Proposal** | Quote sent | Follow up on the quote |
| **Negotiation** | Discussing terms | Work out the details |
| **Won** | They said yes! 🎉 | Convert to client, start work |
| **Lost** | They said no | Ask for feedback, learn |
| **On Hold** | Not now, maybe later | Check back periodically |

### From Lead to Client

```
Lead → Contacted → Qualified → Proposal → Won → CLIENT 🎉
```

When a lead is **Won**, you should:
1. Record them as a **client** in the system
2. Send a **quote** through the Billing module
3. Start **invoicing** them for work

### Lead Sources

Where do your leads come from? Common sources:
- **Website** — Contact form on your site
- **Referral** — Existing client recommended you
- **Social Media** — LinkedIn, Facebook, Instagram
- **Networking** — Events, meetups, conferences
- **Direct** — They reached out to you directly
- **Tender** — Through a tender platform

Tracking lead sources helps you know **where to focus your marketing**.

---

## 3. Divisions

### What Is a Division?

A **division** is a business unit within the PMG group. Each division operates semi-independently with its own:
- Clients
- Revenue
- Expenses
- Distribution rates (PMG share percentage)

### Your Divisions

| Division | Description |
|----------|-------------|
| **PMG** | Playhouse Media Group — core business services |
| **TES** | Tender Edge Solutions — tender support services |

### Division Performance

The Relationships overview shows how each division is performing:

| Metric | What It Tells You |
|--------|-------------------|
| Number of Clients | How many clients each division serves |
| Total Revenue | How much each division has earned |
| Total Expenses | How much each division has spent |
| Net Profit | What each division contributed to the bottom line |

---

## How Relationships Connects to Everything

```
                  ┌─────────────────┐
                  │  Relationships  │
                  │ (clients, leads,│
                  │   divisions)    │
                  └────┬──────┬────┘
                       │      │
            ┌──────────┘      └──────────┐
            ▼                             ▼
   ┌────────────────┐          ┌────────────────┐
   │    Billing     │          │    Finance      │
   │ (invoices to  │          │ (income from   │
   │  clients,     │          │  clients,      │
   │  quotes for   │          │  expenses by   │
   │  leads)       │          │  division)      │
   └────────────────┘          └────────────────┘
            │                          │
            └──────────┬──────────────┘
                       ▼
              ┌────────────────┐
              │   Accounting   │
              │  (all revenue  │
              │   & expenses   │
              │   flow here)   │
              └────────────────┘
```

**Clients** are the central link — they connect billing (invoices sent) with finance (income received) with accounting (journal entries posted).

---

## Quick Reference

| I want to... | Go to... | Notes |
|-------------|----------|-------|
| View all clients | `/relationships/clients` | See their balances and status |
| Add a new client | `/relationships/clients` | Click the Add button |
| See a client's financials | Click on a client | Dashboard shows their billing history |
| View leads | `/relationships/leads` | See your sales pipeline |
| Add a new lead | `/relationships/leads` | Track potential clients |
| Convert a lead to client | Mark as Won | Then create them as a client |
| View divisions | `/relationships/divisions` | See performance by business unit |
| See the big picture | `/relationships` | Relationships overview dashboard |

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "I can't find a client" | Check if they're marked as inactive or archived |
| "A lead went cold" | Move them to Lost or On Hold — don't delete |
| "The division looks wrong" | Check the client's assigned division |
| "I need to merge duplicate clients" | Currently not supported in the UI — contact support |
| "A client's balance doesn't look right" | Check their invoices and payments in the Billing module |
