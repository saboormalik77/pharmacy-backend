'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { 
  ShoppingBag, 
  CreditCard, 
  Shield, 
  ArrowLeft, 
  Loader2, 
  AlertCircle,
  CheckCircle2,
  Package,
  Truck
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils/format'
import { useMarketplaceStore } from '@/lib/store/marketplaceStore'
import { marketplaceService, CartItem, CartSummary } from '@/lib/api/services/marketplaceService'
import { authService } from '@/lib/api/services/authService'

function CheckoutContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const user = authService.getCurrentUser()
  
  const { cartItems: storeCartItems, cartSummary: storeCartSummary } = useMarketplaceStore()
  
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [cartSummary, setCartSummary] = useState<CartSummary | null>(null)
  const [validationIssues, setValidationIssues] = useState<string[]>([])

  const canceled = searchParams.get('canceled')
  
  // Helper function to safely get a number value, handling NaN and undefined
  const safeNumber = (value: number | undefined | null): number => {
    if (value === null || value === undefined || isNaN(value)) {
      return 0
    }
    return value
  }
  
  // Helper function to get unit price, calculating from totalPrice if needed
  const getUnitPrice = (item: CartItem): number => {
    const unitPrice = safeNumber(item.unitPrice)
    if (unitPrice > 0) {
      return unitPrice
    }
    // Calculate from totalPrice if unitPrice is missing
    const totalPrice = safeNumber(item.totalPrice)
    const quantity = safeNumber(item.quantity)
    if (totalPrice > 0 && quantity > 0) {
      return totalPrice / quantity
    }
    return 0
  }
  
  // Helper function to get total price
  const getTotalPrice = (item: CartItem): number => {
    const totalPrice = safeNumber(item.totalPrice)
    if (totalPrice > 0) {
      return totalPrice
    }
    // Calculate from unitPrice if totalPrice is missing
    const unitPrice = safeNumber(item.unitPrice)
    const quantity = safeNumber(item.quantity)
    if (unitPrice > 0 && quantity > 0) {
      return unitPrice * quantity
    }
    return 0
  }

  useEffect(() => {
    loadCartAndValidate()
  }, [])

  const loadCartAndValidate = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      // Validate cart
      const validation = await marketplaceService.validateCart()
      
      if (!validation.valid) {
        const issues = validation.issues.map(i => `${i.productName}: ${i.issue}`)
        setValidationIssues(issues)
      }
      
      // Use validation items, but merge with store data if prices are missing
      const itemsWithPrices = validation.items.map(item => {
        // Find corresponding item in store
        const storeItem = storeCartItems.find(storeItem => storeItem.id === item.id)
        
        // Use store prices if validation prices are invalid
        const unitPrice = (item.unitPrice && !isNaN(item.unitPrice) && item.unitPrice > 0) 
          ? item.unitPrice 
          : (storeItem?.unitPrice && !isNaN(storeItem.unitPrice) && storeItem.unitPrice > 0)
            ? storeItem.unitPrice
            : 0
            
        const totalPrice = (item.totalPrice && !isNaN(item.totalPrice) && item.totalPrice > 0)
          ? item.totalPrice
          : (storeItem?.totalPrice && !isNaN(storeItem.totalPrice) && storeItem.totalPrice > 0)
            ? storeItem.totalPrice
            : (unitPrice > 0 && item.quantity > 0 ? unitPrice * item.quantity : 0)
        
        const savings = (item.savings && !isNaN(item.savings) && item.savings >= 0)
          ? item.savings
          : (storeItem?.savings && !isNaN(storeItem.savings) && storeItem.savings >= 0)
            ? storeItem.savings
            : 0
      
        return {
          ...item,
          unitPrice,
          totalPrice,
          savings,
        }
      })
      
      setCartItems(itemsWithPrices)
      
      // Use validation summary, but fallback to store summary if values are invalid
      const summary = validation.summary
      const finalSummary: CartSummary = {
        itemCount: (summary?.itemCount && summary.itemCount > 0) 
          ? summary.itemCount 
          : (storeCartSummary?.itemCount && storeCartSummary.itemCount > 0)
            ? storeCartSummary.itemCount
            : itemsWithPrices.length,
        subtotal: (summary?.subtotal && !isNaN(summary.subtotal) && summary.subtotal > 0)
          ? summary.subtotal
          : (storeCartSummary?.subtotal && !isNaN(storeCartSummary.subtotal) && storeCartSummary.subtotal > 0)
            ? storeCartSummary.subtotal
            : itemsWithPrices.reduce((sum, item) => sum + getTotalPrice(item), 0),
        totalSavings: (summary?.totalSavings && !isNaN(summary.totalSavings) && summary.totalSavings >= 0)
          ? summary.totalSavings
          : (storeCartSummary?.totalSavings && !isNaN(storeCartSummary.totalSavings) && storeCartSummary.totalSavings >= 0)
            ? storeCartSummary.totalSavings
            : itemsWithPrices.reduce((sum, item) => sum + safeNumber(item.savings), 0),
        estimatedTax: (summary?.estimatedTax && !isNaN(summary.estimatedTax) && summary.estimatedTax >= 0)
          ? summary.estimatedTax
          : (storeCartSummary?.estimatedTax && !isNaN(storeCartSummary.estimatedTax) && storeCartSummary.estimatedTax >= 0)
            ? storeCartSummary.estimatedTax
            : 0,
        total: (summary?.total && !isNaN(summary.total) && summary.total > 0)
          ? summary.total
          : (storeCartSummary?.total && !isNaN(storeCartSummary.total) && storeCartSummary.total > 0)
            ? storeCartSummary.total
            : 0,
      }
      
      // Calculate total if it's still 0
      if (finalSummary.total === 0) {
        finalSummary.estimatedTax = finalSummary.subtotal * 0.08
        finalSummary.total = finalSummary.subtotal + finalSummary.estimatedTax
      }
      
      setCartSummary(finalSummary)
      
      if (validation.items.length === 0) {
        setError('Your cart is empty. Add some deals before checkout.')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load cart')
      // Fallback to store data if validation fails
      if (storeCartItems.length > 0) {
        setCartItems(storeCartItems)
        setCartSummary(storeCartSummary || {
          itemCount: storeCartItems.length,
          subtotal: storeCartItems.reduce((sum, item) => sum + safeNumber(item.totalPrice), 0),
          totalSavings: storeCartItems.reduce((sum, item) => sum + safeNumber(item.savings), 0),
          estimatedTax: 0,
          total: 0,
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleCheckout = async () => {
    if (!user?.email) {
      setError('Please log in to continue')
      return
    }

    if (validationIssues.length > 0) {
      setError('Please resolve cart issues before checkout')
      return
    }

    try {
      setIsProcessing(true)
      setError(null)
      
      const result = await marketplaceService.createCheckoutSession(
        user.email,
        user.pharmacy_name
      )
      
      // Redirect to Stripe Checkout
      if (result.url) {
        window.location.href = result.url
      } else {
        throw new Error('No checkout URL returned')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to start checkout')
      setIsProcessing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-teal-600 mx-auto mb-4" />
          <p className="text-muted-foreground">Loading checkout...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => router.push('/marketplace')}
          className="p-2 hover:bg-muted rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold">Checkout</h1>
          <p className="text-muted-foreground text-sm">Review your order and complete payment</p>
        </div>
      </div>

      {/* Canceled message */}
      {canceled && (
        <div className="mb-6 p-4 bg-amber-100 dark:bg-amber-900/60 border-2 border-amber-300 dark:border-amber-700 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-700 dark:text-amber-300 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-900 dark:text-amber-100">Payment canceled</p>
            <p className="text-sm text-amber-800 dark:text-amber-200">
              Your payment was canceled. Your cart items are still saved.
            </p>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-destructive">{error}</p>
          </div>
        </div>
      )}

      {/* Validation issues */}
      {validationIssues.length > 0 && (
        <div className="mb-6 p-4 bg-amber-100 dark:bg-amber-900/60 border-2 border-amber-300 dark:border-amber-700 rounded-lg">
          <p className="font-semibold text-amber-900 dark:text-amber-100 mb-2">
            Some items need attention:
          </p>
          <ul className="list-disc list-inside text-sm text-amber-800 dark:text-amber-200 space-y-1">
            {validationIssues.map((issue, idx) => (
              <li key={idx}>{issue}</li>
            ))}
          </ul>
          <button
            onClick={() => router.push('/marketplace')}
            className="mt-3 text-sm font-medium text-amber-800 dark:text-amber-200 underline hover:no-underline"
          >
            Return to marketplace to update your cart
          </button>
        </div>
      )}

      {cartItems.length > 0 && (
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Order Items */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
              <div className="p-4 border-b bg-muted/30">
                <h2 className="font-semibold flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5" />
                  Order Items ({cartSummary?.itemCount || cartItems.length})
                </h2>
              </div>
              <div className="divide-y">
                {cartItems.map((item) => (
                  <div key={item.id} className="p-4 flex gap-4">
                    <div className="w-20 h-20 bg-muted rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                      <img
                        src={item.imageUrl || `https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=160&h=160&fit=crop&q=80`}
                        alt={item.productName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm line-clamp-2">{item.productName}</h3>
                      <div className="flex flex-wrap gap-2 mt-1 text-xs text-muted-foreground">
                        {item.ndc && <span className="font-mono">NDC: {item.ndc}</span>}
                        <span>• {item.distributor}</span>
                      </div>
                      <div className="mt-2 flex items-center gap-3">
                        <span className="text-sm">Qty: {item.quantity}</span>
                        <span className="text-sm text-muted-foreground">×</span>
                        <span className="text-sm">{formatCurrency(getUnitPrice(item))}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatCurrency(getTotalPrice(item))}</p>
                      {safeNumber(item.savings) > 0 && (
                        <p className="text-xs text-green-600 font-medium">
                          Save {formatCurrency(safeNumber(item.savings))}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Shipping Info */}
            <div className="bg-card rounded-xl border shadow-sm p-4">
              <h2 className="font-semibold flex items-center gap-2 mb-3">
                <Truck className="h-5 w-5" />
                Shipping
              </h2>
              <div className="flex items-center justify-between py-2 px-3 bg-green-100 dark:bg-green-900/60 border border-green-200 dark:border-green-700 rounded-lg">
                <span className="text-sm font-semibold text-green-800 dark:text-green-100">
                  Free Standard Shipping
                </span>
                <CheckCircle2 className="h-5 w-5 text-green-700 dark:text-green-300" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Estimated delivery: 3-5 business days
              </p>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-card rounded-xl border shadow-sm sticky top-4">
              <div className="p-4 border-b bg-muted/30">
                <h2 className="font-semibold">Order Summary</h2>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">{formatCurrency(safeNumber(cartSummary?.subtotal))}</span>
                </div>
                {cartSummary && safeNumber(cartSummary.totalSavings) > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Total Savings</span>
                    <span className="font-medium">−{formatCurrency(safeNumber(cartSummary.totalSavings))}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Estimated Tax (8%)</span>
                  <span className="font-medium">{formatCurrency(safeNumber(cartSummary?.estimatedTax))}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className="font-medium text-green-600">Free</span>
                </div>
                <div className="h-px bg-border my-2" />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>{formatCurrency(safeNumber(cartSummary?.total))}</span>
                </div>
              </div>
              
              <div className="p-4 border-t space-y-4">
                <button
                  onClick={handleCheckout}
                  disabled={isProcessing || validationIssues.length > 0 || cartItems.length === 0}
                  className="w-full py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium transition-all shadow-sm"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-5 w-5" />
                      Pay with Stripe
                    </>
                  )}
                </button>
                
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Shield className="h-4 w-4" />
                  <span>Secure payment powered by Stripe</span>
                </div>
              </div>
            </div>

            {/* Security badges */}
            <div className="mt-4 p-4 bg-muted/30 rounded-xl border">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Package className="h-5 w-5" />
                <div>
                  <p className="font-medium text-foreground">Quality Guaranteed</p>
                  <p className="text-xs">All products verified for quality</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-teal-600 mx-auto mb-4" />
          <p className="text-muted-foreground">Loading checkout...</p>
        </div>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  )
}

