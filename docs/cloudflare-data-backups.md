# Cloudflare R2 data exports and database backups

This app can download CSV/JSON exports from **Settings -> Data & Exports** and upload complete JSON database backups to Cloudflare R2.

## What is implemented

- `Income & Expenses (CSV)` downloads income and expense rows in one spreadsheet.
- `Invoices (CSV)` downloads invoice totals, status, dates, division, and client.
- `Clients (CSV)` downloads client contact and status data.
- `Full Data Export (JSON)` downloads every public database table as JSON.
- `Back Up Now` uploads the same full JSON database export to Cloudflare R2.
- Auto backup runs through the native Next.js route handler at `/api/cron/database-backup`.
- Auto cleanup runs through `/api/cron/backup-retention` and deletes old R2 backup files.
- Restore can be run from Settings -> Data & Exports by choosing a backup and typing `RESTORE`.

CSV export endpoints require an `admin` or `super_admin` user. Cloudflare backup upload requires `super_admin`.

Cron endpoints use `CRON_SECRET` and expect:

```txt
Authorization: Bearer <CRON_SECRET>
```

## Cloudflare setup

1. In Cloudflare, create an R2 bucket, for example:

   ```txt
   pmg-hub-backups
   ```

2. Create an R2 API token with object read/write access to that bucket.

3. Copy these values from Cloudflare:

   - Account ID
   - Access Key ID
   - Secret Access Key
   - Bucket name

4. Add the environment variables below to local `.env.local` and to your deployed app environment.

## Environment variables

Required for backup upload:

```bash
CLOUDFLARE_R2_ACCOUNT_ID="your-cloudflare-account-id"
CLOUDFLARE_R2_ACCESS_KEY_ID="your-r2-access-key-id"
CLOUDFLARE_R2_SECRET_ACCESS_KEY="your-r2-secret-access-key"
CLOUDFLARE_R2_BUCKET="pmg-hub-backups"
CRON_SECRET="use-a-long-random-secret"
```

Optional:

```bash
CLOUDFLARE_R2_BACKUP_PREFIX="database-backups"
CLOUDFLARE_R2_BACKUP_RETENTION_DAYS="90"
```

Existing database variables are still required:

```bash
DATABASE_URL="postgresql://..."
DATABASE_URL_UNPOOLED="postgresql://..."
```

## Backup file format

Backups are uploaded as JSON files with this key pattern:

```txt
database-backups/pmg-hub-2026-06-20T10-30-00-000Z.json
```

Each backup contains:

```json
{
  "exportedAt": "2026-06-20T10:30:00.000Z",
  "source": "pmg-hub-admin",
  "tables": {
    "clients": [],
    "income": [],
    "expenses": []
  }
}
```

## Automatic backup and cleanup

The app uses native Next.js route handlers:

```txt
GET /api/cron/database-backup
GET /api/cron/backup-retention
```

`apps/admin/vercel.json` schedules:

```json
{
  "path": "/api/cron/database-backup",
  "schedule": "0 1 * * *"
}
```

and:

```json
{
  "path": "/api/cron/backup-retention",
  "schedule": "30 1 * * 0"
}
```

Vercel cron schedules run in UTC. If you use Cloudflare Workers Cron Triggers instead, call the same endpoints with the `Authorization` header above.

`/api/cron/database-backup` also runs cleanup after uploading the new backup, so stale files are removed even if the weekly cleanup route is missed.

## Restore

Restore is available in Settings -> Data & Exports.

The restore flow:

1. Lists JSON backups from the configured R2 prefix.
2. Requires a `super_admin` user.
3. Requires typing `RESTORE`.
4. Truncates the backed-up public database tables.
5. Reinserts rows from the selected JSON backup in foreign-key-safe order.

Restore is intentionally not automatic. It is destructive and should remain a deliberate operator action.

## Operational notes

- Keep the R2 bucket private.
- Do not expose `CLOUDFLARE_R2_SECRET_ACCESS_KEY` to the browser.
- The app deletes old backup files based on `CLOUDFLARE_R2_BACKUP_RETENTION_DAYS`.
- You can also add a Cloudflare R2 lifecycle rule as a second layer of retention control.
- Test backups after changing env vars by clicking **Back Up Now** in Settings -> Data & Exports.
- Test restore only in a non-production environment first.
