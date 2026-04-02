import { db } from "./db"; // Your drizzle db instance
import { packages } from "./schema";

const seedData = async () => {
  await db.insert(packages).values([
    {
      title: "Digital Identity",
      slug: "digital-identity",
      tagline: "The Tender Starter Pack",
      description:
        "Perfect for new companies needing a professional email for tenders.",
      monthlyPrice: 9900, // R99.00
      setupFee: 45000, // R450.00
      features: [
        "Professional .co.za Domain",
        "3x Business Email Accounts",
        "Digital Business Card",
        "Company Reg Number Display",
        "Mobile Friendly",
      ],
      isPopular: false,
    },
    {
      title: "Company Profile",
      slug: "company-profile",
      tagline: "The Credibility Builder",
      description:
        "A complete one-page website to showcase your services and build trust.",
      monthlyPrice: 25000, // R250.00
      setupFee: 145000, // R1,450.00
      features: [
        "Professional One-Page Website",
        "About Us & Services Sections",
        "WhatsApp Chat Button",
        "Google Maps Integration",
        "Monthly Content Updates",
      ],
      isPopular: true,
    },
    {
      title: "Business Growth",
      slug: "business-growth",
      tagline: "The SEO Ranker",
      description:
        "A multi-page solution to help you rank on Google and find new clients.",
      monthlyPrice: 35000, // R350.00
      setupFee: 295000, // R2,950.00
      features: [
        "5-Page Website Structure",
        "Contact Form with Lead Alerts",
        "Basic SEO (Google Ranking)",
        "Google Business Profile Setup",
        "Social Media Links",
      ],
      isPopular: false,
    },
  ]);
};
