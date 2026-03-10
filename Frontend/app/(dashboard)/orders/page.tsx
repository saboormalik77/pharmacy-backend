'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { 
  Package, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Truck, 
  CreditCard,
  ChevronRight,
  Search,
  Filter,
  RefreshCw,
  Loader2,
  ShoppingBag,
  Calendar,
  DollarSign,
  TrendingUp,
  Eye,
  Receipt,
  AlertCircle,
  Ban
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils/format'
import { marketplaceService, OrderSummary, Order, PaginationInfo } from '@/lib/api/services/marketplaceService'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent } from '@/components/ui/Card'

type OrderStatus = 'all' | 'pending' | 'processing' | 'paid' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled' | 'refunded'

const statusConfig: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  pending: { label: 'Pending', color: 'bg-amber-100 text-black dark:bg-amber-900/30 dark:text-black', icon: Clock },
  processing: { label: 'Processing', color: 'bg-blue-100 text-black dark:bg-blue-900/30 dark:text-black', icon: RefreshCw },
  paid: { label: 'Paid', color: 'bg-green-100 text-black dark:bg-green-900/30 dark:text-black', icon: CreditCard },
  confirmed: { label: 'Confirmed', color: 'bg-teal-100 text-black dark:bg-teal-900/30 dark:text-black', icon: CheckCircle2 },
  shipped: { label: 'Shipped', color: 'bg-purple-100 text-black dark:bg-purple-900/30 dark:text-black', icon: Truck },
  delivered: { label: 'Delivered', color: 'bg-emerald-100 text-black dark:bg-emerald-900/30 dark:text-black', icon: Package },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-black dark:bg-red-900/30 dark:text-black', icon: XCircle },
  refunded: { label: 'Refunded', color: 'bg-gray-100 text-black dark:bg-gray-900/30 dark:text-black', icon: Ban },
}

