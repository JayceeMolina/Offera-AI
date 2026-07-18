// ROOT LAYOUT
// Wraps all pages with ThemeProvider for dark mode support.
// Every page in the app inherits dark mode from here.

import type { Metadata } from 'next'
import { ThemeProvider } from 'next-themes'
import './globals.css'

export const metadata: Metadata = {
  title: 'Offera AI',
  description: 'Track your job applications with AI-powered tools - free forever.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}