/**
 * Policy Engine Service
 *
 * Core business-rule engine that determines whether a pharmaceutical product
 * is returnable, non-returnable, or TBD based on manufacturer return policies.
 *
 * Algorithm:
 *   1. Extract labeler_id (NDC prefix) → lookup manufacturer_policies
 *   2. Check non_returnable_products for NDC-level exceptions
 *   3. Get return policy → calculate return window
 *   4. Check timing (too early / within window / too late)
 *   5. Check partial acceptance rules
 *   6. Return { status, reason, destination, ... }
 */

import { supabaseAdmin } from '../config/supabase';
import { AppError } from '../utils/appError';

// ============================================================
// Types
// ============================================================

export type ReturnabilityStatus = 'returnable' | 'non_returnable' | 'tbd';

export type NonReturnableReason =
  | 'no_policy'
  | 'no_return_policy'
  | 'policy_exception'
  | 'too_early'
  | 'too_late'
  | 'no_partials'
  | 'dosage_form_not_accepted';

export interface ReturnabilityResult {
  status: ReturnabilityStatus;
  reason: string | null;
  destination: string | null;
  discountRate: number | null;
  reimbursementType: string | null;
  policyNumber: number | null;
  policyDescription: string | null;
  expectedReturnableDate: string | null;
  windowStart: string | null;
  windowEnd: string | null;
  partialsAccepted: boolean | null;
  manufacturerName: string | null;
  manufacturerPolicyId: string | null;
  autoRaEmail: string | null;
}

export interface CheckReturnabilityInput {
  ndc: string;
  expirationDate: string;
  isPartial?: boolean;
  dosageForm?: string;
}

// ============================================================
// Helpers
// ============================================================

/**
 * Extract the labeler ID (first 5 digits) from an NDC code.
 * Handles dashed formats (e.g. "43547-325-06") and plain digits.
 */
