import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'PharmAnalytics - Data Analytics Platform',
  description: 'Maximize your pharmacy returns with data-driven insights',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
