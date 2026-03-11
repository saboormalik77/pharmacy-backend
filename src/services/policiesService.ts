/**
 * Policies CRUD Service
 *
 * Full CRUD for manufacturer_policies and related sub-tables:
 *   - manufacturer_return_policies (return rules)
 *   - non_returnable_products (NDC exceptions)
 *   - manufacturer_policy_notes (dated notes)
 *   - Bulk import from CSV/JSON
 */

import { supabaseAdmin } from '../config/supabase';
import { AppError } from '../utils/appError';

// ============================================================
// Types
// ============================================================

export interface ManufacturerPolicyInput {
  labelerId: string;
  labelerType?: 'generic' | 'brand';
  manufacturerName: string;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  zip?: string;
  mainContact?: string;
  mainPhone?: string;
  fax?: string;
  creditRequestEmail?: string;
  contact2Name?: string;
  contact2Phone?: string;
  contact2Email?: string;
  averagePayPercent?: number;
  averageDaysToPay?: number;
  verifiedDate?: string;
}

export interface ReturnPolicyInput {
  destination: string;
  autoRaEmail?: string;
  policyNumber?: number;
  policyDescription?: string;
  monthsBeforeExpiration?: number;
  monthsAfterExpiration?: number;
  discountRate?: number;
  partialsAccepted?: boolean;
  partialDosageForms?: string[];
  reimbursementType?: 'batch' | 'per_item';
}

export interface NonReturnableProductInput {
  ndc: string;
  productName?: string;
  reason?: string;
}

export interface PolicyNoteInput {
  noteDate?: string;
  authorInitials?: string;
  noteText: string;
}

export interface BulkImportRow {
  labelerId: string;
  labelerType?: string;
  manufacturerName: string;
  destination?: string;
  policyDescription?: string;
  monthsBeforeExpiration?: number;
  monthsAfterExpiration?: number;
  discountRate?: number;
  partialsAccepted?: boolean;
  reimbursementType?: string;
  autoRaEmail?: string;
}

interface ListPoliciesParams {
  page?: number;
  limit?: number;
  search?: string;
  labelerType?: string;
  destination?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ============================================================
// Helpers
// ============================================================

function getDb() {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }
  return supabaseAdmin;
}

