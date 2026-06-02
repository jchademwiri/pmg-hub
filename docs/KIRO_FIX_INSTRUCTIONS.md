# Kiro Fix Instructions

## Problem Summary
Build fails with: `Module not found: Can't resolve '@react-email/components'` at `apps/admin/src/lib/auth.ts:10:1`

The `admin` app doesn't have `@react-email/components` as a dependency, but auth.ts tries to import and use `render()` from it.

## Context for Kiro

### Current Broken Code (apps/admin/src/lib/auth.ts line 1-11)
```typescript
import 'server-only'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { magicLink } from 'better-auth/plugins'
import { createAuthMiddleware, APIError } from 'better-auth/api'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getDb, invitations, user, eq } from '@pmg/db'
import { Resend } from 'resend'
import { render } from '@react-email/components'  // ❌ BROKEN: Not in admin dependencies
import { MagicLinkEmail, DEFAULT_EMAIL_FROM } from '@pmg/emails'
```

### Where render() is Used
In the magicLink plugin's `sendMagicLink` callback:
```typescript
const html = await render(
  MagicLinkEmail({
    url,
    expiresIn: '24 hours',
    companyName: 'Playhouse Media Group',
    primaryColor: '#1d4ed8',
    websiteUrl: 'https://playhousemedia.co.za',
  })
)
```

## How Other Emails Do It (Reference Pattern)

From `apps/admin/src/app/actions/billing-payments.ts` (lines 177-214):

```typescript
// THEY DON'T USE render() - they use React.createElement() + createEmailClient()
if (client.email) {
  (async () => {
    try {
      const { createEmailClient, PaymentThankYouEmail, DEFAULT_REPLY_TO } = await import('@pmg/emails');
      const emailClient = createEmailClient({
        apiKey,
        from: `${fromName} <${fromEmail}>`,
        adminEmail: fromEmail,
      });

      const React = await import('react');
      await emailClient({
        to: client.email!,
        subject: `Payment Receipt...`,
        react: React.createElement(PaymentThankYouEmail, emailProps),
        replyTo: DEFAULT_REPLY_TO,
      });
    } catch (mailErr) {
      console.error('Failed to send email:', mailErr);
    }
  })();
}
```

Key pattern:
- ✅ Use `React.createElement(ComponentName, props)`
- ✅ Use `createEmailClient()` from @pmg/emails
- ✅ Pass React element to `emailClient()`
- ❌ Don't import or use `render()` from @react-email/components

## What @pmg/emails exports

From `packages/emails/src/index.ts`:
```typescript
export { sendEmail, createEmailClient, renderEmailTemplate } from "./send";
export { default as MagicLinkEmail } from "./templates/MagicLinkEmail";
export { MagicLinkEmailProps } from "./templates/MagicLinkEmail";
export { DEFAULT_EMAIL_FROM, DEFAULT_REPLY_TO, DEFAULT_WEBSITE_URL, ... } from "./domains";
```

## The Fix Kiro Should Apply

**Replace this:**
```typescript
import { render } from '@react-email/components'
import { MagicLinkEmail, DEFAULT_EMAIL_FROM } from '@pmg/emails'

// In magicLink plugin:
const html = await render(
  MagicLinkEmail({
    url,
    expiresIn: '24 hours',
    companyName: 'Playhouse Media Group',
    primaryColor: '#1d4ed8',
    websiteUrl: 'https://playhousemedia.co.za',
  })
)

const { error } = await resend.emails.send({
  from: `PMG Admin <${DEFAULT_EMAIL_FROM}>`,
  to: email,
  subject: 'Sign in to PMG Control Center',
  html,
})
```

**With this:**
```typescript
import { createEmailClient, MagicLinkEmail, DEFAULT_EMAIL_FROM, DEFAULT_REPLY_TO } from '@pmg/emails'
import React from 'react'

// In magicLink plugin's sendMagicLink callback:
const emailClient = createEmailClient({
  apiKey: process.env.PMG_RESEND_API_KEY!,
  from: `PMG Admin <${DEFAULT_EMAIL_FROM}>`,
  adminEmail: DEFAULT_EMAIL_FROM,
})

const { data, error } = await emailClient({
  to: email,
  subject: 'Sign in to PMG Control Center',
  react: React.createElement(MagicLinkEmail, {
    url,
    expiresIn: '24 hours',
    companyName: 'Playhouse Media Group',
    primaryColor: '#1d4ed8',
    websiteUrl: 'https://playhousemedia.co.za',
  }),
  replyTo: DEFAULT_REPLY_TO,
})

if (error) {
  console.error('[MagicLink Error]', error)
  throw new APIError('INTERNAL_SERVER_ERROR', { message: 'Failed to send email' })
}
```

## Key Changes

1. **Remove import:**
   - ❌ `import { render } from '@react-email/components'`

2. **Add imports:**
   - ✅ `import { createEmailClient, ... } from '@pmg/emails'`
   - ✅ `import React from 'react'`

3. **Replace render() call:**
   - ❌ `const html = await render(<Component {...props} />)`
   - ✅ `const emailClient = createEmailClient({...})`
   - ✅ `await emailClient({ react: React.createElement(...) })`

4. **Error handling:**
   - The `emailClient()` returns `{ data, error }` from Resend
   - Check `error` instead of relying on exceptions

## File Location
`apps/admin/src/lib/auth.ts`

## Test Command
```bash
cd /path/to/pmg-hub
bun run build
```

Expected: ✅ No module resolution errors, successful build

## Kiro Prompt Template

You can give Kiro this prompt:

---

**"Fix the @react-email/components import error in apps/admin/src/lib/auth.ts**

**Problem:** Line 10 imports `render` from '@react-email/components', which doesn't exist in admin's dependencies. This breaks the Turbopack build.

**Solution:** Use the pattern from `apps/admin/src/app/actions/billing-payments.ts` instead:
- Remove the `@react-email/components` import
- Use `React.createElement()` instead of JSX rendering
- Use `createEmailClient()` from `@pmg/emails` to send emails
- Pass the React element via `react:` prop to emailClient

**Reference implementation:** Check how `recordClientPayment()` in billing-payments.ts sends emails using createEmailClient + React.createElement (lines 177-214).

**File to fix:** apps/admin/src/lib/auth.ts

**Build test:** `bun run build` should complete without module resolution errors."

---

## Summary for Kiro

| Item | Details |
|------|---------|
| **File** | `apps/admin/src/lib/auth.ts` |
| **Error** | Module not found: '@react-email/components' |
| **Root cause** | Using `render()` function directly |
| **Fix pattern** | Use `createEmailClient()` + `React.createElement()` |
| **Reference** | `apps/admin/src/app/actions/billing-payments.ts` (lines 177-214) |
| **Verification** | `bun run build` succeeds |
