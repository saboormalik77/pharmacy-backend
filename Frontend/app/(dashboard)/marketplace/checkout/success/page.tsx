'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { 
  CheckCircle2, 
  Package, 
  ArrowRight, 
  Loader2, 
  AlertCircle,
  Receipt,
  Truck,
  Calendar,
  CreditCard
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils/format'
import { marketplaceService, Order } from '@/lib/api/services/marketplaceService'
import { useMarketplaceStore } from '@/lib/store/marketplaceStore'
import { getToken } from '@/lib/utils/cookies'

function CheckoutSuccessContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [order, setOrder] = useState<Order | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(true)
  const [countdown, setCountdown] = useState(3)
  
  const { fetchCart, clearCart } = useMarketplaceStore()

  useEffect(() => {
    // Check authentication client-side
    const token = getToken()
    if (!token) {
      setIsAuthenticated(false)
      setIsLoading(false)
      return
    }

    if (sessionId) {
      loadOrder()
    } else {
      setError('No session ID provided')
      setIsLoading(false)
    }
  }, [sessionId])

  // Countdown effect for auto-redirect
  useEffect(() => {
    if (order && countdown > 0) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            router.push('/orders')
            return 0
          }
          return prev - 1
        })
      }, 1000)
      
      return () => clearInterval(timer)
    }
  }, [order, countdown, router])

  const loadOrder = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      // Get order by session ID
      const orderData = await marketplaceService.getOrderBySessionId(sessionId!)
      setOrder(orderData)
      
      // Clear cart immediately after successful order
      // This ensures the cart is empty even if the webhook hasn't processed yet
      await clearCart()
      
      // Start countdown for auto-navigation
      setCountdown(3)
    } catch (err: any) {
      // If order not found yet, it might still be processing
      if (err.message?.includes('not found')) {
        // Poll for a few seconds
        setTimeout(async () => {
          try {
            const orderData = await marketplaceService.getOrderBySessionId(sessionId!)
            setOrder(orderData)
            
            // Clear cart after successful order
            await clearCart()
            
            // Start countdown for auto-navigation
            setCountdown(3)
          } catch (retryErr: any) {
            // Even if order not found, clear the cart since payment was successful
            await clearCart()
            setError('Order is being processed. Please check your orders page in a few moments.')
            // Still navigate to orders page even if order not found yet
            setCountdown(3)
          }
        }, 2000)
      } else {
        setError(err.message || 'Failed to load order')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
      case 'confirmed':
        return 'bg-green-100 text-black dark:bg-green-900/30 dark:text-black'
      case 'pending':
      case 'processing':
        return 'bg-amber-100 text-black dark:bg-amber-900/30 dark:text-black'
      case 'shipped':
      case 'delivered':
        return 'bg-blue-100 text-black dark:bg-blue-900/30 dark:text-black'
      default:
        return 'bg-[#f5f2f1] text-black dark:bg-gray-900/30 dark:text-black'
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-[#516057] mx-auto mb-4" />
          <p className="text-muted-foreground">Processing your order...</p>
        </div>
      </div>
    )
  }

  // Handle unauthenticated state after Stripe redirect
  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-2xl text-center">
        <div className="bg-card rounded-2xl border shadow-sm p-8">
          <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Payment Successful!</h1>
          <p className="text-muted-foreground mb-6">
            Your payment was processed successfully. Please log in to view your order details.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => router.push(`/login?redirect=/orders`)}
              className="px-6 py-3 bg-[#516057] text-white rounded-[4px] hover:bg-[#505454] font-medium transition-all"
            >
              Log In to View Order
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (error && !order) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-2xl text-center">
        <div className="bg-card rounded-2xl border shadow-sm p-8">
          <AlertCircle className="h-16 w-16 text-amber-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Order Processing</h1>
          <p className="text-muted-foreground mb-6">{error}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => router.push('/orders')}
              className="px-6 py-3 bg-[#516057] text-white rounded-[4px] hover:bg-[#505454] font-medium transition-all"
            >
              View My Orders
            </button>
            <button
              onClick={() => router.push('/marketplace')}
              className="px-6 py-3 border rounded-[4px] hover:bg-muted font-medium transition-all"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      {/* Success Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full mb-4">
          <CheckCircle2 className="h-10 w-10 text-green-600" />
        </div>
        <h1 className="text-3xl font-bold mb-2">Order Confirmed!</h1>
        <p className="text-muted-foreground mb-2">
          Thank you for your purchase. Your order has been received.
        </p>
        {order && countdown > 0 && (
          <p className="text-sm text-[#516057] font-medium">
            Redirecting to orders page in {countdown} second{countdown !== 1 ? 's' : ''}...
          </p>
        )}
      </div>

      {order && (
        <>
          {/* Order Summary Card */}
          <div className="bg-card rounded-2xl border shadow-sm overflow-hidden mb-6">
            <div className="p-6 border-b bg-[#f5f2f1] ">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Order Number</p>
                  <p className="text-xl font-bold font-mono">{order.orderNumber}</p>
                </div>
                <span className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize ${getStatusColor(order.status)}`}>
                  {order.status}
                </span>
              </div>
            </div>

            <div className="p-6">
              {/* Order Items */}
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Package className="h-5 w-5" />
                Items Ordered
              </h3>
              <div className="space-y-3 mb-6">
                {order.items?.map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-3 px-4 bg-muted/50 rounded-[4px]">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{item.productName}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.ndc && `NDC: ${item.ndc} • `}Qty: {item.quantity} × {formatCurrency(item.unitPrice)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(item.lineTotal)}</p>
                      {item.lineSavings > 0 && (
                        <p className="text-xs text-green-600">Saved {formatCurrency(item.lineSavings)}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Order Totals */}
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(order.subtotal)}</span>
                </div>
                {order.totalSavings > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Total Savings</span>
                    <span>−{formatCurrency(order.totalSavings)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax ({(order.taxRate * 100).toFixed(0)}%)</span>
                  <span>{formatCurrency(order.taxAmount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className="text-green-600">Free</span>
                </div>
                <div className="flex justify-between font-bold text-lg pt-2 border-t mt-2">
                  <span>Total</span>
                  <span>{formatCurrency(order.totalAmount)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Order Info Cards */}
          <div className="grid sm:grid-cols-2 gap-4 mb-8">
            {/* Payment Info */}
            <div className="bg-card rounded-xl border p-4">
              <h3 className="font-semibold flex items-center gap-2 mb-3">
                <CreditCard className="h-5 w-5" />
                Payment
              </h3>
              {order.paymentMethodBrand && order.paymentMethodLast4 ? (
                <p className="text-sm">
                  <span className="capitalize">{order.paymentMethodBrand}</span> ending in {order.paymentMethodLast4}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">Processing...</p>
              )}
              {order.stripeReceiptUrl && (
                <a
                  href={order.stripeReceiptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-[#516057] hover:underline mt-2"
                >
                  <Receipt className="h-4 w-4" />
                  View Receipt
                </a>
              )}
            </div>

            {/* Shipping Info */}
            <div className="bg-card rounded-xl border p-4">
              <h3 className="font-semibold flex items-center gap-2 mb-3">
                <Truck className="h-5 w-5" />
                Shipping
              </h3>
              <p className="text-sm">Free Standard Shipping</p>
              <p className="text-sm text-muted-foreground mt-1">
                Estimated delivery: 3-5 business days
              </p>
            </div>
          </div>

          {/* Order Date */}
          <div className="text-center text-sm text-muted-foreground mb-8">
            <Calendar className="h-4 w-4 inline mr-1" />
            Order placed on {new Date(order.createdAt).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
        </>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <button
          onClick={() => router.push('/orders')}
          className="px-6 py-3 bg-[#516057] text-white rounded-[4px] hover:bg-[#505454] font-medium transition-all flex items-center justify-center gap-2"
        >
          View All Orders
          <ArrowRight className="h-5 w-5" />
        </button>
        <button
          onClick={() => router.push('/marketplace')}
          className="px-6 py-3 border rounded-[4px] hover:bg-muted font-medium transition-all"
        >
          Continue Shopping
        </button>
      </div>
    </div>
  )
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-[#516057] mx-auto mb-4" />
          <p className="text-muted-foreground">Loading order details...</p>
        </div>
      </div>
    }>
      <CheckoutSuccessContent />
    </Suspense>
  )
}