function extractLabelerId(ndc: string): string {
  const digits = ndc.replace(/\D/g, '');
  return digits.slice(0, 5);
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// ============================================================
// Core Function
// ============================================================

export async function checkReturnability(
  input: CheckReturnabilityInput
): Promise<ReturnabilityResult> {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  const { ndc, expirationDate, isPartial = false, dosageForm } = input;

  if (!ndc || !expirationDate) {
    throw new AppError('ndc and expirationDate are required', 400);
  }

  const expDate = new Date(expirationDate);
  if (isNaN(expDate.getTime())) {
    throw new AppError('Invalid expirationDate format. Use YYYY-MM-DD.', 400);
  }

  const labelerId = extractLabelerId(ndc);
  const normalizedNdc = ndc.replace(/\D/g, '');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const baseTbd: ReturnabilityResult = {
    status: 'tbd',
    reason: null,
    destination: null,
    discountRate: null,
    reimbursementType: null,
    policyNumber: null,
    policyDescription: null,
    expectedReturnableDate: null,
    windowStart: null,
    windowEnd: null,
    partialsAccepted: null,
    manufacturerName: null,
    manufacturerPolicyId: null,
    autoRaEmail: null,
  };

  // Step 1: Lookup manufacturer_policies by labeler_id
  const { data: mfgPolicy, error: mfgError } = await supabaseAdmin
    .from('manufacturer_policies')
    .select('*')
    .eq('labeler_id', labelerId)
    .maybeSingle();

  if (mfgError) {
    throw new AppError(`Policy lookup failed: ${mfgError.message}`, 500);
  }

  // Step 2: No policy found → TBD
  if (!mfgPolicy) {
    return {
      ...baseTbd,
      status: 'tbd',
      reason: 'no_policy',
    };
  }

  const manufacturerPolicyId = mfgPolicy.id;
  const manufacturerName = mfgPolicy.manufacturer_name;

  // Step 3: Check non_returnable_products for this specific NDC
  const { data: exceptions, error: excError } = await supabaseAdmin
    .from('non_returnable_products')
    .select('*')
    .eq('manufacturer_policy_id', manufacturerPolicyId);

  if (excError) {
    throw new AppError(`Exception lookup failed: ${excError.message}`, 500);
  }

  if (exceptions && exceptions.length > 0) {
    const normalizedExceptionNdcs = exceptions.map((e: any) =>
      e.ndc.replace(/\D/g, '')
    );
    if (normalizedExceptionNdcs.includes(normalizedNdc)) {
      const matchedEx = exceptions.find(
        (e: any) => e.ndc.replace(/\D/g, '') === normalizedNdc
      );
      return {
        ...baseTbd,
        status: 'non_returnable',
        reason: 'policy_exception',
        manufacturerName,
        manufacturerPolicyId,
        policyDescription: matchedEx?.reason || 'Product excluded by manufacturer policy',
      };
    }
  }

  // Step 4: Get return policy sub-records
  const { data: returnPolicies, error: rpError } = await supabaseAdmin
    .from('manufacturer_return_policies')
    .select('*')
    .eq('manufacturer_policy_id', manufacturerPolicyId)
    .order('created_at', { ascending: true });

  if (rpError) {
    throw new AppError(`Return policy lookup failed: ${rpError.message}`, 500);
  }

  if (!returnPolicies || returnPolicies.length === 0) {
    return {
      ...baseTbd,
      status: 'tbd',
      reason: 'no_return_policy',
      manufacturerName,
      manufacturerPolicyId,
    };
  }

  // Use the first (primary) return policy
  const rp = returnPolicies[0];

  // Step 5: Calculate return window
  const windowStart = addMonths(expDate, -rp.months_before_expiration);
  const windowEnd = addMonths(expDate, rp.months_after_expiration);

  windowStart.setHours(0, 0, 0, 0);
  windowEnd.setHours(23, 59, 59, 999);

  const commonFields = {
    destination: rp.destination,
    discountRate: rp.discount_rate ? Number(rp.discount_rate) : null,
    reimbursementType: rp.reimbursement_type,
    policyNumber: rp.policy_number,
    policyDescription: rp.policy_description,
    windowStart: formatDate(windowStart),
    windowEnd: formatDate(windowEnd),
    partialsAccepted: rp.partials_accepted,
    manufacturerName,
    manufacturerPolicyId,
    autoRaEmail: rp.auto_ra_email,
  };

  // Step 6: Check timing
  if (today < windowStart) {
    return {
      ...baseTbd,
      ...commonFields,
      status: 'non_returnable',
      reason: 'too_early',
      expectedReturnableDate: formatDate(windowStart),
    };
  }

  if (today > windowEnd) {
    return {
      ...baseTbd,
      ...commonFields,
      status: 'non_returnable',
      reason: 'too_late',
      expectedReturnableDate: null,
    };
  }

  // Step 7: Check partial acceptance
  if (isPartial) {
    if (!rp.partials_accepted) {
      return {
        ...baseTbd,
        ...commonFields,
        status: 'non_returnable',
        reason: 'no_partials',
        expectedReturnableDate: null,
      };
    }

    if (
      dosageForm &&
      rp.partial_dosage_forms &&
      rp.partial_dosage_forms.length > 0
    ) {
      const normalizedDosageForm = dosageForm.toUpperCase().trim();
      const allowedForms = rp.partial_dosage_forms.map((f: string) =>
        f.toUpperCase().trim()
      );
      if (!allowedForms.includes(normalizedDosageForm)) {
        return {
          ...baseTbd,
          ...commonFields,
          status: 'non_returnable',
          reason: 'dosage_form_not_accepted',
          policyDescription: `Partial accepted for: ${rp.partial_dosage_forms.join(', ')}. "${dosageForm}" not in list.`,
          expectedReturnableDate: null,
        };
      }
    }
  }

  // Step 8: Returnable!
  return {
    ...baseTbd,
    ...commonFields,
    status: 'returnable',
    reason: null,
    expectedReturnableDate: null,
  };
}
