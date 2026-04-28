// Core types for the application - Data Analytics Platform

export type UserRole = 'pharmacy_admin' | 'pharmacy_staff' | 'admin'

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  pharmacyId?: string
  avatar?: string
}

// Pharmacy/Client Types
export interface Pharmacy {
  id: string
  pharmacyName: string
  npiNumber: string
  deaNumber: string
  contactName: string
  contactEmail: string
  contactPhone: string
  physicalAddress: Address
  billingAddress: Address
  status: 'pending' | 'active' | 'suspended'
  subscriptionTier: 'free' | 'basic' | 'premium' | 'enterprise'
  subscriptionStatus: 'active' | 'trial' | 'expired' | 'cancelled'
  createdAt: string
  trialEndsAt?: string
}

// Legacy - keeping for backward compatibility
export interface Client extends Pharmacy {}

export interface Address {
  street: string
  city: string
  state: string
  zipCode: string
}

export type ReturnStatus = 'draft' | 'ready_to_ship' | 'in_transit' | 'processing' | 'completed' | 'cancelled'

export interface ReturnItem {
  id: string
  ndc: string
  drugName: string
  manufacturer: string
  lotNumber: string
  expirationDate: string
  quantity: number
  unit: string
  reason: string
  estimatedCredit: number
  classification?: 'returnable' | 'destruction' | 'pending'
  photos?: string[]
}

export interface Return {
  id: string
  clientId: string
  clientName: string
  createdAt: string
  updatedAt: string
  status: ReturnStatus
  items: ReturnItem[]
  totalEstimatedCredit: number
  shipmentId?: string
  notes?: string
}

export type ShipmentStatus = 'label_created' | 'picked_up' | 'in_transit' | 'delivered' | 'exception'

export interface ShipmentEvent {
  timestamp: string
  location: string
  status: string
  description: string
}

export interface Shipment {
  id: string
  returnId: string
  trackingNumber: string
  carrier: 'UPS' | 'FedEx' | 'USPS'
  serviceLevel: string
  status: ShipmentStatus
  createdAt: string
  estimatedDelivery?: string
  actualDelivery?: string
  events: ShipmentEvent[]
}

export interface Credit {
  id: string
  returnId: string
  itemId: string
  drugName: string
  manufacturer: string
  expectedAmount: number
  actualAmount?: number
  variance?: number
  expectedPaymentDate: string
  actualPaymentDate?: string
  status: 'expected' | 'received' | 'overdue' | 'disputed'
}

export interface ManufacturerCredit {
  manufacturerName: string
  creditAmount: number
  isControlledSubstance: boolean
  notes?: string | null
}

export interface ManufacturerCredits {
  included: ManufacturerCredit[]
  direct: ManufacturerCredit[]
  por: ManufacturerCredit[]
}

export interface PharmacyPayment {
  id: string
  pharmacyId: string
  pharmacyName: string
  batchId: string | null
  batchName: string | null
  batchMonth: string | null
  totalCreditReceived: number
  companyFee: number
  companyFeePercent: number
  gpoShare: number
  gpoName: string | null
  pharmacyPayout: number
  paymentMethod: string | null
  paymentReference: string | null
  paidAt: string | null
  status: 'pending' | 'processing' | 'paid' | 'failed' | 'disputed'
  notes: string | null
  createdBy: string | null
  createdAt: string
  updatedAt: string
  // New check-specific fields
  paymentType?: 'ocs' | 'por' | 'direct'
  checkNumber?: string | null
  returnReferenceNumber?: string | null
  pharmacyAccountNumber?: string | null
  serviceDate?: string | null
  checkDate?: string | null
  grossCreditAmount?: number
  includedCreditAmount?: number
  directCreditAmount?: number
  porCreditAmount?: number
  rsiFeeIncludedPercent?: number
  rsiFeeDirectPercent?: number
  isLegacy?: boolean
  manufacturerCredits?: ManufacturerCredits
}

