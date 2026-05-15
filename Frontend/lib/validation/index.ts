import type { ValidationResult, FileValidationOptions, PasswordStrengthResult } from './types';

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
  if (!/^[a-zA-Z\s'\-\.]+$/.test(trimmed))
    return { valid: false, error: 'Name may only contain letters, spaces, hyphens, apostrophes, or periods.' };
  return { valid: true, error: null };
}

export function validateTextArea(value: string, maxLength = 1000): ValidationResult {
  const trimmed = value?.trim() ?? '';
  if (trimmed.length > maxLength)
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

export function getPasswordStrength(password: string): PasswordStrengthResult {
  const suggestions: string[] = [];
  let score = 0;
  if (password.length >= 8) score++; else suggestions.push('At least 8 characters');
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++; else suggestions.push('One uppercase letter');
  if (/[a-z]/.test(password)) score++; else suggestions.push('One lowercase letter');
  if (/\d/.test(password)) score++; else suggestions.push('One number');
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score++; else suggestions.push('One special character');
  const level = score <= 2 ? 'weak' : score <= 4 ? 'medium' : 'strong';
  return { score, level, suggestions };
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
  if (digits.length !== 10) return { valid: false, error: 'Phone number must be 10 digits (e.g. (555) 123-4567).' };
  if (/^0{10}$/.test(digits) || /^1{10}$/.test(digits))
    return { valid: false, error: 'Enter a valid US phone number.' };
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
  if (!/^[a-zA-Z\s\-\.]+$/.test(trimmed))
    return { valid: false, error: 'City may only contain letters, spaces, hyphens, or periods.' };
  return { valid: true, error: null };
}

// ─────────────────────────────────────────────
// US HEALTHCARE
// ─────────────────────────────────────────────

export function validateNPI(value: string): ValidationResult {
  const digits = value?.replace(/\D/g, '') ?? '';
  if (!digits) return { valid: false, error: 'NPI number is required.' };
  if (digits.length !== 10) return { valid: false, error: 'NPI must be exactly 10 digits.' };

  // Luhn checksum for NPI (prefix 80840 + 10 digits)
  const prefixed = '80840' + digits;
  let sum = 0;
  for (let i = 0; i < prefixed.length; i++) {
    let d = parseInt(prefixed[prefixed.length - 1 - i]);
    if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
  }
  if (sum % 10 !== 0) return { valid: false, error: 'NPI number is invalid (checksum failed).' };
  return { valid: true, error: null };
}

export function validateDEA(value: string): ValidationResult {
  const upper = value?.trim().toUpperCase() ?? '';
  if (!upper) return { valid: false, error: 'DEA number is required.' };
  if (!/^[A-Z]{2}\d{7}$/.test(upper))
    return { valid: false, error: 'DEA must be 2 letters followed by 7 digits (e.g. AB1234563).' };

  const invalidFirstLetters = ['I', 'O', 'S', 'Z'];
  if (invalidFirstLetters.includes(upper[0]))
    return { valid: false, error: `DEA number cannot start with ${upper[0]}.` };

  // DEA checksum
  const digits = upper.slice(2).split('').map(Number);
  const oddSum = digits[0] + digits[2] + digits[4];
  const evenSum = (digits[1] + digits[3] + digits[5]) * 2;
  const checkDigit = (oddSum + evenSum) % 10;
  if (checkDigit !== digits[6])
    return { valid: false, error: 'DEA number is invalid (checksum failed).' };

  return { valid: true, error: null };
}

export function validateDEAOptional(value: string): ValidationResult {
  if (!value?.trim()) return { valid: true, error: null };
  return validateDEA(value);
}

export function validateNDC(value: string): ValidationResult {
  if (!value?.trim()) return { valid: false, error: 'NDC is required.' };
  if (!/^\d{5}-\d{4}-\d{2,3}$/.test(value.trim()))
    return { valid: false, error: 'Enter a valid NDC (e.g. 12345-6789-01).' };
  return { valid: true, error: null };
}

export function validateStateLicense(value: string): ValidationResult {
  if (!value?.trim()) return { valid: false, error: 'License number is required.' };
  if (!/^[a-zA-Z0-9\-]{3,20}$/.test(value.trim()))
    return { valid: false, error: 'Enter a valid license number (letters, numbers, hyphens only).' };
  return { valid: true, error: null };
}

export function validateLabelerID(value: string): ValidationResult {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) return { valid: false, error: 'Labeler ID is required.' };
  if (!/^\d{5}$/.test(trimmed))
    return { valid: false, error: 'Labeler ID must be exactly 5 digits.' };
  return { valid: true, error: null };
}

// ─────────────────────────────────────────────
// FINANCIAL
// ─────────────────────────────────────────────

export function validateCurrency(value: string | number): ValidationResult {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (value === '' || value === null || value === undefined)
    return { valid: false, error: 'Amount is required.' };
  if (isNaN(num)) return { valid: false, error: 'Enter a valid dollar amount.' };
  if (num < 0) return { valid: false, error: 'Amount cannot be negative.' };
  if (!/^\d+(\.\d{1,2})?$/.test(String(value).trim()))
    return { valid: false, error: 'Amount can have at most 2 decimal places.' };
  return { valid: true, error: null };
}

export function validateCurrencyOptional(value: string | number): ValidationResult {
  if (value === '' || value === null || value === undefined) return { valid: true, error: null };
  return validateCurrency(value);
}

export function validateQuantity(value: string | number): ValidationResult {
  const num = typeof value === 'string' ? parseInt(value, 10) : value;
  if (value === '' || value === null || value === undefined)
    return { valid: false, error: 'Quantity is required.' };
  if (isNaN(num) || !Number.isInteger(num))
    return { valid: false, error: 'Quantity must be a whole number.' };
  if (num <= 0) return { valid: false, error: 'Quantity must be greater than 0.' };
  return { valid: true, error: null };
}

export function validateDiscountRate(value: string | number): ValidationResult {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (value === '' || value === null || value === undefined)
    return { valid: true, error: null };
  if (isNaN(num)) return { valid: false, error: 'Enter a valid discount rate.' };
  if (num < 0 || num > 1) return { valid: false, error: 'Discount rate must be between 0 and 1.' };
  return { valid: true, error: null };
}

// ─────────────────────────────────────────────
// DATES
// ─────────────────────────────────────────────

export function validateDate(value: string): ValidationResult {
  if (!value?.trim()) return { valid: false, error: 'Date is required.' };
  const date = new Date(value);
  if (isNaN(date.getTime())) return { valid: false, error: 'Enter a valid date.' };
  return { valid: true, error: null };
}

export function validateDateOptional(value: string): ValidationResult {
  if (!value?.trim()) return { valid: true, error: null };
  return validateDate(value);
}

export function validateFutureDate(value: string): ValidationResult {
  const base = validateDate(value);
  if (!base.valid) return base;
  const date = new Date(value);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (date < today) return { valid: false, error: 'Date must be today or in the future.' };
  return { valid: true, error: null };
}

export function validateNotExpired(value: string): ValidationResult {
  const base = validateDate(value);
  if (!base.valid) return base;
  const date = new Date(value);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (date < today) return { valid: false, error: 'This date has already expired.' };
  return { valid: true, error: null };
}

export function validateDateRange(from: string, to: string): ValidationResult {
  if (!from || !to) return { valid: true, error: null };
  const fromDate = new Date(from);
  const toDate = new Date(to);
  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) return { valid: true, error: null };
  if (toDate < fromDate) return { valid: false, error: '"To" date must be on or after "From" date.' };
  return { valid: true, error: null };
}

