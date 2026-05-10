'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Package, 
  ArrowLeft, 
  Loader2, 
  AlertCircle,
  ChevronRight,
  Calendar,
  CreditCard,
  Search,
  Filter,
  ShoppingBag
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils/format'
import { marketplaceService, OrderSummary, PaginationInfo } from '@/lib/api/services/marketplaceService'

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Orders' },
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'paid', label: 'Paid' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'refunded', label: 'Refunded' },
]

export default function OrdersPage() {
  const router = useRouter()
  
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [orders, setOrders] = useState<OrderSummary[]>([])
  const [pagination, setPagination] = useState<PaginationInfo | null>(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    loadOrders()
  }, [statusFilter, currentPage])

  const loadOrders = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await marketplaceService.getOrders(
        currentPage,
        10,
        statusFilter === 'all' ? undefined : statusFilter
      )
      
      setOrders(response.orders)
      setPagination(response.pagination)
    } catch (err: any) {
      setError(err.message || 'Failed to load orders')
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => router.push('/marketplace')}
          className="p-2 hover:bg-muted rounded-[4px] transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold">My Orders</h1>
          <p className="text-muted-foreground text-sm">View and track your marketplace orders</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              setCurrentPage(1)
            }}
            className="w-full pl-10 pr-4 py-2.5 border rounded-[4px] bg-background focus:outline-none focus:ring-2 focus:ring-[#516057] appearance-none cursor-pointer"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-[4px] flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-destructive">{error}</p>
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading ? (
        <div className="py-16 text-center">
          <Loader2 className="h-10 w-10 animate-spin text-[#516057] mx-auto mb-4" />
          <p className="text-muted-foreground">Loading orders...</p>
        </div>
      ) : orders.length === 0 ? (
        /* Empty State */
        <div className="py-16 text-center">
          <ShoppingBag className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No orders found</h3>
          <p className="text-muted-foreground mb-6">
            {statusFilter !== 'all' 
              ? `You don't have any ${statusFilter} orders.`
              : "You haven't placed any orders yet."}
          </p>
          <button
            onClick={() => router.push('/marketplace')}
            className="px-6 py-2.5 bg-[#516057] text-white rounded-[4px] hover:bg-[#505454] font-medium transition-all"
          >
            Browse Marketplace
          </button>
        </div>
      ) : (
        <>
          {/* Orders List */}
          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                onClick={() => router.push(`/marketplace/orders/${order.id}`)}
                className="bg-card rounded-xl border shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden group"
              >
                <div className="p-4 sm:p-6">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-mono font-bold text-lg">{order.orderNumber}</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Package className="h-4 w-4" />
                          {order.itemCount} {order.itemCount === 1 ? 'item' : 'items'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {formatDate(order.createdAt)}
                        </span>
                        {order.paymentMethodBrand && order.paymentMethodLast4 && (
                          <span className="flex items-center gap-1">
                            <CreditCard className="h-4 w-4" />
                            <span className="capitalize">{order.paymentMethodBrand}</span> ••••{order.paymentMethodLast4}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-bold text-lg">{formatCurrency(order.totalAmount)}</p>
                        {order.totalSavings > 0 && (
                          <p className="text-xs text-green-600 font-medium">
                            Saved {formatCurrency(order.totalSavings)}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 border rounded-[4px] hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-sm text-muted-foreground">
                Page {currentPage} of {pagination.totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))}
                disabled={currentPage === pagination.totalPages}
                className="px-4 py-2 border rounded-[4px] hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