export interface PharmacyPaymentSummary {
  totalCredits: number
  totalFees: number
  totalPayout: number
  paidPayouts: number
  pendingPayouts: number
  totalPayments: number
  paidCount: number
  pendingCount: number
}

export type ListingStatus = 'active' | 'sold' | 'expired' | 'pending_approval'

export interface MarketplaceListing {
  id: string
  sellerId: string
  sellerName: string
  sellerRating: number
  ndc: string
  drugName: string
  strength: string
  manufacturer: string
  lotNumber: string
  expirationDate: string
  quantity: number
  unit: string
  pricePerUnit: number
  wacPrice: number
  condition: string
  photos: string[]
  status: ListingStatus
  createdAt: string
  location: {
    city: string
    state: string
  }
  visibility: 'public' | 'private'
}

export type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled'

export interface Order {
  id: string
  listingId: string
  buyerId: string
  sellerId: string
  buyerName: string
  sellerName: string
  drugName: string
  quantity: number
  totalAmount: number
  status: OrderStatus
  createdAt: string
  confirmedAt?: string
  shippedAt?: string
  deliveredAt?: string
  trackingNumber?: string
}

// Legacy Notification interface - removed, using new one below

export interface InventoryItem {
  id: string
  ndc: string
  productName: string
  lotNumber: string
  expirationDate: string
  quantity: number
  location: string
  addedDate: string
  daysUntilExpiration: number
  status: 'active' | 'expiring_soon' | 'expired'
  boxes?: number
  tabletsPerBox?: number
  product?: {
    ndc: string
    proprietaryName?: string
    nonProprietaryName?: string
    manufacturer?: string
    manufacturerName?: string
    wac?: number
    strength?: string
    dosageForm?: string
    packageUnit?: string
  }
}

export type ReceivingStatus = 'pending' | 'received' | 'inspected' | 'classified' | 'completed'

export interface WarehouseReceiving {
  id: string
  returnId: string
  shipmentId: string
  receivedDate: string
  receivedBy: string
  status: ReceivingStatus
  packages: Package[]
  totalItems: number
  refundableItems: number
  nonRefundableItems: number
  notes?: string
}

export interface Package {
  id: string
  packageNumber: string
  items: ReturnItem[]
  condition: 'good' | 'damaged' | 'opened'
  receivedDate: string
  inspectedBy: string
}

export interface Distributor {
  id: string
  name: string
  contactPerson?: string
  email?: string
  phone?: string
  address?: string
}

export interface SupplierPayment {
  id: string
  supplierId: string
  supplierName: string
  distributorId?: string
  distributor?: Distributor
  orderId: string
  returnId: string
  paymentDate: string
  totalAmount: number
  items: PaymentItem[]
  status: 'pending' | 'partial' | 'completed' | 'disputed'
  paymentMethod: string
  transactionId?: string
  notes?: string
  commission?: {
    rate: number // Commission percentage (e.g., 5 for 5%)
    amount: number // Commission amount in dollars
    netAmount: number // Amount after commission
  }
}

export interface PaymentItem {
  id: string
  itemId: string
  ndc: string
  productName: string
  lotNumber: string
  quantity: number
  expectedAmount: number
  actualAmount: number
  variance: number
  packageId?: string
  paymentDate: string
  distributorId?: string
  distributor?: Distributor
  commission?: {
    rate: number
    amount: number
    netAmount: number
  }
}

export interface ExpectedReturn {
  ndc: string
  productName: string
  quantity: number
  wacPrice: number
  creditPercentage: number
  expectedCredit: number
  estimatedPaymentDate: string
  supplier?: string
}

// Package Management Types
export type PackageStatus = 'draft' | 'ready_to_ship' | 'in_transit' | 'received' | 'inspected' | 'processed' | 'completed'

