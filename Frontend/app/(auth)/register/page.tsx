'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card'
import { authService } from '@/lib/api/services'
import { US_STATES } from '@/lib/constants/usStates'
import { DomainNotRecognizedScreen } from '@/components/auth/DomainNotRecognizedScreen'
import { TenantInfoLoadingScreen } from '@/components/auth/TenantInfoLoadingScreen'
import { usePharmacyPortalTenant } from '@/lib/hooks/usePharmacyPortalTenant'

interface AdminBranding {
  logoUrl: string | null
  businessName: string | null
}

// Validation functions
const validateNPI = (npi: string): { isValid: boolean; error?: string } => {
  const cleaned = npi.replace(/\D/g, '')
  if (cleaned.length !== 10) {
    return { isValid: false, error: 'NPI must be exactly 10 digits' }
  }
  if (!/^\d{10}$/.test(cleaned)) {
    return { isValid: false, error: 'NPI must contain only digits' }
  }
  return { isValid: true }
}

const validateDEA = (dea: string): { isValid: boolean; error?: string } => {
  const cleaned = dea.replace(/\s/g, '').toUpperCase()
  if (cleaned.length !== 9) {
    return { isValid: false, error: 'DEA must be 9 characters (2 letters + 7 digits)' }
  }
  
  // DEA format: 2 letters followed by 7 digits
  const deaPattern = /^[A-Z]{2}\d{7}$/
  if (!deaPattern.test(cleaned)) {
    return { isValid: false, error: 'DEA format: 2 letters followed by 7 digits (e.g., AB1234563)' }
  }
  
  // DEA checksum validation
  const firstLetter = cleaned[0]
  const secondLetter = cleaned[1]
  const digits = cleaned.slice(2)
  
  // First letter must be A-Z (excluding I, O, S, Z)
  const invalidFirstLetters = ['I', 'O', 'S', 'Z']
  if (invalidFirstLetters.includes(firstLetter)) {
    return { isValid: false, error: 'DEA first letter cannot be I, O, S, or Z' }
  }
  
  // Calculate checksum using standard DEA algorithm:
  // 1. Sum of letter values (A=0, B=1, ..., Z=25)
  // 2. Sum of 1st, 3rd, and 5th digits
  // 3. Sum of 2nd, 4th, and 6th digits multiplied by 2
  // 4. Total mod 10 should equal the 7th digit (checksum digit)
  const firstLetterValue = firstLetter.charCodeAt(0) - 65 // A=0, B=1, etc.
  const secondLetterValue = secondLetter.charCodeAt(0) - 65
  
  // Sum of 1st, 3rd, and 5th digits (positions 0, 2, 4)
  const oddPositionSum = parseInt(digits[0]) + parseInt(digits[2]) + parseInt(digits[4])
  
  // Sum of 2nd, 4th, and 6th digits (positions 1, 3, 5) multiplied by 2
  const evenPositionSum = (parseInt(digits[1]) + parseInt(digits[3]) + parseInt(digits[5])) * 2
  
  // Total sum
  const totalSum = firstLetterValue + secondLetterValue + oddPositionSum + evenPositionSum
  
  // The last digit of the total should match the 7th digit (checksum)
  const checkDigit = totalSum % 10
  const lastDigit = parseInt(digits[6])
  
  if (checkDigit !== lastDigit) {
    return { isValid: false, error: 'Invalid DEA number (checksum validation failed)' }
  }
  
  return { isValid: true }
}

const formatPhoneNumber = (value: string): string => {
  const cleaned = value.replace(/\D/g, '')
  if (cleaned.length === 0) return ''
  if (cleaned.length <= 3) return `(${cleaned}`
  if (cleaned.length <= 6) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`
  return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`
}

const validatePhone = (phone: string): { isValid: boolean; error?: string } => {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length !== 10) {
    return { isValid: false, error: 'Phone number must be 10 digits' }
  }
  // Check if it's a valid US phone number (not starting with 0 or 1)
  if (cleaned[0] === '0' || cleaned[0] === '1') {
    return { isValid: false, error: 'Invalid US phone number format' }
  }
  return { isValid: true }
}

