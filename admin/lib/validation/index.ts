import type { ValidationResult, FileValidationOptions } from './types';

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
// US HEALTHCARE
// ─────────────────────────────────────────────

export function validateNPI(value: string): ValidationResult {
  const digits = value?.replace(/\D/g, '') ?? '';
  if (!digits) return { valid: false, error: 'NPI number is required.' };
  if (digits.length !== 10) return { valid: false, error: 'NPI must be exactly 10 digits.' };
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

export function validateNPIOptional(value: string): ValidationResult {
  if (!value?.trim()) return { valid: true, error: null };
  return validateNPI(value);
}

export function validateDEA(value: string): ValidationResult {
  const upper = value?.trim().toUpperCase() ?? '';
  if (!upper) return { valid: false, error: 'DEA number is required.' };
  if (!/^[A-Z]{2}\d{7}$/.test(upper))
    return { valid: false, error: 'DEA must be 2 letters followed by 7 digits (e.g. AB1234563).' };
  const invalidFirst = ['I', 'O', 'S', 'Z'];
  if (invalidFirst.includes(upper[0]))
    return { valid: false, error: `DEA number cannot start with ${upper[0]}.` };
  const digits = upper.slice(2).split('').map(Number);
  const checkDigit = (digits[0] + digits[2] + digits[4] + (digits[1] + digits[3] + digits[5]) * 2) % 10;
  if (checkDigit !== digits[6]) return { valid: false, error: 'DEA number is invalid (checksum failed).' };
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
  if (value === '' || value === null || value === undefined)
    return { valid: false, error: 'Amount is required.' };
  const num = typeof value === 'string' ? parseFloat(value) : value;
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
  if (value === '' || value === null || value === undefined)
    return { valid: false, error: 'Quantity is required.' };
  const num = typeof value === 'string' ? parseInt(value, 10) : value;
  if (isNaN(num) || !Number.isInteger(num))
    return { valid: false, error: 'Quantity must be a whole number.' };
  if (num <= 0) return { valid: false, error: 'Quantity must be greater than 0.' };
  return { valid: true, error: null };
}

export function validateDiscountRate(value: string | number): ValidationResult {
  if (value === '' || value === null || value === undefined) return { valid: true, error: null };
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return { valid: false, error: 'Enter a valid discount rate.' };
  if (num < 0 || num > 1) return { valid: false, error: 'Discount rate must be between 0 and 1.' };
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

export function validateFutureDate(value: string): ValidationResult {
  const base = validateDate(value);
  if (!base.valid) return base;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  if (new Date(value) < today) return { valid: false, error: 'Date must be today or in the future.' };
  return { valid: true, error: null };
}

export function validateNotExpired(value: string): ValidationResult {
  const base = validateDate(value);
  if (!base.valid) return base;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  if (new Date(value) < today) return { valid: false, error: 'This date has already expired.' };
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
  const diffDays = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'This has already expired.';
  if (diffDays <= daysThreshold) return `Expires in ${diffDays} day${diffDays === 1 ? '' : 's'}.`;
  return null;
}

// ─────────────────────────────────────────────
// BUSINESS
// ─────────────────────────────────────────────

export function validateTrackingNumber(value: string): ValidationResult {
  if (!value?.trim()) return { valid: true, error: null };
  const trimmed = value.trim().replace(/\s/g, '');
  if (/^\d{12}$/.test(trimmed) || /^\d{15}$/.test(trimmed)) return { valid: true, error: null };
  if (/^1Z[A-Z0-9]{16}$/i.test(trimmed)) return { valid: true, error: null };
  if (/^\d{20,22}$/.test(trimmed)) return { valid: true, error: null };
  return { valid: false, error: 'Enter a valid tracking number (FedEx 12/15 digits, UPS 1Z format, USPS 20-22 digits).' };
}

export function validateRANumber(value: string): ValidationResult {
  if (!value?.trim()) return { valid: true, error: null };
  if (value.trim().length > 50) return { valid: false, error: 'RA number must be 50 characters or fewer.' };
  return { valid: true, error: null };
}

// ─────────────────────────────────────────────
// FILE UPLOADS
// ─────────────────────────────────────────────

export function validateImageUpload(file: File): ValidationResult {
  if (file.size > 5 * 1024 * 1024) return { valid: false, error: 'Image must be under 5MB.' };
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
    return { valid: false, error: 'Only JPG, PNG, or WebP images are allowed.' };
  return { valid: true, error: null };
}

export function validateCSVUpload(file: File): ValidationResult {
  if (file.size > 10 * 1024 * 1024) return { valid: false, error: 'CSV must be under 10MB.' };
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext !== 'csv') return { valid: false, error: 'Only .csv files are allowed.' };
  return { valid: true, error: null };
}

export type { ValidationResult, FileValidationOptions } from './types';
