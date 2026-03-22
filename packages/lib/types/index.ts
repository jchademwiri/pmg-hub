export type DivisionId =
  | 'tes'
  | 'apex'
  | 'launchpad'
  | 'creative'
  | 'studyedge'

export type LeadStatus = 'new' | 'contacted' | 'converted' | 'closed'
export type LeadSource = 'website' | 'whatsapp' | 'referral' | 'direct'

export type Lead = {
  division:  DivisionId
  name:      string
  company?:  string
  email:     string
  phone:     string
  services:  string[]
  message:   string
  source:    LeadSource
}

export type Division = {
  id:       DivisionId
  name:     string
  slug:     string
  tagline:  string
  domain?:  string
  status:   'active' | 'launching' | 'formalising'
  color: {
    primary: string
    accent:  string
  }
}
