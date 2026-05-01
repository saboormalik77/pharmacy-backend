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
    // Optional fields
    fax?: string;
    deaNumber?: string;
    deaExpiration?: string;
    wholesaler?: string;
    wholesalerAccount?: string;
    secondaryWholesaler?: string;
    serviceType?: string;
    daysBetweenVisits?: number;
    lastVisitDate?: string;
    nextVisitDate?: string;
    stateLicenseNumber?: string;
    licenseExpiryDate?: string;
    npiNumber?: string;
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
    fax?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    licenseNumber?: string;
    stateLicenseNumber?: string;
    licenseExpiryDate?: string;
    npiNumber?: string;
    deaNumber?: string;
    deaExpiration?: string;
    wholesaler?: string;
    wholesalerAccount?: string;
    secondaryWholesaler?: string;
    serviceType?: string;
    daysBetweenVisits?: number;
    lastVisitDate?: string;
    nextVisitDate?: string;
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
    totalReturns: {
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

export interface AnalyticsScope {
    buyingGroupId: string | null;
    isGlobal: boolean;
}

export interface AnalyticsData {
    keyMetrics: KeyMetrics;
    charts: AnalyticsCharts;
    distributorBreakdown: DistributorBreakdown[];
    stateBreakdown: StateBreakdown[];
    scope?: AnalyticsScope;
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
    permissions?: string[];
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
    permissions?: string[];
}

export interface AdminUpdatePayload {
    name?: string;
    email?: string;
    role?: 'super_admin' | 'manager' | 'reviewer' | 'support';
    isActive?: boolean;
    permissions?: string[];
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
    totalReturns: number;
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
    /** Enriched from pharmacy row (processor my-stores parity) */
    storeNumber?: string | null;
    pharmacyStreetAddress?: string | null;
    pharmacyCity?: string | null;
    pharmacyState?: string | null;
    pharmacyLastVisitDate?: string | null;
    processorId: string | null;
    processorName: string | null;
    serviceType: string;
    status: 'in_progress' | 'paused' | 'completed' | 'finalized' | 'received' | 'verified' | 'closed' | 'closed_out';
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
    boxCount: number | null;
    manifestGeneratedAt: string | null;
    prpNumber: string | null;
    packageTracking: Record<string, string> | null;
    scannedPackages: Record<string, string> | null;
    fedexShipmentId: string | null;
    fedexLabels: Record<string, string> | null;
    finalizeSteps: { printManifest: boolean; fedexEntered: boolean; printJobSheets: boolean } | null;
    verifiedAt: string | null;
    verifiedBy: string | null;
    /** Set when v2 start-verification runs (box count) or legacy verify */
    piecesReceived: number | null;
    /** FCR-47: set when warehouse v2 verification is finished */
    verificationCompletedAt?: string | null;
    /** FCR-49: derived in _rt_to_json for warehouse verification UI tabs */
    verificationStatus?: 'not_started' | 'in_progress' | 'completed' | null;
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
    fullPackageQtyReturned: number | null;
    isPartial: boolean;
    partialPercentage: number | null;
    estimatedValue: number | null;
    estimatedStorePrice: number | null;
    estimatedStoreValue: number | null;
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
    verified: boolean;
    actualQuantity: number | null;
    conditionNotes: string | null;
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
    fullPackageQtyReturned?: number;
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
    /** When false, items inside the stated date window are still non-returnable */
    returnableWithinPolicyPeriod: boolean;
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
    returnableWithinPolicyPeriod?: boolean;
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
    returnableWithinPolicyPeriod: boolean | null;
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
        fullPackageSize: number | null;
        source: string;
    } | null;
    pricing: {
        suggestedPrice: number | null;
        bestFullPrice: number | null;
        bestPartialPrice: number | null;
        priceSource: string | null;
        distributorPricing: {
            distributorName: string;
            fullPrice: number;
            partialPrice: number;
            reportDate: string | null;
        }[] | null;
    };
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
        fullPackageSize: number | null;
        standardPrice: number | null;
        scanSource: string;
    };
}

// ── Wine Cellar (Module 7) ─────────────────────────────────

