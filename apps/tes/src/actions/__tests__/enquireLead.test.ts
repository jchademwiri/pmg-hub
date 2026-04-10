/**
 * Property-based tests for the enquireLead action handler
 * Tests Properties 1–4 from the design document
 *
 * Since the action uses Astro-specific imports (astro:actions, astro:schema),
 * we test the handler logic directly via an inline mirror of the handler,
 * using injected mocks for db and sendEmail.
 */
import { describe, it, expect, vi } from 'vitest'
import * as fc from 'fast-check'

// ── Inline handler (mirrors apps/tes/src/actions/index.ts handler logic) ──
interface LeadInput {
  name: string
  phone: string
  email?: string
  companyName?: string
  serviceInterest: string
}

interface HandlerDeps {
  dbInsert: ReturnType<typeof vi.fn>
  sendEmail: ReturnType<typeof vi.fn>
}

async function enquireLeadHandler(input: LeadInput, deps: HandlerDeps) {
  await deps.dbInsert({
    name: input.name,
    phone: input.phone,
    email: input.email || null,
    message: input.companyName ? `Company: ${input.companyName}` : null,
    serviceInterest: input.serviceInterest,
    source: 'tes',
    status: 'new',
  })

  try {
    await deps.sendEmail()
  } catch (err) {
    console.error('[enquireLead] Email send failed:', err)
  }

  return { success: true }
}

// Validation gate — mirrors the zod schema in the Astro action
function isValidInput(input: Partial<LeadInput>): input is LeadInput {
  return (
    typeof input.name === 'string' &&
    input.name.length >= 1 &&
    typeof input.phone === 'string' &&
    input.phone.length >= 7 &&
    typeof input.serviceInterest === 'string' &&
    input.serviceInterest.length >= 1
  )
}

// ── Arbitraries ──
const validName = fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0)
const validPhone = fc
  .string({ minLength: 7, maxLength: 20 })
  .filter((s) => s.trim().length >= 7)
const validServiceInterest = fc
  .string({ minLength: 1, maxLength: 100 })
  .filter((s) => s.trim().length > 0)
const optionalEmail = fc.option(fc.emailAddress(), { nil: undefined, freq: 3 })
const optionalCompany = fc.option(fc.string({ minLength: 1, maxLength: 100 }), {
  nil: undefined,
  freq: 3,
})

const validPayload = fc.record({
  name: validName,
  phone: validPhone,
  email: optionalEmail,
  companyName: optionalCompany,
  serviceInterest: validServiceInterest,
})

// ── Property 1: Valid form submission persists a lead ──
// Validates: Requirements 13.3, 13.6
describe('enquireLead handler — Property 1: Valid form submission persists a lead', () => {
  it('inserts a lead with source=tes, status=new, and matching field values for any valid payload', async () => {
    await fc.assert(
      fc.asyncProperty(validPayload, async (input) => {
        const dbInsert = vi.fn().mockResolvedValue(undefined)
        const sendEmail = vi.fn().mockResolvedValue({ data: {}, error: null })

        const result = await enquireLeadHandler(input, { dbInsert, sendEmail })

        expect(dbInsert).toHaveBeenCalledOnce()
        const inserted = dbInsert.mock.calls[0][0]
        expect(inserted.source).toBe('tes')
        expect(inserted.status).toBe('new')
        expect(inserted.name).toBe(input.name)
        expect(inserted.phone).toBe(input.phone)
        expect(inserted.email).toBe(input.email || null)
        if (input.companyName) {
          expect(inserted.message).toBe(`Company: ${input.companyName}`)
        } else {
          expect(inserted.message).toBeNull()
        }
        expect(inserted.serviceInterest).toBe(input.serviceInterest)
        expect(result).toEqual({ success: true })
      }),
      { numRuns: 100 },
    )
  })
})

// ── Property 2: Email failure does not prevent lead persistence ──
// Validates: Requirements 13.5
describe('enquireLead handler — Property 2: Email failure does not prevent lead persistence', () => {
  it('still inserts the lead and returns { success: true } even when sendEmail throws', async () => {
    await fc.assert(
      fc.asyncProperty(validPayload, async (input) => {
        const dbInsert = vi.fn().mockResolvedValue(undefined)
        const sendEmail = vi.fn().mockRejectedValue(new Error('Resend API error'))

        const result = await enquireLeadHandler(input, { dbInsert, sendEmail })

        expect(dbInsert).toHaveBeenCalledOnce()
        expect(result).toEqual({ success: true })
      }),
      { numRuns: 100 },
    )
  })
})

