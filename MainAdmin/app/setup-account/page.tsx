'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Shield, Lock, Eye, EyeOff, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { validatePassword, validatePasswordMatch } from '@/lib/validation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

function SetupAccountPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [step, setStep] = useState<'loading' | 'form' | 'success' | 'error'>('loading');
  const [adminInfo, setAdminInfo] = useState<{ name: string; email: string } | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('No invite token provided. Please check your invitation email.');
      setStep('error');
      return;
    }

    validateToken();
  }, [token]);

  const validateToken = async () => {
    try {
      const response = await fetch(
        `${API_URL}/main-admin/sub-admins/invite/validate?token=${encodeURIComponent(token!)}`,
        { method: 'GET', headers: { 'Content-Type': 'application/json' } }
      );

      const data = await response.json();

      if (!response.ok || data.error) {
        setError(data.message || 'This invitation link is invalid or has expired. Please contact your administrator.');
        setStep('error');
        return;
      }

      setAdminInfo({ name: data.admin.name, email: data.admin.email });
      setStep('form');
    } catch {
      setError('Unable to validate invitation. Please try again later.');
      setStep('error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const newFieldErrors: Record<string, string> = {};

    const passwordResult = validatePassword(password);
    if (!passwordResult.valid) newFieldErrors.password = passwordResult.error!;

    const confirmResult = validatePasswordMatch(password, confirmPassword);
    if (!confirmResult.valid) newFieldErrors.confirmPassword = confirmResult.error!;

    if (Object.keys(newFieldErrors).length > 0) {
      setFieldErrors(newFieldErrors);
      return;
    }
    setFieldErrors({});

    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_URL}/main-admin/sub-admins/invite/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        setError(data.message || 'Failed to set up account. Please try again.');
        setIsSubmitting(false);
        return;
      }

      setStep('success');
    } catch {
      setError('An error occurred. Please try again.');
      setIsSubmitting(false);
    }
  };

  if (step === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--surface-container)]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto" style={{ color: 'var(--primary)' }} />
          <p className="mt-4 text-sm" style={{ color: 'var(--on-surface-variant)' }}>Validating your invitation...</p>
        </div>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--surface-container)] px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-[4px] mb-4" style={{ backgroundColor: 'var(--error-container)' }}>
              <AlertTriangle className="w-8 h-8" style={{ color: 'var(--error)' }} />
            </div>
            <h1 className="font-heading text-headline mb-2" style={{ color: 'var(--on-surface)' }}>Invalid Invitation</h1>
          </div>
          <div className="rounded-[4px] shadow-md p-8 text-center" style={{ backgroundColor: 'var(--surface-container-lowest)' }}>
            <p className="mb-6 text-sm" style={{ color: 'var(--on-surface-variant)' }}>{error}</p>
            <Button variant="primary" onClick={() => router.push('/login')}>
              Go to Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--surface-container)] px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-[4px] mb-4" style={{ backgroundColor: 'var(--secondary-container)' }}>
              <CheckCircle className="w-8 h-8" style={{ color: 'var(--on-secondary-container)' }} />
            </div>
            <h1 className="font-heading text-headline mb-2" style={{ color: 'var(--on-surface)' }}>Account Setup Complete</h1>
          </div>
          <div className="rounded-[4px] shadow-md p-8 text-center" style={{ backgroundColor: 'var(--surface-container-lowest)' }}>
            <p className="mb-6 text-sm" style={{ color: 'var(--on-surface-variant)' }}>
              Your account has been set up successfully. You can now log in with your email and the password you just created.
            </p>
            <Button variant="primary" onClick={() => router.push('/login')}>
              Go to Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--surface-container)] px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-[4px] mb-4 shadow-lg" style={{ backgroundColor: 'var(--primary)' }}>
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="font-heading text-headline mb-2" style={{ color: 'var(--on-surface)' }}>Set Up Your Account</h1>
          <p className="text-sm" style={{ color: 'var(--on-surface-variant)' }}>Admin Portal</p>
        </div>

        <div className="rounded-[4px] shadow-md p-8" style={{ backgroundColor: 'var(--surface-container-lowest)' }}>
          {adminInfo && (
            <div className="mb-6 p-3 rounded-[4px]" style={{ backgroundColor: 'var(--primary-container)' }}>
              <p className="text-sm" style={{ color: 'var(--on-primary)' }}>
                Welcome, <strong>{adminInfo.name}</strong>
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--on-primary)' }}>{adminInfo.email}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {error && (
              <div style={{ backgroundColor: 'var(--error-container)', borderColor: 'var(--outline-variant)' }}>
                {error}
              </div>
            )}

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2" style={{ color: 'var(--on-surface)' }}>
                Create Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--outline)' }} />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setFieldErrors(prev => ({ ...prev, password: '' })); }}
                  className="w-full pl-10 pr-12 py-2.5 rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                  style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)', color: 'var(--on-surface)' }}
                  placeholder="Min 8 characters"
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 focus:outline-none rounded-[4px]"
                  style={{ color: 'var(--outline)' }}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {fieldErrors.password && <p className="text-xs text-red-500 mt-1">{fieldErrors.password}</p>}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2" style={{ color: 'var(--on-surface)' }}>
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--outline)' }} />
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setFieldErrors(prev => ({ ...prev, confirmPassword: '' })); }}
                  className="w-full pl-10 pr-12 py-2.5 rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                  style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)', color: 'var(--on-surface)' }}
                  placeholder="Re-enter your password"
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 focus:outline-none rounded-[4px]"
                  style={{ color: 'var(--outline)' }}
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {fieldErrors.confirmPassword && <p className="text-xs text-red-500 mt-1">{fieldErrors.confirmPassword}</p>}
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Setting up...
                </span>
              ) : (
                'Complete Setup'
              )}
            </Button>
          </form>
        </div>

        <p className="text-center text-sm mt-6" style={{ color: 'var(--on-surface-variant)' }} suppressHydrationWarning>
          &copy; {new Date().getFullYear()} Admin Portal. All rights reserved.
        </p>
      </div>
    </div>
  );
}

export default function SetupAccountPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[var(--surface-container)]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto" style={{ color: 'var(--primary)' }} />
            <p className="mt-4 text-sm" style={{ color: 'var(--on-surface-variant)' }}>Loading...</p>
          </div>
        </div>
      }
    >
      <SetupAccountPageContent />
    </Suspense>
  );
}