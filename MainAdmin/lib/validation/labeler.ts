/**
 * Comprehensive validation schema for pharmaceutical labeler management forms.
 * Follows U.S. business and contact standards.
 * Compatible with the project's ValidationResult pattern.
 */

import type { ValidationResult } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// ENUMS — single source of truth for dropdowns
// ─────────────────────────────────────────────────────────────────────────────

export const LABELER_TYPES = ['generic', 'brand', 'manufacturer', 'distributor', 'repackager'] as const;
export type LabelerType = typeof LABELER_TYPES[number];

export const REIMBURSEMENT_TYPES = ['batch', 'credit', 'check', 'ach'] as const;
export type ReimbursementType = typeof REIMBURSEMENT_TYPES[number];

export const RETURN_WINDOW_MODES = ['standard', 'inverted'] as const;
export type ReturnWindowMode = typeof RETURN_WINDOW_MODES[number];

export const LABELER_TYPE_LABELS: Record<LabelerType, string> = {
    generic: 'Generic',
    brand: 'Brand',
    manufacturer: 'Manufacturer',
    distributor: 'Distributor',
    repackager: 'Repackager',
};

export const REIMBURSEMENT_TYPE_LABELS: Record<ReimbursementType, string> = {
    batch: 'Batch',
    credit: 'Credit',
    check: 'Check',
    ach: 'ACH',
};

export const RETURN_WINDOW_LABELS: Record<ReturnWindowMode, string> = {
    standard: 'Standard — returnable in window',
    inverted: 'Inverted — Wine Cellar in window',
};

// ─────────────────────────────────────────────────────────────────────────────
// FIELD LIMITS
// ─────────────────────────────────────────────────────────────────────────────