export interface ExpiredMedicationPackage {
  id: string
  packageNumber: string
  clientId: string
  clientName: string
  createdAt: string
  updatedAt: string
  status: PackageStatus
  items: PackageItem[]
  totalItems: number
  totalEstimatedValue: number
  shipmentId?: string
  trackingNumber?: string
  carrier?: 'UPS' | 'FedEx' | 'USPS'
  notes?: string
  createdBy: string
}

export interface PackageItem {
  id: string
  inventoryItemId: string
  ndc: string
  drugName: string
  manufacturer: string
  lotNumber: string
  expirationDate: string
  quantity: number
  unit: string
  reason: 'expired' | 'expiring_soon' | 'damaged' | 'recalled' | 'other'
  estimatedCredit?: number
  classification?: 'returnable' | 'destruction' | 'pending'
}

// Warehouse Order Types
export type WarehouseOrderStatus = 'pending' | 'received' | 'inspecting' | 'classifying' | 'processing' | 'completed' | 'exception'

export interface WarehouseOrder {
  id: string
  orderNumber: string
  packageId: string
  returnId?: string
  clientId: string
  clientName: string
  createdAt: string
  receivedAt?: string
  completedAt?: string
  status: WarehouseOrderStatus
  packages: WarehousePackage[]
  totalItems: number
  refundableItems: number
  nonRefundableItems: number
  totalEstimatedCredit: number
  actualCredit?: number
  variance?: number
  receivedBy?: string
  inspectedBy?: string
  processedBy?: string
  notes?: string
  timeline: WarehouseOrderEvent[]
  qualityChecks: QualityCheck[]
  complianceChecks: ComplianceCheck[]
}

export interface WarehousePackage {
  id: string
  packageNumber: string
  items: ReturnItem[]
  condition: 'good' | 'damaged' | 'opened' | 'sealed'
  receivedDate: string
  inspectedDate?: string
  inspectedBy?: string
  weight?: number
  dimensions?: {
    length: number
    width: number
    height: number
  }
  photos?: string[]
  notes?: string
}

export interface WarehouseOrderEvent {
  id: string
  timestamp: string
  type: 'received' | 'inspected' | 'classified' | 'processed' | 'completed' | 'exception'
  performedBy: string
  description: string
  metadata?: Record<string, any>
}

export interface QualityCheck {
  id: string
  checkType: 'temperature' | 'integrity' | 'labeling' | 'expiration' | 'quantity' | 'other'
  status: 'pass' | 'fail' | 'warning'
  performedBy: string
  performedAt: string
  notes?: string
  photos?: string[]
}

export interface ComplianceCheck {
  id: string
  checkType: 'dea_compliance' | 'fda_compliance' | 'state_regulations' | 'documentation' | 'other'
  status: 'pass' | 'fail' | 'warning'
  performedBy: string
  performedAt: string
  notes?: string
  reference?: string
}

// ============================================
// NEW DATA ANALYTICS PLATFORM TYPES
// ============================================

// Reverse Distributor Types
export interface ReverseDistributor {
  id: string
  name: string
  code: string
  contactEmail?: string
  contactPhone?: string
  address?: Address
  portalUrl?: string
  supportedFormats: string[] // PDF formats they use
  isActive: boolean
  createdAt: string
}

// Document Upload Types
export type DocumentStatus = 'uploading' | 'processing' | 'completed' | 'failed' | 'needs_review'
export type DocumentSource = 'manual_upload' | 'email_forward' | 'portal_fetch' | 'api'

export interface UploadedDocument {
  id: string
  pharmacyId: string
  fileName: string
  fileSize: number
  fileType: string
  fileUrl?: string
  reverseDistributorId: string
  reverseDistributorName: string
  source: DocumentSource
  status: DocumentStatus
  uploadedAt: string
  processedAt?: string
  errorMessage?: string
  extractedItems: number
  totalCreditAmount?: number
  processingProgress?: number
}

