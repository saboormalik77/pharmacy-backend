import type { Metadata } from 'next'
import './globals.css'
import 'react-toastify/dist/ReactToastify.css'
import RootProviders from '@/components/providers/RootProviders'

export const metadata: Metadata = {
  title: 'PharmAnalytics',
  description: 'Maximize your pharmacy returns with data-driven insights',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <RootProviders>{children}</RootProviders>
      </body>
    </html>
  )
}
