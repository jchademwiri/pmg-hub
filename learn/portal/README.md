# Client Portal Lessons

> Learn how the client self-service portal operates, how clients access it without passwords, and how admins assist clients via impersonation.

---

## What Is The Client Portal?

The Client Portal (`apps/portal`) is the dedicated, branded self-service interface for clients across all divisions:

- `portal.playhousemedia.co.za` (PMG and AWS clients)
- `portal.tenderedgesolutions.co.za` (TES clients)

It empowers clients to manage quotes, invoices, payments, monthly statements, active project deliverables, tender submissions, and compliance documents without waiting for manual email responses from staff.

---

## Lessons

| #   | Lesson                                                             | What You Learn                                                                           |
| :-- | :----------------------------------------------------------------- | :--------------------------------------------------------------------------------------- |
| 1   | [Portal Overview & Access](./01-portal-overview-and-access.md)     | Passwordless magic link authentication, dev mode switcher, and admin impersonation       |
| 2   | [Client Self-Service & Billing](./02-client-self-service.md)       | Approving quotes, viewing/paying invoices, downloading statements, and tracking projects |
| 3   | [Compliance Vault & Expiry Tracking](./03-compliance-documents.md) | Uploading and tracking CSD, Tax Clearance, BBBEE, and COIDA certificates                 |

---

## Client Portal Capabilities Matrix

```text
┌─────────────────────────────────────────────────────────────────┐
│                      CLIENT PORTAL SURFACES                     │
├───────────────────┬─────────────────────────┬───────────────────┤
│  FINANCIALS       │  PROJECTS & TENDERS     │  COMPLIANCE VAULT │
├───────────────────┼─────────────────────────┼───────────────────┤
│ • View Invoices   │ • Track Active Projects │ • CSD Reports     │
│ • Download PDFs   │ • Tender Milestones     │ • Tax Compliance  │
│ • Approve Quotes  │ • Effort & Deadlines    │ • BBBEE Certs     │
│ • Live Statements │ • Deliverable Status    │ • COIDA / Letters │
│ • Credit Notes    │ • Scope Reviews         │ • Expiry Alerts   │
└───────────────────┴─────────────────────────┴───────────────────┘
```