function toCamelCase(row: any): any {
  if (!row) return null;
  return {
    id: row.id,
    labelerId: row.labeler_id,
    labelerType: row.labeler_type,
    manufacturerName: row.manufacturer_name,
    address1: row.address_1,
    address2: row.address_2,
    city: row.city,
    state: row.state,
    zip: row.zip,
    mainContact: row.main_contact,
    mainPhone: row.main_phone,
    fax: row.fax,
    creditRequestEmail: row.credit_request_email,
    contact2Name: row.contact_2_name,
    contact2Phone: row.contact_2_phone,
    contact2Email: row.contact_2_email,
    averagePayPercent: row.average_pay_percent != null ? Number(row.average_pay_percent) : null,
    averageDaysToPay: row.average_days_to_pay,
    verifiedDate: row.verified_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function returnPolicyToCamelCase(row: any): any {
  if (!row) return null;
  return {
    id: row.id,
    manufacturerPolicyId: row.manufacturer_policy_id,
    destination: row.destination,
    autoRaEmail: row.auto_ra_email,
    policyNumber: row.policy_number,
    policyDescription: row.policy_description,
    monthsBeforeExpiration: row.months_before_expiration,
    monthsAfterExpiration: row.months_after_expiration,
    discountRate: row.discount_rate != null ? Number(row.discount_rate) : null,
    partialsAccepted: row.partials_accepted,
    partialDosageForms: row.partial_dosage_forms,
    reimbursementType: row.reimbursement_type,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function exceptionToCamelCase(row: any): any {
  if (!row) return null;
  return {
    id: row.id,
    manufacturerPolicyId: row.manufacturer_policy_id,
    ndc: row.ndc,
    productName: row.product_name,
    reason: row.reason,
    createdAt: row.created_at,
  };
}

function noteToCamelCase(row: any): any {
  if (!row) return null;
  return {
    id: row.id,
    manufacturerPolicyId: row.manufacturer_policy_id,
    noteDate: row.note_date,
    authorInitials: row.author_initials,
    noteText: row.note_text,
    createdAt: row.created_at,
  };
}

// ============================================================
// CRUD — Manufacturer Policies
// ============================================================

export async function listPolicies(params: ListPoliciesParams = {}) {
  const db = getDb();
  const {
    page = 1,
    limit = 20,
    search,
    labelerType,
    destination,
    sortBy = 'manufacturer_name',
    sortOrder = 'asc',
  } = params;

  const offset = (page - 1) * limit;

  let query = db
    .from('manufacturer_policies')
    .select('*, manufacturer_return_policies(*)', { count: 'exact' });

  if (search) {
    query = query.or(
      `manufacturer_name.ilike.%${search}%,labeler_id.ilike.%${search}%,credit_request_email.ilike.%${search}%`
    );
  }

  if (labelerType && labelerType !== 'all') {
    query = query.eq('labeler_type', labelerType);
  }

  const allowedSort = [
    'manufacturer_name', 'labeler_id', 'labeler_type',
    'average_pay_percent', 'average_days_to_pay', 'created_at', 'verified_date',
  ];
  const sortColumn = allowedSort.includes(sortBy) ? sortBy : 'manufacturer_name';

  query = query
    .order(sortColumn, { ascending: sortOrder === 'asc' })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw new AppError(`Failed to list policies: ${error.message}`, 500);

  let results = (data || []).map((row: any) => {
    const policy = toCamelCase(row);
    policy.returnPolicies = (row.manufacturer_return_policies || []).map(returnPolicyToCamelCase);
    const destinations = policy.returnPolicies.map((rp: any) => rp.destination);
    policy.destinations = [...new Set(destinations)];
    return policy;
  });

  // Post-filter by destination (join filter not possible with Supabase)
  if (destination && destination !== 'all') {
    results = results.filter((p: any) =>
      p.destinations.includes(destination)
    );
  }

  return {
    policies: results,
    pagination: {
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    },
  };
}

export async function getPolicyById(id: string) {
  const db = getDb();

  const { data: policy, error } = await db
    .from('manufacturer_policies')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw new AppError(`Failed to get policy: ${error.message}`, 500);
  if (!policy) throw new AppError('Manufacturer policy not found', 404);

  const { data: returnPolicies } = await db
    .from('manufacturer_return_policies')
    .select('*')
    .eq('manufacturer_policy_id', id)
    .order('created_at', { ascending: true });

  const { data: exceptions } = await db
    .from('non_returnable_products')
    .select('*')
    .eq('manufacturer_policy_id', id)
    .order('created_at', { ascending: true });

  const { data: notes } = await db
    .from('manufacturer_policy_notes')
    .select('*')
    .eq('manufacturer_policy_id', id)
    .order('note_date', { ascending: false });

  const result = toCamelCase(policy);
  result.returnPolicies = (returnPolicies || []).map(returnPolicyToCamelCase);
  result.exceptions = (exceptions || []).map(exceptionToCamelCase);
  result.notes = (notes || []).map(noteToCamelCase);

  return result;
}

export async function createPolicy(input: ManufacturerPolicyInput) {
  const db = getDb();

  if (!input.labelerId || !input.manufacturerName) {
    throw new AppError('labelerId and manufacturerName are required', 400);
  }

  const { data: existing } = await db
    .from('manufacturer_policies')
    .select('id')
    .eq('labeler_id', input.labelerId)
    .maybeSingle();

  if (existing) {
    throw new AppError(`A policy for labeler ID "${input.labelerId}" already exists`, 409);
  }

  const { data, error } = await db
    .from('manufacturer_policies')
    .insert({
      labeler_id: input.labelerId,
      labeler_type: input.labelerType || 'generic',
      manufacturer_name: input.manufacturerName,
      address_1: input.address1 || null,
      address_2: input.address2 || null,
      city: input.city || null,
      state: input.state || null,
      zip: input.zip || null,
      main_contact: input.mainContact || null,
      main_phone: input.mainPhone || null,
      fax: input.fax || null,
      credit_request_email: input.creditRequestEmail || null,
      contact_2_name: input.contact2Name || null,
      contact_2_phone: input.contact2Phone || null,
      contact_2_email: input.contact2Email || null,
      average_pay_percent: input.averagePayPercent ?? null,
      average_days_to_pay: input.averageDaysToPay ?? null,
      verified_date: input.verifiedDate || null,
    })
    .select()
    .single();

  if (error) throw new AppError(`Failed to create policy: ${error.message}`, 500);

  return toCamelCase(data);
}

export async function updatePolicy(id: string, input: Partial<ManufacturerPolicyInput>) {
  const db = getDb();

  const { data: existing } = await db
    .from('manufacturer_policies')
    .select('id')
    .eq('id', id)
    .maybeSingle();

  if (!existing) throw new AppError('Manufacturer policy not found', 404);

  const updates: Record<string, any> = {};
  if (input.labelerId !== undefined) updates.labeler_id = input.labelerId;
  if (input.labelerType !== undefined) updates.labeler_type = input.labelerType;
  if (input.manufacturerName !== undefined) updates.manufacturer_name = input.manufacturerName;
  if (input.address1 !== undefined) updates.address_1 = input.address1;
  if (input.address2 !== undefined) updates.address_2 = input.address2;
  if (input.city !== undefined) updates.city = input.city;
  if (input.state !== undefined) updates.state = input.state;
  if (input.zip !== undefined) updates.zip = input.zip;
  if (input.mainContact !== undefined) updates.main_contact = input.mainContact;
  if (input.mainPhone !== undefined) updates.main_phone = input.mainPhone;
  if (input.fax !== undefined) updates.fax = input.fax;
  if (input.creditRequestEmail !== undefined) updates.credit_request_email = input.creditRequestEmail;
  if (input.contact2Name !== undefined) updates.contact_2_name = input.contact2Name;
  if (input.contact2Phone !== undefined) updates.contact_2_phone = input.contact2Phone;
  if (input.contact2Email !== undefined) updates.contact_2_email = input.contact2Email;
  if (input.averagePayPercent !== undefined) updates.average_pay_percent = input.averagePayPercent;
  if (input.averageDaysToPay !== undefined) updates.average_days_to_pay = input.averageDaysToPay;
  if (input.verifiedDate !== undefined) updates.verified_date = input.verifiedDate;

  if (Object.keys(updates).length === 0) {
    throw new AppError('No fields to update', 400);
  }

  const { data, error } = await db
    .from('manufacturer_policies')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new AppError(`Failed to update policy: ${error.message}`, 500);

  return toCamelCase(data);
}

export async function deletePolicy(id: string) {
  const db = getDb();

  const { data: existing } = await db
    .from('manufacturer_policies')
    .select('id')
    .eq('id', id)
    .maybeSingle();

  if (!existing) throw new AppError('Manufacturer policy not found', 404);

  const { error } = await db
    .from('manufacturer_policies')
    .delete()
    .eq('id', id);

  if (error) throw new AppError(`Failed to delete policy: ${error.message}`, 500);

  return { message: 'Policy deleted' };
}

// ============================================================
// CRUD — Return Policies (sub-records)
// ============================================================

export async function addReturnPolicy(policyId: string, input: ReturnPolicyInput) {
  const db = getDb();

  const { data: parent } = await db
    .from('manufacturer_policies')
    .select('id')
    .eq('id', policyId)
    .maybeSingle();

  if (!parent) throw new AppError('Manufacturer policy not found', 404);

  if (!input.destination) {
    throw new AppError('destination is required', 400);
  }

  const { data, error } = await db
    .from('manufacturer_return_policies')
    .insert({
      manufacturer_policy_id: policyId,
      destination: input.destination,
      auto_ra_email: input.autoRaEmail || null,
      policy_number: input.policyNumber ?? null,
      policy_description: input.policyDescription || null,
      months_before_expiration: input.monthsBeforeExpiration ?? 6,
      months_after_expiration: input.monthsAfterExpiration ?? 6,
      discount_rate: input.discountRate ?? null,
      partials_accepted: input.partialsAccepted ?? false,
      partial_dosage_forms: input.partialDosageForms || null,
      reimbursement_type: input.reimbursementType || 'batch',
    })
    .select()
    .single();

  if (error) throw new AppError(`Failed to add return policy: ${error.message}`, 500);

  return returnPolicyToCamelCase(data);
}

export async function updateReturnPolicy(returnPolicyId: string, input: Partial<ReturnPolicyInput>) {
  const db = getDb();

  const updates: Record<string, any> = {};
  if (input.destination !== undefined) updates.destination = input.destination;
  if (input.autoRaEmail !== undefined) updates.auto_ra_email = input.autoRaEmail;
  if (input.policyNumber !== undefined) updates.policy_number = input.policyNumber;
  if (input.policyDescription !== undefined) updates.policy_description = input.policyDescription;
  if (input.monthsBeforeExpiration !== undefined) updates.months_before_expiration = input.monthsBeforeExpiration;
  if (input.monthsAfterExpiration !== undefined) updates.months_after_expiration = input.monthsAfterExpiration;
  if (input.discountRate !== undefined) updates.discount_rate = input.discountRate;
  if (input.partialsAccepted !== undefined) updates.partials_accepted = input.partialsAccepted;
  if (input.partialDosageForms !== undefined) updates.partial_dosage_forms = input.partialDosageForms;
  if (input.reimbursementType !== undefined) updates.reimbursement_type = input.reimbursementType;

  if (Object.keys(updates).length === 0) {
    throw new AppError('No fields to update', 400);
  }

  const { data, error } = await db
    .from('manufacturer_return_policies')
    .update(updates)
    .eq('id', returnPolicyId)
    .select()
    .single();

  if (error) throw new AppError(`Failed to update return policy: ${error.message}`, 500);

  return returnPolicyToCamelCase(data);
}

export async function deleteReturnPolicy(returnPolicyId: string) {
  const db = getDb();

  const { error } = await db
    .from('manufacturer_return_policies')
    .delete()
    .eq('id', returnPolicyId);

  if (error) throw new AppError(`Failed to delete return policy: ${error.message}`, 500);

  return { message: 'Return policy deleted' };
}

// ============================================================
// CRUD — Exceptions (non-returnable products)
// ============================================================

export async function getExceptions(policyId: string) {
  const db = getDb();

  const { data, error } = await db
    .from('non_returnable_products')
    .select('*')
    .eq('manufacturer_policy_id', policyId)
    .order('created_at', { ascending: false });

  if (error) throw new AppError(`Failed to get exceptions: ${error.message}`, 500);

  return (data || []).map(exceptionToCamelCase);
}

export async function addException(policyId: string, input: NonReturnableProductInput) {
  const db = getDb();

  const { data: parent } = await db
    .from('manufacturer_policies')
    .select('id')
    .eq('id', policyId)
    .maybeSingle();

  if (!parent) throw new AppError('Manufacturer policy not found', 404);

  if (!input.ndc) {
    throw new AppError('ndc is required', 400);
  }

  const { data, error } = await db
    .from('non_returnable_products')
    .insert({
      manufacturer_policy_id: policyId,
      ndc: input.ndc,
      product_name: input.productName || null,
      reason: input.reason || null,
    })
    .select()
    .single();

  if (error) throw new AppError(`Failed to add exception: ${error.message}`, 500);

  return exceptionToCamelCase(data);
}

export async function deleteException(exceptionId: string) {
  const db = getDb();

  const { error } = await db
    .from('non_returnable_products')
    .delete()
    .eq('id', exceptionId);

  if (error) throw new AppError(`Failed to delete exception: ${error.message}`, 500);

  return { message: 'Exception deleted' };
}

// ============================================================
// CRUD — Notes
// ============================================================

export async function getNotes(policyId: string) {
  const db = getDb();

  const { data, error } = await db
    .from('manufacturer_policy_notes')
    .select('*')
    .eq('manufacturer_policy_id', policyId)
    .order('note_date', { ascending: false });

  if (error) throw new AppError(`Failed to get notes: ${error.message}`, 500);

  return (data || []).map(noteToCamelCase);
}

export async function addNote(policyId: string, input: PolicyNoteInput) {
  const db = getDb();

  const { data: parent } = await db
    .from('manufacturer_policies')
    .select('id')
    .eq('id', policyId)
    .maybeSingle();

  if (!parent) throw new AppError('Manufacturer policy not found', 404);

  if (!input.noteText) {
    throw new AppError('noteText is required', 400);
  }

  const { data, error } = await db
    .from('manufacturer_policy_notes')
    .insert({
      manufacturer_policy_id: policyId,
      note_date: input.noteDate || new Date().toISOString().split('T')[0],
      author_initials: input.authorInitials || null,
      note_text: input.noteText,
    })
    .select()
    .single();

  if (error) throw new AppError(`Failed to add note: ${error.message}`, 500);

  return noteToCamelCase(data);
}

export async function deleteNote(noteId: string) {
  const db = getDb();

  const { error } = await db
    .from('manufacturer_policy_notes')
    .delete()
    .eq('id', noteId);

  if (error) throw new AppError(`Failed to delete note: ${error.message}`, 500);

  return { message: 'Note deleted' };
}

// ============================================================
// Bulk Import
// ============================================================

export async function bulkImport(rows: BulkImportRow[]) {
  const db = getDb();

  if (!rows || rows.length === 0) {
    throw new AppError('No rows to import', 400);
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;
  const errors: { row: number; error: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      if (!row.labelerId || !row.manufacturerName) {
        errors.push({ row: i + 1, error: 'labelerId and manufacturerName are required' });
        skipped++;
        continue;
      }

      const { data: existing } = await db
        .from('manufacturer_policies')
        .select('id')
        .eq('labeler_id', row.labelerId)
        .maybeSingle();

      let policyId: string;

      if (existing) {
        const { data: updatedRow, error: updateErr } = await db
          .from('manufacturer_policies')
          .update({
            manufacturer_name: row.manufacturerName,
            labeler_type: row.labelerType || 'generic',
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (updateErr) {
          errors.push({ row: i + 1, error: updateErr.message });
          skipped++;
          continue;
        }
        policyId = updatedRow.id;
        updated++;
      } else {
        const { data: newRow, error: insertErr } = await db
          .from('manufacturer_policies')
          .insert({
            labeler_id: row.labelerId,
            labeler_type: row.labelerType || 'generic',
            manufacturer_name: row.manufacturerName,
          })
          .select()
          .single();

        if (insertErr) {
          errors.push({ row: i + 1, error: insertErr.message });
          skipped++;
          continue;
        }
        policyId = newRow.id;
        created++;
      }

      if (row.destination) {
        await db
          .from('manufacturer_return_policies')
          .insert({
            manufacturer_policy_id: policyId,
            destination: row.destination,
            policy_description: row.policyDescription || null,
            months_before_expiration: row.monthsBeforeExpiration ?? 6,
            months_after_expiration: row.monthsAfterExpiration ?? 6,
            discount_rate: row.discountRate ?? null,
            partials_accepted: row.partialsAccepted ?? false,
            reimbursement_type: row.reimbursementType || 'batch',
            auto_ra_email: row.autoRaEmail || null,
          });
      }
    } catch (err: any) {
      errors.push({ row: i + 1, error: err.message || 'Unknown error' });
      skipped++;
    }
  }

  return { created, updated, skipped, errors, total: rows.length };
}
