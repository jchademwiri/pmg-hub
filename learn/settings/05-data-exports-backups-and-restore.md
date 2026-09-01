# 5. Data Exports, Backups & Disaster Recovery

> Learn the critical difference between human-readable data exports and full system disaster recovery backups stored in Cloudflare R2.

---

## Exports vs Backups

| Feature                 | Data Exports (`CSV` / `JSON`)                               | Database Backups (`SQL` / `DUMP`)                       |
| :---------------------- | :---------------------------------------------------------- | :------------------------------------------------------ |
| **Purpose**             | Financial review, accountant audits, external spreadsheets. | Full point-in-time disaster recovery if database fails. |
| **Who Uses It**         | Accountants, executive team, tax auditors.                  | Super Administrators & DevOps.                          |
| **Can Restore System?** | **No**. Exports are read-only flat files.                   | **Yes**. Restores all tables, relations, and schemas.   |

---

## Cloudflare R2 Automated Backup Architecture

PMG Hub utilizes Cloudflare R2 for off-site, immutable database backup storage:

```text
PostgreSQL Database (Neon / Supabase)
        │
        ▼ (Daily Cron / pg_dump)
Encrypted Database Archive (.sql.gz)
        │
        ▼
Cloudflare R2 Storage Bucket (pmg-hub-backups)
        │
        ▼
Automated Retention Policy (Keeps latest 30 daily snapshots)
```

---

## Verifying Backup Health

1. In `apps/admin -> Settings -> Data`.
2. Check the **Recent Backups Table**:
   - Verify that the latest backup timestamp is from today or within the last 24 hours.
   - Confirm backup file size is consistent with previous days.
   - Ensure status displays `Healthy` with a green indicator.

---

## Disaster Recovery & Restore Protocol

> [!CAUTION]
> Restoring a backup is a destructive operation that replaces all current database records with the selected snapshot. Only execute with approval from the Lead Architect.

### Standard Recovery Steps:

1. Notify all team members to pause active work in the system.
2. Download the target snapshot from Cloudflare R2.
3. Test restoration on an isolated staging database first to verify data integrity.
4. Apply the restore to the production database.
5. Verify client balances, issued invoices, and recent transactions.
6. Re-enable team access and confirm system health.