function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || statusConfig.pending
  const Icon = config.icon
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${config.color}`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  )
}

export default function OrdersPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<OrderSummary[]>([])
  const [pagination, setPagination] = useState<PaginationInfo | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<OrderStatus>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Stats
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalSpent: 0,
    totalSaved: 0,
    pendingOrders: 0,
  })

  useEffect(() => {
    fetchOrders()
  }, [statusFilter])

  const fetchOrders = async (page: number = 1) => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await marketplaceService.getOrders(page, 10, statusFilter !== 'all' ? statusFilter : undefined)
      setOrders(response.orders)
      setPagination(response.pagination)
      
      // Calculate stats from orders
      const totalSpent = response.orders.reduce((sum, o) => sum + o.totalAmount, 0)
      const totalSaved = response.orders.reduce((sum, o) => sum + o.totalSavings, 0)
      const pendingOrders = response.orders.filter(o => ['pending', 'processing'].includes(o.status)).length
      
      setStats({
        totalOrders: response.pagination.total,
        totalSpent,
        totalSaved,
        pendingOrders,
      })
    } catch (err: any) {
      setError(err.message || 'Failed to load orders')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchOrderDetail = async (orderId: string) => {
    try {
      setIsLoadingDetail(true)
      const order = await marketplaceService.getOrderById(orderId)
      setSelectedOrder(order)
    } catch (err: any) {
      console.error('Failed to load order detail:', err)
    } finally {
      setIsLoadingDetail(false)
    }
  }

  // const handleCancelOrder = async (orderId: string) => {
  //   if (!confirm('Are you sure you want to cancel this order?')) return
    
  //   try {
  //     await marketplaceService.cancelOrder(orderId)
  //     fetchOrders()
  //     if (selectedOrder?.id === orderId) {
  //       setSelectedOrder(null)
  //     }
  //   } catch (err: any) {
  //     alert(err.message || 'Failed to cancel order')
  //   }
  // }

  const filteredOrders = orders.filter(order => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      order.orderNumber.toLowerCase().includes(query) ||
      order.status.toLowerCase().includes(query)
    )
  })

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <DashboardLayout>
      <div className="space-y-2 p-2">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-lg sm:text-xl font-bold flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 sm:h-6 sm:w-6 text-teal-600" />
              My Orders
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Track and manage your marketplace orders
            </p>
          </div>
          {/* <button
            onClick={() => fetchOrders()}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-all shadow-sm font-medium text-sm"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button> */}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          <div className="p-2 rounded-lg border-2 border-teal-200 bg-gradient-to-br from-teal-50 to-teal-100 hover:from-teal-100 hover:to-teal-200 transition-all cursor-pointer shadow-sm hover:shadow-md">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                <ShoppingBag className="h-3 w-3 text-teal-600" />
                <p className="text-[10px] sm:text-xs text-teal-700 font-medium">Total Orders</p>
              </div>
              <p className="text-sm sm:text-base font-bold text-teal-900 whitespace-nowrap">{stats.totalOrders}</p>
            </div>
          </div>

          <div className="p-2 rounded-lg border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100 hover:from-emerald-100 hover:to-emerald-200 transition-all cursor-pointer shadow-sm hover:shadow-md">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                <DollarSign className="h-3 w-3 text-emerald-600" />
                <p className="text-[10px] sm:text-xs text-emerald-700 font-medium">Total Spent</p>
              </div>
              <p className="text-sm sm:text-base font-bold text-emerald-900 whitespace-nowrap">{formatCurrency(stats.totalSpent)}</p>
            </div>
          </div>

          <div className="p-2 rounded-lg border-2 border-violet-200 bg-gradient-to-br from-violet-50 to-violet-100 hover:from-violet-100 hover:to-violet-200 transition-all cursor-pointer shadow-sm hover:shadow-md">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-violet-600" />
                <p className="text-[10px] sm:text-xs text-violet-700 font-medium">Total Saved</p>
              </div>
              <p className="text-sm sm:text-base font-bold text-violet-900 whitespace-nowrap">{formatCurrency(stats.totalSaved)}</p>
            </div>
          </div>

          <div className="p-2 rounded-lg border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100 hover:from-amber-100 hover:to-amber-200 transition-all cursor-pointer shadow-sm hover:shadow-md">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-amber-600" />
                <p className="text-[10px] sm:text-xs text-amber-700 font-medium">Pending</p>
              </div>
              <p className="text-sm sm:text-base font-bold text-amber-900 whitespace-nowrap">{stats.pendingOrders}</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by order number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-teal-600 mb-4" />
            <p className="text-muted-foreground">Loading orders...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          /* Empty State */
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="p-4 bg-muted rounded-full mb-4">
                <ShoppingBag className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-base font-semibold mb-2">No orders found</h3>
              <p className="text-xs text-muted-foreground text-center mb-4 max-w-md">
                {statusFilter !== 'all' 
                  ? `You don't have any ${statusFilter} orders yet.`
                  : "You haven't placed any orders yet. Start shopping in the marketplace!"
                }
              </p>
              <button
                onClick={() => router.push('/marketplace')}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-all font-medium text-xs"
              >
                Browse Marketplace
              </button>
            </CardContent>
          </Card>
        ) : (
          /* Orders Grid */
          <div className="grid gap-2">
            {filteredOrders.map((order) => (
              <Card 
                key={order.id} 
                className="hover:shadow-lg transition-all duration-300 cursor-pointer group overflow-hidden"
                onClick={() => fetchOrderDetail(order.id)}
              >
                <CardContent className="p-0">
                  <div className="flex flex-col lg:flex-row">
                    {/* Order Info */}
                    <div className="flex-1 p-5">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-base font-bold text-teal-600">{order.orderNumber}</h3>
                            <StatusBadge status={order.status} />
                          </div>
                          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                              <Calendar className="h-3 w-3" />
                              {formatDate(order.createdAt)}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Package className="h-3 w-3" />
                              {order.itemCount} {order.itemCount === 1 ? 'item' : 'items'}
                            </span>
                            {order.paymentMethodBrand && order.paymentMethodLast4 && (
                              <span className="flex items-center gap-1.5">
                                <CreditCard className="h-3 w-3" />
                                {order.paymentMethodBrand} •••• {order.paymentMethodLast4}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <p className="text-lg font-bold">{formatCurrency(order.totalAmount)}</p>
                          {order.totalSavings > 0 && (
                            <p className="text-xs text-emerald-600 font-medium flex items-center justify-end gap-1">
                              <TrendingUp className="h-3 w-3" />
                              Saved {formatCurrency(order.totalSavings)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Arrow */}
                    <div className="hidden lg:flex items-center px-4 bg-muted/30 group-hover:bg-teal-50 dark:group-hover:bg-teal-950/30 transition-colors">
                      <ChevronRight className="h-6 w-6 text-muted-foreground group-hover:text-teal-600 transition-colors" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => fetchOrders(pagination.page - 1)}
              disabled={pagination.page <= 1 || isLoading}
              className="px-4 py-2 text-sm font-medium border rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-sm text-muted-foreground">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => fetchOrders(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages || isLoading}
              className="px-4 py-2 text-sm font-medium border rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <>
          <div 
            className="fixed inset-0 bg-black/60 z-50 animate-in fade-in duration-300"
            onClick={() => setSelectedOrder(null)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-card rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] my-auto overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 border">
              {/* Modal Header */}
              <div className="p-4 border-b bg-muted/30">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-teal-600">{selectedOrder.orderNumber}</h2>
                    <p className="text-xs text-muted-foreground mt-1">
                      Placed on {formatDate(selectedOrder.createdAt)}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="p-1.5 hover:bg-muted rounded-lg transition-colors"
                  >
                    <XCircle className="h-5 w-5 text-muted-foreground" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {isLoadingDetail ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
                  </div>
                ) : (
                  <>
                    {/* Status Timeline */}
                    <div className="flex items-center justify-center">
                      <StatusBadge status={selectedOrder.status} />
                    </div>

                    {/* Order Items */}
                    {selectedOrder.items && selectedOrder.items.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                          <Package className="h-3 w-3 text-teal-600" />
                          Order Items
                        </h3>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto">
                          {selectedOrder.items.map((item) => (
                            <div key={item.id} className="flex gap-3 p-3 bg-muted/50 rounded-lg">
                              <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                                <img
                                  src={item.imageUrl || `https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=128&h=128&fit=crop&q=80`}
                                  alt={item.productName}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-xs line-clamp-2">{item.productName}</h4>
                                <div className="flex flex-wrap gap-1.5 mt-1 text-[10px] text-muted-foreground">
                                  {item.ndc && <span className="font-mono">NDC: {item.ndc}</span>}
                                  {item.distributor && <span>• {item.distributor}</span>}
                                </div>
                                <div className="flex items-center gap-1.5 mt-1.5 text-xs">
                                  <span className="text-muted-foreground">Qty: {item.quantity}</span>
                                  <span className="text-muted-foreground">×</span>
                                  <span>{formatCurrency(item.unitPrice)}</span>
                                </div>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className="font-bold text-sm">{formatCurrency(item.lineTotal)}</p>
                                {item.lineSavings > 0 && (
                                  <p className="text-[10px] text-emerald-600 font-medium">
                                    Save {formatCurrency(item.lineSavings)}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Order Summary */}
                    <div className="bg-muted/30 rounded-lg p-3">
                      <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                        <Receipt className="h-3 w-3 text-teal-600" />
                        Order Summary
                      </h3>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Subtotal</span>
                          <span className="font-medium">{formatCurrency(selectedOrder.subtotal)}</span>
                        </div>
                        {selectedOrder.totalSavings > 0 && (
                          <div className="flex justify-between text-emerald-600">
                            <span>Total Savings</span>
                            <span className="font-medium">−{formatCurrency(selectedOrder.totalSavings)}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Tax ({(selectedOrder.taxRate * 100).toFixed(0)}%)</span>
                          <span className="font-medium">{formatCurrency(selectedOrder.taxAmount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Shipping</span>
                          <span className="font-medium text-emerald-600">
                            {selectedOrder.shippingAmount === 0 ? 'Free' : formatCurrency(selectedOrder.shippingAmount)}
                          </span>
                        </div>
                        {selectedOrder.discountAmount > 0 && (
                          <div className="flex justify-between text-orange-600">
                            <span>Discount</span>
                            <span className="font-medium">−{formatCurrency(selectedOrder.discountAmount)}</span>
                          </div>
                        )}
                        <div className="h-px bg-border my-1.5" />
                        <div className="flex justify-between text-sm font-bold">
                          <span>Total</span>
                          <span className="text-teal-600">{formatCurrency(selectedOrder.totalAmount)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Payment Info */}
                    {selectedOrder.paymentMethodBrand && (
                      <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                        <CreditCard className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-xs capitalize">{selectedOrder.paymentMethodBrand}</p>
                          <p className="text-[10px] text-muted-foreground">•••• {selectedOrder.paymentMethodLast4}</p>
                        </div>
                        {selectedOrder.paidAt && (
                          <div className="ml-auto text-right flex-shrink-0">
                            <p className="text-[10px] text-muted-foreground">Paid on</p>
                            <p className="text-xs font-medium">{formatDate(selectedOrder.paidAt)}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Notes */}
                    {selectedOrder.notes && (
                      <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                        <p className="text-xs text-amber-800 dark:text-amber-200">{selectedOrder.notes}</p>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-3 border-t flex items-center justify-between gap-2 bg-muted/30 flex-shrink-0">
                <div className="flex gap-2">
                  {selectedOrder.stripeReceiptUrl && (
                    <a
                      href={selectedOrder.stripeReceiptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded-lg hover:bg-muted transition-colors"
                    >
                      <Receipt className="h-3 w-3" />
                      View Receipt
                    </a>
                  )}
                  {/* {['pending', 'processing'].includes(selectedOrder.status) && (
                    <button
                      onClick={() => handleCancelOrder(selectedOrder.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-destructive border border-destructive/30 rounded-lg hover:bg-destructive/10 transition-colors"
                    >
                      <XCircle className="h-3 w-3" />
                      Cancel Order
                    </button>
                  )} */}
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="px-3 py-1.5 text-xs font-medium bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  )
}

