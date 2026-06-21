# PMG Settings Guide

> Settings control how the system behaves. New users should understand what is here, but only admins should change these pages.

---

## What Is Settings For?

Settings is where admins manage:

- Organisation profile and logo
- Billing setup for each division
- Users and invitations
- Security information
- Data exports, database backups, restore, and backup retention

Use Settings carefully. Small configuration changes can affect invoices, emails, PDFs, backups, and who can access the system.

---

## Organisation

Use Organisation settings for the company identity shown across the app.

Check that these are correct:

- Business name
- Contact details
- Address
- Logo

If the logo or address is wrong here, generated documents may look wrong too.

---

## Billing

Billing settings are configured per division.

Common divisions:

| Acronym | Division |
|---------|----------|
| AWS | Apex Web Solutions |
| TES | Tender Edge Solutions |
| PMG | Playhouse Media Group |

Check each division for:

- Billing contact details
- Banking details
- Invoice and quote defaults
- Email sender details
- Notes and terms

If a division is missing setup, quotes, invoices, statements, and emails may still work but may look incomplete.

---

## Users

Use Users settings to invite and review system users.

For new users:

1. Invite them from Settings -> Users.
2. Confirm they receive the invite email.
3. Ask them to sign in and check the areas they need.
4. Remove or disable access when someone no longer needs the system.

Do not share one login between multiple people. Each person should have their own account for accountability.

---

## Security

Security settings explain the current access-control setup and future controls.

Use this page to confirm:

- Who should have admin access
- Which controls are available now
- Which controls are planned but not active yet

If access looks wrong, fix the user setup instead of sharing passwords.

---

## Data Exports And Backups

Data settings are for admin-level data management.

Use exports when you need readable business data for review, handover, accountant work, or offline records.

Use backups when you need a recoverable database copy. Backups are stored in Cloudflare R2 when configured.

### Backup Retention

Retention controls how many old backups the system keeps before deleting older files.

For example, keeping the latest 5 backups means:

- A daily backup creates one new backup per day.
- The system keeps the newest 5.
- Older backup files are deleted automatically.

This keeps storage small while still giving you recent restore points.

### Restore

Restore is powerful and destructive. Only use it when you are sure you want to replace current data with a backup.

Before restoring:

1. Confirm the backup date and file.
2. Confirm the current system can be overwritten.
3. Tell active users to stop working during the restore.
4. Restore only from a trusted backup.
5. Check key pages after restore: clients, invoices, payments, expenses, reports.

---

## Quick Reference

| I want to... | Go to... |
|-------------|----------|
| Update business details | Settings -> Organisation |
| Update invoice or quote setup | Settings -> Billing |
| Invite someone | Settings -> Users |
| Review access information | Settings -> Security |
| Export data | Settings -> Data |
| Check backups | Settings -> Data |
| Restore from backup | Settings -> Data |
