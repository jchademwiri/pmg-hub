# Settings & System Administration Lessons

> Learn how system configuration, security, user permissions, automated cron jobs, and disaster recovery operate across PMG Hub.

---

## Lessons

| #   | Lesson                                                                           | What You Learn                                                                    |
| --- | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| 1   | [Settings Overview](./01-settings-overview.md)                                   | System boundaries, global parameters, and admin permissions                       |
| 2   | [Organisation Settings](./02-organisation-settings.md)                           | Managing legal entity profiles, addresses, logos, and division metadata           |
| 3   | [Billing Settings](./03-billing-settings.md)                                     | Bank accounts, VAT numbers, invoice prefixes, and reminder intervals              |
| 4   | [Users & Security](./04-users-and-security.md)                                   | Role-based access control (RBAC), invitations, and Better Auth authentication     |
| 5   | [Data Exports, Backups & Restore](./05-data-exports-backups-and-restore.md)      | Automated PostgreSQL snapshots, Cloudflare R2 backup replication, and restore ops |
| 6   | [Automated Crons & Background Jobs](./06-automated-crons-and-background-jobs.md) | Vercel cron schedules, bearer token security (`CRON_SECRET`), and job monitoring  |

---

## Quick Rule

Only Super Administrators should modify settings in this area. Incorrect changes to billing settings, tax numbers, or automated cron configurations can impact legal documents and client communications.
