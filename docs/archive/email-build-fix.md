# Fix Email Issues + Build Error

5 issues to fix: 4 email consistency/duplication bugs + 1 build-breaking bug.

## Build Error — Root Cause

The `alert-dialog.tsx` file was **committed as empty** to git (`e69de29` = empty blob). The content exists only locally — Vercel clones from git and sees an empty file, hence "The module has no exports at all." Fix: commit the file.

---

## Proposed Changes

### Build Fix

#### [MODIFY] [alert-dialog.tsx](file:///d:/dev/websites/pmg-hub/apps/admin/src/components/ui/alert-dialog.tsx)
No code change needed — just needs to be `git add`'d and committed. The file has the correct content locally.

---

### Issue 1 — Cron route: no CC + hardcoded from address

#### [MODIFY] [route.ts](file:///d:/dev/websites/pmg-hub/apps/admin/src/app/api/cron/outstanding-reminders/route.ts)
- Replace `process.env.EMAIL_FROM_ADDRESS || 'info@playhousemedia.com'` → use `DEFAULT_EMAIL_FROM`
- Import `DEFAULT_EMAIL_FROM` and `resolveDivisionAdminEmail` from `@pmg/emails`
- Add `cc: adminCc` to the `emailClient()` call (matching the pattern in all other senders)
- Replace inline `resolveFromEmail` + brand-detection with the new shared helpers (see Issues 3 & 4)

---

### Issue 2 — brand-config.ts uses wrong constant for adminEmail

#### [MODIFY] [brand-config.ts](file:///d:/dev/websites/pmg-hub/packages/emails/src/brand-config.ts)
- Line 66: Change `BRAND_REPLY_TO[brand]` → `BRAND_ADMIN_EMAIL[brand]`
- Add `BRAND_ADMIN_EMAIL` to the import from `./domains`

---

### Issue 3 — Extract shared `resolveFromEmail` helper

#### [MODIFY] [domains.ts](file:///d:/dev/websites/pmg-hub/packages/emails/src/domains.ts)
Add exported `resolveFromEmail(divisionWebsite, fallbackFrom)` function — same logic currently duplicated in 4 files.

#### [MODIFY] [index.ts](file:///d:/dev/websites/pmg-hub/packages/emails/src/index.ts)
Re-export `resolveFromEmail` from domains.ts.

Then remove the local copies from:
- [email-delivery.ts](file:///d:/dev/websites/pmg-hub/apps/admin/src/app/actions/email-delivery.ts) — lines 19-34
- [send-overdue-reminders.ts](file:///d:/dev/websites/pmg-hub/apps/admin/src/app/actions/send-overdue-reminders.ts) — lines 24-34
- [route.ts](file:///d:/dev/websites/pmg-hub/apps/admin/src/app/api/cron/outstanding-reminders/route.ts) — lines 8-18
- [page.tsx](file:///d:/dev/websites/pmg-hub/apps/admin/src/app/(admin)/settings/billing/page.tsx) — lines 16-26

All 4 will import from `@pmg/emails` instead.

---

### Issue 4 — Extract shared `resolveResendApiKey` helper

#### [MODIFY] [domains.ts](file:///d:/dev/websites/pmg-hub/packages/emails/src/domains.ts)
Add exported `resolveResendApiKey(divisionName)` function that encapsulates:
```ts
const name = divisionName?.toLowerCase() ?? '';
const isTes = name.includes('tender');
const isAws = name.includes('apex');
return (isTes ? process.env.TES_RESEND_API_KEY : isAws ? process.env.AWS_RESEND_API_KEY : undefined)
       ?? process.env.PMG_RESEND_API_KEY!;
```

#### [MODIFY] [index.ts](file:///d:/dev/websites/pmg-hub/packages/emails/src/index.ts)
Re-export `resolveResendApiKey`.

Then replace the inline brand-detection in:
- [email-delivery.ts](file:///d:/dev/websites/pmg-hub/apps/admin/src/app/actions/email-delivery.ts) — 2 occurrences (lines 82-85, 195-198)
- [send-overdue-reminders.ts](file:///d:/dev/websites/pmg-hub/apps/admin/src/app/actions/send-overdue-reminders.ts) — lines 161-168
- [billing-payments.ts](file:///d:/dev/websites/pmg-hub/apps/admin/src/app/actions/billing-payments.ts) — lines 253-256
- [route.ts](file:///d:/dev/websites/pmg-hub/apps/admin/src/app/api/cron/outstanding-reminders/route.ts) — lines 102-105

---

## Verification Plan

### Automated Tests
- `git diff` to confirm alert-dialog.tsx is staged
- Build locally with `npx turbo run build --filter=admin` to confirm the Turbopack error is resolved

### Manual Verification
- Push to `dev` branch and verify Vercel build passes
- Spot-check that email flows still work (invoice delivery, payment receipt, overdue reminders)
