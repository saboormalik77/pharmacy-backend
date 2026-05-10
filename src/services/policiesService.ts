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
import { lookupNDC } from './ndcLookupService';

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
  /** If false, expiration inside the months before/after window is still non-returnable */
  returnableWithinPolicyPeriod?: boolean;
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
  /** Default true when omitted */
  returnableWithinPolicyPeriod?: boolean;
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

// ============================================================
// Helper: Get real manufacturer name from API
// ============================================================

/**
 * Fetch the correct manufacturer name from OpenFDA API using labeler_id (first 5 digits of any NDC)
 * This ensures we always store the real manufacturer name, not user-entered incorrect data.
 */
async function getCorrectManufacturerName(labelerId: string): Promise<string | null> {
  try {
    // Create a fake NDC using the labeler_id to lookup manufacturer
    // Format: {labelerId}01-001 (common NDC pattern for API lookup)
    const sampleNdc = `${labelerId}01-001`;
    
    console.log(`Looking up manufacturer for labeler_id: ${labelerId} using NDC: ${sampleNdc}`);
    
    const productInfo = await lookupNDC(sampleNdc);
    
    if (productInfo && productInfo.manufacturer) {
      console.log(`Found manufacturer via API: ${productInfo.manufacturer} for labeler ${labelerId}`);
      return productInfo.manufacturer;
    }
    
    console.log(`No manufacturer found via API for labeler ${labelerId}`);
    return null;
  } catch (error) {
    console.error(`Error looking up manufacturer for labeler ${labelerId}:`, error);
    return null;
  }
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
    returnableWithinPolicyPeriod: row.returnable_within_policy_period !== false,
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

  if (!input.labelerId) {
    throw new AppError('labelerId is required', 400);
  }

  const { data: existing } = await db
    .from('manufacturer_policies')
    .select('id')
    .eq('labeler_id', input.labelerId)
    .maybeSingle();

  if (existing) {
    throw new AppError(`A policy for labeler ID "${input.labelerId}" already exists`, 409);
  }

  // ALWAYS fetch the correct manufacturer name from API
  console.log(`Creating policy for labeler ${input.labelerId} - fetching correct manufacturer name from API...`);
  const correctManufacturerName = await getCorrectManufacturerName(input.labelerId);
  
  // Use API name if found, otherwise fall back to user input, otherwise use a placeholder
  const manufacturerNameToUse = correctManufacturerName || input.manufacturerName || `Unknown Manufacturer (${input.labelerId})`;
  
  if (correctManufacturerName && input.manufacturerName && correctManufacturerName !== input.manufacturerName) {
    console.log(`Corrected manufacturer name for ${input.labelerId}: "${input.manufacturerName}" → "${correctManufacturerName}"`);
  }

  const { data, error } = await db
    .from('manufacturer_policies')
    .insert({
      labeler_id: input.labelerId,
      labeler_type: input.labelerType || 'generic',
      manufacturer_name: manufacturerNameToUse, // Use API-fetched name
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
      returnable_within_policy_period: input.returnableWithinPolicyPeriod !== false,
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
  if (input.returnableWithinPolicyPeriod !== undefined) {
    updates.returnable_within_policy_period = input.returnableWithinPolicyPeriod;
  }

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
      if (!row.labelerId) {
        errors.push({ row: i + 1, error: 'labelerId is required' });
        skipped++;
        continue;
      }

      // ALWAYS fetch the correct manufacturer name from API
      console.log(`Bulk import row ${i + 1}: Fetching correct manufacturer name for labeler ${row.labelerId}...`);
      const correctManufacturerName = await getCorrectManufacturerName(row.labelerId);
      
      // Use API name if found, otherwise fall back to user input, otherwise use a placeholder
      const manufacturerNameToUse = correctManufacturerName || row.manufacturerName || `Unknown Manufacturer (${row.labelerId})`;
      
      if (correctManufacturerName && row.manufacturerName && correctManufacturerName !== row.manufacturerName) {
        console.log(`Bulk import corrected manufacturer name for ${row.labelerId}: "${row.manufacturerName}" → "${correctManufacturerName}"`);
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
            manufacturer_name: manufacturerNameToUse, // Use API-fetched name
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
            manufacturer_name: manufacturerNameToUse, // Use API-fetched name
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
            returnable_within_policy_period: row.returnableWithinPolicyPeriod !== false,
          });
      }
    } catch (err: any) {
      errors.push({ row: i + 1, error: err.message || 'Unknown error' });
      skipped++;
    }
  }

  return { created, updated, skipped, errors, total: rows.length };
}

