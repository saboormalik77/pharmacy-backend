import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { ToastContainer } from 'react-toastify'
import './globals.css'
import 'react-toastify/dist/ReactToastify.css'
import TenantGate from '@/components/auth/TenantGate'

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
        <html lang="en">
          <body>
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
    <html lang="en">
      <body>
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
