/**
 * Marketplace API Service
 * Handles all pharmacy marketplace and cart operations
 */

import { apiClient } from '../client';

// ============================================================
// Types - Marketplace Deals
// ============================================================

export interface MarketplaceDeal {
  id: string;
  dealNumber: string;
  productName: string;
  category: string;
  ndc: string | null;
  quantity: number;
  originalQuantity: number;
  soldQuantity: number;
  remainingQuantity: number;
  minimumBuyQuantity: number;
  unit: string;
  originalPrice: number;
  dealPrice: number;
  savings: number;
  featuredUntil: string;
  totalSavingsAmount: number;
  distributor: string;
  expiryDate: string;
  postedDate: string;
  status: 'active' | 'sold' | 'expired';
  imageUrl: string | null;
  notes: string | null;
  inCart?: boolean;
  cartQuantity?: number;
  isDealOfTheDay?: boolean;
  featuredDealType?: 'day' | 'week' | 'month';
  isFeaturedDeal?: boolean;
}

export interface FeaturedDealsResponse {
  dealOfTheDay: MarketplaceDeal | null;
  dealOfTheWeek: MarketplaceDeal | null;
  dealOfTheMonth: MarketplaceDeal | null;
}

export interface MarketplaceStats {
  totalDeals: number;
  activeDeals: number;
  soldDeals: number;
  expiredDeals: number;
  totalItems: number;
  avgSavings: number;
  categories: string[];
}

