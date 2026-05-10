'use client'

import { ClerkProvider } from '@clerk/nextjs'
import { ToastContainer } from 'react-toastify'
import TenantGate from '@/components/auth/TenantGate'
import BrandingHead from '@/components/layout/BrandingHead'

const PLACEHOLDER_PK = 'pk_test_your_actual_publishable_key_here'

function hasValidClerkPublishableKey(): boolean {
  const pk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  return Boolean(pk && pk !== PLACEHOLDER_PK)
}

/**
 * Single client boundary for layout: avoids splitting root layout into a fragile
 * chunk that can hit ChunkLoadError on slow first-compile in dev.
 */
export default function RootProviders({
  children,
}: {
  children: React.ReactNode
}) {
  const inner = (
    <>
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
    </>
  )

  if (!hasValidClerkPublishableKey()) {
    return <>{inner}</>
  }

  return (
    <ClerkProvider
      signInUrl="/login"
      signUpUrl="/login"
      signInFallbackRedirectUrl="/login?oauthError=no-account"
      signUpFallbackRedirectUrl="/login?oauthError=no-account"
      afterSignOutUrl="/login"
    >
      {inner}
    </ClerkProvider>
  )
}
