import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve('.env.local') });

import { getDb, income, invoices, clients, divisions, paymentAllocations, eq } from '@pmg/db';
import { recordClientPayment } from '../apps/admin/src/app/actions/billing-payments';
import { deleteIncome } from '../apps/admin/src/app/actions/income';

async function testMutations() {
  const db = getDb();
  console.log('Database connected successfully.');

  // Fetch a client and a division
  const clientList = await db.select().from(clients).limit(1);
  const divisionList = await db.select().from(divisions).limit(1);

  if (clientList.length === 0 || divisionList.length === 0) {
    console.log('Error: Clients or Divisions table is empty.');
    return;
  }

  const testClient = clientList[0]!;
  const testDivision = divisionList[0]!;

  console.log('Using Client:', testClient.name, 'ID:', testClient.id);
  console.log('Using Division:', testDivision.name, 'ID:', testDivision.id);

  // 1. Try to fetch some outstanding invoices
  const outstandingInvoices = await db
    .select()
    .from(invoices)
    .where(eq(invoices.clientId, testClient.id))
    .limit(2);

  console.log(`Found ${outstandingInvoices.length} outstanding invoices for this client.`);

  // 2. Attempt to record a payment
  console.log('\n--- Recording a test payment ---');
  const payload = {
    clientId: testClient.id,
    divisionId: testDivision.id,
    date: new Date().toISOString().split('T')[0]!,
    description: 'Test manual payment',
    amount: 100.00,
    allocations: outstandingInvoices.map((inv) => ({
      invoiceId: inv.id,
      amount: 50.00,
    })),
  };

  try {
    const res = await recordClientPayment(payload);
    console.log('recordClientPayment result:', res);
  } catch (err) {
    console.error('recordClientPayment THREW ERROR:', err);
  }

  // 3. Find a test income entry and try to delete it
  console.log('\n--- Attempting to delete an income record ---');
  const testIncomeList = await db.select().from(income).limit(1);
  if (testIncomeList.length > 0) {
    const testIncome = testIncomeList[0]!;
    console.log('Found income record to delete:', testIncome.id, 'Amount:', testIncome.amount);
    try {
      const res = await deleteIncome(testIncome.id);
      console.log('deleteIncome result:', res);
    } catch (err) {
      console.error('deleteIncome THREW ERROR:', err);
    }
  } else {
    console.log('No income records found to delete.');
  }

  process.exit(0);
}

testMutations().catch((err) => {
  console.error('Execution failed:', err);
  process.exit(1);
});