export function warnExpiringSoon(value: string, daysThreshold = 90): string | null {
  if (!value?.trim()) return null;
  const date = new Date(value);
  if (isNaN(date.getTime())) return null;
  const today = new Date();
  const diffMs = date.getTime() - today.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'This has already expired.';
  if (diffDays <= daysThreshold) return `Expires in ${diffDays} day${diffDays === 1 ? '' : 's'}.`;
  return null;
}

// ─────────────────────────────────────────────
// BUSINESS / TECHNICAL
// ─────────────────────────────────────────────

export function validateURL(value: string): ValidationResult {
  if (!value?.trim()) return { valid: false, error: 'URL is required.' };
  try {
    const url = new URL(value.trim());
    if (!['http:', 'https:'].includes(url.protocol))
      return { valid: false, error: 'URL must start with http:// or https://.' };
    return { valid: true, error: null };
  } catch {
    return { valid: false, error: 'Enter a valid URL.' };
  }
}

export function validateSupabaseURL(value: string): ValidationResult {
  const base = validateURL(value);
  if (!base.valid) return base;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:')
      return { valid: false, error: 'Supabase URL must use HTTPS.' };
    if (!url.hostname.endsWith('.supabase.co'))
      return { valid: false, error: 'Supabase URL must end with .supabase.co.' };
    return { valid: true, error: null };
  } catch {
    return { valid: false, error: 'Enter a valid Supabase URL.' };
  }
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

export function validateTrackingNumber(value: string): ValidationResult {
  if (!value?.trim()) return { valid: true, error: null };
  const trimmed = value.trim().replace(/\s/g, '');

  // FedEx: 12 or 15 digits
  if (/^\d{12}$/.test(trimmed) || /^\d{15}$/.test(trimmed))
    return { valid: true, error: null };
  // UPS: starts with 1Z, 18 chars
  if (/^1Z[A-Z0-9]{16}$/i.test(trimmed))
    return { valid: true, error: null };
  // USPS: 20-22 digits
  if (/^\d{20,22}$/.test(trimmed))
    return { valid: true, error: null };

  return { valid: false, error: 'Enter a valid tracking number (FedEx, UPS, or USPS).' };
}

// ─────────────────────────────────────────────
// FILE UPLOADS
// ─────────────────────────────────────────────

export function validateFileUpload(
  file: File,
  options: FileValidationOptions = {}
): ValidationResult {
  const {
    allowedTypes = ['image/jpeg', 'image/png', 'image/webp'],
    maxSizeBytes = 5 * 1024 * 1024,
    allowedExtensions,
  } = options;

  if (allowedTypes.length > 0 && !allowedTypes.includes(file.type))
    return { valid: false, error: `File type not allowed. Accepted: ${allowedTypes.join(', ')}.` };

  if (allowedExtensions) {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowedExtensions.includes(ext))
      return { valid: false, error: `File extension not allowed. Accepted: ${allowedExtensions.join(', ')}.` };
  }

  if (file.size > maxSizeBytes)
    return { valid: false, error: `File size must be under ${Math.round(maxSizeBytes / 1024 / 1024)}MB.` };

  return { valid: true, error: null };
}

export function validateImageUpload(file: File): ValidationResult {
  return validateFileUpload(file, {
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    maxSizeBytes: 5 * 1024 * 1024,
  });
}

export function validateCSVUpload(file: File): ValidationResult {
  return validateFileUpload(file, {
    allowedTypes: ['text/csv', 'application/vnd.ms-excel'],
    allowedExtensions: ['.csv'],
    maxSizeBytes: 10 * 1024 * 1024,
  });
}

// ─────────────────────────────────────────────
// RE-EXPORTS
// ─────────────────────────────────────────────

export type { ValidationResult, FileValidationOptions, PasswordStrengthResult } from './types';
