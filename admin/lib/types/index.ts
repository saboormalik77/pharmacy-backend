// Core Type Definitions for PharmAdmin

export interface Pharmacy {
    id: string;
    businessName: string;
    owner: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    licenseNumber: string;
    status: 'active' | 'suspended' | 'blacklisted' | 'pending';
    totalReturns: number;
    createdAt: string;
    // Optional fields for update
    stateLicenseNumber?: string;
    licenseExpiryDate?: string;
    npiNumber?: string;
    deaNumber?: string;
    physicalAddress?: {
        street: string;
        city: string;
        state: string;
        zip: string;
    };
    billingAddress?: {
        street: string;
        city: string;
        state: string;
        zip: string;
    };
    subscriptionTier?: string;
    subscriptionStatus?: string;
}

export interface PharmacyUpdatePayload {
    businessName?: string;
    owner?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    licenseNumber?: string;
    stateLicenseNumber?: string;
    licenseExpiryDate?: string;
    npiNumber?: string;
    deaNumber?: string;
    physicalAddress?: {
        street: string;
        city: string;
        state: string;
        zip: string;
    };
    billingAddress?: {
        street: string;
        city: string;
        state: string;
        zip: string;
    };
    subscriptionTier?: string;
    subscriptionStatus?: string;
}

export interface PharmacyStatusUpdatePayload {
    status: 'active' | 'suspended' | 'blacklisted' | 'pending';
}

export interface PharmaciesPagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export interface PharmaciesFilters {
    search: string;
    status: 'all' | 'pending' | 'active' | 'suspended' | 'blacklisted';
}

export interface PharmaciesResponse {
    status: string;
    data: {
        pharmacies: Pharmacy[];
        pagination: PharmaciesPagination;
        filters: PharmaciesFilters;
        generatedAt: string;
    };
}

export interface Payment {
    id: string;
    paymentId: string;
    pharmacyId: string;
    pharmacyName: string;
    pharmacyEmail: string;
    amount: number;
    date: string;
    uploadedAt: string;
    reportDate: string;
    method: string;
    source: string;
    transactionId: string;
    distributorId?: string;
    distributorName?: string;
    distributorCode?: string;
    fileName?: string;
    fileType?: string;
    fileUrl?: string;
    extractedItems?: number;
    processedAt?: string;
}

export interface PaymentsPagination {
    page: number;
    limit: number;
    totalCount?: number;  // Optional - API might use 'total' instead
    total?: number;        // Support both field names (like pharmacies API)
    totalPages: number;
    hasNextPage?: boolean; // Optional - will be calculated if not provided
    hasPreviousPage?: boolean; // Optional - will be calculated if not provided
}

export interface PaymentsStats {
    totalPayments: number;
    totalAmount: number;
}

export interface PaymentsResponse {
    status: string;
    data: {
        payments: Payment[];
        pagination: PaymentsPagination;
        stats: PaymentsStats;
    };
}

export interface DashboardStats {
    totalPharmacies: number;
    activeDistributors: number;
    pendingDocuments: number;
    returnsValue: number;
    pharmaciesChange: number;
    distributorsChange: number;
    documentsChange: number;
    returnsChange: number;
}

// Dashboard API Types
export interface PharmacyOption {
    id: string;
    name: string;
}

export interface ReturnsValueTrendItem {
    period: string;
    label: string;
    value: number;
    documentsCount: number;
}

export interface DashboardPeriod {
    type: 'monthly' | 'yearly';
    periods: number;
    startDate: string;
    endDate: string;
    pharmacyId?: string;
}

export interface DashboardStatsData {
    totalPharmacies: {
        value: number;
        change: number;
        changeLabel: string;
    };
    activeDistributors: {
        value: number;
        change: number;
        changeLabel: string;
    };
    returnsValue: {
        value: number;
        change: number;
        changeLabel: string;
    };
}

export interface DashboardResponse {
    status: string;
    data: {
        stats: DashboardStatsData;
        pharmacies: PharmacyOption[];
        returnsValueTrend: ReturnsValueTrendItem[];
        period: DashboardPeriod;
        generatedAt: string;
    };
}

export type PeriodType = 'monthly' | 'yearly';

// Distributor Types
export interface Distributor {
    id: string;
    companyName: string;
    contactPerson: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    licenseNumber: string;
    status: 'active' | 'inactive';
    totalDeals?: number;
    specializations?: string[];
    createdAt?: string;
    uniqueProductsCount?: number;
}

export interface DistributorUpdatePayload {
    companyName?: string;
    contactPerson?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    licenseNumber?: string;
    specializations?: string[];
}

