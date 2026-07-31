import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), 'apps/admin/.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { getDb } from './client';
import { divisions } from './schema/divisions';
import { divisionBillingSettings } from './schema/billing';
import { eq } from 'drizzle-orm';

const notesData: Record<string, { invoiceNotes: string; quoteNotes: string }> = {
  'Playhouse Media Group': {
    invoiceNotes:
      'Payment is due within 7 days of invoice date. Please make electronic funds transfer (EFT) using your invoice number as payment reference. Send proof of payment to info@playhousemedia.co.za.',
    quoteNotes:
      'Quotation is valid for 30 days from date of issue. A 50% deposit is required upon acceptance prior to project commencement, with the balance due upon final delivery.',
  },
  'Apex Web Solutions': {
    invoiceNotes:
      'Payment is due within 7 days of invoice date. Please use your invoice number as payment reference for EFT transactions. Send proof of payment to info@apexwebsolutions.co.za.',
    quoteNotes:
      'Quotation valid for 30 days. 50% deposit required prior to development commencement. Final website/project deployment upon receipt of full balance.',
  },
  'Tender Edge Solutions': {
    invoiceNotes:
      'Payment is due within 7 days of invoice date. Please quote the invoice number on all EFT payments. Send proof of payment to tenders@tenderedgesolutions.co.za.',
    quoteNotes:
      'Quotation valid for 30 days from issue. An official purchase order or signed quotation is required to initiate service delivery.',
  },
};

async function main() {
  const db = getDb();
  console.log('Seeding division default notes & terms...');

  const allDivisions = await db.select().from(divisions);
  console.log(`Found ${allDivisions.length} divisions in DB:`, allDivisions.map((d) => d.name));

  for (const div of allDivisions) {
    const data = notesData[div.name];
    if (!data) {
      console.log(`No notes data specified for division: ${div.name}`);
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
      console.log(`✅ Updated default notes & terms for ${div.name}`);
    } else {
      await db.insert(divisionBillingSettings).values({
        divisionId: div.id,
        ...data,
        updatedAt: new Date(),
      });
      console.log(`✅ Inserted default notes & terms for ${div.name}`);
    }
  }

  console.log('🎉 Division notes & terms seeding complete!');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Failed to seed division notes & terms:', err);
  process.exit(1);
});
