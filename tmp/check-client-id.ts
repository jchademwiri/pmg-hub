import { db } from '../packages/db/src/index';
import { invoices } from '../packages/db/src/schema/billing';
import { eq, inArray } from 'drizzle-orm';

async function run() {
  const invs = await db
    .select({
      num: invoices.documentNumber,
      clientId: invoices.clientId,
    })
    .from(invoices)
    .where(inArray(invoices.documentNumber, [
      'TES-INV-2026-013', 'TES-INV-2026-014', 'TES-INV-2026-015',
      'TES-INV-2026-016', 'TES-INV-2026-017', 'TES-INV-2026-018',
      'TES-INV-2026-019', 'TES-INV-2026-020'
    ]));
    
  console.log(invs);
  process.exit(0);
}
run();
