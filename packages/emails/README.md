# @pmg/emails

Shared email templates and send wrapper for the PMG monorepo. Built with [React Email](https://react.email) and [Resend](https://resend.com).

## Required Environment Variables

Each consuming app must supply these environment variables at call time. The package itself never reads `process.env`.

| Variable | Description |
|---|---|
| `RESEND_API_KEY` | Your Resend API key (e.g. `re_...`) |
| `FROM_EMAIL` | The verified sending address (e.g. `noreply@yourdomain.com`) |
| `ADMIN_EMAIL` | The admin recipient address for internal notifications |

## Usage

```typescript
import { createEmailClient, ContactFormEmail } from "@pmg/emails";
import React from "react";

const email = createEmailClient({
  apiKey: process.env.RESEND_API_KEY!,
  from: process.env.FROM_EMAIL!,
  adminEmail: process.env.ADMIN_EMAIL!,
});

const { data, error } = await email({
  to: process.env.ADMIN_EMAIL!,
  subject: "New contact form submission",
  react: React.createElement(ContactFormEmail, {
    name: "Jane Smith",
    email: "jane@example.com",
    subject: "Project inquiry",
    message: "Hello, I'd like to discuss a project.",
  }),
});

if (error) {
  console.error("Email send failed:", error.message);
}
```

## Available Templates

- `ContactFormEmail` — Contact form submission notification
- `AutoReplyEmail` — Auto-reply to the person who submitted the form
- `BookingConfirmationEmail` — Booking confirmation for a client
- `NewSubscriberEmail` — New newsletter subscriber notification
- `AdminNewLeadEmail` — New lead notification for the admin

## Preview Server

Run the react-email preview server to visually inspect templates:

```bash
bun run email:dev
```
