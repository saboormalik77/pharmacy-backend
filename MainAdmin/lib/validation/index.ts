import type { ValidationResult } from './types';

// ─────────────────────────────────────────────
// GENERAL
// ─────────────────────────────────────────────

export function validateRequired(value: string): ValidationResult {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0
    ? { valid: true, error: null }
    : { valid: false, error: 'This field is required.' };
}

export function validateName(value: string): ValidationResult {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) return { valid: false, error: 'Name is required.' };
  if (trimmed.length < 2) return { valid: false, error: 'Name must be at least 2 characters.' };
  if (trimmed.length > 100) return { valid: false, error: 'Name must be 100 characters or fewer.' };
  return { valid: true, error: null };
}

export function validateTextArea(value: string, maxLength = 2000): ValidationResult {
  if ((value?.trim() ?? '').length > maxLength)
    return { valid: false, error: `Must be ${maxLength} characters or fewer.` };
  return { valid: true, error: null };
}

// ─────────────────────────────────────────────
// AUTHENTICATION
// ─────────────────────────────────────────────

export function validateEmail(value: string): ValidationResult {
  const trimmed = value?.trim().toLowerCase() ?? '';
  if (!trimmed) return { valid: false, error: 'Email is required.' };
  if (trimmed.length > 254) return { valid: false, error: 'Email must be 254 characters or fewer.' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed))
    return { valid: false, error: 'Enter a valid email address.' };
  return { valid: true, error: null };
}

export function validatePassword(value: string): ValidationResult {
  if (!value) return { valid: false, error: 'Password is required.' };
  if (value.length < 8) return { valid: false, error: 'Password must be at least 8 characters.' };
  if (value.length > 128) return { valid: false, error: 'Password must be 128 characters or fewer.' };
  if (!/[A-Z]/.test(value)) return { valid: false, error: 'Password must contain at least one uppercase letter.' };
  if (!/[a-z]/.test(value)) return { valid: false, error: 'Password must contain at least one lowercase letter.' };
  if (!/\d/.test(value)) return { valid: false, error: 'Password must contain at least one number.' };
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value))
    return { valid: false, error: 'Password must contain at least one special character.' };
  return { valid: true, error: null };
}

export function validatePasswordMatch(password: string, confirm: string): ValidationResult {
  if (!confirm) return { valid: false, error: 'Please confirm your password.' };
  if (password !== confirm) return { valid: false, error: 'Passwords do not match.' };
  return { valid: true, error: null };
}

// ─────────────────────────────────────────────
// US CONTACT
// ─────────────────────────────────────────────

export function formatPhoneNumber(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export function validateUSPhone(value: string): ValidationResult {
  if (!value?.trim()) return { valid: false, error: 'Phone number is required.' };
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 10)
    return { valid: false, error: 'Phone number must be 10 digits (e.g. (555) 123-4567).' };
  return { valid: true, error: null };
}

export function validateUSPhoneOptional(value: string): ValidationResult {
  if (!value?.trim()) return { valid: true, error: null };
  return validateUSPhone(value);
}

// ─────────────────────────────────────────────
// US ADDRESS
// ─────────────────────────────────────────────

const US_STATE_CODES = new Set([
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC',
]);

export function validateUSState(value: string): ValidationResult {
  if (!value?.trim()) return { valid: false, error: 'State is required.' };
  if (!US_STATE_CODES.has(value.toUpperCase()))
    return { valid: false, error: 'Select a valid US state.' };
  return { valid: true, error: null };
}

export function validateZipCode(value: string): ValidationResult {
  if (!value?.trim()) return { valid: false, error: 'ZIP code is required.' };
  if (!/^\d{5}(-\d{4})?$/.test(value.trim()))
    return { valid: false, error: 'Enter a valid ZIP code (e.g. 90210 or 90210-1234).' };
  return { valid: true, error: null };
}

export function validateZipCodeOptional(value: string): ValidationResult {
  if (!value?.trim()) return { valid: true, error: null };
  return validateZipCode(value);
}

