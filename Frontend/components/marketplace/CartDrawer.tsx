'use client'

import { useMarketplaceStore } from '@/lib/store/marketplaceStore'
import { X, Trash2, Minus, Plus, ShoppingCart as CartIcon, Loader2, AlertCircle } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/format'
import { useRouter } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import { Badge } from '@/components/ui/Badge'

export function CartDrawer() {
  const router = useRouter()
  const [removingItems, setRemovingItems] = useState<Set<string>>(new Set())
  const [localQuantities, setLocalQuantities] = useState<Map<string, number>>(new Map())
  const debounceTimers = useRef<Map<string, NodeJS.Timeout>>(new Map())
  const pendingUpdates = useRef<Map<string, number>>(new Map())
  
  const {
    cartItems,
    cartSummary,
    isCartOpen,
    isCartLoading,
    cartError,
    toggleCart,
    closeCart,
    removeFromCart,
    updateCartItemQuantity,
    clearCart,
    getCartSubtotal,
    getTotalSavings,
    getCartTotal
  } = useMarketplaceStore()

  // Sync local quantities with cart items (only when not updating)
  useEffect(() => {
    setLocalQuantities(prev => {
      const newLocalQuantities = new Map<string, number>()
      cartItems.forEach(item => {
        // If item doesn't exist in local state, initialize it
        if (!prev.has(item.id)) {
          newLocalQuantities.set(item.id, item.quantity)
        } else {
          // Only sync from store if no pending update (to preserve user input)
          if (!debounceTimers.current.has(item.id)) {
            newLocalQuantities.set(item.id, item.quantity)
          } else {
            // Preserve the local value if has pending update
            newLocalQuantities.set(item.id, prev.get(item.id) || item.quantity)
          }
        }
      })
      return newLocalQuantities
    })
  }, [cartItems])

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      debounceTimers.current.forEach(timer => clearTimeout(timer))
      debounceTimers.current.clear()
    }
  }, [])

  if (!isCartOpen) return null

  const subtotal = cartSummary?.subtotal ?? getCartSubtotal()
  const savings = cartSummary?.totalSavings ?? getTotalSavings()
  const estimatedTax = cartSummary?.estimatedTax ?? (subtotal * 0.08)
  const total = cartSummary?.total ?? getCartTotal()

  const handleUpdateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return
    
    // Update local quantity immediately for responsive UI
    setLocalQuantities(prev => {
      const newMap = new Map(prev)
      newMap.set(itemId, newQuantity)
      return newMap
    })
    
    // Store the pending quantity
    pendingUpdates.current.set(itemId, newQuantity)
    
    // Clear existing timer for this item
    const existingTimer = debounceTimers.current.get(itemId)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }
    
    // Set a new timer with debounce delay (500ms)
    const timer = setTimeout(async () => {
      const quantityToUpdate = pendingUpdates.current.get(itemId)
      if (quantityToUpdate === undefined) return
      
      // Make API call without showing loading
      try {
        await updateCartItemQuantity(itemId, quantityToUpdate)
      } finally {
        pendingUpdates.current.delete(itemId)
        debounceTimers.current.delete(itemId)
      }
    }, 500)
    
    debounceTimers.current.set(itemId, timer)
  }

  const handleRemoveItem = async (itemId: string) => {
    setRemovingItems(prev => new Set(prev).add(itemId))
    await removeFromCart(itemId)
    setRemovingItems(prev => {
      const newSet = new Set(prev)
      newSet.delete(itemId)
      return newSet
    })
  }

  const handleClearCart = async () => {
    await clearCart()
  }

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-40 animate-in fade-in duration-300"
        onClick={closeCart}
      />
      
      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 w-full sm:w-[420px] bg-card z-50 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 border-l">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold">Shopping Cart</h2>
            {cartSummary && cartSummary.itemCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {cartSummary.itemCount} {cartSummary.itemCount === 1 ? 'item' : 'items'}
              </Badge>
            )}
          </div>
          <button
            onClick={closeCart}
            className="p-1.5 hover:bg-accent rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Error Message */}
        {cartError && (
          <div className="px-3 py-2 bg-destructive/10 border-b border-destructive/20 flex items-center gap-2 text-destructive text-xs">
            <AlertCircle className="h-4 w-4" />
            {cartError}
          </div>
        )}

        {/* Loading State */}
        {isCartLoading && cartItems.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
            <p className="text-sm text-muted-foreground">Loading cart...</p>
          </div>
        ) : cartItems.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <CartIcon className="h-16 w-16 text-muted-foreground/30 mb-3" />
            <h3 className="text-base font-bold mb-1">Your cart is empty</h3>
            <p className="text-sm text-muted-foreground mb-4">Add some deals to get started!</p>
            <button
              onClick={closeCart}
              className="px-3 py-1.5 bg-teal-600 text-white rounded-md hover:bg-teal-700 text-xs font-medium transition-all shadow-sm"
            >
              Browse Deals
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {cartItems.map((item) => {
                const isRemoving = removingItems.has(item.id)
                const isItemDisabled = isRemoving
                const displayQuantity = localQuantities.get(item.id) ?? item.quantity
                
                return (
                  <div
                    key={item.id}
                    className={`grid grid-cols-[60px_1fr_auto] gap-3 p-2.5 bg-muted/50 rounded-lg border ${isRemoving ? 'opacity-50' : ''}`}
                  >
                    {/* Image */}
                    <div className="w-[60px] h-[60px] bg-card rounded border flex items-center justify-center overflow-hidden relative">
                      <img 
                        src={item.imageUrl || `https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=120&h=120&fit=crop&q=80&${item.id}`} 
                        alt={item.productName} 
                        className="w-full h-full object-cover" 
                      />
                      {/* Deal Status Badge */}
                      {item.dealStatus !== 'active' && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <Badge variant="destructive" className="text-[10px]">
                            {item.dealStatus === 'sold' ? 'Sold' : 'Expired'}
                          </Badge>
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex flex-col gap-1.5">
                      <h4 className="font-semibold text-sm leading-tight line-clamp-2">{item.productName}</h4>
                      <div className="flex flex-wrap gap-1 text-[10px] text-muted-foreground">
                        {item.ndc && <span className="font-mono">NDC: {item.ndc}</span>}
                        <span>• {item.distributor}</span>
                      </div>
                      
                      {/* Quantity Controls */}
                      <div className="flex items-center gap-1.5">
                        {(() => {
                          const minQty = item.minimumBuyQuantity || 1
                          const availableQty = item.availableQuantity
                          // If available quantity is less than minimum, allow updating to available quantity
                          const effectiveMinQty = availableQty < minQty ? availableQty : minQty
                          return (
                            <>
                              <button
                                onClick={() => handleUpdateQuantity(item.id, displayQuantity - 1)}
                                disabled={isItemDisabled || displayQuantity <= effectiveMinQty}
                                className="w-6 h-6 border rounded hover:bg-accent flex items-center justify-center transition-colors text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <input
                                type="number"
                                value={displayQuantity}
                                onChange={(e) => {
                                  const qty = parseInt(e.target.value) || effectiveMinQty
                                  if (qty >= effectiveMinQty && qty <= item.availableQuantity) {
                                    handleUpdateQuantity(item.id, qty)
                                  }
                                }}
                                disabled={isItemDisabled}
                                className="w-10 h-6 text-center border rounded text-xs font-semibold bg-card disabled:opacity-50"
                                min={effectiveMinQty}
                                max={item.availableQuantity}
                              />
                              <button
                                onClick={() => handleUpdateQuantity(item.id, displayQuantity + 1)}
                                disabled={isItemDisabled || displayQuantity >= item.availableQuantity}
                                className="w-6 h-6 border rounded hover:bg-accent flex items-center justify-center transition-colors text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </>
                          )
                        })()}
                      </div>
                      
                      {/* Minimum and max quantity info */}
                      {(() => {
                        const minQty = item.minimumBuyQuantity || 1
                        const availableQty = item.availableQuantity
                        const effectiveMinQty = availableQty < minQty ? availableQty : minQty
                        return (
                          <>
                            {item.quantity < effectiveMinQty && (
                              <p className="text-[10px] text-destructive">
                                {availableQty < minQty 
                                  ? `Only ${availableQty} remaining (min was ${minQty})`
                                  : `Min: ${minQty}`
                                }
                              </p>
                            )}
                            {item.quantity >= item.availableQuantity && (
                              <p className="text-[10px] text-orange-600">Max available: {item.availableQuantity}</p>
                            )}
                            {availableQty < minQty && item.quantity >= effectiveMinQty && (
                              <p className="text-[10px] text-amber-600">
                                Only {availableQty} remaining (minimum order was {minQty})
                              </p>
                            )}
                          </>
                        )
                      })()}
                    </div>

                    {/* Price & Remove */}
                    <div className="flex flex-col items-end gap-1">
                      <p className="text-xs text-muted-foreground">{formatCurrency(item.unitPrice)} ea</p>
                      <p className="text-sm font-bold">{formatCurrency(item.totalPrice)}</p>
                      {item.savings > 0 && (
                        <p className="text-[10px] text-green-600">Save {formatCurrency(item.savings)}</p>
                      )}
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        disabled={isRemoving}
                        className="p-1 text-destructive hover:bg-destructive/10 rounded transition-colors mt-auto disabled:opacity-50"
                      >
                        {isRemoving ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Summary */}
            <div className="border-t p-3 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-semibold">{formatCurrency(subtotal)}</span>
              </div>
              {savings > 0 && (
                <div className="flex justify-between text-xs font-semibold text-green-600">
                  <span>Total Savings</span>
                  <span>−{formatCurrency(savings)}</span>
                </div>
              )}
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Estimated Tax (8%)</span>
                <span className="font-semibold">{formatCurrency(estimatedTax)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Shipping</span>
                <span className="font-semibold text-green-600">Free</span>
              </div>
              <div className="h-px bg-border my-1.5" />
              <div className="flex justify-between text-sm font-bold">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="p-3 pt-0 space-y-2">
              <button
                onClick={() => {
                  closeCart()
                  router.push('/marketplace/checkout')
                }}
                disabled={isCartLoading}
                className="w-full px-3 py-1.5 bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:opacity-50 flex items-center justify-center gap-1 text-xs font-medium transition-all shadow-sm"
              >
                Proceed to Checkout
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <div className="flex gap-2">
                <button
                  onClick={closeCart}
                  className="flex-1 px-3 py-1.5 border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md text-xs font-medium transition-all"
                >
                  Continue Shopping
                </button>
                <button
                  onClick={handleClearCart}
                  disabled={isCartLoading}
                  className="px-3 py-1.5 border border-destructive/30 text-destructive hover:bg-destructive/10 rounded-md text-xs font-medium transition-all disabled:opacity-50"
                >
                  Clear Cart
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}
