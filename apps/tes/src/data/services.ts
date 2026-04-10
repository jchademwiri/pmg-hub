export interface Service {
  name: string
  description: string
}

export const services: Service[] = [
  {
    name: 'CSD Registration & Management',
    description:
      'Get registered on the Central Supplier Database and keep your profile current. We handle the full process from initial registration to annual updates.',
  },
  {
    name: 'CIDB Grading',
    description:
      'Obtain your CIDB contractor grading certificate for construction and civil tenders. We manage the application, documentation, and submission.',
  },
  {
    name: 'B-BBEE Affidavits',
    description:
      'EME and QSE affidavits prepared and commissioned correctly. Valid, compliant, and ready for any tender submission.',
  },
  {
    name: 'COIDA Registration',
    description:
      'Register with the Compensation Fund and obtain your Letter of Good Standing. Essential for any government tender submission.',
  },
  {
    name: 'SBD Forms & Returnables',
    description:
      'All standard bidding documents completed accurately — SBD1, SBD4, SBD6.1, SBD8, and SBD9. No errors, no omissions.',
  },
  {
    name: 'Full Tender Compilation',
    description:
      'End-to-end tender document preparation. We compile, format, and package your complete submission to meet every specification.',
  },
]