export interface DistributorStatusUpdatePayload {
    status: 'active' | 'inactive';
}

export interface DistributorCreatePayload {
    companyName: string;
    contactPerson: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    licenseNumber: string;
    specializations?: string[];
}

export interface DistributorsPagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export interface DistributorsFilters {
    search: string;
    status: 'all' | 'active' | 'inactive';
}

export interface DistributorsStats {
    totalDistributors: number;
    activeDistributors: number;
    inactiveDistributors: number;
    totalDeals: number;
}

export interface DistributorsResponse {
    status: string;
    data: {
        stats: DistributorsStats;
        distributors: Distributor[];
        pagination: DistributorsPagination;
        filters: DistributorsFilters;
        generatedAt?: string;
    };
}

// Distributor Products Types
export interface DistributorProduct {
    reportId: string;
    ndcCode: string;
    productName: string;
    manufacturer: string;
    creditAmount: number;
    pricePerUnit: number;
    quantity: number;
    fullUnits: number;
    partialUnits: number;
    lotNumber: string;
    expirationDate: string;
    packageSize: string;
    reportDate: string;
    fileName: string;
    pharmacyId: string;
}

export interface DistributorProductsResponse {
    status: string;
    data: {
        distributor: {
            id: string;
            name: string;
        };
        products: DistributorProduct[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
        generatedAt: string;
    };
}

// Analytics Types
export interface KeyMetric {
    value: number;
    change: number;
    changeLabel: string;
}

export interface KeyMetrics {
    totalReturnsValue: KeyMetric;
    totalReturns: KeyMetric;
    avgReturnValue: KeyMetric;
    activePharmacies: KeyMetric;
}

export interface ReturnsValueTrendItem {
    month: string;
    monthKey: string;
    totalValue: number;
    itemsCount: number;
}

export interface TopProduct {
    productName: string;
    totalValue: number;
    totalQuantity: number;
    returnCount: number;
}

export interface DistributorBreakdown {
    distributorId: string;
    distributorName: string;
    pharmaciesCount: number;
    totalReturns: number;
    avgReturnValue: number;
    totalValue: number;
}

export interface StateBreakdown {
    state: string;
    pharmacies: number;
    totalReturns: number;
    avgReturnValue: number;
    totalValue: number;
}

export interface AnalyticsCharts {
    returnsValueTrend: ReturnsValueTrendItem[];
    topProducts: TopProduct[];
}

export interface AnalyticsData {
    keyMetrics: KeyMetrics;
    charts: AnalyticsCharts;
    distributorBreakdown: DistributorBreakdown[];
    stateBreakdown: StateBreakdown[];
    generatedAt: string;
}

export interface AnalyticsResponse {
    status: string;
    data: AnalyticsData;
}

// Document Types
export interface Document {
    id: string;
    fileName: string;
    fileSize: number;
    fileType: string;
    fileUrl: string;
    source: string;
    status: string;
    uploadedAt: string;
    processedAt: string;
    extractedItems: number;
    totalCreditAmount: number;
    reportDate: string;
    pharmacyId: string;
    pharmacyName: string;
    pharmacyOwner: string;
    pharmacyEmail: string;
    reverseDistributorId: string;
    reverseDistributorName: string;
    reverseDistributorCode: string;
}

export interface DocumentsPagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export interface DocumentsFilters {
    search: string;
    pharmacyId: string;
}

export interface DocumentsStats {
    totalDocuments: number;
    totalFileSize: number;
    totalCreditAmount: number;
    byStatus: {
        completed: number;
        processing: number;
        failed: number;
    };
    bySource: {
        manual_upload: number;
        email_forward: number;
    };
    recentUploads: number;
}

export interface DocumentsResponse {
    status: string;
    data: {
        documents: Document[];
        pagination: DocumentsPagination;
        filters: DocumentsFilters;
        stats: DocumentsStats;
        generatedAt: string;
    };
}

// Admin Types
export interface Admin {
    id: string;
    name: string;
    email: string;
    role: 'super_admin' | 'manager' | 'reviewer' | 'support';
    status: 'active' | 'inactive';
    isActive: boolean;
    lastLoginAt?: string | null;
    createdAt: string;
    updatedAt: string;
    roleDisplay?: string;
}

export interface AdminsPagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export interface AdminsFilters {
    search: string;
    role: 'all' | 'super_admin' | 'manager' | 'reviewer' | 'support';
    status: 'all' | 'active' | 'inactive';
    sortBy: 'name' | 'email' | 'role' | 'created_at' | 'last_login_at';
    sortOrder: 'asc' | 'desc';
}

export interface AdminsStats {
    totalAdmins: number;
    activeAdmins: number;
    inactiveAdmins: number;
    superAdmins: number;
    managers: number;
    reviewers: number;
    support: number;
    byRole: {
        super_admin: number;
        manager: number;
        reviewer: number;
        support: number;
    };
}

export interface AdminsResponse {
    status: string;
    data: {
        admins: Admin[];
        pagination: AdminsPagination;
        stats: AdminsStats;
    };
}

export interface AdminCreatePayload {
    email: string;
    password: string;
    name: string;
    role: 'super_admin' | 'manager' | 'reviewer' | 'support';
}

export interface AdminUpdatePayload {
    name?: string;
    email?: string;
    role?: 'super_admin' | 'manager' | 'reviewer' | 'support';
    isActive?: boolean;
}

export interface AdminPasswordUpdatePayload {
    newPassword: string;
}

// ── Processors ──────────────────────────────────────────────

export interface Processor {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    status: 'active' | 'inactive';
    notes: string | null;
    assignedStoresCount: number;
    createdAt: string;
    updatedAt: string;
}

export interface AssignedStore {
    assignmentId: string;
    pharmacyId: string;
    businessName: string;
    storeNumber: string | null;
    city: string | null;
    state: string | null;
    serviceType: string | null;
    assignedDate: string;
}

export interface ProcessorsPagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export interface ProcessorsResponse {
    status: string;
    data: {
        processors: Processor[];
        pagination: ProcessorsPagination;
    };
}

export interface ProcessorCreatePayload {
    name: string;
    email: string;
    password: string;
    phone?: string;
    notes?: string;
}

export interface ProcessorUpdatePayload {
    name?: string;
    email?: string;
    phone?: string;
    status?: 'active' | 'inactive';
    notes?: string;
}

// ── Return Transactions ────────────────────────────────────

export interface ReturnTransaction {
    id: string;
    licensePlate: string;
    pharmacyId: string;
    pharmacyName: string | null;
    processorId: string | null;
    processorName: string | null;
    serviceType: string;
    status: 'in_progress' | 'paused' | 'completed' | 'finalized' | 'received' | 'closed_out';
    fedexTracking: string | null;
    fedexPickupConfirmation: string | null;
    totalItems: number;
    totalReturnableValue: number;
    totalNonReturnableValue: number;
    batchId: string | null;
    timeIn: string | null;
    timeOut: string | null;
    receivedInWarehouseDate: string | null;
    verifiedIntegrity: boolean;
    notes: string | null;
    finalizedAt: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface ReturnTransactionsPagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export interface ReturnTransactionsListResponse {
    status: string;
    data: {
        transactions: ReturnTransaction[];
        pagination: ReturnTransactionsPagination;
    };
}

export interface ReturnTransactionCreatePayload {
    pharmacyId: string;
    serviceType?: string;
    notes?: string;
    forceCreate?: boolean;
}

export interface ReturnTransactionUpdatePayload {
    fedexTracking?: string;
    fedexPickupConfirmation?: string;
    notes?: string;
    serviceType?: string;
}

export interface ProcessorMyStore {
    assignmentId: string;
    pharmacyId: string;
    businessName: string;
    storeNumber: string | null;
    city: string | null;
    state: string | null;
    address: string | null;
    serviceType: string | null;
    lastVisitDate: string | null;
    nextVisitDate: string | null;
    assignedDate: string;
}

// ── Return Transaction Items ───────────────────────────────

export interface ReturnTransactionItem {
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
    route: string | null;
    lotNumber: string | null;
    serialNumber: string | null;
    expirationDate: string | null;
    standardPrice: number | null;
    quantity: number;
    fullPackageSize: number | null;
    isPartial: boolean;
    partialPercentage: number | null;
    estimatedValue: number | null;
    returnStatus: 'returnable' | 'non_returnable' | 'tbd';
    nonReturnableReason: string | null;
    returnReason: string | null;
    destination: string | null;
    deaSchedule: string | null;
    deaForm222Required: boolean;
    productType: string | null;
    coStatus: string;
    bmpStatus: string;
    memo: string | null;
    wineCellarId: string | null;
    scanSource: string;
    createdAt: string;
    updatedAt: string;
}

export interface ReturnTransactionItemsListResponse {
    items: ReturnTransactionItem[];
    summary: {
        totalItems: number;
        totalReturnableValue: number;
        totalNonReturnableValue: number;
        totalValue: number;
    };
}

export interface AddItemPayload {
    ndc?: string;
    ndc10?: string;
    gtin?: string;
    proprietaryName?: string;
    genericName?: string;
    manufacturer?: string;
    packageDescription?: string;
    dosageForm?: string;
    strength?: string;
    route?: string;
    lotNumber?: string;
    serialNumber?: string;
    expirationDate?: string;
    standardPrice?: number;
    quantity?: number;
    fullPackageSize?: number;
    isPartial?: boolean;
    partialPercentage?: number;
    returnStatus?: string;
    nonReturnableReason?: string;
    returnReason?: string;
    destination?: string;
    deaSchedule?: string;
    deaForm222Required?: boolean;
    productType?: string;
    memo?: string;
    scanSource?: string;
    rawScanData?: string;
}

// ── Policy Engine (Module 5) ───────────────────────────────

export interface ManufacturerPolicy {
    id: string;
    labelerId: string;
    labelerType: 'generic' | 'brand';
    manufacturerName: string;
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
    averagePayPercent: number | null;
    averageDaysToPay: number | null;
    verifiedDate: string | null;
    createdAt: string;
    updatedAt: string;
    returnPolicies?: ReturnPolicyRecord[];
    destinations?: string[];
    exceptions?: NonReturnableProduct[];
    notes?: PolicyNote[];
}

export interface ReturnPolicyRecord {
    id: string;
    manufacturerPolicyId: string;
    destination: string;
    autoRaEmail: string | null;
    policyNumber: number | null;
    policyDescription: string | null;
    monthsBeforeExpiration: number | null;
    monthsAfterExpiration: number | null;
    discountRate: number | null;
    partialsAccepted: boolean;
    partialDosageForms: string[] | null;
    reimbursementType: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface NonReturnableProduct {
    id: string;
    manufacturerPolicyId: string;
    ndc: string;
    productName: string | null;
    reason: string | null;
    createdAt: string;
}

export interface PolicyNote {
    id: string;
    manufacturerPolicyId: string;
    noteDate: string;
    authorInitials: string | null;
    noteText: string;
    createdAt: string;
}

export interface ManufacturerPolicyCreatePayload {
    labelerId: string;
    manufacturerName: string;
    labelerType?: 'generic' | 'brand';
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

export interface ReturnPolicyCreatePayload {
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

export interface NonReturnableProductPayload {
    ndc: string;
    productName?: string;
    reason?: string;
}

export interface PolicyNotePayload {
    noteText: string;
    noteDate?: string;
    authorInitials?: string;
}

export interface ReturnabilityCheckResult {
    status: 'returnable' | 'non_returnable' | 'tbd';
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

export interface PoliciesListResponse {
    policies: ManufacturerPolicy[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

// ── Destruction Records (Module 6) ─────────────────────────

export interface DestructionRecord {
    id: string;
    pharmacyId: string;
    transactionItemId: string | null;
    ndc: string | null;
    productName: string | null;
    manufacturer: string | null;
    lotNumber: string | null;
    quantity: number;
    weightLbs: number | null;
    destructionReason: string;
    status: 'pending' | 'scheduled' | 'picked_up' | 'destroyed' | 'cancelled';
    federalFormNumber: string | null;
    destructionCompany: string | null;
    scheduledDate: string | null;
    pickedUpAt: string | null;
    destroyedAt: string | null;
    formUrl: string | null;
    notes: string | null;
    createdBy: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface DestructionStats {
    total: number;
    pending: number;
    scheduled: number;
    pickedUp: number;
    destroyed: number;
    cancelled: number;
}

export interface BarcodeScanResponse {
    scan: {
        gtin: string | null;
        lotNumber: string | null;
        serialNumber: string | null;
        expirationDate: string | null;
        ndc10: string | null;
        ndcCandidates: string[];
    };
    product: {
        ndc: string;
        proprietaryName: string | null;
        genericName: string | null;
        manufacturer: string | null;
        packageDescription: string | null;
        dosageForm: string | null;
        strength: string | null;
        route: string | null;
        deaSchedule: string | null;
        productType: string | null;
        source: string;
    } | null;
    autoFill: {
        ndc: string | null;
        ndc10: string | null;
        gtin: string | null;
        proprietaryName: string | null;
        genericName: string | null;
        manufacturer: string | null;
        packageDescription: string | null;
        dosageForm: string | null;
        strength: string | null;
        route: string | null;
        lotNumber: string | null;
        serialNumber: string | null;
        expirationDate: string | null;
        deaSchedule: string | null;
        productType: string | null;
        scanSource: string;
    };
}
