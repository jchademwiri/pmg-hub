# Cloudflare R2 data exports and database backups

This app can download CSV/JSON exports from **Settings -> Data & Exports** and upload complete JSON database backups to Cloudflare R2.

## What is implemented

- `Income & Expenses (CSV)` downloads income and expense rows in one spreadsheet.
- `Invoices (CSV)` downloads invoice totals, status, dates, division, and client.
- `Clients (CSV)` downloads client contact and status data.
- `Full Data Export (JSON)` downloads every public database table as JSON.
- `Back Up Now` uploads the same full JSON database export to Cloudflare R2.

CSV export endpoints require an `admin` or `super_admin` user. Cloudflare backup upload requires `super_admin`.

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
```

Optional:

```bash
CLOUDFLARE_R2_BACKUP_PREFIX="database-backups"
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

## Operational notes

- Keep the R2 bucket private.
- Do not expose `CLOUDFLARE_R2_SECRET_ACCESS_KEY` to the browser.
- Use a lifecycle rule in Cloudflare R2 if you want automatic backup retention, for example deleting backups older than 90 days.
- Test backups after changing env vars by clicking **Back Up Now** in Settings -> Data & Exports.
- Restore is intentionally not automated yet. Download the JSON backup from R2 and restore manually after reviewing the data.
