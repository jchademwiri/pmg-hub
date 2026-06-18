// packages/db/src/seed-accounting.ts
// Seeds the Chart of Accounts with a starter set of accounts for PMG.
// Idempotent: skips accounts whose code already exists.
import { config } from "dotenv";
import { resolve } from "path";
import pg from "pg";

config({ path: resolve(import.meta.dir, "../.env") });

const url = process.env.DATABASE_URL_UNPOOLED;
if (!url) throw new Error("DATABASE_URL_UNPOOLED is not set");

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: true } });
await client.connect();

// ── Starter Chart of Accounts ────────────────────────────────────────────────
// Code convention: 1xxx = Assets, 2xxx = Liabilities, 3xxx = Equity, 4xxx = Revenue, 5xxx = Expenses
// is_posting_account = true means journal entries can be posted directly to this account.
// is_posting_account = false means it's a header/grouping account (no direct postings).

interface AccountSeed {
  code: string;
  name: string;
  type: "asset" | "liability" | "equity" | "revenue" | "expense";
  description: string;
  isPostingAccount: boolean;
}

const STARTER_ACCOUNTS: AccountSeed[] = [
  // ── Assets (1xxx) ────────────────────────────────────────────────────────
  { code: "1000", name: "Bank", type: "asset", description: "All bank accounts", isPostingAccount: false },
  { code: "1010", name: "Business Cheque Account", type: "asset", description: "Main business bank account", isPostingAccount: true },
  { code: "1020", name: "Savings Account", type: "asset", description: "Business savings account", isPostingAccount: true },
  { code: "1100", name: "Accounts Receivable", type: "asset", description: "Money owed by clients for invoiced services", isPostingAccount: true },
  { code: "1200", name: "Client Deposits", type: "asset", description: "Client deposits held in trust", isPostingAccount: true },
  { code: "1300", name: "Petty Cash", type: "asset", description: "Cash on hand for small expenses", isPostingAccount: true },
  { code: "1400", name: "Prepaid Expenses", type: "asset", description: "Expenses paid in advance (insurance, subscriptions)", isPostingAccount: true },

  // ── Liabilities (2xxx) ───────────────────────────────────────────────────
  { code: "2000", name: "Liabilities", type: "liability", description: "Obligations owed by the business", isPostingAccount: false },
  { code: "2010", name: "Accounts Payable", type: "liability", description: "Money owed to suppliers and vendors", isPostingAccount: true },
  { code: "2020", name: "VAT Output", type: "liability", description: "VAT collected on sales (owed to SARS)", isPostingAccount: true },
  { code: "2030", name: "VAT Input", type: "liability", description: "VAT paid on purchases (claimable from SARS)", isPostingAccount: true },
  { code: "2100", name: "Accrued Expenses", type: "liability", description: "Expenses incurred but not yet invoiced", isPostingAccount: true },
  { code: "2200", name: "Client Credits", type: "liability", description: "Credit notes and overpayments owed to clients", isPostingAccount: true },

  // ── Equity (3xxx) ────────────────────────────────────────────────────────
  { code: "3000", name: "Equity", type: "equity", description: "Owner's claim on business assets", isPostingAccount: false },
  { code: "3010", name: "Owner's Capital", type: "equity", description: "Initial and additional capital invested by owner", isPostingAccount: true },
  { code: "3020", name: "Retained Earnings", type: "equity", description: "Accumulated profits not distributed", isPostingAccount: true },
  { code: "3030", name: "Owner's Drawings", type: "equity", description: "Money taken personally by the owner", isPostingAccount: true },

  // ── Revenue (4xxx) ───────────────────────────────────────────────────────
  { code: "4000", name: "Revenue", type: "revenue", description: "Income from business operations", isPostingAccount: false },
  { code: "4010", name: "Sales Revenue", type: "revenue", description: "Income from services and product sales", isPostingAccount: true },
  { code: "4020", name: "PMG Share Revenue", type: "revenue", description: "PMG's 25% share of gross revenue", isPostingAccount: true },
  { code: "4030", name: "Interest Income", type: "revenue", description: "Interest earned on bank deposits", isPostingAccount: true },
  { code: "4040", name: "Other Income", type: "revenue", description: "Miscellaneous income not from core operations", isPostingAccount: true },

  // ── Expenses (5xxx) ──────────────────────────────────────────────────────
  { code: "5000", name: "Expenses", type: "expense", description: "Costs incurred to generate revenue", isPostingAccount: false },
  { code: "5010", name: "Hosting & Infrastructure", type: "expense", description: "Web hosting, domains, servers, cloud services", isPostingAccount: true },
  { code: "5020", name: "Software & Subscriptions", type: "expense", description: "SaaS tools, licences, and software subscriptions", isPostingAccount: true },
  { code: "5030", name: "Office & Supplies", type: "expense", description: "Stationery, printing, office consumables", isPostingAccount: true },
  { code: "5040", name: "Marketing & Advertising", type: "expense", description: "Ad spend, promotions, and marketing materials", isPostingAccount: true },
  { code: "5050", name: "Professional Fees", type: "expense", description: "Accounting, legal, and consulting fees", isPostingAccount: true },
  { code: "5060", name: "Telecommunications", type: "expense", description: "Internet, phone, and data costs", isPostingAccount: true },
  { code: "5070", name: "Travel & Transport", type: "expense", description: "Fuel, travel, and transport costs", isPostingAccount: true },
  { code: "5080", name: "Insurance", type: "expense", description: "Business insurance premiums", isPostingAccount: true },
  { code: "5090", name: "Contractor Payments", type: "expense", description: "Payments to freelance contractors and sub-contractors", isPostingAccount: true },
  { code: "5100", name: "Utilities", type: "expense", description: "Electricity, water, and municipal services", isPostingAccount: true },
  { code: "5110", name: "Bank Charges", type: "expense", description: "Bank fees, card processing, and transaction costs", isPostingAccount: true },
  { code: "5120", name: "Staff Costs", type: "expense", description: "Salaries, wages, and employee benefits", isPostingAccount: true },
  { code: "5130", name: "Reinvestment", type: "expense", description: "Funds allocated for business growth and development", isPostingAccount: true },
  { code: "5140", name: "Miscellaneous Expense", type: "expense", description: "Other expenses not categorised above", isPostingAccount: true },
];

console.log("🌱 Seeding Chart of Accounts...");

let inserted = 0;
let skipped = 0;

for (const account of STARTER_ACCOUNTS) {
  // Check if code already exists
  const { rows } = await client.query(
    `SELECT id FROM chart_accounts WHERE code = $1 LIMIT 1`,
    [account.code]
  );

  if (rows.length > 0) {
    skipped++;
    continue;
  }

  await client.query(
    `INSERT INTO chart_accounts (code, name, type, description, is_posting_account)
     VALUES ($1, $2, $3, $4, $5)`,
    [account.code, account.name, account.type, account.description, account.isPostingAccount]
  );
  inserted++;
}

console.log(`✅ Done. Inserted ${inserted} accounts, skipped ${skipped} (already exist).`);
console.log(`   Total starter accounts: ${STARTER_ACCOUNTS.length}`);
await client.end();
