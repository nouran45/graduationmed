import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'MediScan- AI symptom Checker',
  description: 'Professional medical diagnosis assistant',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
