'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card'
import { authService } from '@/lib/api/services'
import { validateEmail } from '@/lib/validation'
import { DomainNotRecognizedScreen } from '@/components/auth/DomainNotRecognizedScreen'
import { TenantInfoLoadingScreen } from '@/components/auth/TenantInfoLoadingScreen'
import { usePharmacyPortalTenant } from '@/lib/hooks/usePharmacyPortalTenant'

interface AdminBranding {
  logoUrl: string | null
  businessName: string | null
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [emailError, setEmailError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [branding, setBranding] = useState<AdminBranding | null>(null)

  const { tenantChecked, tenantError, validTenant, isLocalHost } =
    usePharmacyPortalTenant()

  useEffect(() => {
    // Only load cached branding (can't fetch without authentication)
    try {
      const cached = localStorage.getItem('pharmacyAdminBranding')
      if (cached) {
        setBranding(JSON.parse(cached))
      }
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    if (validTenant?.buyingGroupName) {
      const updatedBranding = {
        logoUrl: validTenant.logoUrl || branding?.logoUrl || null,
        businessName: validTenant.buyingGroupName,
      }
      setBranding(updatedBranding)
      try { localStorage.setItem('pharmacyAdminBranding', JSON.stringify(updatedBranding)) } catch { /* ignore */ }
    }
  }, [validTenant])

  useEffect(() => {
    if (branding?.logoUrl) {
      let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']")
      if (!link) {
        link = document.createElement('link')
        link.rel = 'icon'
        document.head.appendChild(link)
      }
      link.href = branding.logoUrl
    }
  }, [branding?.logoUrl])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const emailResult = validateEmail(email)
    setEmailError(emailResult.error ?? '')
    if (!emailResult.valid) return

    setLoading(true)

    try {
      await authService.forgotPassword(email)
      setSuccess(true)
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email. Please try again.')
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

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <div className="flex flex-col items-center justify-center mb-4 gap-3">
              {branding?.logoUrl && (
                <img
                  src={branding.logoUrl}
                  alt="Logo"
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg object-contain"
                />
              )}
              <div className="text-3xl font-bold text-primary">{branding?.businessName || 'PharmAnalytics'}</div>
            </div>
            <CardTitle className="text-2xl text-center">Check Your Email</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-green-600 bg-green-50 p-4 rounded-md text-center">
              <svg
                className="w-12 h-12 mx-auto mb-3 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              <p className="font-medium">Password reset link sent!</p>
              <p className="mt-1 text-green-700">
                We've sent a password reset link to <span className="font-semibold">{email}</span>
              </p>
              <p className="mt-2 text-xs text-green-600">
                If you don't see it, check your spam folder.
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Link 
              href="/login" 
              className="text-primary hover:underline font-medium"
            >
              Back to login
            </Link>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex flex-col items-center justify-center mb-4 gap-3">
            {branding?.logoUrl && (
              <img
                src={branding.logoUrl}
                alt="Logo"
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg object-contain"
              />
            )}
            <div className="text-3xl font-bold text-primary">{branding?.businessName || 'PharmAnalytics'}</div>
          </div>
          <CardTitle className="text-2xl text-center">Reset Password</CardTitle>
          <CardDescription className="text-center">
            Enter your email address and we'll send you a link to reset your password
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="john@pharmacy.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); if (emailError) setEmailError('') }}
                onBlur={() => { const r = validateEmail(email); setEmailError(r.error ?? '') }}
                required
                autoFocus
                className={emailError ? 'border-red-500' : ''}
              />
              {emailError && <p className="text-xs text-red-500 mt-1">{emailError}</p>}
            </div>
            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                {error}
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Sending...' : 'Send Reset Link'}
            </Button>
            <p className="text-sm text-center text-muted-foreground">
              Remember your password?{' '}
              <Link href="/login" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}

