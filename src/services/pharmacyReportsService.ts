import { supabaseAdmin } from '../config/supabase';
import { AppError } from '../utils/appError';

/**
 * Service layer for the Pharmacy Reports Hub.
 *
 * Mirrors the legacy reports.html flow (Return Packet, Controlled
 * Substance Report, Proof-of-Destruction Controls and
 * Proof-of-Destruction Non-Controls) but sources every row from
 * our own Supabase data via RPC calls defined in
 * scripts/fcr_51_pharmacy_reports.sql.
 */

// ---------------------------------------------------------------
// Types
// ---------------------------------------------------------------

export interface ReportDropdownItem {
  refNum: string;
  licensePlate: string;
  date: string;               // YYYY-MM-DD
  rawDate: string;
  amount: number;
  returnableValue: number;
  nonReturnableValue: number;
  totalItems: number;
  status: string;
  serviceType: string;
  transactionId: string;
  label: string;              // "YYYY-MM-DD | RefNum | $Amount"
}

export interface PharmacyHeader {
  pharmacyId: string;
  pharmacyName: string;
  corporateName: string;
  storeNumber: string;
  deaNumber: string;
  deaExpirationDate: string | null;
  npiNumber: string;
  stateLicenseNumber: string;
  licenseExpiryDate: string | null;
  contactPhone: string;
  faxNumber: string;
  email: string;
  contactName: string;
  primaryWholesaler: string;
  wholesalerAccountNumber: string;
  address: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  physicalAddress: Record<string, any> | null;
}

export interface ProcessorInfo {
  processorId: string | null;
  name: string;
  address: string;
  phone: string;
  deaNumber: string;
  email: string;
}

export interface ReportReturnMeta {
  refNum: string;
  licensePlate: string;
  status: string;
  serviceType?: string;
  createdAt: string;
  finalizedAt: string | null;
  timeIn?: string | null;
  timeOut?: string | null;
  reportDate: string;
  serviceDate?: string;
  fedexTracking?: string | null;
  notes?: string | null;
  totalItems?: number;
  totalReturnableItems?: number;
  totalNonReturnableItems?: number;
  totalReturnableValue?: number;
  totalNonReturnableValue?: number;
  totalEstimate?: number;
  debitMemoNum?: string;
  receivedAt?: string;
  verifiedAt?: string;
  shippedAt?: string;
  destroyedAt?: string;
}

export interface ReportItem {
  id: string;
  transactionId: string;
  ndc: string | null;
  ndc10: string | null;
  gtin: string | null;
  proprietaryName: string | null;
  genericName: string | null;
  manufacturer: string | null;
  packageDescription: string | null;
  dosageForm: string | null;
  strength: string | null;
  lotNumber: string | null;
  serialNumber: string | null;
  expirationDate: string | null;
  standardPrice: number | null;
  quantity: number | null;
  fullPackageSize: number | null;
  isPartial: boolean | null;
  partialPercentage: number | null;
  estimatedValue: number | null;
  returnStatus: 'returnable' | 'non_returnable' | 'tbd';
  nonReturnableReason: string | null;
  returnReason: string | null;
  destination: string | null;
  deaSchedule: string | null;
  deaForm222Required: boolean | null;
  memo: string | null;
}

export interface ManufacturerCreditGroup {
  manufacturer: string;
  itemCount: number;
  totalValue: number;
  items: ReportItem[];
}

export interface NeedsReviewReasonGroup {
  reason: string;
  itemCount: number;
  totalValue: number;
  items: ReportItem[];
}

export interface ReturnPacketReport {
  error: false;
  reportType: 'return_packet';
  reportTitle: string;
  pharmacy: PharmacyHeader;
  processor: ProcessorInfo;
  return: ReportReturnMeta;
  items: ReportItem[];
  returnableItems: ReportItem[];
  nonReturnableItems: ReportItem[];
  manufacturerCredits: ManufacturerCreditGroup[];
  needsReviewByReason: NeedsReviewReasonGroup[];
  totals: {
    totalItems: number;
    totalReturnableItems: number;
    totalNonReturnableItems: number;
    totalReturnableValue: number;
    totalNonReturnableValue: number;
    grandTotal: number;
  };
}

