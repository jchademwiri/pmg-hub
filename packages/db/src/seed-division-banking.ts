import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from apps/admin/.env.local or root .env
dotenv.config({ path: path.resolve(process.cwd(), 'apps/admin/.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { getDb } from './client';
import { divisions } from './schema/divisions';
import { divisionBillingSettings } from './schema/billing';
import { eq } from 'drizzle-orm';

const bankingData: Record<string, { bankName: string; bankAccountName: string; bankAccountNumber: string; bankBranchCode: string }> = {
  'Playhouse Media Group': {
    bankName: 'Capitec',
    bankAccountName: 'MR JACOB CHADEMWIRI (PMG Solutions)',
    bankAccountNumber: '2520318607',
    bankBranchCode: '470010',
  },
  'Apex Web Solutions': {
    bankName: 'Capitec',
    bankAccountName: 'MR JACOB CHADEMWIRI (Apex Web Solutions)',
    bankAccountNumber: '2507002995',
    bankBranchCode: '470010',
  },
  'Tender Edge Solutions': {
    bankName: 'Capitec',
    bankAccountName: 'MR JACOB CHADEMWIRI (Tender Edge Solutions)',
    bankAccountNumber: '2521736631',
    bankBranchCode: '470010',
  },
};

async function main() {
  const db = getDb();
  console.log('Seeding division banking details...');

  const allDivisions = await db.select().from(divisions);
  console.log(`Found ${allDivisions.length} divisions in DB:`, allDivisions.map((d) => d.name));

  for (const div of allDivisions) {
    const data = bankingData[div.name];
    if (!data) {
      console.log(`No banking data specified for division: ${div.name}`);
      continue;
    }

    const existing = await db
      .select({ id: divisionBillingSettings.id })
      .from(divisionBillingSettings)
      .where(eq(divisionBillingSettings.divisionId, div.id))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(divisionBillingSettings)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(divisionBillingSettings.divisionId, div.id));
      console.log(`✅ Updated banking details for ${div.name}`);
    } else {
      await db.insert(divisionBillingSettings).values({
        divisionId: div.id,
        ...data,
        updatedAt: new Date(),
      });
      console.log(`✅ Inserted banking details for ${div.name}`);
    }
  }

  console.log('🎉 Division banking seeding complete!');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Failed to seed division banking:', err);
  process.exit(1);
});
