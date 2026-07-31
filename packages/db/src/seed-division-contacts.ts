import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), 'apps/admin/.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { getDb } from './client';
import { divisions } from './schema/divisions';
import { divisionBillingSettings } from './schema/billing';
import { eq } from 'drizzle-orm';

const contactData: Record<string, { salesRepName: string; salesRepEmail: string; salesRepPhone: string; divisionWebsite: string }> = {
  'Playhouse Media Group': {
    salesRepName: 'Jacob Chademwiri',
    salesRepEmail: 'info@playhousemedia.co.za',
    salesRepPhone: '+27 74 049 1433',
    divisionWebsite: 'www.playhousemedia.co.za',
  },
  'Apex Web Solutions': {
    salesRepName: 'Jacob Chademwiri',
    salesRepEmail: 'info@apexwebsolutions.co.za',
    salesRepPhone: '+27 74 049 1433',
    divisionWebsite: 'apexwebsolutions.co.za',
  },
  'Tender Edge Solutions': {
    salesRepName: 'Jacob Chademwiri',
    salesRepEmail: 'tenders@tenderedgesolutions.co.za',
    salesRepPhone: '+27 74 501 7094',
    divisionWebsite: 'tenderedgesolutions.co.za',
  },
};

async function main() {
  const db = getDb();
  console.log('Seeding division contact details...');

  const allDivisions = await db.select().from(divisions);
  console.log(`Found ${allDivisions.length} divisions in DB:`, allDivisions.map((d) => d.name));

  for (const div of allDivisions) {
    const data = contactData[div.name];
    if (!data) {
      console.log(`No contact data specified for division: ${div.name}`);
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
      console.log(`✅ Updated contact details for ${div.name}`);
    } else {
      await db.insert(divisionBillingSettings).values({
        divisionId: div.id,
        ...data,
        updatedAt: new Date(),
      });
      console.log(`✅ Inserted contact details for ${div.name}`);
    }
  }

  console.log('🎉 Division contact seeding complete!');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Failed to seed division contacts:', err);
  process.exit(1);
});