export interface ItemizedReport {
  error: false;
  reportType:
    | 'controlled_substance'
    | 'destruction_controls'
    | 'destruction_non_controls';
  reportTitle: string;
  pharmacy: PharmacyHeader;
  processor: ProcessorInfo;
  return: ReportReturnMeta;
  items: ReportItem[];
  totals: {
    totalItems: number;
    totalEstimatedValue: number;
  };
}

// ---------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------

const ensureAdmin = () => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }
  return supabaseAdmin;
};

const mapRpcError = (error: any, fallbackStatus = 400): AppError => {
  const msg = error?.message || 'Pharmacy reports operation failed';
  const code = error?.code;
  if (code === '42501') return new AppError(msg, 403);
  if (code === '02000') return new AppError(msg, 404);
  if (code === '22023') return new AppError(msg, 400);
  return new AppError(msg, fallbackStatus);
};

/**
 * Every RPC in fcr_51_pharmacy_reports.sql returns a jsonb object
 * of the form `{ error: boolean, code?: int, message?: string, ... }`.
 * Unwrap and throw on error so the controller layer can just await.
 */
const unwrap = <T>(data: any): T => {
  if (!data || typeof data !== 'object') {
    throw new AppError('Invalid RPC response', 500);
  }
  if (data.error) {
    throw new AppError(data.message || 'Report request failed', data.code || 400);
  }
  return data as T;
};

// ---------------------------------------------------------------
// Public API
// ---------------------------------------------------------------

export const listPharmacyReportReturns = async (
  pharmacyId: string,
  limit = 200,
): Promise<ReportDropdownItem[]> => {
  if (!pharmacyId) throw new AppError('pharmacy_id is required', 400);
  const sb = ensureAdmin();
  const { data, error } = await sb.rpc('list_pharmacy_report_returns', {
    p_pharmacy_id: pharmacyId,
    p_limit: limit,
  });
  if (error) throw mapRpcError(error);
  const resp = unwrap<{ returns: ReportDropdownItem[] }>(data);
  return resp.returns || [];
};

export const getReturnPacket = async (
  pharmacyId: string,
  refNum: string,
): Promise<ReturnPacketReport> => {
  if (!pharmacyId) throw new AppError('pharmacy_id is required', 400);
  if (!refNum)     throw new AppError('refNum is required', 400);
  const sb = ensureAdmin();
  const { data, error } = await sb.rpc('get_pharmacy_return_packet', {
    p_pharmacy_id: pharmacyId,
    p_ref_num: refNum,
  });
  if (error) throw mapRpcError(error);
  return unwrap<ReturnPacketReport>(data);
};

export const getControlledSubstanceReport = async (
  pharmacyId: string,
  refNum: string,
): Promise<ItemizedReport> => {
  if (!pharmacyId) throw new AppError('pharmacy_id is required', 400);
  if (!refNum)     throw new AppError('refNum is required', 400);
  const sb = ensureAdmin();
  const { data, error } = await sb.rpc(
    'get_pharmacy_controlled_substance_report',
    { p_pharmacy_id: pharmacyId, p_ref_num: refNum },
  );
  if (error) throw mapRpcError(error);
  return unwrap<ItemizedReport>(data);
};

export const getDestructionControls = async (
  pharmacyId: string,
  refNum: string,
): Promise<ItemizedReport> => {
  if (!pharmacyId) throw new AppError('pharmacy_id is required', 400);
  if (!refNum)     throw new AppError('refNum is required', 400);
  const sb = ensureAdmin();
  const { data, error } = await sb.rpc('get_pharmacy_destruction_controls', {
    p_pharmacy_id: pharmacyId,
    p_ref_num: refNum,
  });
  if (error) throw mapRpcError(error);
  return unwrap<ItemizedReport>(data);
};

export const getDestructionNonControls = async (
  pharmacyId: string,
  refNum: string,
): Promise<ItemizedReport> => {
  if (!pharmacyId) throw new AppError('pharmacy_id is required', 400);
  if (!refNum)     throw new AppError('refNum is required', 400);
  const sb = ensureAdmin();
  const { data, error } = await sb.rpc('get_pharmacy_destruction_non_controls', {
    p_pharmacy_id: pharmacyId,
    p_ref_num: refNum,
  });
  if (error) throw mapRpcError(error);
  return unwrap<ItemizedReport>(data);
};
