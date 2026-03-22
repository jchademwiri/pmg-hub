import type { Metadata } from 'next'
import { Playfair_Display, DM_Sans } from 'next/font/google'
import './globals.css'

const playfair = Playfair_Display({
  subsets:  ['latin'],
  variable: '--font-display',
  display:  'swap',
})

const dmSans = DM_Sans({
  subsets:  ['latin'],
  variable: '--font-sans',
  weight:   ['300', '400', '500'],
  display:  'swap',
})

export const metadata: Metadata = {
  title: {
    template: '%s | Playhouse Media Group',
    default:  'Playhouse Media Group — Building Businesses. One Service at a Time.',
  },
  description:
    'A South African multi-service business group offering tender compliance, web development, company registrations, graphic design, and academic support. Based in Centurion, Gauteng.',
  keywords: [
    'Playhouse Media Group',
    'tender compliance South Africa',
    'web development Centurion',
    'company registration Gauteng',
    'CIDB registration',
    'CSD registration',
  ],
  openGraph: {
    siteName: 'Playhouse Media Group',
    locale:   'en_ZA',
    type:     'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${playfair.variable} ${dmSans.variable}`}>
      <body className="font-sans antialiased bg-white text-[#0D1B2A]" suppressHydrationWarning>
        {children}
      </body>
    </html>
  )
}
