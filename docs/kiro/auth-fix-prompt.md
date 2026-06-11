# Paste This Into Kiro

## The Prompt

```
Fix the build error in apps/admin/src/lib/auth.ts

ERROR: Module not found: Can't resolve '@react-email/components'

PROBLEM:
- Line 10 imports render from @react-email/components
- This dependency doesn't exist in apps/admin
- It breaks the Turbopack build

SOLUTION:
Follow the email-sending pattern used elsewhere in the codebase:
- Remove: import { render } from '@react-email/components'
- Add: import { createEmailClient } from '@pmg/emails'
- Replace the render() call in magicLink plugin with createEmailClient() pattern

REFERENCE CODE (how it's done in billing-payments.ts):
```typescript
// CORRECT PATTERN - Use createEmailClient + React.createElement
const { createEmailClient, PaymentThankYouEmail, DEFAULT_REPLY_TO } = await import('@pmg/emails');
const emailClient = createEmailClient({
  apiKey: process.env.PMG_RESEND_API_KEY!,
  from: `PMG Admin <${DEFAULT_EMAIL_FROM}>`,
  adminEmail: DEFAULT_EMAIL_FROM,
});

const React = await import('react');
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
});

if (error) {
  console.error('[MagicLink Error]', error);
  throw new APIError('INTERNAL_SERVER_ERROR', { message: 'Failed to send email' });
}
```

CHANGES NEEDED IN apps/admin/src/lib/auth.ts:

1. Remove line 10:
   - import { render } from '@react-email/components'

2. Update imports at top:
   - Add: import React from 'react'
   - Change: import { MagicLinkEmail, DEFAULT_EMAIL_FROM } from '@pmg/emails'
   - Add: import { createEmailClient, DEFAULT_REPLY_TO } from '@pmg/emails'

3. In the magicLink plugin's sendMagicLink callback, replace the entire email sending logic with the pattern above

4. Use React.createElement() instead of JSX
5. Use createEmailClient() instead of new Resend()
6. Return the result from emailClient() call

TARGET: Build should complete with no module resolution errors
```

---

## Or Shorter Version

```
Fix apps/admin/src/lib/auth.ts - remove @react-email/components dependency

The auth.ts file imports render() from @react-email/components which isn't installed. 

Replace that entire email rendering approach with this pattern (used in billing-payments.ts):

1. Import createEmailClient from @pmg/emails instead of using render()
2. Create an emailClient using createEmailClient({apiKey, from, adminEmail})
3. Send emails by calling emailClient() with react: React.createElement(Component, props)
4. Don't use await render() - let createEmailClient handle the rendering

See apps/admin/src/app/actions/billing-payments.ts lines 177-214 for reference.
```

---

## What Kiro Will Do

Kiro should:
1. ✅ Identify the `sendMagicLink` callback in the magicLink plugin
2. ✅ Replace `const html = await render(MagicLinkEmail({...}))` logic
3. ✅ Use `createEmailClient()` and `React.createElement()` instead
4. ✅ Keep all the email props the same
5. ✅ Remove the @react-email/components import

## Verification

After Kiro fixes it:
```bash
cd /path/to/pmg-hub
bun run build
```

Should see: ✅ Build succeeds, no "Module not found" error
