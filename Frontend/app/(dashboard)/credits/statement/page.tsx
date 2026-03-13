"use client";

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import {
  ArrowLeft,
  Download,
  DollarSign,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  FileText,
  Banknote,
  Receipt,
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import Link from 'next/link'
import { pharmacyPaymentService } from '@/lib/api/services'
import type { PharmacyPayment, PharmacyPaymentSummary } from '@/types'

export default function CreditStatementPage() {
  const [payments, setPayments] = useState<PharmacyPayment[]>([]);
  const [summary, setSummary] = useState<PharmacyPaymentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const loadPayments = async () => {
    try {
      setLoading(true);
      setError(null);
      const params: Record<string, any> = { page, limit: 25 };
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      const result = await pharmacyPaymentService.getMyPayments(params);
      setPayments(result.data);
      setSummary(result.summary);
      setTotalPages(result.pagination.totalPages);
      setTotal(result.pagination.total);
    } catch (err: any) {
      setError(err.message || 'Failed to load statement data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, [page]);

  // Reset page and reload when date filters change
  const applyDateFilter = () => {
    setPage(1);
    loadPayments();
  };

  const clearDateFilter = () => {
    setStartDate('');
    setEndDate('');
    setPage(1);
    // loadPayments will be triggered by page change effect
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

  const handleDownload = () => {
    if (payments.length === 0) return;
    const headers = ['Date', 'Batch', 'Month', 'Credit Received', 'Company Fee', 'Fee %', 'GPO Share', 'GPO Name', 'Payout', 'Method', 'Reference', 'Paid At', 'Status'];
    const rows = payments.map(p => [
      p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '',
      p.batchName || '',
      p.batchMonth || '',
      p.totalCreditReceived,
      p.companyFee,
      p.companyFeePercent,
      p.gpoShare,
      p.gpoName || '',
      p.pharmacyPayout,
      p.paymentMethod || '',
      p.paymentReference || '',
      p.paidAt ? new Date(p.paidAt).toLocaleDateString() : '',
      p.status,
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `credit-statement-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-lg bg-gradient-to-r from-teal-50 via-cyan-50 to-teal-50 border-2 border-teal-200">
          <div className="flex items-center gap-3">
            <Link href="/credits">
              <Button size="sm" variant="outline" className="border-teal-300 text-teal-700 hover:bg-teal-100">
                <ArrowLeft className="h-3 w-3" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Credit Statements</h1>
              <p className="text-xs text-gray-600 mt-0.5">
                Detailed payout records with downloadable statements
              </p>
            </div>
          </div>
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white border-0"
            onClick={handleDownload}
            disabled={payments.length === 0}
          >
            <Download className="mr-1 h-3 w-3" />
            Download CSV
          </Button>
        </div>

        {/* Summary Row */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="p-3 rounded-lg border-2 border-teal-200 bg-gradient-to-br from-teal-50 to-teal-100">
              <div className="flex items-center gap-1 mb-1">
                <DollarSign className="h-3 w-3 text-teal-600" />
                <p className="text-xs text-teal-700 font-medium">Total Credits</p>
              </div>
              <p className="text-lg font-bold text-teal-900">{formatCurrency(summary.totalCredits)}</p>
            </div>
            <div className="p-3 rounded-lg border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100">
              <div className="flex items-center gap-1 mb-1">
                <Receipt className="h-3 w-3 text-amber-600" />
                <p className="text-xs text-amber-700 font-medium">Total Fees</p>
              </div>
              <p className="text-lg font-bold text-amber-900">{formatCurrency(summary.totalFees)}</p>
            </div>
            <div className="p-3 rounded-lg border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100">
              <div className="flex items-center gap-1 mb-1">
                <Banknote className="h-3 w-3 text-emerald-600" />
                <p className="text-xs text-emerald-700 font-medium">Total Payout</p>
              </div>
              <p className="text-lg font-bold text-emerald-900">{formatCurrency(summary.totalPayout)}</p>
            </div>
            <div className="p-3 rounded-lg border-2 border-cyan-200 bg-gradient-to-br from-cyan-50 to-cyan-100">
              <div className="flex items-center gap-1 mb-1">
                <CheckCircle2 className="h-3 w-3 text-cyan-600" />
                <p className="text-xs text-cyan-700 font-medium">Payments</p>
              </div>
              <p className="text-lg font-bold text-cyan-900">{summary.paidCount} paid / {summary.pendingCount} pending</p>
            </div>
          </div>
        )}

        {/* Date Filters */}
        <Card className="border-2 border-teal-200 bg-gradient-to-br from-white to-teal-50/30">
          <CardContent className="p-3">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-8 text-xs border-teal-200 w-40"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-8 text-xs border-teal-200 w-40"
                />
              </div>
              <Button size="sm" className="h-8 text-xs bg-teal-600 hover:bg-teal-700 text-white" onClick={applyDateFilter}>
                <Calendar className="mr-1 h-3 w-3" />
                Apply
              </Button>
              {(startDate || endDate) && (
                <Button size="sm" variant="outline" className="h-8 text-xs border-gray-300" onClick={clearDateFilter}>
                  Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Statement Table */}
        <Card className="border-2 border-teal-200 bg-gradient-to-br from-white to-teal-50/30">
          <CardHeader className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-teal-100">
                <FileText className="h-4 w-4 text-teal-600" />
              </div>
              <div>
                <CardTitle className="text-base text-gray-900">Payment Statement</CardTitle>
                <CardDescription className="text-xs text-gray-600">
                  {total} record{total !== 1 ? 's' : ''}
                  {startDate && ` from ${startDate}`}
                  {endDate && ` to ${endDate}`}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
                <span className="ml-2 text-sm text-gray-500">Loading statement...</span>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                <p className="text-red-700 font-medium">{error}</p>
                <Button size="sm" className="mt-2" onClick={loadPayments}>Retry</Button>
              </div>
            ) : payments.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">No records found</p>
                <p className="text-xs mt-1">Adjust your date filters or check back later.</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gradient-to-r from-teal-100 to-cyan-100 border-b-2 border-teal-200">
                      <tr>
                        <th className="text-left p-2 font-bold text-teal-900">#</th>
                        <th className="text-left p-2 font-bold text-teal-900">Date</th>
                        <th className="text-left p-2 font-bold text-teal-900">Batch</th>
                        <th className="text-left p-2 font-bold text-teal-900">Month</th>
                        <th className="text-right p-2 font-bold text-teal-900">Credit Received</th>
                        <th className="text-right p-2 font-bold text-teal-900">Company Fee</th>
                        <th className="text-right p-2 font-bold text-teal-900">GPO Share</th>
                        <th className="text-right p-2 font-bold text-teal-900">Your Payout</th>
                        <th className="text-left p-2 font-bold text-teal-900">Method</th>
                        <th className="text-left p-2 font-bold text-teal-900">Reference</th>
                        <th className="text-left p-2 font-bold text-teal-900">Paid At</th>
                        <th className="text-left p-2 font-bold text-teal-900">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((payment, idx) => (
                        <tr
                          key={payment.id}
                          className={`border-b ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-teal-50 transition-colors`}
                        >
                          <td className="p-2 text-gray-400">{(page - 1) * 25 + idx + 1}</td>
                          <td className="p-2">{formatDate(payment.createdAt)}</td>
                          <td className="p-2 font-medium">{payment.batchName || '—'}</td>
                          <td className="p-2">{payment.batchMonth || '—'}</td>
                          <td className="p-2 text-right font-bold text-teal-700">{formatCurrency(payment.totalCreditReceived)}</td>
                          <td className="p-2 text-right text-amber-700">
                            {formatCurrency(payment.companyFee)}
                            <span className="text-gray-400 ml-1">({payment.companyFeePercent}%)</span>
                          </td>
                          <td className="p-2 text-right text-gray-600">
                            {payment.gpoShare > 0 ? (
                              <>
                                {formatCurrency(payment.gpoShare)}
                                {payment.gpoName && <span className="text-gray-400 ml-1 block text-[10px]">{payment.gpoName}</span>}
                              </>
                            ) : '—'}
                          </td>
                          <td className="p-2 text-right font-bold text-emerald-700">{formatCurrency(payment.pharmacyPayout)}</td>
                          <td className="p-2 capitalize">{payment.paymentMethod || '—'}</td>
                          <td className="p-2 font-mono text-gray-500">{payment.paymentReference || '—'}</td>
                          <td className="p-2">{payment.paidAt ? formatDate(payment.paidAt) : '—'}</td>
                          <td className="p-2">
                            <Badge
                              variant={getStatusVariant(payment.status)}
                              className={`text-xs border-2 ${getStatusColor(payment.status)}`}
                            >
                              {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {/* Totals Row */}
                    <tfoot className="bg-gradient-to-r from-teal-50 to-cyan-50 border-t-2 border-teal-300">
                      <tr className="font-bold">
                        <td className="p-2" colSpan={4}>Statement Total</td>
                        <td className="p-2 text-right text-teal-800">
                          {formatCurrency(payments.reduce((s, p) => s + p.totalCreditReceived, 0))}
                        </td>
                        <td className="p-2 text-right text-amber-800">
                          {formatCurrency(payments.reduce((s, p) => s + p.companyFee, 0))}
                        </td>
                        <td className="p-2 text-right text-gray-700">
                          {formatCurrency(payments.reduce((s, p) => s + p.gpoShare, 0))}
                        </td>
                        <td className="p-2 text-right text-emerald-800">
                          {formatCurrency(payments.reduce((s, p) => s + p.pharmacyPayout, 0))}
                        </td>
                        <td className="p-2" colSpan={4}></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-xs text-gray-500">
                      Page {page} of {totalPages} ({total} total records)
                    </p>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        disabled={page <= 1}
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                      >
                        Previous
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
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
      </div>
    </DashboardLayout>
  );
}
