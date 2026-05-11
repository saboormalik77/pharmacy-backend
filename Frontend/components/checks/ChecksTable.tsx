"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { 
  Search, 
  ExternalLink, 
  Loader2, 
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Package,
  Eye
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';
import type { PharmacyPayment } from '@/types';

interface ChecksTableProps {
  payments: PharmacyPayment[];
  loading?: boolean;
  error?: string | null;
  pagination?: {
    page: number;
    totalPages: number;
    total: number;
  };
  onPageChange?: (page: number) => void;
  onSearch?: (search: string) => void;
}

export function ChecksTable({ 
  payments, 
  loading = false, 
  error = null, 
  pagination,
  onPageChange,
  onSearch 
}: ChecksTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (onSearch) {
      onSearch(query);
    }
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const openCheckPdf = async (checkNumber: string) => {
    if (!checkNumber) {
      alert('Check number not available');
      return;
    }

    try {
      const { pharmacyPaymentService } = await import('@/lib/api/services');
      const pdfBlob = await pharmacyPaymentService.getCheckPdf(checkNumber);
      
      const pdfUrl = URL.createObjectURL(pdfBlob);
      const newWindow = window.open(pdfUrl, '_blank');
      
      if (newWindow) {
        newWindow.onload = () => {
          URL.revokeObjectURL(pdfUrl);
        };
      } else {
        URL.revokeObjectURL(pdfUrl);
        alert('Please allow popups for this site to view PDFs.');
      }
    } catch (error) {
      console.error('Error opening check PDF:', error);
      alert('Failed to open check PDF. Please try again.');
    }
  };

  const getPaymentTypeLabel = (type?: string) => {
    switch (type) {
      case 'ocs': return 'OCS';
      case 'por': return 'POR';
      case 'direct': return 'Direct';
      default: return 'OCS';
    }
  };

  const getPaymentTypeBadge = (type?: string) => {
    switch (type) {
      case 'ocs': return 'bg-[#516057]/10 text-[#516057] border-[#516057]/20';
      case 'por': return 'bg-[#ad916a]/20 text-[#6b5a3f] border-[#ad916a]/30';
      case 'direct': return 'bg-blue-100 text-blue-700 border-blue-300';
      default: return 'bg-[#516057]/10 text-[#516057] border-[#516057]/20';
    }
  };

  const totals = payments.reduce((acc, payment) => {
    acc.checkAmount += payment.pharmacyPayout || 0;
    acc.creditIncluded += payment.includedCreditAmount || payment.totalCreditReceived || 0;
    acc.rsiFee += payment.companyFee || 0;
    acc.manufacturerDirectFee += (payment.directCreditAmount || 0) * ((payment.rsiFeeDirectPercent || 14.90) / 100);
    return acc;
  }, {
    checkAmount: 0,
    creditIncluded: 0,
    rsiFee: 0,
    manufacturerDirectFee: 0
  });

  if (error) {
    return (
      <Card className="border border-[#e2e2e2] rounded-[4px]">
        <CardContent className="p-6 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Checks</h3>
          <p className="text-red-700">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-[#e2e2e2] rounded-[4px]">
      <CardHeader className="p-4 border-b border-[#e2e2e2]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-[4px] bg-[#f5f2f1]">
              <Package className="h-5 w-5 text-[#516057]" />
            </div>
            <div>
              <CardTitle className="text-lg text-[#000000] font-serif">Check History</CardTitle>
              <p className="text-sm text-[#6b7280]">
                {pagination ? `${pagination.total} check${pagination.total !== 1 ? 's' : ''} found` : `${payments.length} checks`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="search" className="text-sm text-[#505454] whitespace-nowrap">
              Search:
            </label>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9ca3af]" />
              <Input
                id="search"
                type="text"
                placeholder=""
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-8 w-48 h-8 text-sm border-[#e2e2e2] rounded-[4px]"
              />
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {loading ? (
          <TableSkeleton rows={10} />
        ) : payments.length === 0 ? (
          <div className="text-center py-12 text-[#6b7280]">
            <Package className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No checks found</p>
            <p className="text-sm mt-1">Check records will appear here once payments are processed.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full border border-[var(--outline)] text-sm" style={{ borderColor: 'var(--outline)' }}>
                {/* Table Header - Nordic Healthcare Spec */}
                <thead 
                  className="bg-[var(--surface-container-low)] border-b" 
                  style={{ borderColor: 'var(--outline)', borderBottomWidth: '1.5px' }}
                >
                  <tr className="bg-[var(--surface-container-low)]">
                    <th 
                      className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-[#505454] border-r border-[var(--outline)] cursor-pointer hover:bg-[var(--surface-container)]"
                      onClick={() => handleSort('serviceDate')}
                    >
                      Return Date
                    </th>
                    <th 
                      className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-[#505454] border-r border-[var(--outline)] cursor-pointer hover:bg-[var(--surface-container)]"
                      onClick={() => handleSort('returnReferenceNumber')}
                    >
                      Reference Number
                    </th>
                    <th 
                      className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-[#505454] border-r border-[var(--outline)] cursor-pointer hover:bg-[var(--surface-container)]"
                      onClick={() => handleSort('checkDate')}
                    >
                      Date Paid
                    </th>
                    <th 
                      className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-[#505454] border-r border-[var(--outline)] cursor-pointer hover:bg-[var(--surface-container)]"
                      onClick={() => handleSort('checkNumber')}
                    >
                      Check Number
                    </th>
                    <th 
                      className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-[#505454] border-r border-[var(--outline)] cursor-pointer hover:bg-[var(--surface-container)]"
                      onClick={() => handleSort('pharmacyPayout')}
                    >
                      Check Amount
                    </th>
                    <th 
                      className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-[#505454] border-r border-[var(--outline)] cursor-pointer hover:bg-[var(--surface-container)]"
                      onClick={() => handleSort('includedCreditAmount')}
                    >
                      Credit Included
                    </th>
                    <th 
                      className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-[#505454] border-r border-[var(--outline)] cursor-pointer hover:bg-[var(--surface-container)]"
                      onClick={() => handleSort('companyFee')}
                    >
                      RSI Credit Fee
                    </th>
                    <th 
                      className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-[#505454] border-r border-[var(--outline)]"
                    >
                      Manufacturer<br />Direct Credit Fee
                    </th>
                    <th 
                      className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-[#505454] cursor-pointer hover:bg-[var(--surface-container)]"
                      onClick={() => handleSort('paymentType')}
                    >
                      Credit Type
                    </th>
                  </tr>
                </thead>

                {/* Table Body */}
                <tbody className="divide-y" style={{ borderColor: 'var(--outline-variant)' }}>
                  {payments.map((payment, index) => {
                    const manufacturerDirectFee = (payment.directCreditAmount || 0) * ((payment.rsiFeeDirectPercent || 14.90) / 100);
                    
                    return (
                      <tr 
                        key={payment.id} 
                        className="hover:bg-[var(--surface-container)] transition-colors border-b"
                        style={{ borderColor: 'var(--outline-variant)' }}
                      >
                        <td className="px-3 py-3 text-sm border-r border-[var(--outline-variant)]">
                          {payment.serviceDate ? formatDate(payment.serviceDate) : formatDate(payment.createdAt)}
                        </td>
                        <td className="px-3 py-3 text-sm font-mono border-r border-[var(--outline-variant)]">
                          {payment.returnReferenceNumber || '—'}
                        </td>
                        <td className="px-3 py-3 text-sm border-r border-[var(--outline-variant)]">
                          {payment.checkDate ? formatDate(payment.checkDate) : (payment.paidAt ? formatDate(payment.paidAt) : '—')}
                        </td>
                        <td className="px-3 py-3 text-sm border-r border-[var(--outline-variant)]">
                          {payment.checkNumber ? (
                            <button
                              onClick={() => openCheckPdf(payment.checkNumber!)}
                              className="text-[#516057] hover:text-[#3d4343] hover:underline font-medium cursor-pointer flex items-center gap-1"
                            >
                              {payment.checkNumber}
                              <ExternalLink className="h-3 w-3" />
                            </button>
                          ) : (
                            <span className="text-[#9ca3af]">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-sm font-semibold text-[#516057] border-r border-[var(--outline-variant)]">
                          {formatCurrency(payment.pharmacyPayout || 0)}
                        </td>
                        <td className="px-3 py-3 text-sm border-r border-[var(--outline-variant)]">
                          {formatCurrency(payment.includedCreditAmount || payment.totalCreditReceived || 0)}
                        </td>
                        <td className="px-3 py-3 text-sm border-r border-[var(--outline-variant)]">
                          {formatCurrency(payment.companyFee || 0)}
                        </td>
                        <td className="px-3 py-3 text-sm border-r border-[var(--outline-variant)]">
                          {formatCurrency(manufacturerDirectFee)}
                        </td>
                        <td className="px-3 py-3 text-sm">
                          <Badge
                            variant="secondary"
                            className={`text-xs border ${getPaymentTypeBadge(payment.paymentType)}`}
                          >
                            {getPaymentTypeLabel(payment.paymentType)}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                
                {/* Totals footer */}
                <tfoot 
                  className="bg-[var(--surface-container-low)] border-t-2" 
                  style={{ borderColor: 'var(--outline)' }}
                >
                  <tr>
                    <th colSpan={4} className="p-3 text-right text-sm font-normal text-[#505454] border-r border-[var(--outline)]">
                      TOTALS:
                    </th>
                    <th className="p-3 text-center text-sm font-normal text-[#505454] border-r border-[var(--outline)]">
                      {formatCurrency(totals.checkAmount)}
                    </th>
                    <th className="p-3 text-center text-sm font-normal text-[#505454] border-r border-[var(--outline)]">
                      {formatCurrency(totals.creditIncluded)}
                    </th>
                    <th className="p-3 text-center text-sm font-normal text-[#505454] border-r border-[var(--outline)]">
                      {formatCurrency(totals.rsiFee)}
                    </th>
                    <th className="p-3 text-center text-sm font-normal text-[#505454] border-r border-[var(--outline)]">
                      {formatCurrency(totals.manufacturerDirectFee)}
                    </th>
                    <th className="p-3"></th>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-[#e2e2e2] bg-white">
                <div className="text-sm text-[#6b7280]">
                  Showing {(pagination.page - 1) * 10 + 1} to {Math.min(pagination.page * 10, pagination.total)} of {pagination.total} entries
                </div>
                
                <div className="flex items-center gap-1">
                  {/* Previous Button */}
                  <button 
                    onClick={() => onPageChange?.(pagination.page - 1)} 
                    disabled={pagination.page <= 1} 
                    className="p-1.5 border border-[#e2e2e2] rounded-[4px] disabled:opacity-40 hover:bg-[#f5f2f1] transition-colors"
                    title="Previous page"
                  >
                    <ChevronLeft className="w-4 h-4 text-[#505454]" />
                  </button>

                  {/* Page Numbers */}
                  {(() => {
                    const pages = [];
                    
                    if (pagination.totalPages <= 7) {
                      // Show all pages if 7 or fewer
                      for (let i = 1; i <= pagination.totalPages; i++) {
                        pages.push(i);
                      }
                    } else {
                      // Always show first page
                      pages.push(1);
                      
                      if (pagination.page <= 4) {
                        // Show pages 1,2,3,4,5...last
                        for (let i = 2; i <= 5; i++) {
                          pages.push(i);
                        }
                        if (pagination.totalPages > 6) pages.push('...');
                        pages.push(pagination.totalPages);
                      } else if (pagination.page >= pagination.totalPages - 3) {
                        // Show pages 1...last-4,last-3,last-2,last-1,last
                        if (pagination.totalPages > 6) pages.push('...');
                        for (let i = pagination.totalPages - 4; i <= pagination.totalPages; i++) {
                          pages.push(i);
                        }
                      } else {
                        // Show pages 1...current-1,current,current+1...last
                        pages.push('...');
                        for (let i = pagination.page - 1; i <= pagination.page + 1; i++) {
                          pages.push(i);
                        }
                        pages.push('...');
                        pages.push(pagination.totalPages);
                      }
                    }
                    
                    return pages.map((pageNum, index) => 
                      pageNum === '...' ? (
                        <span key={`ellipsis-${index}`} className="px-2 py-1.5 text-sm text-[#9ca3af]">...</span>
                      ) : (
                        <button
                          key={pageNum}
                          onClick={() => onPageChange?.(pageNum as number)}
                          className={`px-3 py-1.5 text-sm border rounded-[4px] transition-colors ${
                            pageNum === pagination.page
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
                    onClick={() => onPageChange?.(pagination.page + 1)} 
                    disabled={pagination.page >= pagination.totalPages} 
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
  );
}
