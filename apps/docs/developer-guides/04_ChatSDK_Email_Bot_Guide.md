# Chat SDK Email Bot — Reference Guide
## Resend + Chat SDK for PMG

**Status: FUTURE IMPLEMENTATION — DO NOT BUILD YET**  
**Build after:** PMG hub admin panel, TES site, and Resend email setup are all working  
**Location:** `apps/pmg-hub/lib/bot/`  
**Stack:** Chat SDK · @resend/chat-sdk-adapter · @chat-adapter/state-pg · Neon DB  
**Version:** 1.0 | March 2026

---

## WHAT IS THIS?

This guide covers adding a Resend-powered email bot to the PMG hub using Vercel's Chat SDK. The bot turns email into a two-way conversation channel — when a visitor replies to an auto-reply email, the bot receives it, saves it to the lead record, and notifies Jacob/Youlanda.

**This is not required to launch.** The basic Resend email flow (auto-reply + notification) works without Chat SDK. The bot adds:
- Automatic reply tracking (visitor replies are captured and logged)
- Proactive follow-up from the admin panel (`openDM`)
- Thread state — the bot remembers which division the conversation belongs to

**Read first:** `PMG_Resend_ChatSDK_Implementation.md` for full implementation details.

---

## PREREQUISITES BEFORE BUILDING

All of these must be working before adding the bot:

- [ ] PMG hub admin panel live at `playhousemedia.co.za/admin`
- [ ] Hono `POST /api/leads` working and receiving leads from TES
- [ ] Resend domain verified for at least one division
- [ ] Basic auto-reply and notification emails working (plain Resend, no Chat SDK)
- [ ] Neon DB running with `public.leads` table

---

## HOW IT WORKS

```
1. Visitor fills quote form on tenderedgesolutions.co.za
              ↓
2. TES Astro Action → POST /api/leads → lead saved to Neon DB
              ↓
3. Hono route calls sendLeadEmails()
   → Auto-reply to visitor (from bot@tenderedgesolutions.co.za)
   → Notification to info@tenderedgesolutions.co.za
              ↓
4. Visitor replies to the auto-reply email
              ↓
5. Resend receives the reply → fires email.received webhook
              ↓
6. POST → playhousemedia.co.za/api/webhooks/resend
              ↓
7. Chat SDK bot.webhooks.resend() → onSubscribedMessage fires
              ↓
8. Reply saved to lead record, Jacob/Youlanda notified
              ↓
OR: 24h no response → admin panel "Send follow-up" button
              ↓
9. bot.adapters.resend.openDM(lead.email) → follow-up card sent
```

---

## INSTALLATION

```bash
bun add chat @resend/chat-sdk-adapter @chat-adapter/state-pg
```

---

## RESEND SETUP REQUIRED BEFORE BOT WORKS

**1. Enable inbound receiving per domain:**
- Resend dashboard → Domains → select domain → Receiving tab → Enable

**2. Add webhook:**
- Resend dashboard → Webhooks → Add endpoint
- URL: `https://playhousemedia.co.za/api/webhooks/resend`
- Event: `email.received`
- Copy the signing secret → `RESEND_WEBHOOK_SECRET`

**3. Environment variable:**
```bash
RESEND_WEBHOOK_SECRET=whsec_xxxxxxxxxxxx
```

---

## FILE STRUCTURE

```
apps/pmg-hub/lib/bot/
├── index.ts          ← Bot instance
├── divisions.ts      ← Division config map
├── handlers.ts       ← onNewMention + onSubscribedMessage
└── templates.tsx     ← React Email card templates
```

---

## DIVISION CONFIG

**`lib/bot/divisions.ts`:**

