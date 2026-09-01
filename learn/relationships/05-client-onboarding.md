# 5. Client Onboarding & 1-Click Conversion

> Learn how new clients submit their intake forms from public websites and how administrators review and convert them into full clients and portal users in one click.

---

## What Is Client Onboarding?

Client Onboarding bridges the gap between public prospective clients on our brand websites and our internal operations. Instead of manually entering client information from emails or WhatsApp messages, prospective clients fill out a branded onboarding form.

### The Onboarding Lifecycle

```text
Prospective Client visits:
- playhousemedia.co.za/onboard
- tenderedgesolutions.co.za/onboard
- apexwebsolutions.co.za/onboard
        │
        ▼ (Submits Form)
Admin receives notification email & submission logged in DB
        │
        ▼
Admin opens Relationships -> Onboarding -> Review Drawer
        │
        ▼ (Clicks "Convert to Client")
System automatically:
1. Creates active Client record in @repo/db
2. Sets up Client Portal credentials / authentication
3. Sends welcome email with magic link to Client Portal
4. Updates Onboarding submission status to "Converted"
```

---

## 1. Sharing Onboarding Links

You can send direct onboarding links to prospects:

1. Go to `Relationships -> Onboarding`.
2. Click **Share Onboarding Link** in the top right.
3. Select the desired division:
   - **Playhouse Media Group**: `https://playhousemedia.co.za/onboard`
   - **TenderEdge Solutions**: `https://tenderedgesolutions.co.za/onboard`
   - **Apex Web Solutions**: `https://apexwebsolutions.co.za/onboard`
4. Click **Copy Link** and send it via email, chat, or proposal document.

---

## 2. What Information Clients Submit

The public multi-step onboarding form captures:

- **Company Identity**: Legal company name, trading name, registration number (CIPC), and VAT number.
- **Primary Contact**: Full name, direct email address, phone number, and designation/job title.
- **Billing Preferences**: Accounts/billing email, physical address, postal code, and country.
- **Service Scope & Requirements**: Selected service packages, budget expectations, timeline, and project description.

---

## 3. Reviewing Submissions in Admin

1. Navigate to `Relationships -> Onboarding`.
2. Filter the table by status (`Pending`, `In Review`, `Converted`, or `Rejected`).
3. Click on any pending submission row or click **Review** to open the **Onboarding Review Drawer**.
4. The drawer displays:
   - Complete company profile and contact details.
   - Selected division and requested services.
   - Verification status of provided email addresses and tax numbers.
   - Submission timestamp and origin domain.

---

## 4. Performing 1-Click Conversion

When you are satisfied with the prospect's details:

1. In the **Onboarding Review Drawer**, review the pre-populated client fields.
2. Ensure the correct division (`PMG`, `TES`, or `AWS`) is selected.
3. Toggle `Retainer Client` if they signed up for an ongoing monthly service plan.
4. Click **Convert to Client**.
5. The system performs the complete activation:
   - Creates the Client database entity.
   - Sets up Better Auth client portal credentials.
   - Dispatches a branded **Client Onboarding Confirmation Email** with direct portal access via Resend.
   - Dispatches an **Admin Notification Email** confirming successful onboarding.
6. The drawer displays a success message with a direct link to the newly created Client record and an **Impersonate in Portal** button to preview their portal workspace immediately.

---

## 5. Handling Incomplete or Invalid Submissions

- **Missing Details**: You can edit contact fields directly in the review drawer before converting.
- **Spam or Duplicate**: Change the status to `Rejected` or delete the submission to keep the review queue clean.
