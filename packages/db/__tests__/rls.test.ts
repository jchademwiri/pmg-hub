import { describe, it, expect } from 'vitest';
import { withClientContext, withAdminContext, getDb } from '../src/client';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { sql } from 'drizzle-orm';

describe('Row-Level Security (RLS) helpers and configuration', () => {
  it('exports withClientContext and withAdminContext functions', () => {
    expect(typeof withClientContext).toBe('function');
    expect(typeof withAdminContext).toBe('function');
  });

  it('withClientContext throws error when clientId is empty, whitespace, or invalid UUID', async () => {
    await expect(withClientContext('', async () => {})).rejects.toThrow(
      'withClientContext requires a valid, non-empty clientId string',
    );
    // @ts-expect-error test runtime check
    await expect(withClientContext(null, async () => {})).rejects.toThrow(
      'withClientContext requires a valid, non-empty clientId string',
    );
    await expect(withClientContext('not-a-uuid', async () => {})).rejects.toThrow(
      'withClientContext requires a valid UUID string',
    );
    await expect(withClientContext('12345', async () => {})).rejects.toThrow(
      'withClientContext requires a valid UUID string',
    );
  });

  it('migration 0056_add_row_level_security.sql exists and covers all 13 target tables', () => {
    const migrationPath = join(__dirname, '../src/migrations/0056_add_row_level_security.sql');
    expect(existsSync(migrationPath)).toBe(true);

    const sqlContent = readFileSync(migrationPath, 'utf-8');

    // 1. Functions
    expect(sqlContent).toContain('CREATE OR REPLACE FUNCTION app_current_client_id()');
    expect(sqlContent).toContain('CREATE OR REPLACE FUNCTION app_is_admin()');
    expect(sqlContent).toContain('CREATE OR REPLACE FUNCTION app_is_client_mode()');

    // 2. Direct Root Tables
    const rootTables = [
      'invoices',
      'quotations',
      'credit_notes',
      'credit_refunds',
      'project_schedule_entries',
      'compliance_documents',
      'expenses',
      'client_change_requests',
    ];

    for (const table of rootTables) {
      expect(sqlContent).toContain(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;`);
      expect(sqlContent).toContain(`ALTER TABLE "${table}" FORCE ROW LEVEL SECURITY;`);
      expect(sqlContent).toContain(`${table}_tenant_isolation`);
    }

    // 3. Child Tables
    const childTables = [
      'billing_line_items',
      'payment_allocations',
      'credit_applications',
      'project_progress_sections',
      'project_progress_items',
    ];

    for (const table of childTables) {
      expect(sqlContent).toContain(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;`);
      expect(sqlContent).toContain(`ALTER TABLE "${table}" FORCE ROW LEVEL SECURITY;`);
      expect(sqlContent).toContain(`${table}_tenant_isolation`);
    }
  });

  it('migration is registered in meta/_journal.json', () => {
    const journalPath = join(__dirname, '../src/migrations/meta/_journal.json');
    const journal = JSON.parse(readFileSync(journalPath, 'utf-8'));
    const entry = journal.entries.find((e: any) => e.tag === '0056_add_row_level_security');
    expect(entry).toBeDefined();
    expect(entry.idx).toBe(56);
  });

  // Database integration checks (run against test DB if DATABASE_URL is accessible)
  it('sets and clears app.current_client_id and app.is_client_mode in withClientContext', async () => {
    if (!process.env.DATABASE_URL) return;

    const testClientId = 'a0000000-0000-0000-0000-000000000001';
    let observedClientIdInside: string | null = null;
    let observedClientModeInside: string | null = null;

    await withClientContext(testClientId, async (tx) => {
      const res = await tx.execute(
        sql`SELECT current_setting('app.current_client_id', true) AS client_id, current_setting('app.is_client_mode', true) AS client_mode`,
      );
      observedClientIdInside = (res.rows[0] as any)?.client_id;
      observedClientModeInside = (res.rows[0] as any)?.client_mode;
    });

    expect(observedClientIdInside).toBe(testClientId);
    expect(observedClientModeInside).toBe('true');

    // After transaction commits, session settings should NOT leak outside the transaction
    const db = getDb();
    const resOutside = await db.execute(
      sql`SELECT current_setting('app.current_client_id', true) AS client_id, current_setting('app.is_client_mode', true) AS client_mode`,
    );
    const outsideClientId = (resOutside.rows[0] as any)?.client_id;
    expect(outsideClientId || '').toBe('');
  });

  it('sets and clears app.is_admin in withAdminContext', async () => {
    if (!process.env.DATABASE_URL) return;

    let observedAdminInside: string | null = null;

    await withAdminContext(async (tx) => {
      const res = await tx.execute(sql`SELECT current_setting('app.is_admin', true) AS is_admin`);
      observedAdminInside = (res.rows[0] as any)?.is_admin;
    });

    expect(observedAdminInside).toBe('true');

    // After transaction commits, admin setting should NOT leak outside the transaction
    const db = getDb();
    const resOutside = await db.execute(
      sql`SELECT current_setting('app.is_admin', true) AS is_admin`,
    );
    const outsideAdmin = (resOutside.rows[0] as any)?.is_admin;
    expect(outsideAdmin || '').toBe('');
  });
});
