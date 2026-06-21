# 5. Data Exports, Backups, And Restore

> Data settings help you get data out and recover the database when needed.

## Exports vs Backups

| Type | Purpose |
|------|---------|
| Export | Human-readable files for review, handover, or accountant work |
| Backup | Recoverable database copy for disaster recovery |

Exports are not restore files. Use a database backup when you need to restore the system.

## Cloudflare R2 Backups

When Cloudflare R2 is configured, backups are stored in a bucket.

Admins should confirm:

- R2 bucket exists
- R2 API credentials are set
- Backup environment variables are configured
- Cron jobs are running
- Recent backup files are visible

## Backup Retention

Retention controls how many old backups are kept.

Example: keeping the latest 5 backups means:

- Daily backup creates one new file per day.
- The newest 5 files are kept.
- Older files are deleted automatically.

This keeps storage small while still keeping recent restore points.

## Restore Rules

Restore is powerful and destructive. Only admins should do it.

Before restoring:

1. Confirm the backup file and date.
2. Tell users to stop working.
3. Confirm the current data can be replaced.
4. Restore from a trusted backup only.
5. Check clients, invoices, payments, expenses, and reports after restore.

## Common Mistakes

| Mistake | Risk |
|---------|------|
| Restoring the wrong file | Current data may be replaced with old data |
| Restoring while users work | New work may be lost |
| Keeping too many backups | Storage grows quickly |
| Keeping too few backups | Fewer recovery options |

