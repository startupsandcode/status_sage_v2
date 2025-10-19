
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/toaster'
import { Providers } from './providers'
import '@/lib/monitoring-service' // Initialize monitoring service

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'StatusSage - Website Monitoring Made Simple',
  description: 'Monitor your websites and APIs with real-time alerts, uptime tracking, and detailed analytics.',
  keywords: 'website monitoring, uptime monitoring, API monitoring, status page, downtime alerts',
  authors: [{ name: 'StatusSage' }],
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem
            disableTransitionOnChange
          >
            {children}
            <Toaster />
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  )
}
