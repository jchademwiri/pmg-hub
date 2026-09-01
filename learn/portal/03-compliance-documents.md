# 3. Compliance Vault & Expiry Tracking

> Learn how clients manage South African compliance certificates (CSD, Tax, BBBEE, COIDA) and how automated reminders prevent compliance lapses.

---

## Why Compliance Documents Matter

In South African corporate and government contracting (especially for TenderEdge Solutions and Playhouse Media Group clients), tenders and supplier databases require strictly up-to-date compliance returnables:

1. **CSD Registration Report** (Central Supplier Database - MAAA number)
2. **SARS Tax Compliance Status (TCS)** (PIN & Expiry)
3. **B-BBEE Affidavit / Certificate** (Level 1–8, valid for 12 months)
4. **COIDA Letter of Good Standing** (Compensation Fund)
5. **CIPC Registration Documents & Shareholder Certificates**

---

## Client Workflow: Uploading Returnables

1. The client navigates to `/compliance` in the Client Portal.
2. They select the document type from the compliance checklist.
3. They enter the **Document Reference Number** and **Expiry Date**.
4. They upload the PDF certificate (stored securely in Cloudflare R2).
5. The system marks the item as `Valid` with a green shield badge.

---

## Automated Expiry Tracking & Alerts

Clients no longer suffer disqualified bids due to expired tax pins or B-BBEE certificates:

- **30 Days Before Expiry**: The background cron job `/api/cron/compliance-reminders` scans all uploaded client documents.
- **Automated Email Dispatched**: An email is sent notifying the client's compliance contact to renew the certificate.
- **7 Days Before Expiry**: A follow-up high-priority alert is issued.
- **Expired**: The portal dashboard displays a warning banner and changes the compliance badge to red.

---

## Admin Visibility

In the Admin Hub:

- Staff can view all uploaded client compliance certificates directly within the client profile.
- Returnable attachments can be directly pulled into tender bids when preparing submissions in the Scheduling & Projects module.