export const LIMITS = {
    LABELER_ID: 10,
    LABELER_NAME_MIN: 2,
    LABELER_NAME_MAX: 150,
    ADDRESS_MAX: 150,
    CITY_MAX: 100,
    CONTACT_NAME_MAX: 100,
    EMAIL_MAX: 254,
    NOTES_MAX: 5000,
    POLICY_NUMBER_MAX: 20,
    POLICY_DESCRIPTION_MAX: 500,
    AVG_DAYS_MAX: 9999,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// REGEX PATTERNS
// ─────────────────────────────────────────────────────────────────────────────

/** Uppercase alphanumeric only, no spaces */
const LABELER_ID_RE = /^[A-Z0-9]{1,10}$/;

/** Letters, numbers, spaces, apostrophes, commas, periods, ampersands, hyphens, parentheses, slashes */
const LABELER_NAME_RE = /^[A-Za-z0-9 ',.&\-()/]+$/;

/** U.S. street address: numbers, letters, spaces, common punctuation, parentheses */
const ADDRESS_RE = /^[A-Za-z0-9 '#.,\-/()+]+$/;

/** City: letters, spaces, hyphens, apostrophes */
const CITY_RE = /^[A-Za-z '\-]+$/;

/** Contact name: letters, spaces, hyphens, apostrophes, periods (for initials) */
const CONTACT_NAME_RE = /^[A-Za-z '.\-]+$/;

/** US ZIP: 5 digits or 5+4 with hyphen */
const US_ZIP_RE = /^\d{5}(-\d{4})?$/;

/** Policy #: alphanumeric + hyphens, underscores, periods */
const POLICY_NUMBER_RE = /^[A-Za-z0-9\-_.]+$/;

/**
 * RFC 5321 / 5322 practical email regex.
 * Allows quoted local parts and subdomains; rejects consecutive dots.
 */
const EMAIL_RE =
    /^[a-zA-Z0-9]([a-zA-Z0-9._%+\-]*[a-zA-Z0-9])?@[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,63}$/;

/** Detect HTML/script injection attempts */
const HTML_TAG_RE = /<[^>]+>/g;
const SCRIPT_RE = /<script[\s\S]*?>[\s\S]*?<\/script>/gi;
const ON_EVENT_RE = /\bon\w+\s*=/gi;
const JAVASCRIPT_RE = /javascript\s*:/gi;

/** Common SQL injection markers */
const SQL_INJECTION_RE =
    /\b(SELECT|INSERT|UPDATE|DELETE|DROP|TRUNCATE|UNION|EXEC|EXECUTE|CAST|CONVERT|DECLARE|XP_|SP_|CHAR\s*\(|NCHAR\s*\()\b/i;

/** Emoji-only detection (Unicode ranges) */
const EMOJI_ONLY_RE =
    /^[\u{1F300}-\u{1FAD6}\u{2600}-\u{27FF}\u{FE00}-\u{FEFF}\u{200D}\u{20E3}]+$/u;

// ─────────────────────────────────────────────────────────────────────────────
// SECURITY UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

/** Remove HTML tags, dangerous attributes, and CRLF sequences. Normalises whitespace. */
export function sanitizeText(value: string): string {
    return value
        .replace(/\r?\n|\r/g, ' ')   // strip newlines/CRLF before further processing
        .replace(SCRIPT_RE, '')
        .replace(ON_EVENT_RE, '')
        .replace(JAVASCRIPT_RE, '')
        .replace(HTML_TAG_RE, '')
        .replace(/\s+/g, ' ')
        .trim();
}

/** Sanitize notes: preserves newlines but strips script/HTML injection. */
export function sanitizeNotes(value: string): string {
    return value
        .replace(SCRIPT_RE, '')
        .replace(ON_EVENT_RE, '')
        .replace(JAVASCRIPT_RE, '')
        .replace(HTML_TAG_RE, '')
        .trim();
}

function hasInjection(value: string): boolean {
    return (
        SCRIPT_RE.test(value) ||
        ON_EVENT_RE.test(value) ||
        JAVASCRIPT_RE.test(value) ||
        SQL_INJECTION_RE.test(value)
    );
}

function isEmojiOnly(value: string): boolean {
    return EMOJI_ONLY_RE.test(value.trim());
}

/** Run security checks common to all text fields. Returns error string or null. */
function securityCheck(value: string): string | null {
    if (hasInjection(value)) return 'Value contains disallowed characters or patterns.';
    if (isEmojiOnly(value)) return 'Value cannot consist of emoji only.';
    return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// FIELD VALIDATORS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 1. Labeler ID
 * Required · max 10 chars · uppercase alphanumeric · no spaces
 */
export function validateLabelerId(value: string): ValidationResult {
    const v = value?.trim().toUpperCase() ?? '';
    if (!v) return { valid: false, error: 'Labeler ID is required.' };
    if (v.length > LIMITS.LABELER_ID)
        return { valid: false, error: `Labeler ID must be ${LIMITS.LABELER_ID} characters or fewer (e.g. 00032, ABB123).` };
    if (!LABELER_ID_RE.test(v))
        return { valid: false, error: 'Labeler ID may only contain uppercase letters and numbers, no spaces.' };
    return { valid: true, error: null };
}

/**
 * 2. Labeler Type
 * Required · one of LABELER_TYPES
 */
export function validateLabelerType(value: string): ValidationResult {
    if (!value) return { valid: false, error: 'Labeler type is required.' };
    if (!LABELER_TYPES.includes(value as LabelerType))
        return { valid: false, error: `Labeler type must be one of: ${LABELER_TYPES.join(', ')}.` };
    return { valid: true, error: null };
}

/**
 * 3. Average Pay Percent
 * Required · 0–100 · up to 2 decimal places
 * Round to 2dp to avoid JS floating-point artefacts (e.g. 0.1+0.2 = 0.30000000000000004)
 */
export function validateAveragePayPercent(value: number | null | undefined): ValidationResult {
    if (value == null || value === undefined || (value as unknown as string) === '')
        return { valid: true, error: null };
    if (typeof value !== 'number' || isNaN(value))
        return { valid: false, error: 'Average Pay Percent must be a number.' };
    const rounded = Math.round(value * 100) / 100;
    if (rounded < 0 || rounded > 100)
        return { valid: false, error: 'Average Pay Percent must be between 0 and 100.' };
    if (!/^\d+(\.\d{1,2})?$/.test(rounded.toFixed(2).replace(/\.?0+$/, '')))
        return { valid: false, error: 'Average Pay Percent allows up to 2 decimal places.' };
    return { valid: true, error: null };
}

/** Round average pay percent to 2dp before storage. */
export function roundPayPercent(value: number): number {
    return Math.round(value * 100) / 100;
}

/**
 * 4. Average Days to Pay
 * Required · integer · 0–9999
 */
export function validateAverageDaysToPay(value: number | null | undefined): ValidationResult {
    if (value == null || value === undefined || (value as unknown as string) === '')
        return { valid: true, error: null };
    if (typeof value !== 'number' || isNaN(value))
        return { valid: false, error: 'Average Days to Pay must be a number.' };
    if (!Number.isInteger(value))
        return { valid: false, error: 'Average Days to Pay must be a whole number.' };
    if (value < 0 || value > LIMITS.AVG_DAYS_MAX)
        return { valid: false, error: `Average Days to Pay must be between 0 and ${LIMITS.AVG_DAYS_MAX}.` };
    return { valid: true, error: null };
}

/**
 * 5. Labeler Name
 * Required · min 2 · max 150 · letters, numbers, spaces, ' , . & -
 */
export function validateLabelerName(value: string): ValidationResult {
    const v = sanitizeText(value ?? '');
    if (!v) return { valid: false, error: 'Labeler Name is required.' };
    if (v.length < LIMITS.LABELER_NAME_MIN)
        return { valid: false, error: `Labeler Name must be at least ${LIMITS.LABELER_NAME_MIN} characters.` };
    if (v.length > LIMITS.LABELER_NAME_MAX)
        return { valid: false, error: `Labeler Name must be ${LIMITS.LABELER_NAME_MAX} characters or fewer.` };
    const sec = securityCheck(v);
    if (sec) return { valid: false, error: sec };
    if (!LABELER_NAME_RE.test(v))
        return { valid: false, error: "Labeler Name may only contain letters, numbers, spaces, and ' , . & -" };
    return { valid: true, error: null };
}

/**
 * 6–7. Address Line (Address 1 / Address 2)
 * Optional · max 150 · U.S. address characters
 */
export function validateAddressLine(value: string, label = 'Address'): ValidationResult {
    if (!value?.trim()) return { valid: true, error: null };
    const v = sanitizeText(value);
    if (v.length > LIMITS.ADDRESS_MAX)
        return { valid: false, error: `${label} must be ${LIMITS.ADDRESS_MAX} characters or fewer.` };
    const sec = securityCheck(v);
    if (sec) return { valid: false, error: sec };
    if (!ADDRESS_RE.test(v))
        return { valid: false, error: `${label} contains invalid characters.` };
    return { valid: true, error: null };
}

/**
 * 8. City
 * Optional · max 100 · letters, spaces, hyphens, apostrophes
 */
export function validateCity(value: string): ValidationResult {
    if (!value?.trim()) return { valid: true, error: null };
    const v = sanitizeText(value);
    if (v.length > LIMITS.CITY_MAX)
        return { valid: false, error: `City must be ${LIMITS.CITY_MAX} characters or fewer.` };
    const sec = securityCheck(v);
    if (sec) return { valid: false, error: sec };
    if (!CITY_RE.test(v))
        return { valid: false, error: "City may only contain letters, spaces, hyphens, and apostrophes." };
    return { valid: true, error: null };
}

const US_STATE_CODES = new Set([
    'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
    'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
    'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
    'VA','WA','WV','WI','WY','DC',
]);

/**
 * 9. State
 * Optional · must match U.S. state abbreviation
 */
export function validateState(value: string): ValidationResult {
    if (!value?.trim()) return { valid: true, error: null };
    if (!US_STATE_CODES.has(value.trim().toUpperCase()))
        return { valid: false, error: 'Select a valid U.S. state abbreviation (e.g. CA, NY, TX).' };
    return { valid: true, error: null };
}

/**
 * 10. ZIP Code
 * Optional · 12345 or 12345-6789
 */
export function validateZip(value: string): ValidationResult {
    if (!value?.trim()) return { valid: true, error: null };
    if (!US_ZIP_RE.test(value.trim()))
        return { valid: false, error: 'Enter a valid U.S. ZIP code (e.g. 90210 or 90210-1234).' };
    return { valid: true, error: null };
}

/**
 * 11 / 15. Contact Name (Main Contact / Contact 2)
 * Optional · max 100 · letters, spaces, apostrophes, hyphens, periods
 */
export function validateContactName(value: string, label = 'Contact'): ValidationResult {
    if (!value?.trim()) return { valid: true, error: null };
    const v = sanitizeText(value);
    if (v.length > LIMITS.CONTACT_NAME_MAX)
        return { valid: false, error: `${label} must be ${LIMITS.CONTACT_NAME_MAX} characters or fewer.` };
    const sec = securityCheck(v);
    if (sec) return { valid: false, error: sec };
    if (!CONTACT_NAME_RE.test(v))
        return { valid: false, error: `${label} may only contain letters, spaces, apostrophes, hyphens, and periods.` };
    return { valid: true, error: null };
}

/** Normalise any US phone to (XXX) XXX-XXXX. Returns null if input is empty. */
export function normalizePhone(value: string): string | null {
    if (!value?.trim()) return null;
    let digits = value.replace(/\D/g, '');
    if (digits.length === 11 && digits[0] === '1') digits = digits.slice(1);
    if (digits.length !== 10) return value.trim();
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/**
 * 12 / 13 / 16. U.S. Phone / Fax / Phone 2
 * Optional · accepts (800) 255-5162, 800-255-5162, +1 800-255-5162
 * Normalised to (XXX) XXX-XXXX before save
 */
export function validateUSPhone(value: string, label = 'Phone number'): ValidationResult {
    if (!value?.trim()) return { valid: true, error: null };
    const digits = value.replace(/\D/g, '');
    const len = digits.length;
    if ((len !== 10) && !(len === 11 && digits[0] === '1'))
        return {
            valid: false,
            error: `${label} must be a valid 10-digit U.S. number (e.g. (800) 255-5162 or +1 800-255-5162).`,
        };
    return { valid: true, error: null };
}

/**
 * 14 / 17 / 20. Email
 * Optional · RFC-compliant · lowercased before save
 */
export function validateEmail(value: string, label = 'Email', required = false): ValidationResult {
    const v = value?.trim().toLowerCase() ?? '';
    if (!v) {
        if (required) return { valid: false, error: `${label} is required.` };
        return { valid: true, error: null };
    }
    if (v.length > LIMITS.EMAIL_MAX)
        return { valid: false, error: `${label} must be ${LIMITS.EMAIL_MAX} characters or fewer.` };
    if (/\.\./.test(v))
        return { valid: false, error: `${label}: consecutive dots are not allowed.` };
    if (!EMAIL_RE.test(v))
        return { valid: false, error: `Enter a valid email address (e.g. user@domain.com).` };
    return { valid: true, error: null };
}

/**
 * 18. Notes
 * Optional · max 5000 · multiline · sanitize HTML/scripts · preserve punctuation
 */
export function validateNotes(value: string): ValidationResult {
    if (!value?.trim()) return { valid: true, error: null };
    const sanitized = sanitizeNotes(value);
    if (sanitized.length > LIMITS.NOTES_MAX)
        return { valid: false, error: `Notes must be ${LIMITS.NOTES_MAX} characters or fewer.` };
    if (SQL_INJECTION_RE.test(sanitized))
        return { valid: false, error: 'Notes contain disallowed patterns.' };
    return { valid: true, error: null };
}

/**
 * 19. Destination
 * Required · must exist in the provided valid-destinations list (from DB)
 */
export function validateDestination(value: string, validDestinations: string[]): ValidationResult {
    if (!value?.trim()) return { valid: false, error: 'Please select a Destination.' };
    if (!validDestinations.includes(value.trim()))
        return { valid: false, error: 'Selected Destination is not valid. Please choose from the list.' };
    return { valid: true, error: null };
}

/**
 * 21. Policy #
 * Optional · max 20 · alphanumeric + hyphens
 */
export function validatePolicyNumber(value: string | number | undefined, label = 'Policy #'): ValidationResult {
    if (value == null || value === '') return { valid: true, error: null };
    const v = String(value).trim();
    if (!v) return { valid: true, error: null };
    if (v.length > LIMITS.POLICY_NUMBER_MAX)
        return { valid: false, error: `${label} must be ${LIMITS.POLICY_NUMBER_MAX} characters or fewer.` };
    // If it's numeric, enforce >= 1
    if (/^\d+$/.test(v) && parseInt(v, 10) < 1)
        return { valid: false, error: `${label} must be 1 or greater.` };
    if (!POLICY_NUMBER_RE.test(v))
        return { valid: false, error: `${label} may only contain letters, numbers, and hyphens.` };
    return { valid: true, error: null };
}

/**
 * 22. Policy Description
 * Optional · max 500 · normal punctuation allowed
 */
export function validatePolicyDescription(value: string, label = 'Policy Description'): ValidationResult {
    if (!value?.trim()) return { valid: true, error: null };
    const v = sanitizeText(value);
    if (v.length > LIMITS.POLICY_DESCRIPTION_MAX)
        return { valid: false, error: `${label} must be ${LIMITS.POLICY_DESCRIPTION_MAX} characters or fewer.` };
    const sec = securityCheck(v);
    if (sec) return { valid: false, error: sec };
    return { valid: true, error: null };
}

/**
 * 23. Discount Rate
 * Required · 0–1 · up to 4 decimal places
 * Round to 4dp to avoid JS floating-point artefacts before storage.
 */
export function validateDiscountRate(value: number | null | undefined): ValidationResult {
    if (value == null || (value as unknown as string) === '')
        return { valid: true, error: null };
    if (typeof value !== 'number' || isNaN(value))
        return { valid: false, error: 'Discount Rate must be a number.' };
    const rounded = Math.round(value * 10000) / 10000;
    if (rounded < 0 || rounded > 1)
        return { valid: false, error: 'Discount Rate must be between 0 and 1 (e.g. 0.3000 = 30%).' };
    if (!/^\d*(\.\d{1,4})?$/.test(rounded.toFixed(4).replace(/\.?0+$/, '')))
        return { valid: false, error: 'Discount Rate allows up to 4 decimal places.' };
    return { valid: true, error: null };
}

/** Round discount rate to 4dp before storage. */
export function roundDiscountRate(value: number): number {
    return Math.round(value * 10000) / 10000;
}

/**
 * Months Before / After Expiration
 * Required when return section is active · integer · 0–999
 */
export function validateMonthsExpiration(value: number | null | undefined, label: string): ValidationResult {
    if (value == null || (value as unknown as string) === '')
        return { valid: false, error: `${label} is required.` };
    if (typeof value !== 'number' || isNaN(value))
        return { valid: false, error: `${label} must be a number.` };
    if (!Number.isInteger(value))
        return { valid: false, error: `${label} must be a whole number (no decimals).` };
    if (value < 0 || value > 999)
        return { valid: false, error: `${label} must be between 0 and 999.` };
    return { valid: true, error: null };
}

/**
 * 24. Partials
 * Required · boolean
 */
export function validatePartials(value: boolean | null | undefined): ValidationResult {
    if (value == null)
        return { valid: false, error: 'Please select whether partial returns are accepted.' };
    return { valid: true, error: null };
}

/**
 * 25. Reimbursement Type
 * Required · one of REIMBURSEMENT_TYPES
 */
export function validateReimbursementType(value: string): ValidationResult {
    if (!value) return { valid: false, error: 'Reimbursement type is required.' };
    if (!REIMBURSEMENT_TYPES.includes(value as ReimbursementType))
        return {
            valid: false,
            error: `Reimbursement type must be one of: ${REIMBURSEMENT_TYPES.join(', ')}.`,
        };
    return { valid: true, error: null };
}

/**
 * 26. Return Window Mode
 * Required · 'standard' | 'inverted'
 */
export function validateReturnWindowMode(value: string): ValidationResult {
    if (!value) return { valid: false, error: 'Return window mode is required.' };
    if (!RETURN_WINDOW_MODES.includes(value as ReturnWindowMode))
        return {
            valid: false,
            error: `Return window mode must be one of: ${RETURN_WINDOW_MODES.join(', ')}.`,
        };
    return { valid: true, error: null };
}

// ─────────────────────────────────────────────────────────────────────────────
// FULL FORM VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

export interface LabelerFormData {
    // General
    labelerId: string;
    labelerType: string;
    averagePayPercent: number | null | undefined;
    averageDaysToPay: number | null | undefined;
    manufacturerName: string;
    // Address
    address1?: string;
    address2?: string;
    city?: string;
    state?: string;
    zip?: string;
    // Contact
    mainContact?: string;
    mainPhone?: string;
    fax?: string;
    creditRequestEmail?: string;
    contact2Name?: string;
    contact2Phone?: string;
    contact2Email?: string;
    // Notes
    notes?: string;
}

export interface ReturnPolicyFormData {
    destination: string;
    autoRaEmail?: string;
    policyNumber?: number | string;
    policyDescription?: string;
    monthsBeforeExpiration: number | null | undefined;
    monthsAfterExpiration: number | null | undefined;
    discountRate: number | null | undefined;
    partialsAccepted: boolean | null | undefined;
    reimbursementType: string;
    returnableWithinPolicyPeriod: string; // 'standard' | 'inverted'
}

export interface PartialPolicyFormData {
    policyNumber?: number | string;
    policyDescription?: string;
    monthsBeforeExpiration: number | null | undefined;
    monthsAfterExpiration: number | null | undefined;
    returnableWithinPolicyPeriod: string;
}

export type LabelerFormErrors = Partial<Record<
    | keyof LabelerFormData
    | keyof ReturnPolicyFormData
    | 'partialPolicyNumber'
    | 'partialPolicyDescription'
    | 'partialMonthsBeforeExpiration'
    | 'partialMonthsAfterExpiration'
    | 'partialReturnWindowMode',
    string
>>;

export interface ValidateLabelerFormOptions {
    validDestinations?: string[];
    /** Pass true when the return section fields are filled in */
    returnSectionActive?: boolean;
}

export function validateLabelerForm(
    labeler: LabelerFormData,
    returnPolicy: ReturnPolicyFormData,
    partialPolicy: PartialPolicyFormData,
    opts: ValidateLabelerFormOptions = {},
): LabelerFormErrors {
    const errors: LabelerFormErrors = {};

    const check = (key: keyof LabelerFormErrors, result: ValidationResult) => {
        if (!result.valid && result.error) errors[key] = result.error;
    };

    // ── General ──────────────────────────────────────────────────────────────
    check('labelerId',          validateLabelerId(labeler.labelerId));
    check('labelerType',        validateLabelerType(labeler.labelerType));
    check('averagePayPercent',  validateAveragePayPercent(labeler.averagePayPercent));
    check('averageDaysToPay',   validateAverageDaysToPay(labeler.averageDaysToPay));
    check('manufacturerName',   validateLabelerName(labeler.manufacturerName));

    // ── Address ───────────────────────────────────────────────────────────────
    check('address1',  validateAddressLine(labeler.address1 ?? '', 'Address 1'));
    check('address2',  validateAddressLine(labeler.address2 ?? '', 'Address 2'));
    check('city',      validateCity(labeler.city ?? ''));
    check('state',     validateState(labeler.state ?? ''));
    check('zip',       validateZip(labeler.zip ?? ''));

    // ── Contact ───────────────────────────────────────────────────────────────
    check('mainContact',        validateContactName(labeler.mainContact ?? '', 'Main Contact'));
    check('mainPhone',          validateUSPhone(labeler.mainPhone ?? '', 'Main Phone'));
    check('fax',                validateUSPhone(labeler.fax ?? '', 'Fax'));
    check('creditRequestEmail', validateEmail(labeler.creditRequestEmail ?? '', 'Credit Request Email'));
    check('contact2Name',       validateContactName(labeler.contact2Name ?? '', 'Contact 2'));
    check('contact2Phone',      validateUSPhone(labeler.contact2Phone ?? '', 'Phone 2'));
    check('contact2Email',      validateEmail(labeler.contact2Email ?? '', 'Email 2'));

    // ── Notes ─────────────────────────────────────────────────────────────────
    check('notes', validateNotes(labeler.notes ?? ''));

    // ── Return Policy (only when section is active) ───────────────────────────
    const returnFieldsFilled =
        !!returnPolicy.autoRaEmail ||
        (returnPolicy.policyNumber != null && returnPolicy.policyNumber !== '') ||
        !!returnPolicy.policyDescription ||
        returnPolicy.discountRate != null;

    if (returnFieldsFilled || opts.returnSectionActive) {
        check('destination', validateDestination(
            returnPolicy.destination,
            opts.validDestinations ?? [],
        ));
        // autoRaEmail is auto-filled from destination; still validate format if present
        if (returnPolicy.autoRaEmail) {
            check('autoRaEmail', validateEmail(returnPolicy.autoRaEmail, 'Auto RA Email'));
        }
        check('monthsBeforeExpiration', validateMonthsExpiration(returnPolicy.monthsBeforeExpiration, 'Months Before Expiration'));
        check('monthsAfterExpiration',  validateMonthsExpiration(returnPolicy.monthsAfterExpiration, 'Months After Expiration'));
        check('discountRate',          validateDiscountRate(returnPolicy.discountRate));
        check('partialsAccepted',      validatePartials(returnPolicy.partialsAccepted));
        check('reimbursementType',     validateReimbursementType(returnPolicy.reimbursementType));
        check('returnableWithinPolicyPeriod', validateReturnWindowMode(returnPolicy.returnableWithinPolicyPeriod));
    }

    check('policyNumber', validatePolicyNumber(returnPolicy.policyNumber));

    // ── Partial Policy (only when partialsAccepted = true) ────────────────────
    if (returnPolicy.partialsAccepted) {
        check('partialPolicyNumber',            validatePolicyNumber(partialPolicy.policyNumber, 'Partial Policy #'));
        check('partialPolicyDescription',       validatePolicyDescription(partialPolicy.policyDescription ?? '', 'Partial Policy Description'));
        check('partialMonthsBeforeExpiration',  validateMonthsExpiration(partialPolicy.monthsBeforeExpiration, 'Partial Months Before Expiration'));
        check('partialMonthsAfterExpiration',   validateMonthsExpiration(partialPolicy.monthsAfterExpiration, 'Partial Months After Expiration'));
        check('partialReturnWindowMode',        validateReturnWindowMode(partialPolicy.returnableWithinPolicyPeriod));
    }

    return errors;
}

// ─────────────────────────────────────────────────────────────────────────────
// NORMALISATION — call before saving to DB
// ─────────────────────────────────────────────────────────────────────────────

export interface NormalisedLabelerPayload {
    labelerId: string;
    manufacturerName: string;
    labelerType: LabelerType;
    averagePayPercent: number | undefined;
    averageDaysToPay: number | undefined;
    address1: string | null;
    address2: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
    mainContact: string | null;
    mainPhone: string | null;
    fax: string | null;
    creditRequestEmail: string | null;
    contact2Name: string | null;
    contact2Phone: string | null;
    contact2Email: string | null;
    notes?: string;
}

export function normaliseLabelerPayload(data: LabelerFormData): NormalisedLabelerPayload {
    const str = (v?: string) => (v?.trim() || null);
    return {
        // Required — never null
        labelerId:         data.labelerId.trim().toUpperCase(),
        manufacturerName:  sanitizeText(data.manufacturerName),
        labelerType:       data.labelerType as LabelerType,
        averagePayPercent: data.averagePayPercent != null ? roundPayPercent(data.averagePayPercent) : undefined,
        averageDaysToPay:  data.averageDaysToPay ?? undefined,
        // Optional — empty string → null
        address1:          str(data.address1),
        address2:          str(data.address2),
        city:              str(data.city),
        state:             data.state?.trim().toUpperCase() || null,
        zip:               str(data.zip),
        mainContact:       str(data.mainContact),
        mainPhone:         normalizePhone(data.mainPhone ?? '') ?? null,
        fax:               normalizePhone(data.fax ?? '') ?? null,
        creditRequestEmail: data.creditRequestEmail?.trim().toLowerCase() || null,
        contact2Name:      str(data.contact2Name),
        contact2Phone:     normalizePhone(data.contact2Phone ?? '') ?? null,
        contact2Email:     data.contact2Email?.trim().toLowerCase() || null,
        notes:             data.notes ? sanitizeNotes(data.notes) : undefined,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// BACKEND SECURITY RECOMMENDATIONS (documented as comments)
// ─────────────────────────────────────────────────────────────────────────────
//
// API layer (Express / Next.js route handlers):
//
// 1. Re-run the same validation server-side. Never trust frontend-only checks.
//    Use validateLabelerForm() before any DB write.
//
// 2. Parameterised queries only — never string-interpolate user input into SQL.
//    The SQL_INJECTION_RE check is an early warning, not a substitute for
//    parameterisation.
//
// 3. Rate-limit the create/update endpoints (e.g. 10 req / min per IP).
//
// 4. Sanitize with DOMPurify (or equivalent server-side: sanitize-html) before
//    storing freetext fields (notes, descriptions) if they will be rendered as HTML.
//
// 5. Set Content-Security-Policy headers to prevent XSS even if a value slips through.
//
// 6. Store phone numbers in normalised (XXX) XXX-XXXX format — call normalizePhone()
//    before INSERT/UPDATE.
//
// 7. Store emails lowercase — call .trim().toLowerCase() before INSERT/UPDATE.
//
// 8. Store labelerIds uppercase — call .trim().toUpperCase() before INSERT/UPDATE.
//
// 9. Enforce DB-level constraints (CHECK, NOT NULL, VARCHAR lengths) as a final
//    safety net that cannot be bypassed.
//
// 10. Log and alert on repeated injection-pattern rejections from the same user/IP.
