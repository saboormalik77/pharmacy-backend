'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'
import { useClerk, useSignIn } from '@clerk/nextjs'
import { toast } from 'react-toastify'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card'
import { authService } from '@/lib/api/services'
import { DomainNotRecognizedScreen } from '@/components/auth/DomainNotRecognizedScreen'
import { TenantInfoLoadingScreen } from '@/components/auth/TenantInfoLoadingScreen'
import { usePharmacyPortalTenant } from '@/lib/hooks/usePharmacyPortalTenant'

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
    </svg>
  )
}

interface AdminBranding {
  logoUrl: string | null
  businessName: string | null
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { signOut } = useClerk()
  const { signIn } = useSignIn()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [branding, setBranding] = useState<AdminBranding | null>(null)

  const { tenantChecked, tenantError, validTenant, isLocalHost } =
    usePharmacyPortalTenant()

  useEffect(() => {
    try {
      const cached = localStorage.getItem('pharmacyAdminBranding')
      if (cached) {
        const parsedBranding = JSON.parse(cached)
        setBranding(parsedBranding)
        if (parsedBranding.businessName) {
          document.title = `${parsedBranding.businessName} - Data Analytics Platform`
        }
      }
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    if (!isLocalHost && tenantChecked && tenantError) {
      document.title = 'Domain not recognized'
    }
  }, [isLocalHost, tenantChecked, tenantError])

  useEffect(() => {
    if (validTenant?.buyingGroupName) {
      setBranding((prev) => ({
        logoUrl: prev?.logoUrl ?? null,
        businessName: validTenant.buyingGroupName,
      }))
      document.title = `${validTenant.buyingGroupName} - Data Analytics Platform`
    }
  }, [validTenant])

  useEffect(() => {
    const oauthError = searchParams.get('oauthError')
    if (oauthError === 'no-account') {
      toast.error('No account found', { autoClose: 2000 })
      const timer = setTimeout(() => {
        window.location.href = '/login'
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [searchParams])

  const handleGoogleSignIn = async () => {
    if (!signIn) return

    setError('')
    setGoogleLoading(true)

    try {
      try { await signOut() } catch {}

      const redirectTo = searchParams.get('redirect') || '/portal'
      const callbackPath = `/sso-callback?redirect=${encodeURIComponent(redirectTo)}`
      const origin = typeof window !== 'undefined' ? window.location.origin : ''
      const callbackUrl = origin ? `${origin}${callbackPath}` : callbackPath
      const { error: ssoError } = await signIn.sso({
        strategy: 'oauth_google',
        redirectUrl: callbackUrl,
        redirectCallbackUrl: callbackUrl,
      })
      if (ssoError) {
        setGoogleLoading(false)
        toast.error(ssoError.message || 'Failed to start Google sign-in.')
      }
    } catch (err: any) {
      setGoogleLoading(false)
      toast.error(err.message || 'Failed to start Google sign-in.')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await authService.signin({ email, password })
      const redirectTo = searchParams.get('redirect') || '/portal'
      router.push(redirectTo)
    } catch (err: any) {
      setError(err.message || 'Invalid email or password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!isLocalHost && !tenantChecked) {
    return <TenantInfoLoadingScreen />
  }

  if (!isLocalHost && tenantChecked && tenantError) {
    return <DomainNotRecognizedScreen detail={tenantError} />
  }

  const authBlocked = !!tenantError || !tenantChecked

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <div className="flex flex-col items-center justify-center mb-4 gap-3">
          {branding?.logoUrl && (
            <img src={branding.logoUrl} alt="Logo" className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg object-contain" />
          )}
          <div className="text-2xl font-bold text-primary">{branding?.businessName || 'PharmAnalytics'}</div>
        </div>
        <CardTitle className="text-2xl text-center">Welcome back</CardTitle>
        <CardDescription className="text-center">
          Maximize your returns with data-driven insights
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading || authBlocked}
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            <GoogleIcon />
            {googleLoading ? 'Signing in...' : 'Sign in with Google'}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500">Or continue with email</span>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <Input
              id="email"
              type="email"
              placeholder="john@pharmacy.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-sm text-primary hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
              {error}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button type="submit" className="w-full" disabled={loading || authBlocked}>
            {loading ? 'Signing in...' : 'Sign in'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Suspense fallback={<TenantInfoLoadingScreen />}>
        <LoginForm />
      </Suspense>
    </div>
  )
}