```ts
export type DivisionId = 'tes' | 'apex' | 'launchpad' | 'creative' | 'studyedge'

export type DivisionConfig = {
  id:           DivisionId
  name:         string
  fromEmail:    string
  notifyEmail:  string
  resendApiKey: string
  domain:       string
  whatsappUrl:  string
  tagline:      string
}

export const DIVISIONS: Record<DivisionId, DivisionConfig> = {
  tes: {
    id:           'tes',
    name:         'Tender Edge Solutions',
    fromEmail:    'bot@tenderedgesolutions.co.za',
    notifyEmail:  'info@tenderedgesolutions.co.za',
    resendApiKey: process.env.RESEND_KEY_TES!,
    domain:       'tenderedgesolutions.co.za',
    whatsappUrl:  'https://wa.me/27740491433?text=Hi%2C+I+submitted+a+quote+request+on+Tender+Edge+Solutions.',
    tagline:      'Your Edge in Every Tender',
  },
  apex: {
    id:           'apex',
    name:         'Apex Web Solutions',
    fromEmail:    'bot@apexwebsolutions.co.za',
    notifyEmail:  'info@apexwebsolutions.co.za',
    resendApiKey: process.env.RESEND_KEY_APEX!,
    domain:       'apexwebsolutions.co.za',
    whatsappUrl:  'https://wa.me/27740491433?text=Hi%2C+I+submitted+a+request+on+Apex+Web+Solutions.',
    tagline:      'Where Great Websites Begin',
  },
  launchpad: {
    id:           'launchpad',
    name:         'LaunchPad SA',
    fromEmail:    'bot@launchpadsa.co.za',
    notifyEmail:  'info@launchpadsa.co.za',
    resendApiKey: process.env.RESEND_KEY_LAUNCHPAD!,
    domain:       'launchpadsa.co.za',
    whatsappUrl:  'https://wa.me/27740491433',
    tagline:      'Where Every Business Begins',
  },
  creative: {
    id:           'creative',
    name:         'Playhouse Creative Studio',
    fromEmail:    'bot@playhousecreative.co.za',
    notifyEmail:  'info@playhousecreative.co.za',
    resendApiKey: process.env.RESEND_KEY_CREATIVE!,
    domain:       'playhousecreative.co.za',
    whatsappUrl:  'https://wa.me/27740491433',
    tagline:      'Your Brand, Brought to Life',
  },
  studyedge: {
    id:           'studyedge',
    name:         'StudyEdge SA',
    fromEmail:    'bot@studyedgesa.co.za',
    notifyEmail:  'info@studyedgesa.co.za',
    resendApiKey: process.env.RESEND_KEY_STUDYEDGE!,
    domain:       'studyedgesa.co.za',
    whatsappUrl:  'https://wa.me/27740491433',
    tagline:      'Your Academic Edge — Earned',
  },
}

export function getDivisionFromEmail(toAddress: string): DivisionId {
  for (const [id, config] of Object.entries(DIVISIONS)) {
    if (toAddress.includes(config.domain)) return id as DivisionId
  }
  return 'tes' // fallback
}
```

---

## BOT INSTANCE

**`lib/bot/index.ts`:**

```ts
import { Chat } from 'chat'
import { createResendAdapter } from '@resend/chat-sdk-adapter'
import { createPostgresState } from '@chat-adapter/state-pg'

export const bot = new Chat({
  userName: 'pmg-bot',
  adapters: {
    resend: createResendAdapter({
      fromAddress: 'bot@playhousemedia.co.za',
      fromName:    'PMG Bot',
    }),
  },
  state: createPostgresState({
    connectionString: process.env.DATABASE_URL!,
  }),
})

// Register handlers
import './handlers'
```

---

## BOT HANDLERS

**`lib/bot/handlers.ts`:**

```ts
import { Resend } from 'resend'
import { bot } from './index'
import { DIVISIONS, getDivisionFromEmail } from './divisions'

interface ThreadState {
  division: string
  leadId?:  string
  name?:    string
}

// ─── New inbound email ────────────────────────────────────────────────────────

bot.onNewMention(async (thread, message) => {
  const toAddress  = (message.raw as any)?.data?.to?.[0]?.email ?? ''
  const divisionId = getDivisionFromEmail(toAddress)
  const config     = DIVISIONS[divisionId as keyof typeof DIVISIONS]

  await thread.subscribe()
  await thread.setState({ division: divisionId } satisfies ThreadState)

  // Send branded auto-reply via this division's Resend account
  const resend = new Resend(config.resendApiKey)

  await resend.emails.send({
    from:    `${config.name} <${config.fromEmail}>`,
    to:      message.author.email ?? '',
    replyTo: config.notifyEmail,
    subject: `Re: ${message.text?.slice(0, 60) ?? 'Your enquiry'}`,
    react:   AutoReplyCard({
      name:         message.author.fullName ?? 'there',
      divisionName: config.name,
      tagline:      config.tagline,
      whatsappUrl:  config.whatsappUrl,
    }),
  })

  // Notify Jacob/Youlanda
  await resend.emails.send({
    from:    `PMG Bot <bot@playhousemedia.co.za>`,
    to:      config.notifyEmail,
    subject: `New email lead — ${message.author.fullName ?? message.author.email}`,
    react:   LeadNotificationCard({
      name:     message.author.fullName ?? 'Unknown',
      email:    message.author.email ?? '',
      message:  message.text ?? '',
      division: config.name,
    }),
  })
})

// ─── Follow-up reply ──────────────────────────────────────────────────────────

bot.onSubscribedMessage(async (thread, message) => {
  const state  = await thread.state as ThreadState
  const config = DIVISIONS[state.division as keyof typeof DIVISIONS]
  if (!config) return

  const resend = new Resend(config.resendApiKey)
  await resend.emails.send({
    from:    `PMG Bot <bot@playhousemedia.co.za>`,
    to:      config.notifyEmail,
    subject: `Follow-up reply — ${message.author.fullName ?? message.author.email}`,
    html: `
      <p><strong>${message.author.fullName ?? message.author.email}</strong> replied:</p>
      <blockquote style="border-left:3px solid #ccc;padding-left:12px;color:#555">
        ${message.text}
      </blockquote>
      <p>Reply directly or via WhatsApp:
        <a href="${config.whatsappUrl}">${config.whatsappUrl}</a>
      </p>
    `,
  })
})
```

