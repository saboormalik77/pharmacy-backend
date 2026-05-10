import { supabaseAdmin } from '../config/supabase';
import { AppError } from '../utils/appError';

// =====================================================================
// Types
// =====================================================================

export type ServiceRequestPurpose =
  | 'return_pickup'
  | 'training'
  | 'inventory_review'
  | 'destruction_pickup'
  | 'other';

export type ServiceRequestStatus =
  | 'pending'
  | 'scheduled'
  | 'completed'
  | 'cancelled';

export type ProcessorClaimAction = 'schedule' | 'complete' | 'cancel' | 'release';

export interface CreateServiceRequestInput {
  pharmacyId: string;
  branchId?: string | null;
  requestedDate: string; // ISO date (YYYY-MM-DD)
  purpose?: ServiceRequestPurpose | null;
  specialInstructions?: string | null;
  requestedByUserId?: string | null;
}

export interface ListParams {
  status?: string | null;
  page?: number;
  limit?: number;
}

export interface AdminListParams extends ListParams {
  search?: string | null;
}

export interface ClaimInput {
  requestId: string;
  processorId: string;
  action: ProcessorClaimAction;
  scheduledDate?: string | null;
  notes?: string | null;
}

interface AssignedProcessorRef {
  processor_id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
}

// =====================================================================
// Internal helpers
// =====================================================================

const ensureAdmin = () => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }
  return supabaseAdmin;
};

const mapRpcError = (error: any, fallbackStatus = 400): AppError => {
  const raw = error?.message ?? '';
  const msg = typeof raw === 'string' ? raw : 'Service request operation failed';
  const code = error?.code;

  // PostgreSQL / PostgREST: duplicate overloaded RPC signatures — never expose raw SQL to clients
  if (/could not choose the best candidate function/i.test(msg)) {
    return new AppError(
      "We couldn't submit your on-site request right now. Please try again in a few minutes. If this keeps happening, contact support.",
      503
    );
  }

  if (code === '42501') return new AppError(msg, 403);
  if (code === '02000') return new AppError(msg, 404);
  if (code === '22023') return new AppError(msg, 400);
  if (code === '55000') return new AppError(msg, 409);
  return new AppError(msg, fallbackStatus);
};

// =====================================================================
// RPC wrappers — pharmacy
// =====================================================================

export const createServiceRequest = async (
  input: CreateServiceRequestInput
): Promise<any> => {
  const sb = ensureAdmin();

  if (!input.pharmacyId) throw new AppError('pharmacy_id is required', 400);
  if (!input.requestedDate) throw new AppError('requested_date is required', 400);

  // Parameter order must match a single DB signature (pharmacy → date → branch → …).
  // See scripts/dedupe_create_service_request_overloads.sql if PostgREST reports overload ambiguity.
  const { data, error } = await sb.rpc('create_service_request', {
    p_pharmacy_id: input.pharmacyId,
    p_requested_date: input.requestedDate,
    p_branch_id: input.branchId ?? null,
    p_purpose: input.purpose ?? null,
    p_special_instructions: input.specialInstructions ?? null,
    p_requested_by_user_id: input.requestedByUserId ?? null,
  });

  if (error) throw mapRpcError(error);

  // Fire-and-forget email notifications. We do NOT await the email to keep
  // the pharmacy-facing request fast; failures are logged only.
  notifyAssignedProcessorsOfNewRequest(data).catch((err) =>
    console.error('[ServiceRequestService] Notification error:', err)
  );

  return data;
};

export const listPharmacyServiceRequests = async (
  pharmacyId: string,
  params: ListParams = {}
): Promise<any> => {
  const sb = ensureAdmin();
  const { data, error } = await sb.rpc('list_pharmacy_service_requests', {
    p_pharmacy_id: pharmacyId,
    p_status_filter: params.status ?? null,
    p_page: params.page ?? 1,
    p_limit: params.limit ?? 10,
  });
  if (error) throw mapRpcError(error);
  return data ?? { items: [], total: 0, page: 1, limit: 10 };
};