// Pricing Data Types
export interface PricingData {
  id: string
  pharmacyId: string
  reverseDistributorId: string
  reverseDistributorName: string
  ndc: string
  productName: string
  manufacturer: string
  lotNumber: string
  expirationDate: string
  quantity: number
  creditAmount: number
  pricePerUnit: number // Calculated: creditAmount / quantity
  documentId: string
  paymentDate: string
  createdAt: string
}

// Product/NDC Types
export interface Product {
  id: string
  ndc: string
  productName: string
  manufacturer: string
  strength?: string
  dosageForm?: string
  packageSize?: number
  wac?: number
  awp?: number
}

export interface ProductList {
  id: string
  pharmacyId: string
  name: string
  products: ProductListItem[]
  createdAt: string
  updatedAt: string
}

export interface ProductListItem {
  id: string
  ndc: string
  productName: string
  quantity: number
  lotNumber?: string
  expirationDate?: string
  notes?: string
  addedAt: string
  addedBy: string
}

// Analytics & Recommendations
export interface PriceComparison {
  ndc: string
  productName: string
  manufacturer: string
  distributorPrices: {
    distributorId: string
    distributorName: string
    averagePricePerUnit: number
    minPrice: number
    maxPrice: number
    dataPoints: number
    lastUpdated: string
  }[]
  bestDistributor: {
    distributorId: string
    distributorName: string
    pricePerUnit: number
    savings: number
  }
  recommendation: string
}

export interface OptimizationRecommendation {
  id: string
  pharmacyId: string
  productListId?: string
  recommendations: {
    ndc: string
    productName: string
    recommendedDistributor: string
    expectedPrice: number
    alternativeDistributors: {
      name: string
      price: number
      difference: number
    }[]
    savings: number
  }[]
  totalPotentialSavings: number
  generatedAt: string
}

// Analytics Dashboard Data
export interface AnalyticsSummary {
  totalDocuments: number
  totalDistributors: number
  totalNDCs: number
  totalDataPoints: number
  averagePriceVariance: number
  potentialSavings: number
  documentsThisMonth: number
  lastUploadDate?: string
}

// Subscription Types
export type SubscriptionPlan = 'free' | 'basic' | 'premium' | 'enterprise'
export type SubscriptionStatus = 'active' | 'trial' | 'expired' | 'cancelled' | 'past_due'

export interface Subscription {
  id: string
  pharmacyId: string
  plan: SubscriptionPlan
  status: SubscriptionStatus
  currentPeriodStart: string
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
  paymentMethod?: {
    type: 'card'
    last4: string
    brand: string
    expiryMonth: number
    expiryYear: number
  }
  price: number
  billingInterval: 'monthly' | 'yearly'
}

export interface SubscriptionPlanDetails {
  id: SubscriptionPlan
  name: string
  price: number
  features: string[]
  maxDocuments: number | 'unlimited'
  maxDistributors: number | 'unlimited'
  analyticsFeatures: string[]
  supportLevel: 'email' | 'priority' | 'dedicated'
}

// Email Integration
export interface EmailIntegration {
  id: string
  pharmacyId: string
  email: string
  isActive: boolean
  forwardingAddress?: string
  lastSyncAt?: string
  createdAt: string
}

// Portal Credentials
export interface PortalCredential {
  id: string
  pharmacyId: string
  reverseDistributorId: string
  reverseDistributorName: string
  username: string
  password: string // Encrypted in production
  isActive: boolean
  lastSyncAt?: string
  lastError?: string
  createdAt: string
}

// Notification Types (updated)
export type NotificationType = 'document_processed' | 'price_alert' | 'subscription' | 'system' | 'recommendation_ready' | 'credit_received' | 'shipment_update' | 'order_status'

export interface Notification {
  id: string
  userId: string
  type: NotificationType
  title: string
  message: string
  read: boolean
  createdAt: string
  actionUrl?: string
}
