import { create } from 'zustand'
import { 
  marketplaceService, 
  MarketplaceDeal, 
  CartItem, 
  CartSummary, 
  MarketplaceStats, 
  PaginationInfo,
  CategoryOption,
  MarketplaceFilters,
  FeaturedDealsResponse
} from '@/lib/api/services/marketplaceService'

interface MarketplaceStore {
  // Deals state
  deals: MarketplaceDeal[]
  featuredDeal: MarketplaceDeal | null
  featuredDeals: FeaturedDealsResponse | null
  featuredDealType: 'day' | 'week' | 'month' | null
  stats: MarketplaceStats | null
  pagination: PaginationInfo | null
  categories: CategoryOption[]
  filters: MarketplaceFilters
  isLoadingDeals: boolean
  dealsError: string | null
  
  // Cart state
  cartItems: CartItem[]
  cartSummary: CartSummary | null
  isCartOpen: boolean
  isCartLoading: boolean
  cartError: string | null
  
  // Modal state
  isDealModalOpen: boolean
  selectedDeal: MarketplaceDeal | null
  
  // Deals actions
  fetchDeals: (filters?: MarketplaceFilters) => Promise<void>
  fetchDealById: (id: string) => Promise<MarketplaceDeal | null>
  fetchDealOfTheDay: () => Promise<void>
  fetchCategories: () => Promise<void>
  setFilters: (filters: MarketplaceFilters) => void
  
  // Cart actions (API integrated)
  fetchCart: () => Promise<void>
  fetchCartCount: () => Promise<number>
  addToCart: (dealId: string, quantity?: number) => Promise<boolean>
  updateCartItemQuantity: (itemId: string, quantity: number) => Promise<boolean>
  removeFromCart: (itemId: string) => Promise<boolean>
  clearCart: () => Promise<boolean>
  
  // Cart UI actions
  toggleCart: () => void
  openCart: () => void
  closeCart: () => void
  
  // Modal actions
  openDealModal: (deal: MarketplaceDeal) => void
  closeDealModal: () => void
  
  // Computed values
  getCartTotal: () => number
  getCartSubtotal: () => number
  getTotalSavings: () => number
  getItemCount: () => number
}