export const cancelPharmacyServiceRequest = async (
  requestId: string,
  pharmacyId: string,
  reason?: string | null
): Promise<any> => {
  const sb = ensureAdmin();
  const { data, error } = await sb.rpc('cancel_pharmacy_service_request', {
    p_request_id: requestId,
    p_pharmacy_id: pharmacyId,
    p_reason: reason ?? null,
  });
  if (error) throw mapRpcError(error);
  return data;
};

// =====================================================================
// RPC wrappers — processor
// =====================================================================

export const listProcessorServiceRequests = async (
  processorId: string,
  params: ListParams = {}
): Promise<any> => {
  const sb = ensureAdmin();
  const { data, error } = await sb.rpc('list_processor_service_requests', {
    p_processor_id: processorId,
    p_status_filter: params.status ?? null,
    p_page: params.page ?? 1,
    p_limit: params.limit ?? 10,
  });
  if (error) throw mapRpcError(error);
  return data ?? { items: [], total: 0, page: 1, limit: 10 };
};

export const claimServiceRequest = async (input: ClaimInput): Promise<any> => {
  const sb = ensureAdmin();
  const { data, error } = await sb.rpc('claim_service_request', {
    p_request_id: input.requestId,
    p_processor_id: input.processorId,
    p_action: input.action,
    p_scheduled_date: input.scheduledDate ?? null,
    p_notes: input.notes ?? null,
  });
  if (error) throw mapRpcError(error);

  // Notify pharmacy for schedule / complete / cancel actions
  if (data && (input.action === 'schedule' || input.action === 'complete' || input.action === 'cancel')) {
    notifyPharmacyOfProcessorAction(data, input.action, input.processorId).catch((err) =>
      console.error('[ServiceRequestService] Pharmacy notification error:', err)
    );
  }

  return data;
};

// =====================================================================
// RPC wrappers — admin
// =====================================================================

export const listAdminServiceRequests = async (
  buyingGroupId: string | null,
  params: AdminListParams = {}
): Promise<any> => {
  const sb = ensureAdmin();
  const { data, error } = await sb.rpc('list_admin_service_requests', {
    p_buying_group_id: buyingGroupId,
    p_status_filter: params.status ?? null,
    p_search: params.search ?? null,
    p_page: params.page ?? 1,
    p_limit: params.limit ?? 10,
  });
  if (error) throw mapRpcError(error);
  return data ?? { items: [], total: 0, page: 1, limit: 10 };
};

export const adminReassignServiceRequest = async (
  requestId: string,
  processorIds: string[]
): Promise<any> => {
  const sb = ensureAdmin();
  const { data, error } = await sb.rpc('admin_reassign_service_request', {
    p_request_id: requestId,
    p_processor_ids: processorIds,
  });
  if (error) throw mapRpcError(error);

  // Notify the newly assigned processors
  if (data) {
    notifyAssignedProcessorsOfNewRequest(data).catch((err) =>
      console.error('[ServiceRequestService] Reassign notification error:', err)
    );
  }

  return data;
};

// =====================================================================
// Shared detail getter (authorization must be enforced by the caller)
// =====================================================================

export const getServiceRequestDetail = async (requestId: string): Promise<any> => {
  const sb = ensureAdmin();
  const { data, error } = await sb.rpc('get_service_request_detail', {
    p_request_id: requestId,
  });
  if (error) throw mapRpcError(error);
  if (!data) throw new AppError('Service request not found', 404);
  return data;
};

// =====================================================================
// Edge Function Helpers
// =====================================================================

const callServiceRequestNotificationEdgeFunction = async (payload: any): Promise<void> => {
  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.EDGE_SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.EDGE_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl) {
      console.error('[ServiceRequestService] SUPABASE_URL not configured for edge function calls');
      return;
    }

    const edgeFunctionUrl = `${supabaseUrl.replace('/rest/v1', '')}/functions/v1/send-service-request-notifications`;
    
    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': supabaseAnonKey ? `Bearer ${supabaseAnonKey}` : '',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[ServiceRequestService] Edge function call failed: ${response.status} ${errorText}`);
      return;
    }

    const result = await response.json();
    console.log(`[ServiceRequestService] Edge function result:`, result);
  } catch (error) {
    console.error('[ServiceRequestService] Edge function call error:', error);
  }
};

