'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card'
import { authService } from '@/lib/api/services'
import { DomainNotRecognizedScreen } from '@/components/auth/DomainNotRecognizedScreen'
import { TenantInfoLoadingScreen } from '@/components/auth/TenantInfoLoadingScreen'
import { usePharmacyPortalTenant } from '@/lib/hooks/usePharmacyPortalTenant'

interface AdminBranding {
  logoUrl: string | null
  businessName: string | null
}

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(true)
  const [tokenValid, setTokenValid] = useState(false)
  const [userEmail, setUserEmail] = useState<string | undefined>()
  const [accessToken, setAccessToken] = useState<string | null>(null)
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
      setBranding((prev) => ({
        logoUrl: prev?.logoUrl ?? null,
        businessName: validTenant.buyingGroupName,
      }))
    }
  }, [validTenant])

  // Get access token from URL hash (Supabase puts it in the fragment)
  // Format: #access_token=xxx&type=recovery&expires_in=3600
  const getAccessToken = (): string | null => {
    if (typeof window === 'undefined') return null
    
    // First check URL hash (Supabase default for password reset)
    const hash = window.location.hash.substring(1)
    if (hash) {
      const params = new URLSearchParams(hash)
      const token = params.get('access_token')
      const type = params.get('type')
      
      // Verify it's a recovery token (password reset)
      if (token && type === 'recovery') {
        return token
      }
      
      // Also accept if no type is specified (for backwards compatibility)
      if (token) {
        return token
      }
    }
    
    // Also check query params as fallback
    const token = searchParams.get('access_token')
    const type = searchParams.get('type')
    
    if (token && (type === 'recovery' || !type)) {
      return token
    }
    
    return null
  }

  useEffect(() => {
    const verifyToken = async () => {
      // Wait a bit for Next.js to fully load the hash
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const token = getAccessToken()
      setAccessToken(token)
      
      if (!token) {
        setVerifying(false)
        setTokenValid(false)
        setError('Invalid or missing reset token. Please request a new password reset link.')
        return
      }

      try {
        const result = await authService.verifyResetToken(token)
        setTokenValid(result.valid)
        setUserEmail(result.email)
        
        if (!result.valid) {
          setError('This password reset link has expired or is invalid. Please request a new one.')
        }
      } catch (err: any) {
        console.error('Token verification error:', err)
        setTokenValid(false)
        setError(err.message || 'Failed to verify reset token. Please try again.')
      } finally {
        setVerifying(false)
      }
    }

    verifyToken()
    
    // Also listen for hash changes (in case hash loads after initial render)
    const handleHashChange = () => {
      verifyToken()
    }
    
    window.addEventListener('hashchange', handleHashChange)
    
    return () => {
      window.removeEventListener('hashchange', handleHashChange)
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validate passwords
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      const token = accessToken || getAccessToken()
      if (!token) {
        setError('Reset token not found. Please request a new password reset.')
        return
      }

      await authService.resetPassword(token, newPassword)
      setSuccess(true)
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/login')
      }, 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. Please try again.')
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

  // Loading state while verifying token
  if (verifying) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="p-8">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
            <p className="text-muted-foreground">Verifying reset link...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Success state
  if (success) {
    return (
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
          <CardTitle className="text-2xl text-center">Password Reset Successful</CardTitle>
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
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="font-medium">Your password has been reset!</p>
            <p className="mt-1 text-green-700">
              Redirecting you to login page...
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Link 
            href="/login" 
            className="text-primary hover:underline font-medium"
          >
            Go to login now
          </Link>
        </CardFooter>
      </Card>
    )
  }

  // Invalid token state
  if (!tokenValid) {
    return (
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
          <CardTitle className="text-2xl text-center">Invalid Reset Link</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-red-600 bg-red-50 p-4 rounded-md text-center">
            <svg
              className="w-12 h-12 mx-auto mb-3 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <p className="font-medium">Reset link expired or invalid</p>
            <p className="mt-1 text-red-700">
              {error || 'Please request a new password reset link.'}
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Link href="/forgot-password" className="w-full">
            <Button className="w-full">Request New Reset Link</Button>
          </Link>
          <Link 
            href="/login" 
            className="text-primary hover:underline font-medium text-center block"
          >
            Back to login
          </Link>
        </CardFooter>
      </Card>
    )
  }

  // Reset password form
  return (
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
          {userEmail ? (
            <>Enter a new password for <span className="font-medium">{userEmail}</span></>
          ) : (
            'Enter your new password below'
          )}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="newPassword" className="text-sm font-medium">
              New Password
            </label>
            <Input
              id="newPassword"
              type="password"
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Must be at least 8 characters long
            </p>
          </div>
          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="text-sm font-medium">
              Confirm Password
            </label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>
          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
              {error}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Resetting...' : 'Reset Password'}
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
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Suspense fallback={<TenantInfoLoadingScreen />}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  )
}

