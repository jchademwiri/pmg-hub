import 'server-only';

import { createHash, createHmac } from 'crypto';

import { getDb, sql } from '@pmg/db';

export type ExportType = 'income-expenses' | 'invoices' | 'clients' | 'full-json';

export const EXPORT_FILENAMES: Record<ExportType, string> = {
  'income-expenses': 'income-expenses.csv',
  invoices: 'invoices.csv',
  clients: 'clients.csv',
  'full-json': 'full-data-export.json',
};

interface BackupPayload {
  exportedAt: string;
  source: string;
  tables: Record<string, unknown[]>;
}

export interface BackupObject {
  key: string;
  lastModified: string;
  sizeBytes: number;
}

interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  prefix: string;
}

function csvEscape(value: unknown) {
  if (value == null) return '';
  const text = value instanceof Date ? value.toISOString() : String(value);
  if (!/[",\n\r]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

function toCsv(rows: Record<string, unknown>[]) {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0] ?? {});
  return [
    headers.map(csvEscape).join(','),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(',')),
  ].join('\n');
}

function quoteIdent(identifier: string) {
  return `"${identifier.replace(/"/g, '""')}"`;
}

function sha256Hex(input: string | Buffer) {
  return createHash('sha256').update(input).digest('hex');
}

function hmac(key: string | Buffer, value: string) {
  return createHmac('sha256', key).update(value).digest();
}

function hmacHex(key: string | Buffer, value: string) {
  return createHmac('sha256', key).update(value).digest('hex');
}

function amzDate(date: Date) {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, '');
}

function normalizePrefix(prefix: string) {
  return prefix.replace(/^\/+|\/+$/g, '');
}

function getR2Config(): R2Config | null {
  const {
    CLOUDFLARE_R2_ACCOUNT_ID,
    CLOUDFLARE_R2_ACCESS_KEY_ID,
    CLOUDFLARE_R2_SECRET_ACCESS_KEY,
    CLOUDFLARE_R2_BUCKET,
    CLOUDFLARE_R2_BACKUP_PREFIX,
  } = process.env;

  if (
    !CLOUDFLARE_R2_ACCOUNT_ID ||
    !CLOUDFLARE_R2_ACCESS_KEY_ID ||
    !CLOUDFLARE_R2_SECRET_ACCESS_KEY ||
    !CLOUDFLARE_R2_BUCKET
  ) {
    return null;
  }

  return {
    accountId: CLOUDFLARE_R2_ACCOUNT_ID,
    accessKeyId: CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: CLOUDFLARE_R2_SECRET_ACCESS_KEY,
    bucket: CLOUDFLARE_R2_BUCKET,
    prefix: CLOUDFLARE_R2_BACKUP_PREFIX || 'database-backups',
  };
}

function getRetentionDays() {
  const value = Number(process.env.CLOUDFLARE_R2_BACKUP_RETENTION_DAYS ?? 90);
  return Number.isFinite(value) && value > 0 ? value : 90;
}

export function getBackupStorageStatus() {
  const config = getR2Config();
  return {
    configured: Boolean(config),
    bucket: config?.bucket ?? null,
    prefix: config?.prefix ?? 'database-backups',
    retentionDays: getRetentionDays(),
  };
}

async function getRows(query: ReturnType<typeof sql>) {
  const result = await getDb().execute(query);
  return result.rows as Record<string, unknown>[];
}

export async function buildIncomeExpensesCsv() {
  const rows = await getRows(sql`
    SELECT
      'income' AS type,
      i.date::text AS date,
      d.name AS division,
      c.name AS client,
      NULL AS category,
      i.description,
      i.amount
    FROM income i
    JOIN divisions d ON d.id = i.division_id
    JOIN clients c ON c.id = i.client_id
    UNION ALL
    SELECT
      'expense' AS type,
      e.date::text AS date,
      d.name AS division,
      c.name AS client,
      e.category,
      e.description,
      e.amount
    FROM expenses e
    JOIN divisions d ON d.id = e.division_id
    LEFT JOIN clients c ON c.id = e.client_id
    ORDER BY date DESC, type ASC
  `);
  return toCsv(rows);
}

