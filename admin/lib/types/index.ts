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
