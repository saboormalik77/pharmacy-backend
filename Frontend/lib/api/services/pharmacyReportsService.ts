import { apiClient } from '../client';

// ---------------------------------------------------------------
// Types (mirror backend src/services/pharmacyReportsService.ts)
// ---------------------------------------------------------------

export interface ReportDropdownItem {
  refNum: string;
  licensePlate: string;
  date: string;              // YYYY-MM-DD
  rawDate: string;
  amount: number;
  returnableValue: number;
  nonReturnableValue: number;
  totalItems: number;
  status: string;
  serviceType: string;
  transactionId: string;
  label: string;             // "YYYY-MM-DD | RefNum | $Amount"
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
  // Destruction lifecycle dates (Controls / Non Controls)
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
// API service
// ---------------------------------------------------------------

export const pharmacyReportsService = {
  async listReturns(limit = 200): Promise<ReportDropdownItem[]> {
    const res = await apiClient.get<{ returns: ReportDropdownItem[] }>(
      '/pharmacy-reports/returns',
      { limit },
    );
    if (res.status === 'success' && res.data) return res.data.returns || [];
    throw new Error(res.message || 'Failed to load reports dropdown');
  },

  async getReturnPacket(refNum: string): Promise<ReturnPacketReport> {
    const res = await apiClient.get<ReturnPacketReport>(
      `/pharmacy-reports/returns/${encodeURIComponent(refNum)}/return-packet`,
    );
    if (res.status === 'success' && res.data) return res.data;
    throw new Error(res.message || 'Failed to load return packet');
  },

  async getControlledSubstance(refNum: string): Promise<ItemizedReport> {
    const res = await apiClient.get<ItemizedReport>(
      `/pharmacy-reports/returns/${encodeURIComponent(refNum)}/controlled-substance`,
    );
    if (res.status === 'success' && res.data) return res.data;
    throw new Error(res.message || 'Failed to load controlled substance report');
  },

  async getDestructionControls(refNum: string): Promise<ItemizedReport> {
    const res = await apiClient.get<ItemizedReport>(
      `/pharmacy-reports/returns/${encodeURIComponent(refNum)}/destruction-controls`,
    );
    if (res.status === 'success' && res.data) return res.data;
    throw new Error(res.message || 'Failed to load destruction-controls report');
  },

  async getDestructionNonControls(refNum: string): Promise<ItemizedReport> {
    const res = await apiClient.get<ItemizedReport>(
      `/pharmacy-reports/returns/${encodeURIComponent(refNum)}/destruction-non-controls`,
    );
    if (res.status === 'success' && res.data) return res.data;
    throw new Error(res.message || 'Failed to load destruction non-controls report');
  },
};