---

## WEBHOOK ROUTE

**`app/api/webhooks/resend/route.ts`:**

```ts
import { bot } from '@/lib/bot'

export async function POST(request: Request) {
  const result = await bot.webhooks.resend(request)
  return new Response(null, { status: result.status })
}
```

---

## PROACTIVE FOLLOW-UP

Called from admin panel "Send follow-up" button after 24h of no contact:

```ts
// lib/api/leads.ts — add this route
leadsRouter.post('/:id/followup', async (c) => {
  const { id } = c.req.param()
  const [lead]  = await db.select().from(leads).where(eq(leads.id, id))
  if (!lead) return c.json({ error: 'Lead not found' }, 404)

  const config = DIVISIONS[lead.division as DivisionId]

  const threadId = await bot.adapters.resend.openDM(lead.email!)
  const thread   = await bot.thread('resend', threadId)

  await thread.post({
    card: {
      type:     'card',
      title:    `Following up — ${config.name}`,
      subtitle: `Hi ${lead.name},`,
      children: [
        {
          type:    'text',
          content: `We wanted to follow up on your recent enquiry about ${lead.services?.join(', ') ?? 'our services'}. Are you still interested? We would love to help.`,
        },
        { type: 'divider' },
        {
          type:     'actions',
          children: [
            { type: 'link-button', label: 'Reply to this email', url: `mailto:${config.notifyEmail}` },
            { type: 'link-button', label: 'WhatsApp us',         url: config.whatsappUrl },
          ],
        },
      ],
    },
    fallbackText: `Hi ${lead.name}, following up on your enquiry. Reply or WhatsApp us at 074 049 1433.`,
  })

  await db.update(leads)
    .set({ status: 'contacted', updatedAt: new Date() })
    .where(eq(leads.id, id))

  return c.json({ success: true })
})
```

---

## CARD EMAIL TEMPLATES

**`lib/bot/templates.tsx`:**

