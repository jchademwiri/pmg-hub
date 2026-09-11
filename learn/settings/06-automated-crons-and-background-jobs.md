# 6. Automated Crons & Background Jobs

> Learn how autonomous cron jobs handle recurring billing, statement delivery, overdue invoice reminders, and compliance tracking across PMG Hub.

---

## What Are Background Cron Jobs?

Background cron jobs execute scheduled tasks automatically without human intervention. In PMG Hub, cron jobs are configured in `vercel.json` and executed by Vercel Cron Infrastructure against dedicated API route handlers in `apps/admin`.

---

## Active Cron Schedule Reference

| Job Name                  | Route Endpoint                    | Schedule (UTC)             | Schedule (SAST) | What It Does                                                                                 |
| :------------------------ | :-------------------------------- | :------------------------- | :-------------- | :------------------------------------------------------------------------------------------- |
| **Recurring Billing**     | `/api/cron/recurring-billing`     | `0 6 * * *` (Daily 06:00)  | `08:00 SAST`    | Scans recurring retainer profiles and generates new monthly invoices.                        |
| **Compliance Reminders**  | `/api/cron/compliance-reminders`  | `5 6 * * *` (Daily 06:05)  | `08:05 SAST`    | Scans client compliance returnables and alerts clients on 30-day/7-day certificate expiries. |
| **Outstanding Reminders** | `/api/cron/outstanding-reminders` | `10 6 * * *` (Daily 06:10) | `08:10 SAST`    | Sends branded overdue invoice reminder emails for unpaid balances.                           |

---

## Security & Bearer Token Authentication

Every cron endpoint is secured against unauthorized public requests:

1. **Authorization Header**: Vercel passes `Authorization: Bearer <CRON_SECRET>` with every request.
2. **Server-Side Validation**: The route handler verifies that the header matches the secret environment variable:
   ```typescript
   const authHeader = req.headers.get('authorization');
   if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
     return new Response('Unauthorized', { status: 401 });
   }
   ```
3. **Execution Auditing**: Each execution logs the duration, number of records processed, and delivery status to database audit tables.

---

## Manually Triggering Cron Jobs

If a scheduled job needs to be run on demand (e.g. following an emergency server migration or immediate billing run):

1. **Via Admin UI**: Go to the relevant operational page:
   - Statements: `Billing -> Statements -> Send Statements`
   - Overdue Reminders: `Billing -> Invoices -> Send Overdue Reminders`
2. **Via Secure Terminal / cURL**:
   Send an authenticated GET request providing your `CRON_SECRET` token:
   ```bash
   curl -X GET https://admin.playhousemedia.co.za/api/cron/recurring-billing \
     -H "Authorization: Bearer ${CRON_SECRET}"
   ```