export async function buildInvoicesCsv() {
  const rows = await getRows(sql`
    SELECT
      i.document_number AS "documentNumber",
      i.status,
      i.invoice_date::text AS "invoiceDate",
      i.due_date::text AS "dueDate",
      d.name AS division,
      c.name AS client,
      i.subtotal,
      i.discount_amount AS "discountAmount",
      i.vat_amount AS "vatAmount",
      i.total,
      i.paid_at AS "paidAt",
      i.created_at AS "createdAt"
    FROM invoices i
    JOIN divisions d ON d.id = i.division_id
    LEFT JOIN clients c ON c.id = i.client_id
    ORDER BY i.invoice_date DESC, i.document_number DESC
  `);
  return toCsv(rows);
}

export async function buildClientsCsv() {
  const rows = await getRows(sql`
    SELECT
      name,
      business_name AS "businessName",
      email,
      phone,
      is_active AS "isActive",
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM clients
    ORDER BY name ASC
  `);
  return toCsv(rows);
}

export async function buildDatabaseBackupPayload(): Promise<BackupPayload> {
  const tables = await getRows(sql`
    SELECT table_name AS name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
    ORDER BY table_name ASC
  `);

  const data: BackupPayload['tables'] = {};

  for (const table of tables) {
    const name = String(table.name);
    const result = await getDb().execute(sql.raw(`SELECT * FROM ${quoteIdent(name)}`));
    data[name] = result.rows as Record<string, unknown>[];
  }

  return {
    exportedAt: new Date().toISOString(),
    source: 'pmg-hub-admin',
    tables: data,
  };
}

function parseXmlTag(value: string, tag: string) {
  const match = value.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
  return match?.[1]
    ?.replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'") ?? '';
}

function parseR2ListObjects(xml: string): BackupObject[] {
  return [...xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)]
    .map((match) => {
      const content = match[1] ?? '';
      return {
        key: parseXmlTag(content, 'Key'),
        lastModified: parseXmlTag(content, 'LastModified'),
        sizeBytes: Number(parseXmlTag(content, 'Size') || 0),
      };
    })
    .filter((object) => object.key.endsWith('.json'));
}

export async function buildExport(type: ExportType) {
  if (type === 'income-expenses') {
    return {
      filename: EXPORT_FILENAMES[type],
      contentType: 'text/csv; charset=utf-8',
      body: await buildIncomeExpensesCsv(),
    };
  }

  if (type === 'invoices') {
    return {
      filename: EXPORT_FILENAMES[type],
      contentType: 'text/csv; charset=utf-8',
      body: await buildInvoicesCsv(),
    };
  }

  if (type === 'clients') {
    return {
      filename: EXPORT_FILENAMES[type],
      contentType: 'text/csv; charset=utf-8',
      body: await buildClientsCsv(),
    };
  }

  const payload = await buildDatabaseBackupPayload();
  return {
    filename: EXPORT_FILENAMES[type],
    contentType: 'application/json; charset=utf-8',
    body: JSON.stringify(payload, null, 2),
  };
}

