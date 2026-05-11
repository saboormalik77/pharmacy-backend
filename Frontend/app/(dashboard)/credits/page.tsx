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
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import Link from 'next/link'
import { pharmacyPaymentService } from '@/lib/api/services'
import type { PharmacyPayment, PharmacyPaymentSummary } from '@/types'
import { DateRangeFilter } from '@/components/checks/DateRangeFilter'
import { ChecksTable } from '@/components/checks/ChecksTable'

const SORT_OPTIONS = [
  { value: 'createdAt', label: 'Date Created' },
  { value: 'paidAt', label: 'Date Paid' },
  { value: 'totalCreditReceived', label: 'Credit Amount' },
  { value: 'pharmacyPayout', label: 'Payout Amount' },
  { value: 'status', label: 'Status' },
  { value: 'batchName', label: 'Batch Name' },
];

export default function CreditsPage() {
  const [payments, setPayments] = useState<PharmacyPayment[]>([]);
  const [summary, setSummary] = useState<PharmacyPaymentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  
  const [activeTab, setActiveTab] = useState<'credits' | 'checks'>('credits');
  
  const [dateFilters, setDateFilters] = useState<{
    dateRange?: string;
    startDate?: string;
    endDate?: string;
  }>({});

  const loadPayments = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params: any = {
        page,
        limit: 10,
        sort: sortBy,
        order: sortOrder,
      };
      
      if (activeTab === 'credits') {
        if (filterStatus) params.status = filterStatus;
      } else {
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
  }, [filterStatus, page, activeTab, dateFilters, sortBy, sortOrder]);

  useEffect(() => {
    setPage(1);
  }, [filterStatus, activeTab, dateFilters, sortBy, sortOrder]);

  const handleDateFilter = (filters: {
    dateRange?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    setDateFilters(filters);
  };

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
      case 'paid': return 'bg-[#516057]/10 text-[#516057] border-[#516057]/20';
      case 'processing': return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'pending': return 'bg-[#ad916a]/20 text-[#6b5a3f] border-[#ad916a]/30';
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-[4px] bg-white border border-[#e2e2e2] shadow-sm">
          <div>
            <h1 className="text-xl font-bold text-[#000000] font-serif">Credits & Payments</h1>
            <p className="text-xs text-[#505454] mt-0.5">
              Track your credit payments, payouts, and payment history
            </p>
          </div>
          <Link href="/credits/statement">
            <Button size="sm" className="bg-[#516057] hover:opacity-90 text-white border-0">
              <FileText className="mr-1 h-3 w-3" />
              View Statements
            </Button>
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-[#e2e2e2] bg-white rounded-t-[4px] p-1">
          <button 
            onClick={() => setActiveTab('credits')}
            className={`px-4 py-2 text-sm font-medium rounded-[4px] border transition-all ${
              activeTab === 'credits' 
                ? 'bg-[#516057] text-white border-[#516057]' 
                : 'bg-white text-[#505454] border-[#e2e2e2] hover:bg-gray-50'
            }`}
          >
            Credits ({summary?.totalPayments || 0})
          </button>
          <button 
            onClick={() => setActiveTab('checks')}
            className={`px-4 py-2 text-sm font-medium rounded-[4px] border transition-all ${
              activeTab === 'checks' 
                ? 'bg-[#516057] text-white border-[#516057]' 
                : 'bg-white text-[#505454] border-[#e2e2e2] hover:bg-gray-50'
            }`}
          >
            Checks ({summary?.totalPayments || 0})
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'credits' ? (
          <>
            {/* Summary Stats */}
        {loading && !summary ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#516057]" />
          </div>
        ) : error && !summary ? (
          <Card className="border border-red-200 bg-red-50 rounded-[4px]">
            <CardContent className="p-4 text-center">
              <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
              <p className="text-red-700 font-medium">{error}</p>
              <Button size="sm" className="mt-2 bg-[#516057]" onClick={loadPayments}>Retry</Button>
            </CardContent>
          </Card>
        ) : summary ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
              <div className="p-3 rounded-[4px] border border-[#e2e2e2] bg-white shadow-sm">
                <div className="flex items-center gap-1 mb-1">
                  <DollarSign className="h-3 w-3 text-[#516057]" />
                  <p className="text-xs text-[#505454] font-medium">Total Credits</p>
                </div>
                <p className="text-xl font-bold text-[#000000]">{formatCurrency(summary.totalCredits)}</p>
                <p className="text-xs text-[#6b7280] mt-1">{summary.totalPayments} payments</p>
              </div>
              <div className="p-3 rounded-[4px] border border-[#e2e2e2] bg-white shadow-sm">
                <div className="flex items-center gap-1 mb-1">
                  <Banknote className="h-3 w-3 text-[#516057]" />
                  <p className="text-xs text-[#505454] font-medium">Total Payout</p>
                </div>
                <p className="text-xl font-bold text-[#000000]">{formatCurrency(summary.totalPayout)}</p>
                <p className="text-xs text-[#6b7280] mt-1">Net after fees</p>
              </div>
              <div className="p-3 rounded-[4px] border border-[#e2e2e2] bg-white shadow-sm">
                <div className="flex items-center gap-1 mb-1">
                  <Receipt className="h-3 w-3 text-[#ad916a]" />
                  <p className="text-xs text-[#505454] font-medium">Total Fees</p>
                </div>
                <p className="text-xl font-bold text-[#000000]">{formatCurrency(summary.totalFees)}</p>
                <p className="text-xs text-[#6b7280] mt-1">Company + GPO</p>
              </div>
              <div className="p-3 rounded-[4px] border border-[#e2e2e2] bg-white shadow-sm">
                <div className="flex items-center gap-1 mb-1">
                  <CheckCircle2 className="h-3 w-3 text-[#516057]" />
                  <p className="text-xs text-[#505454] font-medium">Paid</p>
                </div>
                <p className="text-xl font-bold text-[#000000]">{formatCurrency(summary.paidPayouts)}</p>
                <p className="text-xs text-[#6b7280] mt-1">{summary.paidCount} paid</p>
              </div>
              <div className="p-3 rounded-[4px] border border-[#e2e2e2] bg-white shadow-sm">
                <div className="flex items-center gap-1 mb-1">
                  <Clock className="h-3 w-3 text-[#ad916a]" />
                  <p className="text-xs text-[#505454] font-medium">Pending</p>
                </div>
                <p className="text-xl font-bold text-[#000000]">{formatCurrency(summary.pendingPayouts)}</p>
                <p className="text-xs text-[#6b7280] mt-1">{summary.pendingCount} pending</p>
              </div>
              <div className="p-3 rounded-[4px] border border-[#e2e2e2] bg-white shadow-sm">
                <div className="flex items-center gap-1 mb-1">
                  <BarChart3 className="h-3 w-3 text-[#516057]" />
                  <p className="text-xs text-[#505454] font-medium">Payout Rate</p>
                </div>
                <p className="text-xl font-bold text-[#000000]">
                  {summary.totalCredits > 0
                    ? ((summary.totalPayout / summary.totalCredits) * 100).toFixed(1)
                    : 0}%
                </p>
                <p className="text-xs text-[#6b7280] mt-1">Of credits received</p>
              </div>
            </div>

            {/* Fee Transparency Notice */}
            <Card className="border border-[#e2e2e2] bg-white rounded-[4px]">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-[4px] bg-[#f5f2f1]">
                    <Info className="h-4 w-4 text-[#516057] flex-shrink-0" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-[#000000] mb-1 font-serif">Payout Breakdown</p>
                    <p className="text-xs text-[#505454] leading-relaxed">
                      Each payment shows the total credit received from manufacturers, the company processing fee,
                      any GPO share, and your net payout amount. View detailed statements for complete per-batch breakdowns.
                    </p>
                  </div>
                  <Link href="/credits/statement">
                    <Button size="sm" variant="outline" className="border-[#516057] text-[#516057] hover:bg-[#516057]/10 whitespace-nowrap rounded-[4px]">
                      <ArrowRight className="mr-1 h-3 w-3" />
                      Statements
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </>
        ) : null}

        {/* Filters and Sorting */}
        <Card className="border border-[#e2e2e2] bg-white rounded-[4px]">
          <CardContent className="p-3">
            <div className="flex flex-wrap gap-3 items-center">
              {/* Status Filters */}
              <div className="flex gap-2 flex-wrap">
                {[
                  { value: '', label: 'All', color: 'bg-gray-100 text-gray-700 border-gray-300' },
                  { value: 'pending', label: 'Pending', color: 'bg-[#ad916a]/20 text-[#6b5a3f] border-[#ad916a]/30' },
                  { value: 'processing', label: 'Processing', color: 'bg-blue-100 text-blue-700 border-blue-300' },
                  { value: 'paid', label: 'Paid', color: 'bg-[#516057]/10 text-[#516057] border-[#516057]/20' },
                  { value: 'failed', label: 'Failed', color: 'bg-red-100 text-red-700 border-red-300' },
                  { value: 'disputed', label: 'Disputed', color: 'bg-red-100 text-red-700 border-red-300' },
                ].map((status) => (
                  <Button
                    key={status.value}
                    variant={filterStatus === status.value ? 'primary' : 'outline'}
                    size="sm"
                    className={`h-7 text-xs px-3 rounded-[4px] ${filterStatus === status.value ? status.color : 'border-[#e2e2e2] text-[#505454]'}`}
                    onClick={() => setFilterStatus(status.value)}
                  >
                    {status.label}
                  </Button>
                ))}
              </div>

              {/* Sorting Controls */}
              <div className="flex items-center gap-2 ml-auto">
                <label className="text-xs font-medium text-[#6b7280]">Sort by:</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-2 py-1 text-xs border border-[#e2e2e2] rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#516057] bg-white"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="flex items-center gap-1 px-2 py-1 text-xs border border-[#e2e2e2] rounded-[4px] bg-white hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-[#516057]"
                  title={`Sort ${sortOrder === 'asc' ? 'ascending' : 'descending'}`}
                >
                  {sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                  <span className="hidden sm:inline">{sortOrder === 'asc' ? 'Asc' : 'Desc'}</span>
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payments Table */}
        <Card className="border border-[#e2e2e2] bg-white rounded-[4px]">
          <CardHeader className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-[4px] bg-[#f5f2f1]">
                  <Package className="h-4 w-4 text-[#516057]" />
                </div>
                <div>
                  <CardTitle className="text-base text-[#000000] font-serif">Payment History</CardTitle>
                  <CardDescription className="text-xs text-[#6b7280]">
                    {total} payment{total !== 1 ? 's' : ''} found
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-[#516057]" />
                <span className="ml-2 text-sm text-[#6b7280]">Loading payments...</span>
              </div>
            ) : payments.length === 0 ? (
              <div className="text-center py-12 text-[#6b7280]">
                <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">No payments found</p>
                <p className="text-xs mt-1">Payment records will appear here once payouts are processed.</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border border-[var(--outline)]" style={{ borderColor: 'var(--outline)' }}>
                    {/* Table Header - Nordic Healthcare Spec */}
                    <thead 
                      className="bg-[var(--surface-container-low)] border-b" 
                      style={{ borderColor: 'var(--outline)', borderBottomWidth: '1.5px' }}
                    >
                      <tr className="bg-[var(--surface-container-low)]">
                        <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-[#505454] border-r border-[var(--outline)]">
                          Date
                        </th>
                        <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-[#505454] border-r border-[var(--outline)]">
                          Batch
                        </th>
                        <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-[#505454] border-r border-[var(--outline)]">
                          Credit Received
                        </th>
                        <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-[#505454] border-r border-[var(--outline)]">
                          Company Fee
                        </th>
                        <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-[#505454] border-r border-[var(--outline)]">
                          Your Payout
                        </th>
                        <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-[#505454] border-r border-[var(--outline)]">
                          Method
                        </th>
                        <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-[#505454] border-r border-[var(--outline)]">
                          Reference
                        </th>
                        <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-[#505454] border-r border-[var(--outline)]">
                          Paid At
                        </th>
                        <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-[#505454]">
                          Status
                        </th>
                      </tr>
                    </thead>

                    {/* Table Body */}
                    <tbody className="divide-y" style={{ borderColor: 'var(--outline-variant)' }}>
                      {payments.map((payment) => (
                        <tr 
                          key={payment.id} 
                          className="hover:bg-[var(--surface-container)] transition-colors border-b"
                          style={{ borderColor: 'var(--outline-variant)' }}
                        >
                          <td className="px-3 py-3 border-r border-[var(--outline-variant)]">
                            <span className="text-sm text-[#000000]">{formatDate(payment.createdAt)}</span>
                          </td>
                          <td className="px-3 py-3 border-r border-[var(--outline-variant)]">
                            <span className="text-sm font-medium text-[#000000]">{payment.batchName || '—'}</span>
                          </td>
                          <td className="px-3 py-3 border-r border-[var(--outline-variant)]">
                            <span className="text-sm font-bold text-[#516057]">{formatCurrency(payment.totalCreditReceived)}</span>
                          </td>
                          <td className="px-3 py-3 border-r border-[var(--outline-variant)]">
                            <span className="text-sm text-[#ad916a]">{formatCurrency(payment.companyFee)}</span>
                            <span className="text-sm text-[#9ca3af] ml-1">({payment.companyFeePercent}%)</span>
                          </td>
                          <td className="px-3 py-3 border-r border-[var(--outline-variant)]">
                            <span className="text-sm font-bold text-[#516057]">{formatCurrency(payment.pharmacyPayout)}</span>
                          </td>
                          <td className="px-3 py-3 border-r border-[var(--outline-variant)]">
                            <span className="text-sm text-[#505454]">{getMethodLabel(payment.paymentMethod)}</span>
                          </td>
                          <td className="px-3 py-3 border-r border-[var(--outline-variant)]">
                            <span className="text-sm font-mono text-[#6b7280]">{payment.paymentReference || '—'}</span>
                          </td>
                          <td className="px-3 py-3 border-r border-[var(--outline-variant)]">
                            <span className="text-sm text-[#505454]">{payment.paidAt ? formatDate(payment.paidAt) : '—'}</span>
                          </td>
                          <td className="px-3 py-3">
                            <Badge
                              variant={getStatusVariant(payment.status)}
                              className={`text-xs border ${getStatusColor(payment.status)}`}
                            >
                              {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-[#e2e2e2] bg-white mt-4 rounded-b-[4px]">
                    <p className="text-sm text-[#6b7280] font-medium">
                      Page <span className="font-bold text-[#000000]">{page}</span> of <span className="font-bold text-[#000000]">{totalPages}</span> (<span className="font-bold text-[#000000]">{total}</span> total)
                    </p>
                    <div className="flex items-center gap-1">
                      {/* Previous Button */}
                      <button 
                        onClick={() => setPage(p => Math.max(1, p - 1))} 
                        disabled={page <= 1} 
                        className="p-1.5 border border-[#e2e2e2] rounded-[4px] disabled:opacity-40 hover:bg-[#f5f2f1] transition-colors"
                        title="Previous page"
                      >
                        <ChevronLeft className="w-4 h-4 text-[#505454]" />
                      </button>

                      {/* Page Numbers */}
                      {(() => {
                        const pages = [];
                        
                        if (totalPages <= 7) {
                          // Show all pages if 7 or fewer
                          for (let i = 1; i <= totalPages; i++) {
                            pages.push(i);
                          }
                        } else {
                          // Always show first page
                          pages.push(1);
                          
                          if (page <= 4) {
                            // Show pages 1,2,3,4,5...last
                            for (let i = 2; i <= 5; i++) {
                              pages.push(i);
                            }
                            if (totalPages > 6) pages.push('...');
                            pages.push(totalPages);
                          } else if (page >= totalPages - 3) {
                            // Show pages 1...last-4,last-3,last-2,last-1,last
                            if (totalPages > 6) pages.push('...');
                            for (let i = totalPages - 4; i <= totalPages; i++) {
                              pages.push(i);
                            }
                          } else {
                            // Show pages 1...current-1,current,current+1...last
                            pages.push('...');
                            for (let i = page - 1; i <= page + 1; i++) {
                              pages.push(i);
                            }
                            pages.push('...');
                            pages.push(totalPages);
                          }
                        }
                        
                        return pages.map((pageNum, index) => 
                          pageNum === '...' ? (
                            <span key={`ellipsis-${index}`} className="px-2 py-1.5 text-sm text-[#9ca3af]">...</span>
                          ) : (
                            <button
                              key={pageNum}
                              onClick={() => setPage(pageNum as number)}
                              className={`px-3 py-1.5 text-sm border rounded-[4px] transition-colors ${
                                pageNum === page
                                  ? 'border-[#516057] bg-[#516057] text-white font-semibold'
                                  : 'border-[#e2e2e2] text-[#505454] hover:bg-[#f5f2f1]'
                              }`}
                            >
                              {pageNum}
                            </button>
                          )
                        );
                      })()}

                      {/* Next Button */}
                      <button 
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
                        disabled={page >= totalPages} 
                        className="p-1.5 border border-[#e2e2e2] rounded-[4px] disabled:opacity-40 hover:bg-[#f5f2f1] transition-colors"
                        title="Next page"
                      >
                        <ChevronRight className="w-4 h-4 text-[#505454]" />
                      </button>
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
            <DateRangeFilter 
              onFilter={handleDateFilter}
              loading={loading}
            />

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
