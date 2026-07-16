import { getAllInvoices } from '../packages/db/src/queries/billing';

async function run() {
  const result = await getAllInvoices({ month: '2026-06' }, { page: 1, pageSize: 1000 });
  console.log(`Returned count: ${result.data.length}`);
  for (const row of result.data) {
    console.log(`- ${row.documentNumber} (${row.clientName}) - Status: ${row.status}`);
  }
  process.exit(0);
}
run();