async function signedR2Request({
  method,
  key,
  query = '',
  body = '',
  contentType = 'application/octet-stream',
}: {
  method: 'DELETE' | 'GET' | 'PUT';
  key?: string;
  query?: string;
  body?: string;
  contentType?: string;
}) {
  const config = getR2Config();
  if (!config) throw new Error('Cloudflare R2 backup storage is not configured.');

  const now = new Date();
  const shortDate = now.toISOString().slice(0, 10).replace(/-/g, '');
  const timestamp = amzDate(now);
  const host = `${config.accountId}.r2.cloudflarestorage.com`;
  const region = 'auto';
  const service = 's3';
  const scope = `${shortDate}/${region}/${service}/aws4_request`;
  const objectPath = key ? `/${key.split('/').map(encodeURIComponent).join('/')}` : '';
  const path = `/${config.bucket}${objectPath}`;
  const payloadHash = sha256Hex(body);
  const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date';
  const canonicalHeaders = [
    `content-type:${contentType}`,
    `host:${host}`,
    `x-amz-content-sha256:${payloadHash}`,
    `x-amz-date:${timestamp}`,
    '',
  ].join('\n');
  const canonicalRequest = [
    method,
    path,
    query,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    timestamp,
    scope,
    sha256Hex(canonicalRequest),
  ].join('\n');

  const dateKey = hmac(`AWS4${config.secretAccessKey}`, shortDate);
  const regionKey = hmac(dateKey, region);
  const serviceKey = hmac(regionKey, service);
  const signingKey = hmac(serviceKey, 'aws4_request');
  const signature = hmacHex(signingKey, stringToSign);
  const authorization = [
    `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${scope}`,
    `SignedHeaders=${signedHeaders}`,
    `Signature=${signature}`,
  ].join(', ');

  const init: RequestInit = {
    method,
    headers: {
      Authorization: authorization,
      'Content-Type': contentType,
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': timestamp,
    },
  };

  if (method === 'PUT') init.body = body;

  return fetch(`https://${host}${path}${query ? `?${query}` : ''}`, init);
}

async function uploadToR2(key: string, body: string, contentType: string) {
  const response = await signedR2Request({
    method: 'PUT',
    key,
    body,
    contentType,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Cloudflare R2 upload failed (${response.status}). ${detail}`.trim());
  }
}

export async function createDatabaseBackup() {
  const config = getR2Config();
  if (!config) throw new Error('Cloudflare R2 backup storage is not configured.');

  const payload = await buildDatabaseBackupPayload();
  const body = JSON.stringify(payload, null, 2);
  const timestamp = payload.exportedAt.replace(/[:.]/g, '-');
  const key = `${normalizePrefix(config.prefix)}/pmg-hub-${timestamp}.json`;

  await uploadToR2(key, body, 'application/json; charset=utf-8');

  return {
    key,
    sizeBytes: Buffer.byteLength(body),
    tableCount: Object.keys(payload.tables).length,
    exportedAt: payload.exportedAt,
  };
}

export async function listDatabaseBackups(): Promise<BackupObject[]> {
  const config = getR2Config();
  if (!config) return [];

  const prefix = normalizePrefix(config.prefix);
  const query = new URLSearchParams({
    'list-type': '2',
    prefix: `${prefix}/`,
  }).toString();

  const response = await signedR2Request({
    method: 'GET',
    query,
    contentType: 'application/octet-stream',
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Cloudflare R2 list failed (${response.status}). ${detail}`.trim());
  }

  const xml = await response.text();
  return parseR2ListObjects(xml).sort((a, b) => b.lastModified.localeCompare(a.lastModified));
}

async function getBackupObject(key: string) {
  const response = await signedR2Request({
    method: 'GET',
    key,
    contentType: 'application/octet-stream',
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Cloudflare R2 download failed (${response.status}). ${detail}`.trim());
  }

  return response.text();
}

async function deleteBackupObject(key: string) {
  const response = await signedR2Request({
    method: 'DELETE',
    key,
    contentType: 'application/octet-stream',
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Cloudflare R2 delete failed (${response.status}). ${detail}`.trim());
  }
}

export async function deleteOldDatabaseBackups(retentionDays?: number) {
  const days = retentionDays ?? getRetentionDays();
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const backups = await listDatabaseBackups();
  const expired = backups.filter((backup) => new Date(backup.lastModified).getTime() < cutoff);

  for (const backup of expired) {
    await deleteBackupObject(backup.key);
  }

  return {
    retentionDays: days,
    deletedCount: expired.length,
    deletedKeys: expired.map((backup) => backup.key),
  };
}

