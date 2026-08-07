export interface Service {
  name: string
  description: string
  price: string
}

export const services: Service[] = [
  {
    name: 'Full Tender Preparation',
    description:
      'End-to-end tender document preparation, done for you. We read the bid, source every requirement, and compile a complete, submission-ready package. Already started your own tender and something isn\'t right? We\'ll review it, flag what\'s missing or incorrect, and get it submission-ready before the deadline.',
    price: 'Get a quote',
  },
  {
    name: 'RFQ & RFI Preparation',
    description:
      'Fast turnaround on Requests for Quotation and Requests for Information. We prepare accurate, compliant responses so you never miss a window because of paperwork.',
    price: 'Get a quote',
  },
  {
    name: 'Supplier & Vendor Database Registration',
    description:
      'Get registered directly with the municipalities, parastatals, and corporates you want to supply to - Tshwane, Ekurhuleni, Transnet, Eskom, and more. Each runs its own database; we handle the registration so you receive their RFQs directly.',
    price: 'Get a quote',
  },
]

export interface AddOnService {
  name: string
}

export const addOnServices: AddOnService[] = [
  { name: 'CSD Registration' },
  { name: 'CIDB Grading' },
  { name: 'B-BBEE Affidavits' },
  { name: 'COIDA Registration' },
  { name: 'SBD Forms' },
]
