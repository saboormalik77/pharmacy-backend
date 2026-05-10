'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { 
  Package, 
  ArrowLeft, 
  Loader2, 
  AlertCircle,
  Receipt,
  Truck,
  Calendar,
  CreditCard,
  CheckCircle2,
  Clock,
  XCircle,
  RotateCcw
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils/format'
import { marketplaceService, Order } from '@/lib/api/services/marketplaceService'

export default function OrderDetailPage() {
  const router = useRouter()
  const params = useParams()
  const orderId = params.id as string
  
  const [isLoading, setIsLoading] = useState(true)
  const [isCancelling, setIsCancelling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [order, setOrder] = useState<Order | null>(null)

  useEffect(() => {
    if (orderId) {
      loadOrder()
    }
  }, [orderId])

  const loadOrder = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const orderData = await marketplaceService.getOrderById(orderId)
      setOrder(orderData)
    } catch (err: any) {
      setError(err.message || 'Failed to load order')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancelOrder = async () => {
    if (!order) return
    
    if (!confirm('Are you sure you want to cancel this order?')) return
    
    try {
      setIsCancelling(true)
      setError(null)
      
      await marketplaceService.cancelOrder(orderId)
      
      // Reload order to get updated status
      await loadOrder()
    } catch (err: any) {
      setError(err.message || 'Failed to cancel order')
    } finally {
      setIsCancelling(false)
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
        return 'bg-blue-100 text-black dark:bg-blue-900/30 dark:text-black'
      case 'delivered':
        return 'bg-[#f5f2f1] text-black dark:bg-[#516057]/30 dark:text-black'
      case 'cancelled':
      case 'refunded':
        return 'bg-red-100 text-black dark:bg-red-900/30 dark:text-black'
      default:
        return 'bg-[#f5f2f1] text-black dark:bg-gray-900/30 dark:text-black'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
      case 'confirmed':
      case 'delivered':
        return <CheckCircle2 className="h-5 w-5" />
      case 'pending':
      case 'processing':
        return <Clock className="h-5 w-5" />
      case 'shipped':
        return <Truck className="h-5 w-5" />
      case 'cancelled':
        return <XCircle className="h-5 w-5" />
      case 'refunded':
        return <RotateCcw className="h-5 w-5" />
      default:
        return <Package className="h-5 w-5" />
    }
  }

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return null
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-[#516057] mx-auto mb-4" />
          <p className="text-muted-foreground">Loading order details...</p>
        </div>
      </div>
    )
  }

  if (error && !order) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-2xl text-center">
        <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Error Loading Order</h1>
        <p className="text-muted-foreground mb-6">{error}</p>
        <button
          onClick={() => router.push('/marketplace/orders')}
          className="px-6 py-3 bg-[#516057] text-white rounded-[4px] hover:bg-[#505454] font-medium transition-all"
        >
          Back to Orders
        </button>
      </div>
    )
  }

  if (!order) return null

  const canCancel = ['pending', 'processing'].includes(order.status)

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => router.push('/marketplace/orders')}
          className="p-2 hover:bg-muted rounded-[4px] transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Order {order.orderNumber}</h1>
          <p className="text-muted-foreground text-sm">
            Placed on {formatDateTime(order.createdAt)}
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-[4px] flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          <p className="text-destructive">{error}</p>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Order Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status Card */}
          <div className="bg-card rounded-xl border shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-2 rounded-full ${getStatusColor(order.status)}`}>
                {getStatusIcon(order.status)}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Order Status</p>
                <p className="font-bold text-lg capitalize">{order.status}</p>
              </div>
            </div>
            
            {/* Status Timeline */}
            <div className="border-t pt-4 mt-4">
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${order.createdAt ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span className={order.createdAt ? 'text-foreground' : 'text-muted-foreground'}>
                    Order Placed
                  </span>
                  {order.createdAt && (
                    <span className="text-xs text-muted-foreground ml-auto">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${order.paidAt ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span className={order.paidAt ? 'text-foreground' : 'text-muted-foreground'}>
                    Payment Confirmed
                  </span>
                  {order.paidAt && (
                    <span className="text-xs text-muted-foreground ml-auto">
                      {new Date(order.paidAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${order.shippedAt ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span className={order.shippedAt ? 'text-foreground' : 'text-muted-foreground'}>
                    Shipped
                  </span>
                  {order.shippedAt && (
                    <span className="text-xs text-muted-foreground ml-auto">
                      {new Date(order.shippedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${order.deliveredAt ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span className={order.deliveredAt ? 'text-foreground' : 'text-muted-foreground'}>
                    Delivered
                  </span>
                  {order.deliveredAt && (
                    <span className="text-xs text-muted-foreground ml-auto">
                      {new Date(order.deliveredAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
            <div className="p-4 border-b bg-muted/30">
              <h2 className="font-semibold flex items-center gap-2">
                <Package className="h-5 w-5" />
                Order Items ({order.items?.length || 0})
              </h2>
            </div>
            <div className="divide-y">
              {order.items?.map((item) => (
                <div key={item.id} className="p-4 flex gap-4">
                  <div className="w-16 h-16 bg-muted rounded-[4px] flex items-center justify-center overflow-hidden flex-shrink-0">
                    <Package className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm line-clamp-2">{item.productName}</h3>
                    <div className="flex flex-wrap gap-2 mt-1 text-xs text-muted-foreground">
                      {item.ndc && <span className="font-mono">NDC: {item.ndc}</span>}
                      {item.category && <span>• {item.category}</span>}
                      {item.distributor && <span>• {item.distributor}</span>}
                    </div>
                    <div className="mt-2 flex items-center gap-3 text-sm">
                      <span>Qty: {item.quantity}</span>
                      <span className="text-muted-foreground">×</span>
                      <span>{formatCurrency(item.unitPrice)}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{formatCurrency(item.lineTotal)}</p>
                    {item.lineSavings > 0 && (
                      <p className="text-xs text-green-600 font-medium">
                        Saved {formatCurrency(item.lineSavings)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Order Summary */}
          <div className="bg-card rounded-xl border shadow-sm">
            <div className="p-4 border-b bg-muted/30">
              <h2 className="font-semibold">Order Summary</h2>
            </div>
            <div className="p-4 space-y-3">
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
              {order.discountAmount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount</span>
                  <span>−{formatCurrency(order.discountAmount)}</span>
                </div>
              )}
              <div className="h-px bg-border my-2" />
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>{formatCurrency(order.totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Payment Info */}
          <div className="bg-card rounded-xl border shadow-sm p-4">
            <h3 className="font-semibold flex items-center gap-2 mb-3">
              <CreditCard className="h-5 w-5" />
              Payment
            </h3>
            {order.paymentMethodBrand && order.paymentMethodLast4 ? (
              <div className="flex items-center gap-2">
                <span className="capitalize font-medium">{order.paymentMethodBrand}</span>
                <span className="text-muted-foreground">•••• {order.paymentMethodLast4}</span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {order.status === 'pending' ? 'Awaiting payment' : 'Payment information not available'}
              </p>
            )}
            {order.stripeReceiptUrl && (
              <a
                href={order.stripeReceiptUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-[#516057] hover:underline mt-3"
              >
                <Receipt className="h-4 w-4" />
                View Receipt
              </a>
            )}
          </div>

          {/* Shipping Info */}
          <div className="bg-card rounded-xl border shadow-sm p-4">
            <h3 className="font-semibold flex items-center gap-2 mb-3">
              <Truck className="h-5 w-5" />
              Shipping
            </h3>
            <p className="text-sm">Free Standard Shipping</p>
            <p className="text-sm text-muted-foreground mt-1">
              Estimated delivery: 3-5 business days
            </p>
          </div>

          {/* Actions */}
          {canCancel && (
            <div className="bg-card rounded-xl border shadow-sm p-4">
              <h3 className="font-semibold mb-3">Actions</h3>
              <button
                onClick={handleCancelOrder}
                disabled={isCancelling}
                className="w-full px-4 py-2 border border-destructive text-destructive rounded-[4px] hover:bg-destructive/10 font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isCancelling ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4" />
                    Cancel Order
                  </>
                )}
              </button>
            </div>
          )}

          {/* Notes */}
          {order.notes && (
            <div className="bg-card rounded-xl border shadow-sm p-4">
              <h3 className="font-semibold mb-3">Notes</h3>
              <p className="text-sm text-muted-foreground">{order.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