async function getPublicTableNames() {
  const rows = await getRows(sql`
    SELECT table_name AS name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
    ORDER BY table_name ASC
  `);

  return rows.map((row) => String(row.name));
}

async function getTableDependencies(tableNames: string[]) {
  const rows = await getRows(sql`
    SELECT
      tc.table_name AS "tableName",
      ccu.table_name AS "referencedTable"
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
  `);
  const known = new Set(tableNames);
  const dependencies = new Map<string, Set<string>>();

  for (const name of tableNames) dependencies.set(name, new Set());

  for (const row of rows) {
    const tableName = String(row.tableName);
    const referencedTable = String(row.referencedTable);
    if (known.has(tableName) && known.has(referencedTable) && tableName !== referencedTable) {
      dependencies.get(tableName)?.add(referencedTable);
    }
  }

  return dependencies;
}

function sortTablesByDependencies(tableNames: string[], dependencies: Map<string, Set<string>>) {
  const sorted: string[] = [];
  const remaining = new Set(tableNames);

  while (remaining.size > 0) {
    const ready = [...remaining].filter((table) => {
      const deps = dependencies.get(table) ?? new Set();
      return [...deps].every((dep) => !remaining.has(dep));
    });

    if (ready.length === 0) {
      sorted.push(...remaining);
      break;
    }

    for (const table of ready.sort()) {
      sorted.push(table);
      remaining.delete(table);
    }
  }

  return sorted;
}

function isBackupPayload(value: unknown): value is BackupPayload {
  if (!value || typeof value !== 'object') return false;
  const payload = value as BackupPayload;
  return (
    typeof payload.exportedAt === 'string' &&
    typeof payload.source === 'string' &&
    Boolean(payload.tables) &&
    typeof payload.tables === 'object'
  );
}

export async function restoreDatabaseBackup(key: string) {
  const config = getR2Config();
  if (!config) throw new Error('Cloudflare R2 backup storage is not configured.');

  const allowedPrefix = `${normalizePrefix(config.prefix)}/`;
  if (!key.startsWith(allowedPrefix) || !key.endsWith('.json')) {
    throw new Error('Backup key is outside the configured backup prefix.');
  }

  const raw = await getBackupObject(key);
  const parsed = JSON.parse(raw) as unknown;
  if (!isBackupPayload(parsed)) {
    throw new Error('Selected backup file is not a valid PMG backup.');
  }

  const publicTables = new Set(await getPublicTableNames());
  const backupTables = Object.keys(parsed.tables).filter((table) => publicTables.has(table));
  if (backupTables.length === 0) {
    throw new Error('Selected backup does not contain restorable public tables.');
  }

  const db = getDb();
  const quotedTables = backupTables.map(quoteIdent).join(', ');

  const dependencies = await getTableDependencies(backupTables);
  const restoreOrder = sortTablesByDependencies(backupTables, dependencies);

  await db.transaction(async (tx) => {
    await tx.execute(sql.raw(`TRUNCATE TABLE ${quotedTables} RESTART IDENTITY CASCADE`));

    for (const table of restoreOrder) {
      const rows = parsed.tables[table] as Record<string, unknown>[];
      if (!Array.isArray(rows) || rows.length === 0) continue;

      await tx.execute(sql`
        INSERT INTO ${sql.raw(quoteIdent(table))}
        SELECT *
        FROM json_populate_recordset(NULL::${sql.raw(quoteIdent(table))}, ${JSON.stringify(rows)}::json)
      `);
    }
  });

  return {
    key,
    restoredAt: new Date().toISOString(),
    backupExportedAt: parsed.exportedAt,
    tableCount: restoreOrder.length,
    rowCount: restoreOrder.reduce((sum, table) => {
      const rows = parsed.tables[table];
      return sum + (Array.isArray(rows) ? rows.length : 0);
    }, 0),
  };
}
