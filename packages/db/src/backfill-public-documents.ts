import 'dotenv/config';
import { getDb, publicDocuments } from './index';

const LEGACY_SBD_DEFAULTS = [
  {
    slug: 'sbd-4',
    code: 'SBD 4',
    title: 'Declaration of Interest',
    subtitle: 'Mandatory bidder disclosure of state employment and relationships',
    category: 'sbd_form' as const,
    seoTitle: 'Download SBD 4 Form (Declaration of Interest PDF) | TenderEdge Solutions',
    seoDescription:
      'Download the official SBD 4 form (Declaration of Interest) required for all South African government tenders, plus common mistakes to avoid disqualification.',
    keywords: [
      'sbd 4',
      'sbd 4 form download',
      'sbd 4 pdf',
      'declaration of interest tender form',
      'standard bidding document 4',
    ],
    content:
      '<p>The <strong>SBD 4 form (Bidder’s Disclosure / Declaration of Interest)</strong> is a mandatory document for all South African government and SOE tenders. It requires bidders to declare whether any directors, shareholders, or trustees are employed by the state, or have any relationship with persons involved in the evaluation or adjudication of the bid.</p><p>Failing to accurately complete and sign the SBD 4 form will result in immediate administrative disqualification.</p>',
    commonMistakes: [
      'Failing to declare family members or directors who work for the government or a state-owned entity.',
      "Leaving sections blank instead of writing 'N/A' where not applicable.",
      'Listing directors that do not match your latest CIPC and CSD registration records.',
    ],
    s3Key: 'sbd-forms/sbd-4.pdf',
    fileName: 'sbd-4.pdf',
    mimeType: 'application/pdf',
    sortOrder: 10,
  },
  {
    slug: 'sbd-6-1',
    code: 'SBD 6.1',
    title: 'Preference Points Claim Form',
    subtitle: 'Claim 80/20 or 90/10 preference points for B-BBEE & specific goals',
    category: 'sbd_form' as const,
    seoTitle: 'Download SBD 6.1 Form (Preference Points Claim PDF) | TenderEdge Solutions',
    seoDescription:
      'Download the official SBD 6.1 Preference Points Claim form in PDF to claim 80/20 or 90/10 preference points on South African government tenders.',
    keywords: [
      'sbd 6.1',
      'sbd 6.1 form download',
      'preference points claim form pdf',
      '80/20 preference points sbd',
      'b-bbee preference points form',
    ],
    content:
      '<p>The <strong>SBD 6.1 form</strong> is used to claim preference points in terms of the Preferential Procurement Regulations. It determines your preference score alongside price using either the <strong>80/20</strong> (for tenders up to R50 million) or <strong>90/10</strong> (above R50 million) preference point system.</p><p>You must submit valid supporting evidence — such as a commissioned B-BBEE Sworn Affidavit or SANAS-accredited B-BBEE certificate — to be awarded the points claimed.</p>',
    commonMistakes: [
      'Claiming preference points without attaching a valid, commissioned B-BBEE sworn affidavit or certificate.',
      'Incorrectly calculating or leaving the preference points claimed column blank.',
      'Using an outdated version of the SBD 6.1 form that does not match the tender’s specific goals.',
    ],
    s3Key: 'sbd-forms/sbd-6-1.pdf',
    fileName: 'sbd-6.1.pdf',
    mimeType: 'application/pdf',
    sortOrder: 20,
  },
  {
    slug: 'sbd-8',
    code: 'SBD 8',
    title: 'Declaration of Bidder’s Past SCM Practices',
    subtitle: 'Declaration of past supply chain management compliance',
    category: 'sbd_form' as const,
    seoTitle: 'Download SBD 8 Form (Past SCM Practices PDF) | TenderEdge Solutions',
    seoDescription:
      'Download the SBD 8 form to declare your company’s past supply chain management practices for South African government and municipal tenders.',
    keywords: [
      'sbd 8',
      'sbd 8 form download',
      'past supply chain management practices pdf',
      'standard bidding document 8',
    ],
    content:
      '<p>The <strong>SBD 8 form</strong> serves as a formal declaration that the bidder and its directors have not abused the institution’s supply chain management system, committed fraud or corruption, or failed to perform on previous government contracts.</p>',
    commonMistakes: [
      'Failing to disclose past contract terminations or disputes.',
      'Not checking the National Treasury Register for Tender Defaulters before signing.',
    ],
    s3Key: 'sbd-forms/sbd-8.pdf',
    fileName: 'sbd-8.pdf',
    mimeType: 'application/pdf',
    sortOrder: 30,
  },
  {
    slug: 'sbd-9',
    code: 'SBD 9',
    title: 'Certificate of Independent Bid Determination',
    subtitle: 'Certify that your tender bid was prepared independently',
    category: 'sbd_form' as const,
    seoTitle: 'Download SBD 9 Form (Independent Bid Determination PDF) | TenderEdge Solutions',
    seoDescription:
      'Download the SBD 9 Certificate of Independent Bid Determination PDF required to confirm your tender bid was prepared without collusion.',
    keywords: [
      'sbd 9',
      'sbd 9 form download',
      'certificate of independent bid determination pdf',
      'standard bidding document 9',
    ],
    content:
      '<p>The <strong>SBD 9 form</strong> is a Certificate of Independent Bid Determination confirming that your bid was arrived at independently, without consultation, communication, or agreement with any competitor. It protects public procurement against bid-rigging and collusive tendering.</p>',
    commonMistakes: [
      'Submitting bids from related subsidiary or sister companies on the same tender without disclosure.',
      'Discussing pricing or cover-quoting with competitors before tender closing.',
    ],
    s3Key: 'sbd-forms/sbd-9.pdf',
    fileName: 'sbd-9.pdf',
    mimeType: 'application/pdf',
    sortOrder: 40,
  },
];

async function main() {
  const db = getDb();

  for (const doc of LEGACY_SBD_DEFAULTS) {
    await db
      .insert(publicDocuments)
      .values({
        slug: doc.slug,
        code: doc.code,
        title: doc.title,
        subtitle: doc.subtitle,
        category: doc.category,
        seoTitle: doc.seoTitle,
        seoDescription: doc.seoDescription,
        keywords: doc.keywords,
        content: doc.content,
        commonMistakes: doc.commonMistakes,
        s3Key: doc.s3Key,
        fileName: doc.fileName,
        mimeType: doc.mimeType,
        isPublished: true,
        sortOrder: doc.sortOrder,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: publicDocuments.slug,
        set: {
          code: doc.code,
          title: doc.title,
          subtitle: doc.subtitle,
          category: doc.category,
          seoTitle: doc.seoTitle,
          seoDescription: doc.seoDescription,
          keywords: doc.keywords,
          content: doc.content,
          commonMistakes: doc.commonMistakes,
          fileName: doc.fileName,
          mimeType: doc.mimeType,
          sortOrder: doc.sortOrder,
          updatedAt: new Date(),
        },
      });

    console.log(`✓ Backfilled public_document: ${doc.slug}`);
  }

  console.log('Done backfilling legacy SBD documents.');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Backfill failed:', err);
    process.exit(1);
  });
