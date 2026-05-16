import type { SupabaseClient } from '@supabase/supabase-js';
import { AppError } from '../utils/appError';

export const EMAIL_IN_USE_MESSAGE = 'An account with this email already exists';

export type EmailUniquenessExclude = {
  adminId?: string;
  processorId?: string;
  pharmacyId?: string;
};

/**
 * Ensures an email is not used by any login-capable entity (buying group/admin,
 * processor, pharmacy, or pending pharmacy invite).
 */
export async function assertEmailAvailable(
  sb: SupabaseClient,
  email: string,
  exclude?: EmailUniquenessExclude
): Promise<void> {
  const normalized = email.toLowerCase().trim();
  if (!normalized) {
    throw new AppError('Email is required', 400);
  }

  const { data, error } = await sb.rpc('email_is_in_use', {
    p_email: normalized,
    p_exclude_admin_id: exclude?.adminId ?? null,
    p_exclude_processor_id: exclude?.processorId ?? null,
    p_exclude_pharmacy_id: exclude?.pharmacyId ?? null,
  });

  if (error) {
    throw new AppError(`Failed to validate email: ${error.message}`, 500);
  }

  if (data === true) {
    throw new AppError(EMAIL_IN_USE_MESSAGE, 409);
  }
}
