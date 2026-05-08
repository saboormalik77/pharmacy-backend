'use client'

import { useClerk, useUser } from '@clerk/nextjs'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useRef } from 'react'
import { authService } from '@/lib/api/services'

function SSOCallbackContent() {
  const clerk = useClerk()
  const { user, isLoaded } = useUser()
  const searchParams = useSearchParams()
  const hasRun = useRef(false)

  useEffect(() => {
    if (!isLoaded || hasRun.current) return
    hasRun.current = true

    const redirectTo = searchParams.get('redirect') || '/portal'

    ;(async () => {
      try {
        const email = user?.primaryEmailAddress?.emailAddress
        if (!email) {
          try { await clerk.signOut() } catch {}
          window.location.href = '/login?oauthError=no-account'
          return
        }

        await authService.googleSignin(email)
        try { await clerk.signOut() } catch {}
        window.location.href = redirectTo
      } catch {
        try { await clerk.signOut() } catch {}
        window.location.href = '/login?oauthError=no-account'
      }
    })()
  }, [isLoaded, user, clerk, searchParams])

  return null
}

export default function SSOCallbackPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="flex flex-col items-center space-y-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        <p className="text-sm text-gray-600">Completing Google sign-in...</p>
      </div>
      <Suspense>
        <SSOCallbackContent />
      </Suspense>
    </div>
  )
}