export interface CategoryOption {
  value: string;
  label: string;
  count: number;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface MarketplaceListResponse {
  deals: MarketplaceDeal[];
  stats: MarketplaceStats;
  pagination: PaginationInfo;
}

export interface MarketplaceFilters {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  status?: 'all' | 'active' | 'sold' | 'expired';
  sortBy?: 'product_name' | 'category' | 'distributor' | 'status' | 'posted_date' | 'expiry_date' | 'deal_price' | 'quantity' | 'savings';
  sortOrder?: 'asc' | 'desc';
}

// ============================================================
// Types - Cart
// ============================================================

export interface CartItem {
  id: string;
  dealId: string;
  productName: string;
  ndc: string | null;
  category: string;
  distributor: string;
  quantity: number;
  unitPrice: number;
  originalPrice: number;
  totalPrice: number;
  savings: number;
  savingsPercent: number;
  imageUrl: string | null;
  availableQuantity: number;
  minimumBuyQuantity?: number;
  dealStatus: string;
  expiryDate: string;
  addedAt: string;
}

export interface CartSummary {
  itemCount: number;
  subtotal: number;
  totalSavings: number;
  estimatedTax: number;
  total: number;
}

export interface CartResponse {
  items: CartItem[];
  summary: CartSummary;
}

export interface AddToCartRequest {
  dealId: string;
  quantity?: number;
}

export interface AddToCartResponseItem {
  dealId: string;
  productName: string;
  ndc: string | null;
  distributor: string;
  quantity: number;
  unitPrice: number;
  originalPrice: number;
  totalPrice: number;
  savings: number;
  imageUrl: string | null;
}

export interface UpdateCartItemRequest {
  quantity: number;
}

export interface CartValidationIssue {
  itemId: string;
  dealId: string;
  productName: string;
  issue: string;
}

export interface CartValidationResponse {
  valid: boolean;
  message: string;
  issues: CartValidationIssue[];
  items: CartItem[];
  summary: CartSummary;
}

// ============================================================
// Types - Checkout & Orders
// ============================================================

export interface CheckoutResponse {
  sessionId: string;
  url: string;
  orderId: string;
  orderNumber: string;
}

export interface OrderItem {
  id: string;
  dealId: string;
  productName: string;
  ndc: string | null;
  category: string | null;
  distributor: string | null;
  quantity: number;
  unitPrice: number;
  originalPrice: number;
  lineTotal: number;
  imageUrl: string | null;
  lineSavings: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: 'pending' | 'processing' | 'paid' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  subtotal: number;
  taxAmount: number;
  taxRate: number;
  shippingAmount: number;
  discountAmount: number;
  totalAmount: number;
  totalSavings: number;
  paymentMethodType: string | null;
  paymentMethodLast4: string | null;
  paymentMethodBrand: string | null;
  stripeReceiptUrl: string | null;
  notes: string | null;
  createdAt: string;
  paidAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  items?: OrderItem[];
}

export interface OrderSummary {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  totalSavings: number;
  itemCount: number;
  paymentMethodBrand: string | null;
  paymentMethodLast4: string | null;
  createdAt: string;
  paidAt: string | null;
}

export interface OrderListResponse {
  orders: OrderSummary[];
  pagination: PaginationInfo;
}

// ============================================================
// Marketplace Service
// ============================================================

export const marketplaceService = {
  // ============================================================
  // Marketplace Deals
  // ============================================================

  /**
   * Get marketplace deals with pagination and filters
   * GET /api/marketplace
   */
  async getDeals(filters?: MarketplaceFilters): Promise<MarketplaceListResponse> {
    const response = await apiClient.getApiWithoutPharmacyId<MarketplaceListResponse>('/marketplace', filters);
    if (response.status === 'success' && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Failed to fetch marketplace deals');
  },

  /**
   * Get marketplace deal by ID
   * GET /api/marketplace/:id
   */
  async getDealById(id: string): Promise<MarketplaceDeal> {
    const response = await apiClient.getApiWithoutPharmacyId<{ deal: MarketplaceDeal }>(`/marketplace/${id}`);
    if (response.status === 'success' && response.data) {
      return response.data.deal;
    }
    throw new Error(response.message || 'Failed to fetch marketplace deal');
  },

  /**
   * Get marketplace categories
   * GET /api/marketplace/categories
   */
  async getCategories(): Promise<CategoryOption[]> {
    const response = await apiClient.getApiWithoutPharmacyId<{ categories: CategoryOption[] }>('/marketplace/categories');
    if (response.status === 'success' && response.data) {
      return response.data.categories;
    }
    throw new Error(response.message || 'Failed to fetch marketplace categories');
  },

  /**
   * Get Deal of the Day
   * GET /api/marketplace/deal-of-the-day
   */
  async getDealOfTheDay(): Promise<MarketplaceDeal | null> {
    const response = await apiClient.getApiWithoutPharmacyId<{ deal: MarketplaceDeal | null }>('/marketplace/deal-of-the-day');
    if (response.status === 'success' && response.data) {
      return response.data.deal;
    }
    return null; // No deal of the day available
  },

  /**
   * Get Featured Deals (day, week, month)
   * GET /api/marketplace/featured-deals
   */
  async getFeaturedDeals(): Promise<FeaturedDealsResponse> {
    const response = await apiClient.getApiWithoutPharmacyId<FeaturedDealsResponse>('/marketplace/featured-deals');
    if (response.status === 'success' && response.data) {
      return response.data;
    }
    return { dealOfTheDay: null, dealOfTheWeek: null, dealOfTheMonth: null }; // No featured deals available
  },

  // ============================================================
  // Cart Operations
  // ============================================================

  /**
   * Get pharmacy cart
   * GET /api/marketplace/cart
   */
  async getCart(): Promise<CartResponse> {
    const response = await apiClient.getApiWithoutPharmacyId<CartResponse>('/marketplace/cart');
    if (response.status === 'success' && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Failed to fetch cart');
  },

  /**
   * Get cart item count
   * GET /api/marketplace/cart/count
   */
  async getCartCount(): Promise<number> {
    const response = await apiClient.getApiWithoutPharmacyId<{ count: number }>('/marketplace/cart/count');
    if (response.status === 'success' && response.data) {
      return response.data.count;
    }
    throw new Error(response.message || 'Failed to fetch cart count');
  },

  /**
   * Add item to cart
   * POST /api/marketplace/cart
   */
  async addToCart(dealId: string, quantity: number = 1): Promise<{ message: string; item: AddToCartResponseItem }> {
    const response = await apiClient.post<{ message: string; item: AddToCartResponseItem }>('/marketplace/cart', {
      dealId,
      quantity,
    });
    if (response.status === 'success') {
      return {
        message: response.message || 'Item added to cart',
        item: response.data?.item || {} as AddToCartResponseItem,
      };
    }
    throw new Error(response.message || 'Failed to add item to cart');
  },

  /**
   * Update cart item quantity
   * PATCH /api/marketplace/cart/:itemId
   */
  async updateCartItem(itemId: string, quantity: number): Promise<{ message: string; newQuantity: number }> {
    const response = await apiClient.patch<{ message: string; newQuantity: number }>(`/marketplace/cart/${itemId}`, {
      quantity,
    });
    if (response.status === 'success') {
      return {
        message: response.message || 'Cart updated successfully',
        newQuantity: response.data?.newQuantity || quantity,
      };
    }
    throw new Error(response.message || 'Failed to update cart item');
  },

  /**
   * Remove item from cart
   * DELETE /api/marketplace/cart/:itemId
   */
  async removeFromCart(itemId: string): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string }>(`/marketplace/cart/${itemId}`);
    if (response.status === 'success') {
      return { message: response.message || 'Item removed from cart' };
    }
    throw new Error(response.message || 'Failed to remove item from cart');
  },

  /**
   * Clear entire cart
   * DELETE /api/marketplace/cart
   */
  async clearCart(): Promise<{ message: string; itemsRemoved: number }> {
    const response = await apiClient.delete<{ message: string; itemsRemoved: number }>('/marketplace/cart');
    if (response.status === 'success') {
      return {
        message: response.message || 'Cart cleared successfully',
        itemsRemoved: response.data?.itemsRemoved || 0,
      };
    }
    throw new Error(response.message || 'Failed to clear cart');
  },

  /**
   * Validate cart before checkout
   * GET /api/marketplace/cart/validate
   */
  async validateCart(): Promise<CartValidationResponse> {
    const response = await apiClient.getApiWithoutPharmacyId<CartValidationResponse>('/marketplace/cart/validate');
    if (response.status === 'success' && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Failed to validate cart');
  },

  // ============================================================
  // Checkout & Orders
  // ============================================================

  /**
   * Create Stripe checkout session
   * POST /api/marketplace/checkout
   */
  async createCheckoutSession(email: string, pharmacyName?: string): Promise<CheckoutResponse> {
    const response = await apiClient.post<CheckoutResponse>('/marketplace/checkout', {
      email,
      pharmacyName,
    });
    if (response.status === 'success' && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Failed to create checkout session');
  },

  /**
   * Get pharmacy orders list
   * GET /api/marketplace/orders
   */
  async getOrders(page: number = 1, limit: number = 10, status?: string): Promise<OrderListResponse> {
    const params: Record<string, any> = { page, limit };
    if (status && status !== 'all') {
      params.status = status;
    }
    const response = await apiClient.getApiWithoutPharmacyId<OrderListResponse>('/marketplace/orders', params);
    if (response.status === 'success' && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Failed to fetch orders');
  },

  /**
   * Get order by ID
   * GET /api/marketplace/orders/:orderId
   */
  async getOrderById(orderId: string): Promise<Order> {
    const response = await apiClient.getApiWithoutPharmacyId<{ order: Order }>(`/marketplace/orders/${orderId}`);
    if (response.status === 'success' && response.data) {
      return response.data.order;
    }
    throw new Error(response.message || 'Failed to fetch order');
  },

  /**
   * Get order by Stripe session ID
   * GET /api/marketplace/orders/session/:sessionId
   */
  async getOrderBySessionId(sessionId: string): Promise<Order> {
    const response = await apiClient.getApiWithoutPharmacyId<{ order: Order }>(`/marketplace/orders/session/${sessionId}`);
    if (response.status === 'success' && response.data) {
      return response.data.order;
    }
    throw new Error(response.message || 'Failed to fetch order');
  },

  /**
   * Cancel order
   * POST /api/marketplace/orders/:orderId/cancel
   */
  async cancelOrder(orderId: string): Promise<{ message: string; orderNumber: string }> {
    const response = await apiClient.post<{ orderNumber: string }>(`/marketplace/orders/${orderId}/cancel`, {});
    if (response.status === 'success') {
      return {
        message: response.message || 'Order cancelled successfully',
        orderNumber: response.data?.orderNumber || '',
      };
    }
    throw new Error(response.message || 'Failed to cancel order');
  },
};

