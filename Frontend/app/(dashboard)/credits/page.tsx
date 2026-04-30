"use client";

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { PermissionGuard } from '@/components/shared/PermissionGuard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { 
  Search, 
  Download, 
  DollarSign,
  Calendar,
  Package,
  Info,
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  BarChart3,
  Loader2,
  FileText,
  Banknote,
  Receipt,
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import Link from 'next/link'
import { pharmacyPaymentService } from '@/lib/api/services'
import type { PharmacyPayment, PharmacyPaymentSummary } from '@/types'
import { DateRangeFilter } from '@/components/checks/DateRangeFilter'
import { ChecksTable } from '@/components/checks/ChecksTable'

export default function CreditsPage() {
  const [payments, setPayments] = useState<PharmacyPayment[]>([]);
  const [summary, setSummary] = useState<PharmacyPaymentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  
  // Tab state for Credits vs Checks
  const [activeTab, setActiveTab] = useState<'credits' | 'checks'>('credits');
  
  // Date range filters for checks
  const [dateFilters, setDateFilters] = useState<{
    dateRange?: string;
    startDate?: string;
    endDate?: string;
  }>({});

  const loadPayments = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Build parameters based on active tab
      const params: any = {
        page,
        limit: 20,
      };
      
      // Add filters based on active tab
      if (activeTab === 'credits') {
        if (filterStatus) params.status = filterStatus;
      } else {
        // For checks tab, include date filters
        if (dateFilters.dateRange) params.dateRange = dateFilters.dateRange;
        if (dateFilters.startDate) params.startDate = dateFilters.startDate;
        if (dateFilters.endDate) params.endDate = dateFilters.endDate;
      }
      
      const result = await pharmacyPaymentService.getMyPayments(params);
      setPayments(result.data);
      setSummary(result.summary);
      setTotalPages(result.pagination.totalPages);
      setTotal(result.pagination.total);
    } catch (err: any) {
      setError(err.message || 'Failed to load payment data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, [filterStatus, page, activeTab, dateFilters]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [filterStatus, activeTab, dateFilters]);

  // Handle date range filter changes
  const handleDateFilter = (filters: {
    dateRange?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    setDateFilters(filters);
  };

  // Handle page changes for checks table
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'paid': return 'success';
      case 'processing': return 'info';
      case 'pending': return 'warning';
      case 'failed': return 'error';
      case 'disputed': return 'error';
      default: return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-emerald-100 text-emerald-700 border-emerald-300';
      case 'processing': return 'bg-cyan-100 text-cyan-700 border-cyan-300';
      case 'pending': return 'bg-amber-100 text-amber-700 border-amber-300';
      case 'failed': return 'bg-red-100 text-red-700 border-red-300';
      case 'disputed': return 'bg-red-100 text-red-700 border-red-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getMethodLabel = (method: string | null) => {
    if (!method) return '—';
    return method.charAt(0).toUpperCase() + method.slice(1);
  };

  return (
    <DashboardLayout>
      <PermissionGuard permission="credits:view">
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-lg bg-gradient-to-r from-teal-50 via-cyan-50 to-teal-50 border-2 border-teal-200">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Credits & Payments</h1>
            <p className="text-xs text-gray-600 mt-0.5">
              Track your credit payments, payouts, and payment history
            </p>
          </div>
          <Link href="/credits/statement">
            <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white border-0">
              <FileText className="mr-1 h-3 w-3" />
              View Statements
            </Button>
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b-2 border-gray-200 bg-white rounded-t-lg p-1">
          <button 
            onClick={() => setActiveTab('credits')}
            className={`px-4 py-2 text-sm font-medium rounded-lg border-2 transition-all ${
              activeTab === 'credits' 
                ? 'bg-teal-100 text-teal-700 border-teal-300 shadow-md scale-105' 
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            Credits ({summary?.totalPayments || 0})
          </button>
          <button 
            onClick={() => setActiveTab('checks')}
            className={`px-4 py-2 text-sm font-medium rounded-lg border-2 transition-all ${
              activeTab === 'checks' 
                ? 'bg-cyan-100 text-cyan-700 border-cyan-300 shadow-md scale-105' 
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            Checks ({summary?.totalPayments || 0})
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'credits' ? (
          /* Credits Tab Content */
          <>
            {/* Summary Stats */}
        {loading && !summary ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
          </div>
        ) : error && !summary ? (
          <Card className="border-2 border-red-200 bg-red-50">
            <CardContent className="p-4 text-center">
              <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
              <p className="text-red-700 font-medium">{error}</p>
              <Button size="sm" className="mt-2" onClick={loadPayments}>Retry</Button>
            </CardContent>
          </Card>
        ) : summary ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
              <div className="p-3 rounded-lg border-2 border-teal-200 bg-gradient-to-br from-teal-50 to-teal-100">
                <div className="flex items-center gap-1 mb-1">
                  <DollarSign className="h-3 w-3 text-teal-600" />
                  <p className="text-xs text-teal-700 font-medium">Total Credits</p>
                </div>
                <p className="text-xl font-bold text-teal-900">{formatCurrency(summary.totalCredits)}</p>
                <p className="text-xs text-teal-700 mt-1">{summary.totalPayments} payments</p>
              </div>
              <div className="p-3 rounded-lg border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100">
                <div className="flex items-center gap-1 mb-1">
                  <Banknote className="h-3 w-3 text-emerald-600" />
                  <p className="text-xs text-emerald-700 font-medium">Total Payout</p>
                </div>
                <p className="text-xl font-bold text-emerald-900">{formatCurrency(summary.totalPayout)}</p>
                <p className="text-xs text-emerald-700 mt-1">Net after fees</p>
              </div>
              <div className="p-3 rounded-lg border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100">
                <div className="flex items-center gap-1 mb-1">
                  <Receipt className="h-3 w-3 text-amber-600" />
                  <p className="text-xs text-amber-700 font-medium">Total Fees</p>
                </div>
                <p className="text-xl font-bold text-amber-900">{formatCurrency(summary.totalFees)}</p>
                <p className="text-xs text-amber-700 mt-1">Company + GPO</p>
              </div>
              <div className="p-3 rounded-lg border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100">
                <div className="flex items-center gap-1 mb-1">
                  <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                  <p className="text-xs text-emerald-700 font-medium">Paid</p>
                </div>
                <p className="text-xl font-bold text-emerald-900">{formatCurrency(summary.paidPayouts)}</p>
                <p className="text-xs text-emerald-700 mt-1">{summary.paidCount} paid</p>
              </div>
              <div className="p-3 rounded-lg border-2 border-cyan-200 bg-gradient-to-br from-cyan-50 to-cyan-100">
                <div className="flex items-center gap-1 mb-1">
                  <Clock className="h-3 w-3 text-cyan-600" />
                  <p className="text-xs text-cyan-700 font-medium">Pending</p>
                </div>
                <p className="text-xl font-bold text-cyan-900">{formatCurrency(summary.pendingPayouts)}</p>
                <p className="text-xs text-cyan-700 mt-1">{summary.pendingCount} pending</p>
              </div>
              <div className="p-3 rounded-lg border-2 border-teal-200 bg-gradient-to-br from-teal-50 to-teal-100">
                <div className="flex items-center gap-1 mb-1">
                  <BarChart3 className="h-3 w-3 text-teal-600" />
                  <p className="text-xs text-teal-700 font-medium">Payout Rate</p>
                </div>
                <p className="text-xl font-bold text-teal-900">
                  {summary.totalCredits > 0
                    ? ((summary.totalPayout / summary.totalCredits) * 100).toFixed(1)
                    : 0}%
                </p>
                <p className="text-xs text-teal-700 mt-1">Of credits received</p>
              </div>
            </div>

            {/* Fee Transparency Notice */}
            <Card className="border-2 border-cyan-200 bg-gradient-to-r from-cyan-50 via-teal-50 to-cyan-50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-cyan-100">
                    <Info className="h-4 w-4 text-cyan-600 flex-shrink-0" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-cyan-900 mb-1">Payout Breakdown</p>
                    <p className="text-xs text-cyan-800 leading-relaxed">
                      Each payment shows the total credit received from manufacturers, the company processing fee,
                      any GPO share, and your net payout amount. View detailed statements for complete per-batch breakdowns.
                    </p>
                  </div>
                  <Link href="/credits/statement">
                    <Button size="sm" variant="outline" className="border-cyan-300 text-cyan-700 hover:bg-cyan-100 whitespace-nowrap">
                      <ArrowRight className="mr-1 h-3 w-3" />
                      Statements
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </>
        ) : null}

        {/* Filters */}
        <Card className="border-2 border-teal-200 bg-gradient-to-br from-white to-teal-50/30">
          <CardContent className="p-3">
            <div className="flex gap-2 flex-wrap">
              {[
                { value: '', label: 'All', color: 'bg-slate-100 text-slate-700 border-slate-300' },
                { value: 'pending', label: 'Pending', color: 'bg-amber-100 text-amber-700 border-amber-300' },
                { value: 'processing', label: 'Processing', color: 'bg-cyan-100 text-cyan-700 border-cyan-300' },
                { value: 'paid', label: 'Paid', color: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
                { value: 'failed', label: 'Failed', color: 'bg-red-100 text-red-700 border-red-300' },
                { value: 'disputed', label: 'Disputed', color: 'bg-red-100 text-red-700 border-red-300' },
              ].map((status) => (
                <Button
                  key={status.value}
                  variant={filterStatus === status.value ? 'primary' : 'outline'}
                  size="sm"
                  className={`h-7 text-xs px-3 border-2 ${filterStatus === status.value ? status.color : 'border-gray-300'}`}
                  onClick={() => setFilterStatus(status.value)}
                >
                  {status.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Payments Table */}
        <Card className="border-2 border-teal-200 bg-gradient-to-br from-white to-teal-50/30">
          <CardHeader className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-teal-100">
                  <Package className="h-4 w-4 text-teal-600" />
                </div>
                <div>
                  <CardTitle className="text-base text-gray-900">Payment History</CardTitle>
                  <CardDescription className="text-xs text-gray-600">
                    {total} payment{total !== 1 ? 's' : ''} found
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
                <span className="ml-2 text-sm text-gray-500">Loading payments...</span>
              </div>
            ) : payments.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">No payments found</p>
                <p className="text-xs mt-1">Payment records will appear here once payouts are processed.</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full table-auto">
                    <thead>
                      <tr className="bg-gradient-to-r from-teal-600 to-teal-700 border-b-2 border-teal-800">
                        <th className="text-left px-4 py-3.5 text-xs font-semibold text-white uppercase tracking-wider">Date</th>
                        <th className="text-left px-4 py-3.5 text-xs font-semibold text-white uppercase tracking-wider">Batch</th>
                        <th className="text-left px-4 py-3.5 text-xs font-semibold text-white uppercase tracking-wider">Credit Received</th>
                        <th className="text-left px-4 py-3.5 text-xs font-semibold text-white uppercase tracking-wider">Company Fee</th>
                        <th className="text-left px-4 py-3.5 text-xs font-semibold text-white uppercase tracking-wider">GPO Share</th>
                        <th className="text-left px-4 py-3.5 text-xs font-semibold text-white uppercase tracking-wider">Your Payout</th>
                        <th className="text-left px-4 py-3.5 text-xs font-semibold text-white uppercase tracking-wider">Method</th>
                        <th className="text-left px-4 py-3.5 text-xs font-semibold text-white uppercase tracking-wider">Reference</th>
                        <th className="text-left px-4 py-3.5 text-xs font-semibold text-white uppercase tracking-wider">Paid At</th>
                        <th className="text-left px-4 py-3.5 text-xs font-semibold text-white uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((payment, idx) => {
                        const isEven = idx % 2 === 0;
                        return (
                        <tr
                          key={payment.id}
                          className={`border-b border-gray-100 hover:bg-teal-50 transition-colors ${isEven ? 'bg-white' : 'bg-teal-50/40'}`}
                        >
                          <td className="px-4 py-3"><span className="text-sm text-gray-900">{formatDate(payment.createdAt)}</span></td>
                          <td className="px-4 py-3"><span className="text-sm font-medium text-gray-900">{payment.batchName || '—'}</span></td>
                          <td className="px-4 py-3"><span className="text-sm font-bold text-teal-700">{formatCurrency(payment.totalCreditReceived)}</span></td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-amber-700">{formatCurrency(payment.companyFee)}</span>
                            <span className="text-sm text-gray-400 ml-1">({payment.companyFeePercent}%)</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-gray-600">{payment.gpoShare > 0 ? (
                              <>
                                {formatCurrency(payment.gpoShare)}
                                {payment.gpoName && <span className="text-sm text-gray-400 ml-1">({payment.gpoName})</span>}
                              </>
                            ) : '—'}</span>
                          </td>
                          <td className="px-4 py-3"><span className="text-sm font-bold text-emerald-700">{formatCurrency(payment.pharmacyPayout)}</span></td>
                          <td className="px-4 py-3"><span className="text-sm text-gray-700">{getMethodLabel(payment.paymentMethod)}</span></td>
                          <td className="px-4 py-3"><span className="text-sm font-mono text-gray-600">{payment.paymentReference || '—'}</span></td>
                          <td className="px-4 py-3"><span className="text-sm text-gray-700">{payment.paidAt ? formatDate(payment.paidAt) : '—'}</span></td>
                          <td className="px-4 py-3">
                            <Badge
                              variant={getStatusVariant(payment.status)}
                              className={`text-xs border-2 ${getStatusColor(payment.status)}`}
                            >
                              {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                            </Badge>
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
                    <p className="text-sm text-gray-600 font-medium">
                      Page {page} of {totalPages} ({total} total)
                    </p>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs hover:bg-teal-50"
                        disabled={page <= 1}
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                      >
                        Previous
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs hover:bg-teal-50"
                        disabled={page >= totalPages}
                        onClick={() => setPage(p => p + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
          </>
        ) : (
          /* Checks Tab Content */
          <>
            {/* Date Range Filter for Checks */}
            <DateRangeFilter 
              onFilter={handleDateFilter}
              loading={loading}
            />

            {/* Checks Table */}
            <ChecksTable
              payments={payments}
              loading={loading}
              error={error}
              pagination={totalPages > 1 ? {
                page,
                totalPages,
                total
              } : undefined}
              onPageChange={handlePageChange}
            />
          </>
        )}
      </div>
      </PermissionGuard>
    </DashboardLayout>
  )
}
