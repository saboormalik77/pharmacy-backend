/**
 * API Services Index
 * Central export for all API services
 */

export { authService } from './authService';
export { inventoryService } from './inventoryService';
export { returnsService } from './returnsService';
export { productsService } from './productsService';
export { productListsService } from './productListsService';
export { dashboardService } from './dashboardService';
export { creditsService } from './creditsService';
export { documentsService } from './documentsService';
export { optimizationService } from './optimizationService';
export { packagesService } from './packagesService';
export { distributorsService } from './distributorsService';
export { settingsService } from './settingsService';
export { marketplaceService } from './marketplaceService';
export { 
  getSubscriptionPlans,
  getSubscriptionPlanById,
  getSubscription,
  createCheckoutSession,
  createPortalSession,
  cancelSubscription,
  reactivateSubscription,
  changeSubscriptionPlan,
} from './subscriptionService';

// Re-export types
export type { SignupData, SigninData, AuthResponse } from './authService';
export type { CreateInventoryItemRequest, UpdateInventoryItemRequest, InventoryFilters, InventoryMetrics } from './inventoryService';
export type { CreateReturnRequest, UpdateReturnRequest, ReturnsFilters } from './returnsService';
export type { ValidateNDCResponse, CreateProductRequest } from './productsService';
export type { ProductList, ProductListItem } from './productListsService';
export type { DashboardSummary, EarningsHistoryResponse, PeriodEarning, DistributorEarning, EarningsHistoryParams, EarningsEstimationResponse, EarningsEstimationChartData } from './dashboardService';
export type { CreditEstimateItem, CreditEstimate } from './creditsService';
export type { DocumentsFilters } from './documentsService';
export type { OptimizationRecommendations, Recommendation, AlternativeDistributor, OptimizationSuggestionsResponse, OptimizationSuggestionItem, OptimizationSuggestionDistributor, OptimizationSuggestionProduct, CustomPackageItem, CreateCustomPackageRequest, PackageSuggestionsResponse, PackageSuggestion, PackageSuggestionProduct, DistributorSuggestionResponse, DistributorSuggestionPackage, DistributorSuggestionProduct } from './optimizationService';
export type { PackagesResponse, Package, PackageProduct, DistributorContact, PackagesSummary, PackagesStats } from './packagesService';
export type { TopDistributor, TopDistributorsResponse } from './distributorsService';
export type { UserSettings, ChangePasswordRequest } from './settingsService';
export type { SubscriptionPlan, CheckoutSessionResponse, PortalSessionResponse } from './subscriptionService';
export type { 
  MarketplaceDeal, 
  MarketplaceStats, 
  CategoryOption, 
  PaginationInfo, 
  MarketplaceListResponse, 
  MarketplaceFilters,
  CartItem,
  CartSummary,
  CartResponse,
  AddToCartRequest,
  AddToCartResponseItem,
  UpdateCartItemRequest,
  CartValidationIssue,
  CartValidationResponse,
  CheckoutResponse,
  OrderItem,
  Order,
  OrderSummary,
  OrderListResponse
} from './marketplaceService';