const getPasswordStrength = (password: string): { strength: 'weak' | 'medium' | 'strong'; score: number; suggestions: string[] } => {
  const suggestions: string[] = []
  let score = 0
  
  if (password.length < 8) {
    suggestions.push('At least 8 characters')
  } else {
    score++
  }
  
  if (!/[a-z]/.test(password)) {
    suggestions.push('One lowercase letter')
  } else {
    score++
  }
  
  if (!/[A-Z]/.test(password)) {
    suggestions.push('One uppercase letter')
  } else {
    score++
  }
  
  if (!/\d/.test(password)) {
    suggestions.push('One number')
  } else {
    score++
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    suggestions.push('One special character')
  } else {
    score++
  }
  
  let strength: 'weak' | 'medium' | 'strong' = 'weak'
  if (score >= 4) strength = 'strong'
  else if (score >= 3) strength = 'medium'
  
  return { strength, score, suggestions }
}

export default function RegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [branding, setBranding] = useState<AdminBranding | null>(null)

  // Form data
  const [pharmacyName, setPharmacyName] = useState('')
  const [npiNumber, setNpiNumber] = useState('')
  const [deaNumber, setDeaNumber] = useState('')
  const [contactName, setContactName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  // Validation errors
  const [npiError, setNpiError] = useState('')
  const [deaError, setDeaError] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [confirmPasswordError, setConfirmPasswordError] = useState('')
  
  const [physicalAddress, setPhysicalAddress] = useState({
    street: '',
    city: '',
    state: '',
    zip: '',
  })

  useEffect(() => {
    try {
      const cached = localStorage.getItem('pharmacyAdminBranding')
      if (cached) {
        setBranding(JSON.parse(cached))
      }
    } catch { /* ignore */ }
  }, [])

  const { tenantChecked, tenantError, validTenant, isLocalHost } =
    usePharmacyPortalTenant()

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
  
  const passwordStrength = getPasswordStrength(password)

  const handleNPIChange = (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 10)
    setNpiNumber(cleaned)
    if (cleaned.length > 0) {
      const validation = validateNPI(cleaned)
      setNpiError(validation.isValid ? '' : validation.error || '')
    } else {
      setNpiError('')
    }
  }

  const handleDEAChange = (value: string) => {
    const cleaned = value.replace(/\s/g, '').toUpperCase().slice(0, 9)
    setDeaNumber(cleaned)
    if (cleaned.length > 0) {
      const validation = validateDEA(cleaned)
      setDeaError(validation.isValid ? '' : validation.error || '')
    } else {
      setDeaError('')
    }
  }

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhoneNumber(value)
    setPhone(formatted)
    const cleaned = value.replace(/\D/g, '')
    if (cleaned.length > 0) {
      const validation = validatePhone(formatted)
      setPhoneError(validation.isValid ? '' : validation.error || '')
    } else {
      setPhoneError('')
    }
  }

  const handlePasswordChange = (value: string) => {
    setPassword(value)
    if (value.length > 0) {
      const strength = getPasswordStrength(value)
      if (strength.suggestions.length > 0 && value.length < 8) {
        setPasswordError('Password does not meet requirements')
      } else {
        setPasswordError('')
      }
    } else {
      setPasswordError('')
    }
    // Check confirm password match if confirm password is already entered
    if (confirmPassword && value !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match')
    } else if (confirmPassword && value === confirmPassword) {
      setConfirmPasswordError('')
    }
  }

  const handleConfirmPasswordChange = (value: string) => {
    setConfirmPassword(value)
    if (value.length > 0) {
      if (value !== password) {
        setConfirmPasswordError('Passwords do not match')
      } else {
        setConfirmPasswordError('')
      }
    } else {
      setConfirmPasswordError('')
    }
  }

  const validateStep = (): boolean => {
    if (step === 1) {
      const npiValidation = validateNPI(npiNumber)
      const deaValidation = validateDEA(deaNumber)
      if (!npiValidation.isValid) {
        setNpiError(npiValidation.error || '')
      }
      if (!deaValidation.isValid) {
        setDeaError(deaValidation.error || '')
      }
      return npiValidation.isValid && deaValidation.isValid
    } else if (step === 2) {
      const phoneValidation = validatePhone(phone)
      if (!phoneValidation.isValid) {
        setPhoneError(phoneValidation.error || '')
      }
      return phoneValidation.isValid
    } else if (step === 3) {
      const strength = getPasswordStrength(password)
      const hasError = strength.suggestions.length > 0 || password.length < 8 || password !== confirmPassword
      if (strength.suggestions.length > 0 || password.length < 8) {
        setPasswordError('Password does not meet all requirements')
      }
      if (password !== confirmPassword) {
        setConfirmPasswordError('Passwords do not match')
      }
      return !hasError
    }
    return true
  }

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!validateStep()) {
      return
    }
    
    if (step < 3) {
      setStep(step + 1)
    } else {
      handleSubmit()
    }
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError('')

    // Final validation
    if (!validateStep()) {
      setLoading(false)
      return
    }

    try {
      // Clean phone number before sending (remove formatting)
      const cleanedPhone = phone.replace(/\D/g, '')
      const cleanedDEA = deaNumber.replace(/\s/g, '').toUpperCase()
      
      await authService.signup({
        email,
        password,
        name: contactName,
        pharmacyName,
        phone: cleanedPhone,
        npiNumber,
        deaNumber: cleanedDEA,
        physicalAddress: physicalAddress.street || physicalAddress.city || physicalAddress.state || physicalAddress.zip
          ? physicalAddress
          : undefined,
      })
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Failed to create account. Please try again.')
      setLoading(false)
    }
  }

  if (!isLocalHost && !tenantChecked) {
    return <TenantInfoLoadingScreen />
  }
  if (!isLocalHost && tenantChecked && tenantError) {
    return <DomainNotRecognizedScreen detail={tenantError} />
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
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
          <CardTitle className="text-2xl text-center">Create your account</CardTitle>
          <CardDescription className="text-center">
            Step {step} of 3 - {step === 1 ? 'Basic Information' : step === 2 ? 'Contact Details' : 'Account Setup'}
          </CardDescription>

          {/* Progress indicator */}
          <div className="flex gap-2 mt-4">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-2 flex-1 rounded-full ${
                  s <= step ? 'bg-primary' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </CardHeader>

        <form onSubmit={handleNext}>
          <CardContent className="space-y-4">
            {step === 1 && (
              <>
                <div className="space-y-2">
                  <label htmlFor="pharmacyName" className="text-sm font-medium">
                    Pharmacy Name *
                  </label>
                  <Input
                    id="pharmacyName"
                    placeholder="HealthCare Pharmacy"
                    value={pharmacyName}
                    onChange={(e) => setPharmacyName(e.target.value)}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="npiNumber" className="text-sm font-medium">
                      NPI Number *
                    </label>
                    <Input
                      id="npiNumber"
                      placeholder="1234567890"
                      maxLength={10}
                      value={npiNumber}
                      onChange={(e) => handleNPIChange(e.target.value)}
                      required
                      className={npiError ? 'border-red-500' : ''}
                    />
                    {npiError && (
                      <p className="text-xs text-red-600 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {npiError}
                      </p>
                    )}
                    {!npiError && npiNumber.length === 10 && (
                      <p className="text-xs text-green-600 flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Valid NPI number
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="deaNumber" className="text-sm font-medium">
                      DEA Number *
                    </label>
                    <Input
                      id="deaNumber"
                      placeholder="AB1234563"
                      maxLength={9}
                      value={deaNumber}
                      onChange={(e) => handleDEAChange(e.target.value)}
                      required
                      className={deaError ? 'border-red-500' : ''}
                    />
                    {deaError && (
                      <p className="text-xs text-red-600 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {deaError}
                      </p>
                    )}
                    {!deaError && deaNumber.length === 9 && (
                      <p className="text-xs text-green-600 flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Valid DEA number
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div className="space-y-2">
                  <label htmlFor="contactName" className="text-sm font-medium">
                    Contact Name *
                  </label>
                  <Input
                    id="contactName"
                    placeholder="John Smith"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium">
                    Email Address *
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
                  <label htmlFor="phone" className="text-sm font-medium">
                    Phone Number (US) *
                  </label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(555) 123-4567"
                    value={phone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    required
                    maxLength={14}
                    className={phoneError ? 'border-red-500' : ''}
                  />
                  {phoneError && (
                    <p className="text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {phoneError}
                    </p>
                  )}
                  {!phoneError && phone.replace(/\D/g, '').length === 10 && (
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Valid US phone number
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    US phone numbers only (10 digits)
                  </p>
                </div>
                <div className="pt-4 border-t">
                  <h3 className="text-sm font-medium mb-3">Physical Address (Optional)</h3>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <label htmlFor="street" className="text-sm font-medium">
                        Street Address
                      </label>
                      <Input
                        id="street"
                        placeholder="123 Main Street"
                        value={physicalAddress.street}
                        onChange={(e) => setPhysicalAddress({ ...physicalAddress, street: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label htmlFor="city" className="text-sm font-medium">
                          City
                        </label>
                        <Input
                          id="city"
                          placeholder="Springfield"
                          value={physicalAddress.city}
                          onChange={(e) => setPhysicalAddress({ ...physicalAddress, city: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="state" className="text-sm font-medium">
                          State
                        </label>
                        <select
                          id="state"
                          value={physicalAddress.state}
                          onChange={(e) => setPhysicalAddress({ ...physicalAddress, state: e.target.value })}
                          className="w-full h-10 px-3 py-2 text-sm border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        >
                          <option value="">Select a state</option>
                          {US_STATES.map((state) => (
                            <option key={state.value} value={state.value}>
                              {state.label} ({state.value})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="zip" className="text-sm font-medium">
                        ZIP Code
                      </label>
                      <Input
                        id="zip"
                        placeholder="62701"
                        value={physicalAddress.zip}
                        onChange={(e) => setPhysicalAddress({ ...physicalAddress, zip: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <div className="bg-blue-50 p-4 rounded-lg mb-4">
                  <h3 className="font-medium mb-2">Review your information</h3>
                  <dl className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Pharmacy:</dt>
                      <dd className="font-medium">{pharmacyName}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Contact:</dt>
                      <dd className="font-medium">{contactName}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Email:</dt>
                      <dd className="font-medium">{email}</dd>
                    </div>
                  </dl>
                </div>
                {error && (
                  <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                    {error}
                  </div>
                )}
                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium">
                    Create Password *
                  </label>
                  <div className="relative">
                  <Input
                    id="password"
                      type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                      onChange={(e) => handlePasswordChange(e.target.value)}
                    required
                    minLength={8}
                      className={`pr-10 ${passwordError ? 'border-red-500' : ''}`}
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
                  
                  {password && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              passwordStrength.strength === 'strong'
                                ? 'bg-green-500 w-full'
                                : passwordStrength.strength === 'medium'
                                ? 'bg-yellow-500 w-2/3'
                                : 'bg-red-500 w-1/3'
                            }`}
                          />
                        </div>
                        <span className={`text-xs font-medium ${
                          passwordStrength.strength === 'strong'
                            ? 'text-green-600'
                            : passwordStrength.strength === 'medium'
                            ? 'text-yellow-600'
                            : 'text-red-600'
                        }`}>
                          {passwordStrength.strength.toUpperCase()}
                        </span>
                      </div>
                      
                      {passwordStrength.suggestions.length > 0 ? (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-2">
                          <p className="text-xs font-medium text-yellow-800 mb-1">Password suggestions:</p>
                          <ul className="text-xs text-yellow-700 space-y-1">
                            {passwordStrength.suggestions.map((suggestion, index) => (
                              <li key={index} className="flex items-center gap-1">
                                <XCircle className="h-3 w-3" />
                                {suggestion}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <p className="text-xs text-green-600 flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Password meets all requirements
                        </p>
                      )}
                    </div>
                  )}
                  
                  {passwordError && (
                    <p className="text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {passwordError}
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="confirmPassword" className="text-sm font-medium">
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                      required
                      className={`pr-10 ${confirmPasswordError ? 'border-red-500' : ''}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {confirmPasswordError && (
                    <p className="text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {confirmPasswordError}
                    </p>
                  )}
                  {!confirmPasswordError && confirmPassword && password === confirmPassword && (
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Passwords match
                    </p>
                  )}
                </div>
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    id="terms"
                    className="mt-1"
                    required
                  />
                  <label htmlFor="terms" className="text-sm text-muted-foreground">
                    I agree to the Terms of Service and Privacy Policy
                  </label>
                </div>
              </>
            )}
          </CardContent>

          <CardFooter className="flex justify-between">
            {step > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(step - 1)}
              >
                Back
              </Button>
            )}
            <Button type="submit" className="ml-auto" disabled={loading}>
              {loading ? 'Creating account...' : step === 3 ? 'Create Account' : 'Next'}
            </Button>
          </CardFooter>
        </form>

        <div className="p-6 pt-0 text-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </Card>
    </div>
  )
}