export function validateStreetAddress(value: string): ValidationResult {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) return { valid: false, error: 'Street address is required.' };
  if (trimmed.length < 5) return { valid: false, error: 'Enter a complete street address.' };
  if (trimmed.length > 100) return { valid: false, error: 'Street address must be 100 characters or fewer.' };
  return { valid: true, error: null };
}

export function validateCity(value: string): ValidationResult {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) return { valid: false, error: 'City is required.' };
  if (trimmed.length < 2) return { valid: false, error: 'City must be at least 2 characters.' };
  if (trimmed.length > 50) return { valid: false, error: 'City must be 50 characters or fewer.' };
  return { valid: true, error: null };
}

// ─────────────────────────────────────────────
// TECHNICAL (MainAdmin-specific)
// ─────────────────────────────────────────────

export function validateSupabaseURL(value: string): ValidationResult {
  if (!value?.trim()) return { valid: false, error: 'Supabase URL is required.' };
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:')
      return { valid: false, error: 'Supabase URL must use HTTPS.' };
    if (!url.hostname.endsWith('.supabase.co'))
      return { valid: false, error: 'Supabase URL must end with .supabase.co.' };
    return { valid: true, error: null };
  } catch {
    return { valid: false, error: 'Enter a valid Supabase URL (e.g. https://xyz.supabase.co).' };
  }
}

export function validateSupabaseKey(value: string, label = 'Key'): ValidationResult {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) return { valid: false, error: `${label} is required.` };
  if (trimmed.length < 20) return { valid: false, error: `${label} appears too short.` };
  return { valid: true, error: null };
}

export function validateDomain(value: string): ValidationResult {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) return { valid: false, error: 'Domain is required.' };
  if (/^https?:\/\//i.test(trimmed))
    return { valid: false, error: 'Domain should not include http:// or https://.' };
  if (!/^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+$/.test(trimmed))
    return { valid: false, error: 'Enter a valid domain (e.g. example.com).' };
  return { valid: true, error: null };
}

export function validateDomainOptional(value: string): ValidationResult {
  if (!value?.trim()) return { valid: true, error: null };
  return validateDomain(value);
}

export function validateHostname(value: string): ValidationResult {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) return { valid: true, error: null };
  if (/^https?:\/\//i.test(trimmed))
    return { valid: false, error: 'Hostname should not include http:// or https://.' };
  if (!/^[a-zA-Z0-9]([a-zA-Z0-9\-\.]{0,253}[a-zA-Z0-9])?$/.test(trimmed))
    return { valid: false, error: 'Enter a valid hostname.' };
  return { valid: true, error: null };
}

// ─────────────────────────────────────────────
// DATES
// ─────────────────────────────────────────────

export function validateDate(value: string): ValidationResult {
  if (!value?.trim()) return { valid: false, error: 'Date is required.' };
  if (isNaN(new Date(value).getTime())) return { valid: false, error: 'Enter a valid date.' };
  return { valid: true, error: null };
}

export function validateDateOptional(value: string): ValidationResult {
  if (!value?.trim()) return { valid: true, error: null };
  return validateDate(value);
}

export function validateDateRange(from: string, to: string): ValidationResult {
  if (!from || !to) return { valid: true, error: null };
  const fromDate = new Date(from);
  const toDate = new Date(to);
  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) return { valid: true, error: null };
  if (toDate < fromDate) return { valid: false, error: '"To" date must be on or after "From" date.' };
  return { valid: true, error: null };
}

// ─────────────────────────────────────────────
// FINANCIAL
// ─────────────────────────────────────────────

export function validateCurrencyOptional(value: string | number): ValidationResult {
  if (value === '' || value === null || value === undefined) return { valid: true, error: null };
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return { valid: false, error: 'Enter a valid dollar amount.' };
  if (num < 0) return { valid: false, error: 'Amount cannot be negative.' };
  return { valid: true, error: null };
}

export type { ValidationResult } from './types';
