import { config } from 'dotenv';
config({path: '.env.local'});
import { Client } from 'pg';

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL_UNPOOLED, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const res = await client.query('select "id", "division_id", "default_vat_rate", "payment_terms_days", "bank_name", "bank_account_name", "bank_account_number", "bank_branch_code", "invoice_notes", "quote_notes", "logo_url", "sales_rep_name", "sales_rep_phone", "sales_rep_email", "division_website", "credit_expiry_months", "auto_apply_credits", "auto_send_statements", "statement_cycle_day", "statement_type", "updated_at" from "division_billing_settings"');
    console.log("Success, row count:", res.rowCount);
  } catch(e) {
    console.error("Failed:", e.message);
  }
  process.exit(0);
}
main();
