# @pmg/emails

Shared email templates and send wrapper for the PMG monorepo. Built with [React Email](https://react.email) and [Resend](https://resend.com).

### Required Environment Variables

The monorepo uses a two-level env strategy:

```
.env.local                 ← root, shared — DATABASE_URL lives here
apps/tes/.env.local        ← TES-specific only
apps/aws/.env.local        ← AWS-specific only
apps/pmg/.env.local        ← PMG-specific only
```

Each app uses a site prefix so variables are unambiguous when running multiple apps locally:

```env
# .env.local (root — shared)
DATABASE_URL=postgresql://...
DATABASE_URL_UNPOOLED=postgresql://...
```

```env
# apps/tes/.env.local
TES_RESEND_API_KEY=re_xxxxxxxxxxxx
TES_FROM_EMAIL=noreply@tenderedgesolutions.co.za
TES_ADMIN_EMAIL=tenders@tenderedgesolutions.co.za
TES_SITE_URL=http://localhost:4321
```

```env
# apps/aws/.env.local
AWS_RESEND_API_KEY=re_xxxxxxxxxxxx
AWS_FROM_EMAIL=noreply@apexwebsolutions.co.za
AWS_ADMIN_EMAIL=info@apexwebsolutions.co.za
AWS_SITE_URL=http://localhost:4322
```

```env
# apps/pmg/.env.local
PMG_RESEND_API_KEY=re_xxxxxxxxxxxx
PMG_FROM_EMAIL=noreply@playhousemedia.co.za
PMG_ADMIN_EMAIL=info@playhousemedia.co.za
PMG_SITE_URL=http://localhost:4323
```

Each app's `.env.example` documents its own variables. The root `.env.example` documents the shared ones.

## Usage

Each app passes its own prefixed env vars at call time. The package never reads `process.env` directly.

```typescript
// apps/tes — uses TES_ prefix
import { createEmailClient, AdminNewLeadEmail } from "@pmg/emails";
import React from "react";

const email = createEmailClient({
  apiKey: import.meta.env.TES_RESEND_API_KEY,
  from: import.meta.env.TES_FROM_EMAIL,
  adminEmail: import.meta.env.TES_ADMIN_EMAIL,
});

const { data, error } = await email({
  to: import.meta.env.TES_ADMIN_EMAIL,
  subject: `New TES Lead: ${name}`,
  react: React.createElement(AdminNewLeadEmail, { ... }),
});

if (error) {
  console.error("Email send failed:", error.message);
}
```

## Available Templates

| Template | Purpose | Add when... |
|---|---|---|
| `AdminNewLeadEmail` | Admin notification when a lead submits an enquiry | TES lead form goes live |
| `AutoReplyEmail` | Auto-reply to the person who submitted a form | TES lead form goes live |

### Planned (add when the relevant site section is built)
- `BookingConfirmationEmail` — AWS booking dialog
- `ContactFormEmail` — AWS contact form
- `WaitlistEmail` — AWS waitlist form

## Preview Server

Run the react-email preview server to visually inspect templates:

```bash
bun run email:dev
```