```tsx
import {
  Html, Head, Body, Section, Heading,
  Text, Hr, Link, Button
} from '@react-email/components'

// Auto-reply to visitor
export function AutoReplyCard({
  name, divisionName, tagline, whatsappUrl
}: {
  name:         string
  divisionName: string
  tagline:      string
  whatsappUrl:  string
}) {
  return (
    <Html><Head />
      <Body style={{ fontFamily: 'sans-serif', background: '#f4f4f2', padding: '24px' }}>
        <Section style={{ maxWidth: 560, margin: '0 auto', background: '#fff', borderRadius: 8, padding: '32px' }}>
          <Heading style={{ color: '#0D1B2A', fontSize: 20 }}>Hi {name},</Heading>
          <Text style={{ color: '#555', fontSize: 14, lineHeight: 1.6 }}>
            Thank you for reaching out to <strong>{divisionName}</strong>.
            We have received your message and will respond within 24 hours.
          </Text>
          <Text style={{ color: '#888', fontSize: 12, fontStyle: 'italic' }}>{tagline}</Text>
          <Hr style={{ margin: '24px 0', borderColor: '#e5e5e3' }} />
          <Text style={{ color: '#555', fontSize: 14 }}>Need a faster response?</Text>
          <Button
            href={whatsappUrl}
            style={{ background: '#25D366', color: '#fff', padding: '10px 20px', borderRadius: 6, fontSize: 14, fontWeight: 600 }}
          >
            WhatsApp Us
          </Button>
          <Hr style={{ margin: '24px 0', borderColor: '#e5e5e3' }} />
          <Text style={{ color: '#aaa', fontSize: 11 }}>
            {divisionName} — a Playhouse Media Group division.
            Reply to this email to continue the conversation.
          </Text>
        </Section>
      </Body>
    </Html>
  )
}

// Lead notification to Jacob/Youlanda
export function LeadNotificationCard({
  name, email, message, division
}: {
  name:     string
  email:    string
  message:  string
  division: string
}) {
  return (
    <Html><Head />
      <Body style={{ fontFamily: 'sans-serif', background: '#f4f4f2', padding: '24px' }}>
        <Section style={{ maxWidth: 560, margin: '0 auto', background: '#fff', borderRadius: 8, padding: '32px' }}>
          <Heading style={{ color: '#0D1B2A', fontSize: 18 }}>New lead — {division}</Heading>
          <table style={{ width: '100%', fontSize: 14 }}>
            <tbody>
              {[['Name', name], ['Email', email], ['Division', division]].map(([label, value]) => (
                <tr key={label}>
                  <td style={{ color: '#888', padding: '6px 0', width: 80 }}>{label}</td>
                  <td style={{ color: '#222', padding: '6px 0' }}>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Hr style={{ margin: '20px 0' }} />
          <Text style={{ color: '#555', fontSize: 14 }}><strong>Message:</strong><br />{message}</Text>
          <Hr style={{ margin: '20px 0' }} />
          <Link href={`mailto:${email}`} style={{ color: '#F97316', fontSize: 14, marginRight: 16 }}>Reply via email</Link>
          <Link href="https://playhousemedia.co.za/admin/leads" style={{ color: '#0D1B2A', fontSize: 14 }}>View in admin panel</Link>
        </Section>
      </Body>
    </Html>
  )
}
```

---

## ENVIRONMENT VARIABLES (additions for the bot)

```bash
# Add to apps/pmg-hub/.env.local

# Resend webhook secret — from Resend dashboard → Webhooks
RESEND_WEBHOOK_SECRET=whsec_xxxxxxxxxxxx

# Division Resend keys (one per brand account)
RESEND_KEY_TES=re_xxxxxxxxxxxx
RESEND_KEY_APEX=re_xxxxxxxxxxxx
RESEND_KEY_LAUNCHPAD=re_xxxxxxxxxxxx
RESEND_KEY_CREATIVE=re_xxxxxxxxxxxx
RESEND_KEY_STUDYEDGE=re_xxxxxxxxxxxx
```

---

## BUILD ORDER WHEN READY

| Step | Task |
|---|---|
| 1 | Enable inbound receiving in Resend per domain |
| 2 | Add webhook in Resend dashboard → `email.received` |
| 3 | Install packages |
| 4 | Create `lib/bot/divisions.ts` |
| 5 | Create `lib/bot/index.ts` |
| 6 | Create `lib/bot/handlers.ts` |
| 7 | Create `lib/bot/templates.tsx` |
| 8 | Add webhook route `app/api/webhooks/resend/route.ts` |
| 9 | Update Hono leads router to call bot auto-reply |
| 10 | Add follow-up route to Hono |
| 11 | Add "Send follow-up" button to admin leads table |
| 12 | Test end-to-end: submit form → receive auto-reply → reply to email → check notification |

Start with TES only. Once TES works end-to-end, adding other divisions is just adding entries to the `DIVISIONS` config and their API keys.

---

## LIMITATIONS TO KNOW

- Email is immutable — `editMessage`, `deleteMessage`, reactions, and typing indicators are not supported (email limitation, not SDK limitation)
- Chat SDK is currently in beta — pin your version and read the changelog before upgrading
- The state adapter creates its own tables (`chat_subscriptions`, `chat_locks`, `chat_state`) in your Neon DB — they are prefixed with `chat_` and do not conflict with PMG tables

---

## REFERENCE LINKS

- Chat SDK docs: chat-sdk.dev
- Resend adapter: resend.com/docs/chat-sdk
- Resend adapter GitHub: github.com/resend/resend-chat-sdk
- Inbound email setup: resend.com/docs/dashboard/receiving/introduction
- Webhook setup: resend.com/docs/webhooks/introduction

---

*Chat SDK Email Bot Reference Guide v1.0 | March 2026*  
*Future implementation — build after core admin and TES site are live*  
*Playhouse Media Group — Jacob Chademwiri*
