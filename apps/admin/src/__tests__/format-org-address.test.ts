import { describe, expect, it } from 'vitest'
import { formatOrgAddress } from '@/lib/format'

describe('formatOrgAddress', () => {
  it('returns undefined when settings is null', () => {
    expect(formatOrgAddress(null)).toBeUndefined()
  })

  it('returns undefined when settings is undefined', () => {
    expect(formatOrgAddress(undefined)).toBeUndefined()
  })

  it('returns undefined when all address fields are null', () => {
    expect(formatOrgAddress({ addressStreet: null, addressCity: null, addressPostal: null })).toBeUndefined()
  })

  it('returns undefined when all address fields are undefined', () => {
    expect(formatOrgAddress({})).toBeUndefined()
  })

  it('joins street and city with comma', () => {
    expect(formatOrgAddress({ addressStreet: '123 Main St', addressCity: 'Johannesburg', addressPostal: null }))
      .toBe('123 Main St, Johannesburg')
  })

  it('joins all three fields when present', () => {
    expect(formatOrgAddress({ addressStreet: 'Raswouw AH', addressCity: 'Centurion', addressPostal: '0157' }))
      .toBe('Raswouw AH, Centurion, 0157')
  })

  it('returns just the street when only that is present', () => {
    expect(formatOrgAddress({ addressStreet: '123 Main St', addressCity: null, addressPostal: null }))
      .toBe('123 Main St')
  })

  it('handles empty strings', () => {
    expect(formatOrgAddress({ addressStreet: '', addressCity: 'Centurion', addressPostal: '' }))
      .toBe('Centurion')
  })

  it('returns undefined when all fields are empty strings', () => {
    expect(formatOrgAddress({ addressStreet: '', addressCity: '', addressPostal: '' }))
      .toBeUndefined()
  })
})