export interface WineCellarItem {
    id: string;
    pharmacyId: string;
    pharmacyName: string | null;
    transactionItemId: string | null;
    /** Shelved from add-items without a return line (FCR 42) */
    sourceReturnTransactionId?: string | null;
    ndc: string | null;
    ndc10: string | null;
    productName: string | null;
    manufacturer: string | null;
    lotNumber: string | null;
    serialNumber: string | null;
    expirationDate: string | null;
    quantity: number;
    standardPrice: number | null;
    estimatedValue: number | null;
    estimatedStorePrice: number | null;
    estimatedStoreValue: number | null;
    isPartial: boolean;
    partialPercentage: number | null;
    dateShelved: string;
    expectedReturnableDate: string | null;
    physicalLocation: string | null;
    baggieBarcode: string | null;
    status: 'shelved' | 'ready_to_return' | 'returned' | 'destroyed';
    returnedInTransactionId: string | null;
    returnedAt: string | null;
    notes: string | null;
    createdBy: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface WineCellarStats {
    totalItems: number;
    shelved: number;
    readyToReturn: number;
    returned: number;
    destroyed: number;
    totalValue: number;
}

export interface WineCellarListResponse {
    items: WineCellarItem[];
    summary: {
        totalItems: number;
        totalShelved: number;
        totalReady: number;
        totalValue: number;
    };
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface WineCellarSurfaceResult {
    surfacedCount: number;
    items: WineCellarItem[];
}

// ── Warehouse Receiving (Module 9) ──────────────────────────

export interface WarehouseDiscrepancy {
    id: string;
    transactionId: string;
    itemId: string | null;
    type: 'missing' | 'extra' | 'damaged' | 'wrong_store' | 'other';
    ndc: string | null;
    productName: string | null;
    expectedQuantity: number | null;
    actualQuantity: number | null;
    notes: string | null;
    status: 'open' | 'resolved' | 'dismissed';
    reportedBy: string | null;
    resolvedBy: string | null;
    resolvedAt: string | null;
    resolutionNotes: string | null;
    createdAt: string;
}

export interface VerificationSummary {
    transaction: ReturnTransaction;
    items: ReturnTransactionItem[];
    surplus: SurplusItem[];
    discrepancies: WarehouseDiscrepancy[];
    counts: {
        totalItems: number;
        correct: number;
        damaged: number;
        missing: number;
        wrongItem: number;
        unverified: number;
        surplus: number;
    };
    discrepancyCounts: {
        total: number;
        open: number;
    };
}

export interface SurplusItem {
    id: string;
    returnTransactionId: string;
    ndc?: string;
    productName?: string;
    manufacturer?: string;
    lotNumber?: string;
    expirationDate?: string;
    quantity: number;
    warehouseLocation: string;
    condition: 'good' | 'damaged' | 'unknown';
    status: 'stored' | 'assigned_to_return' | 'disposed' | 'other';
    notes?: string;
    discrepancyId?: string;
    createdAt: string;
    updatedAt: string;
    // Populated from return transaction
    licensePlate?: string;
    pharmacyName?: string;
}

export interface VerificationV2Counts {
    totalItems: number;
    correct: number;
    damaged: number;
    missing: number;
    wrongItem: number;
    unverified: number;
    surplus: number;
}

export interface VerificationV2Item {
    id: string;
    ndc: string;
    proprietaryName: string;
    genericName: string;
    manufacturer: string;
    lotNumber: string;
    serialNumber: string | null;
    expirationDate: string;
    quantity: number;
    actualQuantity: number | null;
    verified: boolean;
    verificationStatus: 'correct' | 'damaged' | 'missing' | 'wrong_item' | null;
    conditionNotes: string | null;
    returnStatus: string;
    destination?: string | null;
    wineCellarId?: string | null;
    nonReturnableReason?: string | null;
    dosageForm?: string | null;
    isPartial?: boolean;
    estimatedValue: number;
}

export interface WarehouseSurplusItem {
    id: string;
    transactionId: string;
    ndc: string | null;
    productName: string | null;
    manufacturer: string | null;
    lotNumber: string | null;
    expirationDate: string | null;
    quantity: number;
    warehouseLocation: string;
    condition: 'good' | 'damaged' | 'unknown';
    status: 'stored' | 'assigned_to_return' | 'disposed';
    notes: string | null;
    discrepancyId: string | null;
    licensePlate?: string;
    pharmacyName?: string;
    createdAt: string;
}

export interface VerificationV2Summary {
    transaction: ReturnTransaction;
    items: VerificationV2Item[];
    counts: VerificationV2Counts;
    surplus: WarehouseSurplusItem[];
    discrepancies: WarehouseDiscrepancy[];
    discrepancyCounts: { total: number; open: number };
}

export interface StartVerificationResult {
    transaction: ReturnTransaction;
    expectedBoxes: number;
    receivedBoxes: number;
    boxCountMatch: boolean;
    totalItems: number;
}

export interface CompleteVerificationSummary {
    totalItems: number;
    correctItems: number;
    damagedItems: number;
    missingItems: number;
    wrongItems: number;
    surplusItems: number;
    openDiscrepancies: number;
    correctItemsValue: number;
    allItemsIntact: boolean;
    /** FCR-50: how many items were set to non_returnable because they aren't correct */
    excludedFromBatch?: number;
}

// ── Monthly Batch & Close-Out (Module 10) ────────────────────

export interface ReturnBatch {
    id: string;
    batchMonth: string;
    batchName: string;
    status: 'open' | 'closed' | 'submitted';
    totalReturns: number;
    totalDebitMemos: number;
    totalValue: number;
    cardinalFileGenerated: boolean;
    cardinalFileUrl: string | null;
    cardinalSubmittedAt: string | null;
    cardinalApprovedAt: string | null;
    closedAt: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface DebitMemo {
    id: string;
    batchId: string;
    pharmacyId: string;
    pharmacyName: string;
    memoNumber: string;
    destination: string | null;
    labelerId: string | null;
    labelerName: string | null;
    totalItems: number;
    totalAskValue: number;
    totalReceivedValue: number;
    raNumber: string | null;
    raRequestedAt: string | null;
    raReceivedAt: string | null;
    raStatus: 'pending' | 'requested' | 'received' | 'shipped' | 'overdue';
    ticklerDate: string | null;
    baggieManifest: string | null;
    outboundTracking: string | null;
    shippedAt: string | null;
    fedexLabels: Record<string, string> | null;
    paymentStatus: 'pending' | 'partial' | 'paid' | 'disputed';
    amountRequested: number;
    amountReceived: number;
    paymentReceivedAt: string | null;
    paymentReference: string | null;
    paymentNotes: string | null;
    creditMemoUrl: string | null;
    shipmentGroupId: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface DebitMemoItem {
    id: string;
    debitMemoId: string;
    transactionItemId: string | null;
    ndc: string | null;
    productName: string | null;
    quantity: number;
    askPrice: number | null;
    receivedPrice: number | null;
    lotNumber: string | null;
    expirationDate: string | null;
    createdAt: string;
}

// ── Shipment Groups (Module 39) ──────────────────────────────

export interface ShipmentGroup {
    id: string;
    destination: string;
    outboundTracking: string | null;
    shippedAt: string | null;
    boxCount: number;
    totalMemos: number;
    fedexShipmentId: string | null;
    fedexLabels: any | null;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface CreateShipmentGroupRequest {
    memoIds: string[];
    boxCount?: number;
    notes?: string;
}

export interface ShipGroupRequest {
    outboundTracking: string;
    shippedAt?: string;
    fedexShipmentId?: string;
    fedexLabels?: any;
}

// ── RA Request & Tracking (Module 11) ────────────────────────

export interface RARequest {
    id: string;
    debitMemoId: string;
    requestType: 'initial' | 'reminder' | 'resend';
    destinationEmail: string | null;
    destinationName: string | null;
    subject: string | null;
    bodyPreview: string | null;
    status: 'sent' | 'failed' | 'bounced';
    sentBy: string | null;
    sentAt: string;
    errorMessage: string | null;
    createdAt: string;
}

export interface RAEmailTemplate {
    to: string | null;
    toName: string | null;
    subject: string;
    body: string;
    memoNumber: string;
    pharmacyName: string;
    destination: string | null;
    labelerName: string | null;
    totalItems: number;
    totalAskValue: number;
    items?: Array<{
        ndc: string | null;
        productName: string | null;
        quantity: number;
        askPrice: number | null;
        lotNumber: string | null;
        expirationDate: string | null;
    }>;
}

export interface RATrackingSummary {
    pending: number;
    requested: number;
    received: number;
    shipped: number;
    overdue: number;
}

// ── Manufacturer Payment Tracking (Module 12) ────────────────

export interface UnpaidSummary {
    totalUnpaid: number;
    totalOutstanding: number;
}

/** Ask vs received row — payment tracking + reporting analytics share this shape (fields vary by endpoint). */
export interface AskVsReceivedRow {
    labelerId?: string | null;
    labelerName?: string;
    ndc?: string;
    productName?: string;
    destination?: string;
    memoCount?: number;
    totalItems?: number;
    totalQty?: number;
    /** Payment tracking / unpaid hub */
    totalAskValue?: number;
    /** Reporting analytics API (`/analytics/ask-vs-received` style) */
    totalAsk?: number;
    totalReceived: number;
    difference: number;
    payPercent: number;
    paidCount?: number;
    unpaidCount?: number;
    paidMemos?: number;
    unpaidMemos?: number;
    period?: string;
}

export interface ManufacturerPaymentSummary {
    labelerId: string | null;
    labelerName: string;
    totalMemos: number;
    unpaidMemos: number;
    paidMemos: number;
    disputedMemos: number;
    totalAskValue: number;
    totalPaidAmount: number;
    outstandingAmount: number;
    averagePayPercent: number;
    averageDaysToPay: number;
    policyAvgPayPercent: number | null;
    policyAvgDaysToPay: number | null;
}

// ============================================================
// Module 14: Reporting & Analytics Types
// ============================================================

export interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

// Returns Summary
export interface ReturnsSummaryOverall {
    totalReturns: number;
    totalReturnableValue: number;
    totalNonReturnableValue: number;
    totalItems: number;
    avgItemsPerReturn: number;
    avgReturnValue: number;
    uniquePharmacies: number;
}

export interface ReturnsByStatus {
    status: string;
    count: number;
    totalReturnableValue: number;
}

export interface ReturnsTrendItem {
    period?: string;
    periodKey?: string;
    returns: number;
    totalValue: number;
    totalItems: number;
    serviceType?: string;
}

export interface ReturnsSummaryData {
    periodStart: string;
    periodEnd: string;
    groupBy: string;
    overall: ReturnsSummaryOverall;
    byStatus: ReturnsByStatus[];
    trend: ReturnsTrendItem[];
}

export interface AskVsReceivedTotals {
    totalMemos: number;
    totalAskValue: number;
    totalReceived: number;
    totalDifference: number;
    overallPayPercent: number;
}

export interface AskVsReceivedResponse {
    data: AskVsReceivedRow[];
    totals: AskVsReceivedTotals;
    pagination: Pagination;
}

// Aging Inventory
export interface AgingBucket {
    count: number;
    value: number;
}

export interface AgingInventoryItem {
    id: string;
    pharmacyId: string;
    pharmacyName: string;
    ndc: string;
    productName: string;
    manufacturer: string;
    lotNumber: string;
    expirationDate: string;
    quantity: number;
    estimatedValue: number;
    dateShelved: string;
    expectedReturnableDate: string;
    status: string;
    daysShelved: number;
    physicalLocation: string;
    baggieBarcode: string;
}

export interface AgingInventorySummary {
    totalItems: number;
    totalValue: number;
    shelvedCount: number;
    readyCount: number;
    returnedCount: number;
    destroyedCount: number;
    avgDaysShelved: number;
}

export interface AgingInventoryBuckets {
    under30Days: AgingBucket;
    days30to90: AgingBucket;
    days91to180: AgingBucket;
    over180Days: AgingBucket;
}

export interface AgingInventoryResponse {
    data: AgingInventoryItem[];
    summary: AgingInventorySummary;
    agingBuckets: AgingInventoryBuckets;
    pagination: Pagination;
}

// Outstanding RA
export interface OutstandingRaItem {
    id: string;
    memoNumber: string;
    labelerName: string;
    labelerId: string;
    destination: string;
    pharmacyName: string;
    totalItems: number;
    amountRequested: number;
    raRequestedAt: string;
    ticklerDate: string;
    daysWaiting: number;
    batchName: string;
}

export interface OutstandingRaSummary {
    totalOutstanding: number;
    totalAskValue: number;
    avgDaysWaiting: number;
    oldestRequest: string;
}

export interface OutstandingRaBuckets {
    under30Days: AgingBucket;
    days30to60: AgingBucket;
    days61to120: AgingBucket;
    over120Days: AgingBucket;
}

export interface OutstandingRaResponse {
    data: OutstandingRaItem[];
    summary: OutstandingRaSummary;
    agingBuckets: OutstandingRaBuckets;
    pagination: Pagination;
}

// Unpaid Memos
export interface UnpaidMemoItem {
    id: string;
    memoNumber: string;
    labelerName: string;
    labelerId: string;
    destination: string;
    pharmacyName: string;
    totalItems: number;
    amountRequested: number;
    amountReceived: number;
    outstandingAmount: number;
    paymentStatus: string;
    daysOutstanding: number;
    batchName: string;
    raNumber: string;
}

export interface UnpaidMemosSummary {
    totalUnpaidMemos: number;
    totalAmountRequested: number;
    totalAmountReceived: number;
    totalOutstanding: number;
    avgDaysOutstanding: number;
}

export interface UnpaidMemosBuckets {
    under30Days: { count: number; outstanding: number };
    days30to90: { count: number; outstanding: number };
    days91to180: { count: number; outstanding: number };
    days181to365: { count: number; outstanding: number };
    over365Days: { count: number; outstanding: number };
}

export interface UnpaidMemosResponse {
    data: UnpaidMemoItem[];
    summary: UnpaidMemosSummary;
    agingBuckets: UnpaidMemosBuckets;
    pagination: Pagination;
}

// Price Audit
export interface PriceAuditItem {
    id: string;
    ndc: string;
    oldPrice: number | null;
    newPrice: number;
    priceChange: number | null;
    changePercent: number | null;
    priceSource: string;
    changedBy: string;
    changedAt: string;
}

export interface PriceAuditSummary {
    totalChanges: number;
    uniqueNdcs: number;
    uniqueSources: number;
    avgPriceIncrease: number;
}

export interface PriceAuditResponse {
    data: PriceAuditItem[];
    summary: PriceAuditSummary;
    pagination: Pagination;
}

// Pharmacy Performance
export interface PharmacyPerformanceItem {
    pharmacyId: string;
    pharmacyName: string;
    storeNumber: string;
    gpoAffiliation: string;
    serviceType: string;
    totalReturns: number;
    totalItems: number;
    totalReturnableValue: number;
    totalNonReturnableValue: number;
    avgReturnValue: number;
    totalPayout: number;
    pendingPayout: number;
    lastReturnDate: string;
    firstReturnDate: string;
}

export interface PharmacyPerformanceOverall {
    totalPharmacies: number;
    totalReturns: number;
    totalReturnableValue: number;
    totalItems: number;
    totalPayout: number;
}

export interface PharmacyPerformanceResponse {
    data: PharmacyPerformanceItem[];
    overall: PharmacyPerformanceOverall;
    pagination: Pagination;
}

// GPO Summary
export interface GpoSummaryItem {
    gpoName: string;
    pharmacyCount: number;
    totalReturns: number;
    totalItems: number;
    totalReturnableValue: number;
    avgReturnValue: number;
    totalPayout: number;
    totalGpoShare: number;
}

export interface GpoSummaryResponse {
    data: GpoSummaryItem[];
    pagination: Pagination;
}

// NDC Pricing Book
export interface NDCPricingRecord {
    id: string;
    ndc: string;
    ndcNormalized: string;
    productName: string | null; // Optional: for display purposes only
    currentPrice: number | null;
    lastPrice: number | null;
    estimatedStorePrice: number | null;
    lastReimbursement: number | null;
    priceSource: string | null;
    closeOutDestination: string | null;
    lastPriceUpdate: string | null;
    createdBy: string | null;
    updatedBy: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface NDCPricingUpsertPayload {
    ndc: string;
    productName?: string; // Optional: for display purposes only
    currentPrice?: number;
    estimatedStorePrice?: number;
    lastReimbursement?: number;
    priceSource?: string;
    closeOutDestination?: string;
}

export interface NDCPricingSearchResponse {
    items: NDCPricingRecord[];
    pagination: Pagination;
}
