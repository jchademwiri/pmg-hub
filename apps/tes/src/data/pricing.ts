export interface PricingRow {
  service: string
  price: string
  turnaround: string
}

export const pricingRows: PricingRow[] = [
  { service: 'CSD Registration', price: 'R650', turnaround: '3–5 days' },
  { service: 'CSD Profile Update', price: 'R350', turnaround: '2–3 days' },
  { service: 'COIDA Registration', price: 'R750', turnaround: '5–10 days' },
  { service: 'COIDA Letter of Good Standing', price: 'R450', turnaround: '2–4 days' },
  { service: 'B-BBEE Affidavit', price: 'R550', turnaround: '1–2 days' },
  { service: 'CIDB Grade 1', price: 'R1,200', turnaround: '7–14 days' },
  { service: 'CIDB Grade 2–3', price: 'R1,800', turnaround: '14–21 days' },
  { service: 'SBD Forms Pack', price: 'R950', turnaround: '2–3 days' },
  { service: 'Municipal Supplier Registration', price: 'R850', turnaround: '5–7 days' },
  { service: 'Full Tender Compilation', price: 'R2,500+', turnaround: '3–5 days' },
  { service: 'BoQ Preparation', price: 'R1,500+', turnaround: '2–5 days' },
]
