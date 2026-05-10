import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { Newsreader, Manrope } from 'next/font/google'
import { ToastContainer } from 'react-toastify'
import './globals.css'
import 'react-toastify/dist/ReactToastify.css'
import TenantGate from '@/components/auth/TenantGate'
import BrandingHead from '@/components/layout/BrandingHead'

const newsreader = Newsreader({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-newsreader',
  display: 'swap',
})

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-manrope',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'PharmAnalytics',
  description: 'Maximize your pharmacy returns with data-driven insights',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const hasClerkKeys = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && 
                      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY !== 'pk_test_your_actual_publishable_key_here'

  if (hasClerkKeys) {
    return (
      <ClerkProvider
        signInUrl="/login"
        signUpUrl="/login"
        signInFallbackRedirectUrl="/login?oauthError=no-account"
        signUpFallbackRedirectUrl="/login?oauthError=no-account"
        afterSignOutUrl="/login"
      >
        <html lang="en" className={`${newsreader.variable} ${manrope.variable}`}>
          <body className="font-sans">
            <BrandingHead />
            <TenantGate>{children}</TenantGate>
            <ToastContainer
              position="top-right"
              autoClose={5000}
              hideProgressBar={false}
              newestOnTop={false}
              closeOnClick
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
              theme="light"
            />
          </body>
        </html>
      </ClerkProvider>
    )
  }

  return (
    <html lang="en" className={`${newsreader.variable} ${manrope.variable}`}>
      <body className="font-sans">
        <BrandingHead />
        <TenantGate>{children}</TenantGate>
        <ToastContainer
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />
      </body>
    </html>
  )
}
