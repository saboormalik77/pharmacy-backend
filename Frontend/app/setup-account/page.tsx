'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, CheckCircle, AlertCircle, Eye, EyeOff, Building2, Mail, Phone, MapPin, Shield, GitBranch } from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

interface PharmacyInviteData {
  inviteId: string;
  email: string;
  pharmacyName: string;
  contactName: string;
  phone: string | null;
  fax: string | null;
  deaNumber: string | null;
  physicalAddress: { street?: string; city?: string; state?: string; zip?: string } | null;
  serviceType: string | null;
  wholesaler: string | null;
  wholesalerAccount: string | null;
  parentPharmacyName?: string;
  isBranch?: boolean;
}

type PageState = 'loading' | 'form' | 'success' | 'error';

function SetupAccountContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const inviteType = searchParams.get('type');
  const isBranchInvite = inviteType === 'branch';

  const [pageState, setPageState] = useState<PageState>('loading');
  const [inviteData, setInviteData] = useState<PharmacyInviteData | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!token) {
      setErrorMessage('No invite token provided. Please use the link from your invitation email.');
      setPageState('error');
      return;
    }
    verifyToken(token);
  }, [token]);

  const verifyToken = async (t: string) => {
    const endpoint = isBranchInvite ? '/auth/verify-branch-invite' : '/auth/verify-invite';
    try {
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: t }),
      });
      const data = await res.json();
      if (!res.ok || data.status === 'fail') {
        setErrorMessage(data.message || 'Invalid or expired invitation link.');
        setPageState('error');
        return;
      }
      setInviteData(data.data);
      setPageState('form');
    } catch {
      setErrorMessage('Failed to verify invitation. Please try again later.');
      setPageState('error');
    }
  };

  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasMinLength = password.length >= 8;
  const passwordsMatch = password === confirmPassword && password.length > 0;

  const handleSubmit = async () => {
    setFormError('');

    if (!hasMinLength || !hasUppercase || !hasLowercase || !hasNumber) {
      setFormError('Password does not meet all requirements.');
      return;
    }
    if (!passwordsMatch) {
      setFormError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    const endpoint = isBranchInvite ? '/auth/complete-branch-setup' : '/auth/complete-setup';
    try {
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok || data.status === 'fail') {
        setFormError(data.message || 'Failed to complete setup.');
        setIsSubmitting(false);
        return;
      }
      setPageState('success');
    } catch {
      setFormError('Something went wrong. Please try again.');
      setIsSubmitting(false);
    }
  };

  if (pageState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Verifying your invitation...</p>
        </div>
      </div>
    );
  }

  if (pageState === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-8 text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Invitation</h1>
          <p className="text-gray-600 mb-6">{errorMessage}</p>
          {isBranchInvite && (
            <p className="text-sm text-gray-500 mb-4">
              If your invite has expired, please contact your pharmacy administrator to resend it.
            </p>
          )}
          <button
            onClick={() => router.push('/login')}
            className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-[4px] hover:bg-blue-700 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (pageState === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Account Setup Complete!</h1>
          <p className="text-gray-600 mb-6">
            Your password has been set and your account is now active.
            {isBranchInvite && inviteData?.parentPharmacyName && (
              <> You are now a branch of <strong>{inviteData.parentPharmacyName}</strong>.</>
            )}
            {' '}You can now log in to your pharmacy portal.
          </p>
          <button
            onClick={() => router.push('/login')}
            className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-[4px] hover:bg-blue-700 transition-colors"
          >
            Log In Now
          </button>
        </div>
      </div>
    );
  }

  const addr = inviteData?.physicalAddress;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 to-blue-500 px-8 py-6 text-white">
          <h1 className="text-2xl font-bold">
            {isBranchInvite ? 'Set Up Your Branch Account' : 'Complete Your Account Setup'}
          </h1>
          <p className="text-blue-100 mt-1">
            Set your password to get started with {inviteData?.pharmacyName}
          </p>
        </div>

        <div className="p-8 space-y-6">
          {/* Branch parent info */}
          {isBranchInvite && inviteData?.parentPharmacyName && (
            <div className="bg-[#f5f2f1] border border-[#e2e2e2] rounded-[4px] p-4 flex items-center gap-3">
              <GitBranch className="w-5 h-5 text-[#516057] flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-[#505454]">Branch Account</p>
                <p className="text-sm text-[#516057]">
                  Your account was created by <strong>{inviteData.parentPharmacyName}</strong>
                </p>
              </div>
            </div>
          )}

          {/* Pharmacy Info */}
          <div className="bg-gray-50 rounded-[4px] p-5 space-y-3">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Your Pharmacy Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="flex items-start gap-2">
                <Building2 className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-gray-500 text-xs">Pharmacy Name</p>
                  <p className="font-medium text-gray-900">{inviteData?.pharmacyName || '—'}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Mail className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-gray-500 text-xs">Email</p>
                  <p className="font-medium text-gray-900">{inviteData?.email || '—'}</p>
                </div>
              </div>
              {inviteData?.phone && (
                <div className="flex items-start gap-2">
                  <Phone className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-gray-500 text-xs">Phone</p>
                    <p className="font-medium text-gray-900">{inviteData.phone}</p>
                  </div>
                </div>
              )}
              {addr && (addr.street || addr.city) && (
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-gray-500 text-xs">Address</p>
                    <p className="font-medium text-gray-900">
                      {[addr.street, addr.city, addr.state, addr.zip].filter(Boolean).join(', ')}
                    </p>
                  </div>
                </div>
              )}
              {inviteData?.deaNumber && (
                <div className="flex items-start gap-2">
                  <Shield className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-gray-500 text-xs">DEA Number</p>
                    <p className="font-medium text-gray-900">{inviteData.deaNumber}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Password Form */}
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Set Your Password</h2>

            {formError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-[4px] text-sm mb-4">
                {formError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-[4px] focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                    placeholder="Enter your password"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-[4px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Confirm your password"
                />
              </div>

              {/* Password Requirements */}
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-green-600' : 'text-gray-400'}`}>
                  <CheckCircle className="w-3.5 h-3.5" /> At least 8 characters
                </div>
                <div className={`flex items-center gap-1.5 ${hasUppercase ? 'text-green-600' : 'text-gray-400'}`}>
                  <CheckCircle className="w-3.5 h-3.5" /> Uppercase letter
                </div>
                <div className={`flex items-center gap-1.5 ${hasLowercase ? 'text-green-600' : 'text-gray-400'}`}>
                  <CheckCircle className="w-3.5 h-3.5" /> Lowercase letter
                </div>
                <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-green-600' : 'text-gray-400'}`}>
                  <CheckCircle className="w-3.5 h-3.5" /> Number
                </div>
                <div className={`flex items-center gap-1.5 ${passwordsMatch ? 'text-green-600' : 'text-gray-400'}`}>
                  <CheckCircle className="w-3.5 h-3.5" /> Passwords match
                </div>
              </div>
            </div>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !hasMinLength || !hasUppercase || !hasLowercase || !hasNumber || !passwordsMatch}
            className="w-full py-3 bg-blue-600 text-white font-semibold rounded-[4px] hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Setting up your account...</>
            ) : (
              'Complete Setup & Activate Account'
            )}
          </button>

          <p className="text-center text-xs text-gray-400">
            Already have an account?{' '}
            <a href="/login" className="text-blue-600 hover:underline">Log in</a>
          </p>
        </div>
      </div>
    </div>
  );
}

function SetupAccountFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
        <p className="text-gray-600 text-lg">Loading...</p>
      </div>
    </div>
  );
}

export default function SetupAccountPage() {
  return (
    <Suspense fallback={<SetupAccountFallback />}>
      <SetupAccountContent />
    </Suspense>
  );
}