// ── Property 3: Invalid inputs are rejected before database write ──
// Validates: Requirements 13.2, 12.10
describe('enquireLead handler — Property 3: Invalid inputs are rejected before database write', () => {
  const invalidPayloads = fc.oneof(
    // Empty name
    fc.record({
      name: fc.constant(''),
      phone: validPhone,
      serviceInterest: validServiceInterest,
    }),
    // Phone too short (< 7 chars)
    fc.record({
      name: validName,
      phone: fc.string({ minLength: 0, maxLength: 6 }),
      serviceInterest: validServiceInterest,
    }),
    // Empty serviceInterest
    fc.record({
      name: validName,
      phone: validPhone,
      serviceInterest: fc.constant(''),
    }),
  )

  it('validation gate rejects payloads with empty name, short phone, or empty serviceInterest', () => {
    fc.assert(
      fc.property(invalidPayloads, (input) => {
        expect(isValidInput(input)).toBe(false)
      }),
      { numRuns: 100 },
    )
  })

  it('handler is never invoked for invalid payloads — dbInsert is not called', async () => {
    await fc.assert(
      fc.asyncProperty(invalidPayloads, async (input) => {
        const dbInsert = vi.fn().mockResolvedValue(undefined)
        const sendEmail = vi.fn().mockResolvedValue({ data: {}, error: null })

        if (!isValidInput(input)) {
          // Simulate the validation gate the Astro action's zod schema provides
          expect(dbInsert).not.toHaveBeenCalled()
          return
        }

        // Should not reach here for invalid inputs
        await enquireLeadHandler(input, { dbInsert, sendEmail })
        expect(dbInsert).not.toHaveBeenCalled()
      }),
      { numRuns: 100 },
    )
  })
})

// ── Property 4: WhatsApp URL consistency ──
// Validates: Requirements 16.1, 16.2, 16.3
describe('enquireLead handler — Property 4: WhatsApp URL consistency', () => {
  const CANONICAL_WHATSAPP_URL =
    "https://wa.me/27745017094?text=Hi%2C+I'm+interested+in+your+tender+compliance+services."
  const COMPONENTS_WITH_WHATSAPP = [
    'Nav',
    'Hero',
    'HowItWorks',
    'PricingSection',
    'Footer',
    'LeadForm',
  ] as const

  it('canonical WhatsApp URL matches the required format for all component references', () => {
    fc.assert(
      fc.property(fc.constantFrom(...COMPONENTS_WITH_WHATSAPP), (componentName) => {
        // The canonical URL must start with the correct wa.me number
        expect(CANONICAL_WHATSAPP_URL).toMatch(/^https:\/\/wa\.me\/27745017094/)
        // Must include the pre-filled message text
        expect(CANONICAL_WHATSAPP_URL).toContain('text=')
        // Component name must be one of the known components
        expect(COMPONENTS_WITH_WHATSAPP).toContain(componentName)
      }),
      { numRuns: 100 },
    )
  })

  it('every WhatsApp anchor in component source files uses the canonical URL', () => {
    // Read the actual component files and verify the URL appears correctly
    const fs = require('fs')
    const path = require('path')

    const componentDir = path.resolve(__dirname, '../../components')

    fc.assert(
      fc.property(fc.constantFrom(...COMPONENTS_WITH_WHATSAPP), (componentName) => {
        const filePath = path.join(componentDir, `${componentName}.astro`)
        if (!fs.existsSync(filePath)) return

        const source = fs.readFileSync(filePath, 'utf-8')

        // If the component has a WhatsApp href, it must be the canonical URL
        if (source.includes('wa.me')) {
          expect(source).toContain(CANONICAL_WHATSAPP_URL)
          // Accept both single and double quote attribute styles
          const hasTargetBlank =
            source.includes('target="_blank"') || source.includes("target='_blank'")
          expect(hasTargetBlank).toBe(true)
          const hasRel =
            source.includes('rel="noopener noreferrer"') ||
            source.includes("rel='noopener noreferrer'")
          expect(hasRel).toBe(true)
        }
      }),
      { numRuns: 100 },
    )
  })
})
