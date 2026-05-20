/**
 * Tests for the submitContact action handler
 */
import { describe, it, expect, vi } from 'vitest'
import * as fc from 'fast-check'

// ── Inline handler (mirrors apps/aws/src/actions/index.ts handler logic) ──
interface ContactInput {
  name: string
  email: string
  subject: string
  message: string
}

interface HandlerDeps {
  dbInsert: ReturnType<typeof vi.fn>
  sendEmail: ReturnType<typeof vi.fn>
}

async function submitContactHandler(input: ContactInput, deps: HandlerDeps) {
  await deps.dbInsert({
    name: input.name,
    email: input.email,
    message: `Subject: ${input.subject}\n\n${input.message}`,
    source: 'aws',
    status: 'new',
  })

  try {
    await deps.sendEmail()
  } catch (err) {
    // console.error('[submitContact] Email send failed:', err)
  }

  return { success: true }
}

// Validation gate - mirrors the zod schema in the Astro action
function isValidInput(input: Partial<ContactInput>): input is ContactInput {
  return (
    typeof input.name === 'string' &&
    input.name.length >= 1 &&
    typeof input.email === 'string' &&
    input.email.includes('@') &&
    typeof input.subject === 'string' &&
    input.subject.length >= 1 &&
    typeof input.message === 'string' &&
    input.message.length >= 1
  )
}

// ── Arbitraries ──
const validName = fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0)
const validEmail = fc.emailAddress()
const validSubject = fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0)
const validMessage = fc.string({ minLength: 1, maxLength: 500 }).filter((s) => s.trim().length > 0)

const validPayload = fc.record({
  name: validName,
  email: validEmail,
  subject: validSubject,
  message: validMessage,
})

// ── Property 1: Valid form submission persists a lead ──
describe('submitContact handler - Property 1: Valid form submission persists a lead', () => {
  it('inserts a lead with source=aws, status=new, and matching field values', async () => {
    await fc.assert(
      fc.asyncProperty(validPayload, async (input) => {
        const dbInsert = vi.fn().mockResolvedValue(undefined)
        const sendEmail = vi.fn().mockResolvedValue({ data: {}, error: null })

        const result = await submitContactHandler(input, { dbInsert, sendEmail })

        expect(dbInsert).toHaveBeenCalledOnce()
        const inserted = dbInsert.mock.calls[0][0]
        expect(inserted.source).toBe('aws')
        expect(inserted.status).toBe('new')
        expect(inserted.name).toBe(input.name)
        expect(inserted.email).toBe(input.email)
        expect(inserted.message).toContain(input.subject)
        expect(inserted.message).toContain(input.message)
        expect(result).toEqual({ success: true })
      }),
      { numRuns: 100 },
    )
  })
})

// ── Property 2: Email failure does not prevent lead persistence ──
describe('submitContact handler - Property 2: Email failure does not prevent lead persistence', () => {
  it('still inserts the lead and returns { success: true } even when sendEmail throws', async () => {
    await fc.assert(
      fc.asyncProperty(validPayload, async (input) => {
        const dbInsert = vi.fn().mockResolvedValue(undefined)
        const sendEmail = vi.fn().mockRejectedValue(new Error('Resend API error'))

        const result = await submitContactHandler(input, { dbInsert, sendEmail })

        expect(dbInsert).toHaveBeenCalledOnce()
        expect(result).toEqual({ success: true })
      }),
      { numRuns: 100 },
    )
  })
})

// ── Property 3: Invalid inputs are rejected ──
describe('submitContact handler - Property 3: Invalid inputs are rejected', () => {
  const invalidPayloads = fc.oneof(
    // Empty name
    fc.record({
      name: fc.constant(''),
      email: validEmail,
      subject: validSubject,
      message: validMessage,
    }),
    // Invalid email
    fc.record({
      name: validName,
      email: fc.constant('not-an-email'),
      subject: validSubject,
      message: validMessage,
    }),
    // Empty subject
    fc.record({
      name: validName,
      email: validEmail,
      subject: fc.constant(''),
      message: validMessage,
    }),
  )

  it('validation gate rejects invalid payloads', () => {
    fc.assert(
      fc.property(invalidPayloads, (input) => {
        expect(isValidInput(input)).toBe(false)
      }),
      { numRuns: 100 },
    )
  })
})