const notifyAssignedProcessorsOfNewRequest = async (requestData: any): Promise<void> => {
  try {
    const assigned: AssignedProcessorRef[] = requestData?.assigned_processors || [];
    if (!assigned.length) return;

    // Call the edge function instead of direct SMTP
    await callServiceRequestNotificationEdgeFunction({
      type: 'new_request',
      requestData,
      assignedProcessors: assigned,
    });
  } catch (error) {
    console.error('[ServiceRequestService] Failed to send new request notifications:', error);
  }
};

const notifyPharmacyOfProcessorAction = async (
  requestData: any,
  action: ProcessorClaimAction,
  processorId: string
): Promise<void> => {
  try {
    // Fetch pharmacy and processor details for the notification
    let pharmacyEmail = '';
    let pharmacyName = 'Pharmacy';
    let processorName = 'Field Representative';
    let processorPhone = '';

    // Get pharmacy details
    if (supabaseAdmin && requestData?.pharmacy_id) {
      try {
        const { data } = await supabaseAdmin
          .from('pharmacy')
          .select('email, name, pharmacy_name')
          .eq('id', requestData.pharmacy_id)
          .single();
        if (data) {
          pharmacyEmail = data.email || '';
          pharmacyName = data.name || data.pharmacy_name || pharmacyName;
        }
      } catch {
        // ignore
      }
    }

    // Get processor details
    if (supabaseAdmin && processorId) {
      try {
        const { data } = await supabaseAdmin
          .from('processors')
          .select('name, phone')
          .eq('id', processorId)
          .single();
        if (data) {
          processorName = data.name || processorName;
          processorPhone = data.phone || '';
        }
      } catch {
        // ignore
      }
    }

    if (!pharmacyEmail) {
      console.warn('[ServiceRequestService] No pharmacy email found for processor action notification');
      return;
    }

    // Enhance request data with pharmacy info for the edge function
    const enhancedRequestData = {
      ...requestData,
      pharmacy_email: pharmacyEmail,
      pharmacy_business_name: pharmacyName,
      pharmacy_name: pharmacyName,
    };

    // Call the edge function
    await callServiceRequestNotificationEdgeFunction({
      type: 'processor_action',
      requestData: enhancedRequestData,
      action,
      processorId,
      processorName,
      processorPhone,
    });
  } catch (error) {
    console.error('[ServiceRequestService] Failed to send processor action notification:', error);
  }
};

// =====================================================================
// Authorization helpers (used by controllers)
// =====================================================================

/**
 * Ensure the given pharmacyId can access the given request.
 * Matches if request.pharmacy_id OR request.branch_id equals pharmacyId.
 */
export const assertPharmacyOwnsRequest = async (
  requestId: string,
  pharmacyId: string
): Promise<any> => {
  const sb = ensureAdmin();
  const { data, error } = await sb
    .from('service_requests')
    .select('id, pharmacy_id, branch_id')
    .eq('id', requestId)
    .maybeSingle();
  if (error) throw new AppError(error.message, 500);
  if (!data) throw new AppError('Service request not found', 404);
  if (data.pharmacy_id !== pharmacyId && data.branch_id !== pharmacyId) {
    throw new AppError('You do not have access to this service request', 403);
  }
  return data;
};

/**
 * Ensure the given processor is in the assignment list for this request.
 * Processors may view requests they are eligible for.
 */
export const assertProcessorAssignedToRequest = async (
  requestId: string,
  processorId: string
): Promise<void> => {
  const sb = ensureAdmin();
  const { data, error } = await sb
    .from('service_request_assignments')
    .select('id')
    .eq('service_request_id', requestId)
    .eq('processor_id', processorId)
    .maybeSingle();
  if (error) throw new AppError(error.message, 500);
  if (!data) throw new AppError('You are not assigned to this service request', 403);
};
