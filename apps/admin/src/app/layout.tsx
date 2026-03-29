import type { Metadata } from 'next'
import { Noto_Sans } from 'next/font/google'
import './globals.css'

const notoSans = Noto_Sans({ subsets: ['latin'], variable: '--font-sans' })

export const metadata: Metadata = {
  title: { template: '%s · PMG Admin', default: 'PMG Admin' },
  description: 'PMG Control Center',
  robots: { index: false, follow: false },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${notoSans.className} font-sans antialiased bg-background text-foreground`}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  )
}