export const useMarketplaceStore = create<MarketplaceStore>((set, get) => ({
  // Initial state - Deals
  deals: [],
  featuredDeal: null,
  featuredDeals: null,
  featuredDealType: null,
  stats: null,
  pagination: null,
  categories: [],
  filters: {
    page: 1,
    limit: 12,
    sortBy: 'posted_date',
    sortOrder: 'desc',
  },
  isLoadingDeals: false,
  dealsError: null,
  
  // Initial state - Cart
  cartItems: [],
  cartSummary: null,
  isCartOpen: false,
  isCartLoading: false,
  cartError: null,
  
  // Initial state - Modal
  isDealModalOpen: false,
  selectedDeal: null,
  
  // ============================================================
  // Deals Actions
  // ============================================================
  
  fetchDeals: async (filters?: MarketplaceFilters) => {
    set({ isLoadingDeals: true, dealsError: null })
    
    try {
      const mergedFilters = { ...get().filters, ...filters }
      const response = await marketplaceService.getDeals(mergedFilters)
      
      // Filter out only the priority featured deal (shown in DealHero) from the regular deals list
      // Remaining featured deals (week/month) will appear as normal cards with badges
      const featuredDeal = get().featuredDeal
      const featuredDeals = get().featuredDeals
      const featuredDealType = get().featuredDealType
      
      // Filter out the DealHero deal
      let remainingDeals = featuredDeal
        ? response.deals.filter(deal => deal.id !== featuredDeal.id)
        : response.deals
      
      // Add remaining featured deals (week/month) that are not in the deals array
      // These will appear as normal cards with "Deal of the Week/Month" badges
      if (featuredDeals) {
        const dealIdsInArray = new Set(remainingDeals.map(deal => deal.id))
        const remainingFeaturedDeals: MarketplaceDeal[] = []
        
        // If DealHero is "day", add week and month if they exist
        // If DealHero is "week", add month if it exists
        // If DealHero is "month", no additional featured deals to add
        if (featuredDealType === 'day') {
          if (featuredDeals.dealOfTheWeek && !dealIdsInArray.has(featuredDeals.dealOfTheWeek.id)) {
            // Ensure featuredDealType is set for badge display
            const weekDeal = { ...featuredDeals.dealOfTheWeek, featuredDealType: 'week' as const }
            remainingFeaturedDeals.push(weekDeal)
          }
          if (featuredDeals.dealOfTheMonth && !dealIdsInArray.has(featuredDeals.dealOfTheMonth.id)) {
            // Ensure featuredDealType is set for badge display
            const monthDeal = { ...featuredDeals.dealOfTheMonth, featuredDealType: 'month' as const }
            remainingFeaturedDeals.push(monthDeal)
          }
        } else if (featuredDealType === 'week') {
          if (featuredDeals.dealOfTheMonth && !dealIdsInArray.has(featuredDeals.dealOfTheMonth.id)) {
            // Ensure featuredDealType is set for badge display
            const monthDeal = { ...featuredDeals.dealOfTheMonth, featuredDealType: 'month' as const }
            remainingFeaturedDeals.push(monthDeal)
          }
        }
        
        // Add remaining featured deals at the beginning of the deals array
        // Priority: week comes before month
        remainingDeals = [...remainingFeaturedDeals, ...remainingDeals]
      }
      
      set({
        deals: remainingDeals,
        stats: response.stats,
        pagination: response.pagination,
        filters: mergedFilters,
        isLoadingDeals: false,
      })
    } catch (error: any) {
      set({
        isLoadingDeals: false,
        dealsError: error.message || 'Failed to fetch deals',
      })
    }
  },
  
  fetchDealOfTheDay: async () => {
    try {
      // Fetch all featured deals (day, week, month)
      const featuredDeals = await marketplaceService.getFeaturedDeals()
      
      // Determine which deal to show based on priority: day > week > month
      let featuredDeal: MarketplaceDeal | null = null
      let featuredDealType: 'day' | 'week' | 'month' | null = null
      
      if (featuredDeals.dealOfTheDay) {
        featuredDeal = featuredDeals.dealOfTheDay
        featuredDealType = 'day'
      } else if (featuredDeals.dealOfTheWeek) {
        featuredDeal = featuredDeals.dealOfTheWeek
        featuredDealType = 'week'
      } else if (featuredDeals.dealOfTheMonth) {
        featuredDeal = featuredDeals.dealOfTheMonth
        featuredDealType = 'month'
      }
      
      set({ 
        featuredDeal,
        featuredDeals,
        featuredDealType
      })
    } catch (error: any) {
      console.error('Failed to fetch Featured Deals:', error)
      set({ 
        featuredDeal: null,
        featuredDeals: null,
        featuredDealType: null
      })
    }
  },
  
  fetchDealById: async (id: string): Promise<MarketplaceDeal | null> => {
    try {
      const deal = await marketplaceService.getDealById(id)
      return deal
    } catch (error: any) {
      console.error('Failed to fetch deal:', error)
      return null
    }
  },
  
  fetchCategories: async () => {
    try {
      const categories = await marketplaceService.getCategories()
      set({ categories })
    } catch (error: any) {
      console.error('Failed to fetch categories:', error)
    }
  },
  
  setFilters: (filters: MarketplaceFilters) => {
    set({ filters: { ...get().filters, ...filters } })
  },
  
  // ============================================================
  // Cart Actions (API Integrated)
  // ============================================================
  
  fetchCart: async () => {
    set({ isCartLoading: true, cartError: null })
    
    try {
      const cart = await marketplaceService.getCart()
      set({
        cartItems: cart.items,
        cartSummary: cart.summary,
        isCartLoading: false,
      })
    } catch (error: any) {
      set({
        isCartLoading: false,
        cartError: error.message || 'Failed to fetch cart',
      })
    }
  },
  
  fetchCartCount: async (): Promise<number> => {
    try {
      const count = await marketplaceService.getCartCount()
      return count
    } catch (error: any) {
      console.error('Failed to fetch cart count:', error)
      return 0
    }
  },
  
  addToCart: async (dealId: string, quantity: number = 1): Promise<boolean> => {
    set({ isCartLoading: true, cartError: null })
    
    try {
      // Fetch deal to validate minimum quantity
      const deal = await get().fetchDealById(dealId)
      if (deal) {
        const minQty = deal.minimumBuyQuantity || 1
        const availableQty = deal.quantity
        
        // If available quantity is less than minimum, allow adding all available quantity
        // Otherwise, enforce minimum quantity requirement
        const effectiveMinQty = availableQty < minQty ? availableQty : minQty
        
        if (quantity < effectiveMinQty) {
          set({
            isCartLoading: false,
            cartError: availableQty < minQty 
              ? `Only ${availableQty} ${deal.unit} remaining (minimum order was ${minQty} ${deal.unit})`
              : `Minimum order quantity is ${minQty} ${deal.unit}`,
          })
          return false
        }
        
        // Also check that quantity doesn't exceed available
        if (quantity > availableQty) {
          set({
            isCartLoading: false,
            cartError: `Only ${availableQty} ${deal.unit} available`,
          })
          return false
        }
      }
      
      await marketplaceService.addToCart(dealId, quantity)
      // Refresh cart after adding
      await get().fetchCart()
      // Also refresh deals to update inCart status
      await get().fetchDeals()
      return true
    } catch (error: any) {
      set({
        isCartLoading: false,
        cartError: error.message || 'Failed to add to cart',
      })
      return false
    }
  },
  
  updateCartItemQuantity: async (itemId: string, quantity: number): Promise<boolean> => {
    set({ isCartLoading: true, cartError: null })
    
    try {
      // Check if quantity meets minimum requirement
      const cartItem = get().cartItems.find(item => item.id === itemId)
      if (cartItem) {
        const minQty = cartItem.minimumBuyQuantity || 1
        const availableQty = cartItem.availableQuantity
        
        // If available quantity is less than minimum, allow updating to available quantity
        // Otherwise, enforce minimum quantity requirement
        const effectiveMinQty = availableQty < minQty ? availableQty : minQty
        
        if (quantity < effectiveMinQty) {
          set({
            isCartLoading: false,
            cartError: availableQty < minQty 
              ? `Only ${availableQty} remaining (minimum order was ${minQty})`
              : `Minimum order quantity is ${minQty}`,
          })
          return false
        }
        
        // Also check that quantity doesn't exceed available
        if (quantity > availableQty) {
          set({
            isCartLoading: false,
            cartError: `Only ${availableQty} available`,
          })
          return false
        }
      }
      
      await marketplaceService.updateCartItem(itemId, quantity)
      // Refresh cart after updating
      await get().fetchCart()
      return true
    } catch (error: any) {
      set({
        isCartLoading: false,
        cartError: error.message || 'Failed to update cart item',
      })
      return false
    }
  },
  
  removeFromCart: async (itemId: string): Promise<boolean> => {
    set({ isCartLoading: true, cartError: null })
    
    try {
      await marketplaceService.removeFromCart(itemId)
      // Refresh cart after removing
      await get().fetchCart()
      // Also refresh deals to update inCart status
      await get().fetchDeals()
      return true
    } catch (error: any) {
      set({
        isCartLoading: false,
        cartError: error.message || 'Failed to remove from cart',
      })
      return false
    }
  },
  
  clearCart: async (): Promise<boolean> => {
    set({ isCartLoading: true, cartError: null })
    
    try {
      await marketplaceService.clearCart()
      set({
        cartItems: [],
        cartSummary: null,
        isCartLoading: false,
      })
      // Refresh deals to update inCart status
      await get().fetchDeals()
      return true
    } catch (error: any) {
      set({
        isCartLoading: false,
        cartError: error.message || 'Failed to clear cart',
      })
      return false
    }
  },
  
  // ============================================================
  // Cart UI Actions
  // ============================================================
  
  toggleCart: () => {
    const newState = !get().isCartOpen
    set({ isCartOpen: newState })
    // Fetch cart when opening
    if (newState) {
      get().fetchCart()
    }
  },
  
  openCart: () => {
    set({ isCartOpen: true })
    get().fetchCart()
  },
  
  closeCart: () => {
    set({ isCartOpen: false })
  },
  
  // ============================================================
  // Modal Actions
  // ============================================================
  
  openDealModal: (deal: MarketplaceDeal) => {
    set({ selectedDeal: deal, isDealModalOpen: true })
  },
  
  closeDealModal: () => {
    set({ isDealModalOpen: false, selectedDeal: null })
  },
  
  // ============================================================
  // Computed Values
  // ============================================================
  
  getCartTotal: () => {
    const summary = get().cartSummary
    if (summary) {
      return summary.total
    }
    // Fallback calculation from items
    const subtotal = get().getCartSubtotal()
    const tax = subtotal * 0.08
    return subtotal + tax
  },
  
  getCartSubtotal: () => {
    const summary = get().cartSummary
    if (summary) {
      return summary.subtotal
    }
    // Fallback calculation from items
    return get().cartItems.reduce((sum, item) => sum + item.totalPrice, 0)
  },
  
  getTotalSavings: () => {
    const summary = get().cartSummary
    if (summary) {
      return summary.totalSavings
    }
    // Fallback calculation from items
    return get().cartItems.reduce((sum, item) => sum + item.savings, 0)
  },
  
  getItemCount: () => {
    const summary = get().cartSummary
    if (summary) {
      return summary.itemCount
    }
    // Fallback calculation from items
    return get().cartItems.length
  },
}))

// Re-export types for convenience
export type { MarketplaceDeal, CartItem, CartSummary, MarketplaceStats, CategoryOption, MarketplaceFilters }
