import { db } from '../packages/db/src/index';
import { invoices } from '../packages/db/src/schema/billing';
import { clients } from '../packages/db/src/schema/clients';
import { eq, desc } from 'drizzle-orm';

async function run() {
  const all = await db
    .select({
      doc: invoices.documentNumber,
      date: invoices.invoiceDate,
      clientName: clients.name,
      businessName: clients.businessName,
    })
    .from(invoices)
    .leftJoin(clients, eq(invoices.clientId, clients.id))
    .orderBy(desc(invoices.invoiceDate));

  const byMonth: Record<string, typeof all> = {};
  for (const inv of all) {
    // format YYYY-MM
    const m = inv.date ? inv.date.substring(0, 7) : 'Unknown';
    if (!byMonth[m]) byMonth[m] = [];
    byMonth[m].push(inv);
  }

  for (const month of Object.keys(byMonth).sort().reverse()) {
    console.log(`\n### ${month} (Total: ${byMonth[month].length})`);
    for (const inv of byMonth[month]) {
      const client = inv.businessName || inv.clientName || 'No Client';
      console.log(`- ${inv.doc} (${client})`);
    }
  }

  process.exit(0);
}
run();