// ============================================================
// Auto-create manufacturer policy with correct name from API
// ============================================================

/**
 * Auto-create a manufacturer policy if it doesn't exist for a given labeler_id.
 * This function is called during verification or debit memo creation when we encounter
 * a new labeler_id that doesn't have a policy yet.
 * 
 * ALWAYS fetches the correct manufacturer name from OpenFDA API.
 */
export async function ensureManufacturerPolicy(labelerId: string): Promise<string> {
  const db = getDb();

  if (!labelerId || labelerId === 'UNKWN') {
    throw new AppError('Invalid labeler_id provided', 400);
  }

  // Check if policy already exists
  const { data: existing } = await db
    .from('manufacturer_policies')
    .select('id, manufacturer_name')
    .eq('labeler_id', labelerId)
    .maybeSingle();

  if (existing) {
    return existing.id;
  }

  // Policy doesn't exist - create it with correct manufacturer name from API
  console.log(`Auto-creating manufacturer policy for labeler ${labelerId} - fetching correct name from API...`);
  const correctManufacturerName = await getCorrectManufacturerName(labelerId);
  
  const manufacturerNameToUse = correctManufacturerName || `Unknown Manufacturer (${labelerId})`;
  
  console.log(`Auto-creating manufacturer policy for ${labelerId} with name: "${manufacturerNameToUse}"`);

  const { data: newPolicy, error } = await db
    .from('manufacturer_policies')
    .insert({
      labeler_id: labelerId,
      labeler_type: 'generic', // Default to generic unless specified
      manufacturer_name: manufacturerNameToUse,
    })
    .select('id')
    .single();

  if (error) {
    throw new AppError(`Failed to auto-create manufacturer policy for ${labelerId}: ${error.message}`, 500);
  }

  console.log(`Successfully auto-created manufacturer policy for ${labelerId} (ID: ${newPolicy.id})`);
  return newPolicy.id;
}

// ============================================================
// Bulk update existing policies with correct API names
// ============================================================

/**
 * Update existing manufacturer policies with correct names from API.
 * This function can be called periodically to fix any incorrect manufacturer names
 * that were entered manually or imported incorrectly.
 */
export async function updateAllPoliciesWithApiNames(limit: number = 50): Promise<{
  processed: number;
  updated: number;
  errors: { labelerId: string; error: string }[];
}> {
  const db = getDb();
  
  // Get manufacturer policies that might need updating
  const { data: policies, error: fetchError } = await db
    .from('manufacturer_policies')
    .select('id, labeler_id, manufacturer_name')
    .limit(limit);

  if (fetchError) {
    throw new AppError(`Failed to fetch manufacturer policies: ${fetchError.message}`, 500);
  }

  if (!policies || policies.length === 0) {
    return { processed: 0, updated: 0, errors: [] };
  }

  let processed = 0;
  let updated = 0;
  const errors: { labelerId: string; error: string }[] = [];

  for (const policy of policies) {
    try {
      processed++;
      console.log(`Checking labeler ${policy.labeler_id} (${processed}/${policies.length})...`);
      
      const correctManufacturerName = await getCorrectManufacturerName(policy.labeler_id);
      
      if (correctManufacturerName && correctManufacturerName !== policy.manufacturer_name) {
        console.log(`Updating manufacturer name for ${policy.labeler_id}: "${policy.manufacturer_name}" → "${correctManufacturerName}"`);
        
        const { error: updateError } = await db
          .from('manufacturer_policies')
          .update({
            manufacturer_name: correctManufacturerName,
            updated_at: new Date().toISOString(),
          })
          .eq('id', policy.id);

        if (updateError) {
          errors.push({ labelerId: policy.labeler_id, error: updateError.message });
        } else {
          updated++;
        }
      } else {
        console.log(`Manufacturer name for ${policy.labeler_id} is already correct: "${policy.manufacturer_name}"`);
      }
      
      // Add small delay to avoid rate limiting the API
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error: any) {
      errors.push({ labelerId: policy.labeler_id, error: error.message || 'Unknown error' });
    }
  }

  return { processed, updated, errors };
}
