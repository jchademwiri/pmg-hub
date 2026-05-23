import { describe, expect, it } from 'vitest'
import { getDocumentLogoText, getDocumentLogoUrl } from '@/lib/document-logo'

describe('document logo helpers', () => {
  it('uses AWS abbreviation for Apex/AWS org names', () => {
    expect(getDocumentLogoUrl('Apex Web Solutions')).toBe('/logo/apex-logo.svg')
    expect(getDocumentLogoText('Apex Web Solutions')).toBe('AWS')
    expect(getDocumentLogoText('AWS Services')).toBe('AWS')
  })

  it('uses PMG abbreviation for Playhouse Media Group names', () => {
    expect(getDocumentLogoUrl('Playhouse Media Group')).toBe('/logo/pmg-logo.png')
    expect(getDocumentLogoText('Playhouse Media Group')).toBe('PMG')
    expect(getDocumentLogoText('PMG Holdings')).toBe('PMG')
  })

  it('returns the TES logo URL and abbreviation for Tender Edge Solutions', () => {
    expect(getDocumentLogoUrl('Tender Edge Solutions')).toBe('/logo/tes-logo.png')
    expect(getDocumentLogoText('Tender Edge Solutions')).toBe('TES')
  })
})
