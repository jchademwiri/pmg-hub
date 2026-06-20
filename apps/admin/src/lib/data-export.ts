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

export function getBackupStorageStatus() {
  const config = getR2Config();
  return {
    configured: Boolean(config),
    bucket: config?.bucket ?? null,
    prefix: config?.prefix ?? 'database-backups',
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

async function uploadToR2(key: string, body: string, contentType: string) {
  const config = getR2Config();
  if (!config) throw new Error('Cloudflare R2 backup storage is not configured.');

  const now = new Date();
  const shortDate = now.toISOString().slice(0, 10).replace(/-/g, '');
  const timestamp = amzDate(now);
  const host = `${config.accountId}.r2.cloudflarestorage.com`;
  const region = 'auto';
  const service = 's3';
  const scope = `${shortDate}/${region}/${service}/aws4_request`;
  const path = `/${config.bucket}/${key.split('/').map(encodeURIComponent).join('/')}`;
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
    'PUT',
    path,
    '',
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

  const response = await fetch(`https://${host}${path}`, {
    method: 'PUT',
    headers: {
      Authorization: authorization,
      'Content-Type': contentType,
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': timestamp,
    },
    body,
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
  const key = `${config.prefix.replace(/^\/+|\/+$/g, '')}/pmg-hub-${timestamp}.json`;

  await uploadToR2(key, body, 'application/json; charset=utf-8');

  return {
    key,
    sizeBytes: Buffer.byteLength(body),
    tableCount: Object.keys(payload.tables).length,
    exportedAt: payload.exportedAt,
  };
}
