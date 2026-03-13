'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
    Search, Loader2, ChevronLeft, ChevronRight, X,
    DollarSign, Clock, AlertCircle, Send, CreditCard,
    TrendingUp, TrendingDown, BarChart3,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ToastContainer, Toast } from '@/components/ui/Toast';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import { useDebounce } from '@/lib/hooks/useDebounce';
import {
    fetchUnpaidMemos, recordPayment, sendPaymentReminder,
    fetchAskVsReceived, fetchManufacturerSummary, clearError,
} from '@/lib/store/paymentTrackingSlice';
import { DebitMemo, AskVsReceivedRow, ManufacturerPaymentSummary } from '@/lib/types';

type TabKey = 'unpaid' | 'askVsReceived' | 'manufacturers';

function fmt(v: number | null | undefined) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v ?? 0);
}

function pct(v: number | null | undefined) {
    return `${(v ?? 0).toFixed(1)}%`;
}

function getPaymentBadge(s: string): { variant: 'success' | 'warning' | 'danger' | 'default' } {
    switch (s) {
        case 'paid': return { variant: 'success' };
        case 'partial': return { variant: 'warning' };
        case 'disputed': return { variant: 'danger' };
        default: return { variant: 'default' };
    }
}

export default function UnpaidMemosPage() {
    const dispatch = useAppDispatch();
    const {
        unpaidMemos, unpaidPagination, unpaidSummary,
        askVsReceived, askVsReceivedTotals,
        manufacturerSummary, manufacturerPagination,
        isLoading, isActionLoading, error,
    } = useAppSelector(s => s.paymentTracking);

    const [activeTab, setActiveTab] = useState<TabKey>('unpaid');
    const [search, setSearch] = useState('');
    const [mfgSearch, setMfgSearch] = useState('');
    const debouncedSearch = useDebounce(search, 400);
    const debouncedMfgSearch = useDebounce(mfgSearch, 400);
    const [destination, setDestination] = useState('');
    const [page, setPage] = useState(1);
    const [mfgPage, setMfgPage] = useState(1);
    const [analyticsGroupBy, setAnalyticsGroupBy] = useState<'manufacturer' | 'period'>('manufacturer');

    // Payment modal
    const [paymentMemo, setPaymentMemo] = useState<(DebitMemo & { daysOutstanding?: number; outstandingAmount?: number }) | null>(null);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [paymentRef, setPaymentRef] = useState('');
    const [paymentNotes, setPaymentNotes] = useState('');

    // Reminder modal
    const [reminderMemo, setReminderMemo] = useState<DebitMemo | null>(null);
    const [reminderEmail, setReminderEmail] = useState('');

    const [toasts, setToasts] = useState<Toast[]>([]);

    const addToast = useCallback((message: string, type: Toast['type']) => {
        setToasts(prev => [...prev, { id: Date.now().toString(), message, type }]);
    }, []);
    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    // Fetch unpaid on tab + filter changes
    useEffect(() => {
        if (activeTab === 'unpaid') {
            dispatch(fetchUnpaidMemos({
                search: debouncedSearch || undefined,
                destination: destination || undefined,
                page,
            }));
        }
    }, [dispatch, activeTab, debouncedSearch, destination, page]);

    // Fetch analytics
    useEffect(() => {
        if (activeTab === 'askVsReceived') {
            dispatch(fetchAskVsReceived({ groupBy: analyticsGroupBy }));
        }
    }, [dispatch, activeTab, analyticsGroupBy]);

    // Fetch manufacturer summary
    useEffect(() => {
        if (activeTab === 'manufacturers') {
            dispatch(fetchManufacturerSummary({
                search: debouncedMfgSearch || undefined,
                page: mfgPage,
            }));
        }
    }, [dispatch, activeTab, debouncedMfgSearch, mfgPage]);

    useEffect(() => {
        if (error) {
            addToast(error, 'error');
            dispatch(clearError());
        }
    }, [error, addToast, dispatch]);

    // ── Handlers ─────────────────────────────────────────────

    const openPaymentModal = (memo: DebitMemo & { outstandingAmount?: number }) => {
        setPaymentMemo(memo);
        setPaymentAmount(String(memo.outstandingAmount ?? (memo.amountRequested - memo.amountReceived)));
        setPaymentDate(new Date().toISOString().split('T')[0]);
        setPaymentRef('');
        setPaymentNotes('');
    };

    const handleRecordPayment = async () => {
        if (!paymentMemo) return;
        const amt = parseFloat(paymentAmount);
        if (isNaN(amt) || amt < 0) { addToast('Enter a valid amount', 'error'); return; }
        const result = await dispatch(recordPayment({
            memoId: paymentMemo.id,
            amountReceived: amt,
            paymentDate: new Date(paymentDate).toISOString(),
            reference: paymentRef || undefined,
            notes: paymentNotes || undefined,
        }));
        if (recordPayment.fulfilled.match(result)) {
            addToast(`Payment of ${fmt(amt)} recorded for ${paymentMemo.memoNumber}`, 'success');
            setPaymentMemo(null);
            dispatch(fetchUnpaidMemos({ search: debouncedSearch || undefined, destination: destination || undefined, page }));
        }
    };

    const handleSendReminder = async () => {
        if (!reminderMemo) return;
        const result = await dispatch(sendPaymentReminder({
            memoId: reminderMemo.id,
            emailOverride: reminderEmail || undefined,
        }));
        if (sendPaymentReminder.fulfilled.match(result)) {
            addToast(`Payment reminder sent for ${reminderMemo.memoNumber}`, 'success');
            setReminderMemo(null);
            setReminderEmail('');
        }
    };

    // ── Tab nav ─────────────────────────────────────────────

    const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
        { key: 'unpaid', label: 'Unpaid Memos', icon: <DollarSign className="w-4 h-4" /> },
        { key: 'askVsReceived', label: 'Ask vs Received', icon: <BarChart3 className="w-4 h-4" /> },
        { key: 'manufacturers', label: 'Manufacturer Summary', icon: <TrendingUp className="w-4 h-4" /> },
    ];

    // ── Render ───────────────────────────────────────────────

    return (
        <div className="space-y-6">
            <ToastContainer toasts={toasts} onClose={removeToast} />

            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Payment Tracking</h1>
                <p className="text-sm text-gray-500 mt-1">
                    Track manufacturer payments, record receipts, and view ask-vs-received analytics.
                </p>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="flex gap-6">
                    {tabs.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-colors ${
                                activeTab === tab.key
                                    ? 'border-primary-500 text-primary-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* ─── TAB 1: Unpaid Memos ─────────────────────────── */}
            {activeTab === 'unpaid' && (
                <div className="space-y-4">
                    {/* Summary cards */}
                    {unpaidSummary && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
                                <div className="p-3 bg-red-50 rounded-lg">
                                    <AlertCircle className="w-6 h-6 text-red-500" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Unpaid Memos</p>
                                    <p className="text-2xl font-bold text-gray-900">{unpaidSummary.totalUnpaid}</p>
                                </div>
                            </div>
                            <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
                                <div className="p-3 bg-orange-50 rounded-lg">
                                    <DollarSign className="w-6 h-6 text-orange-500" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Total Outstanding</p>
                                    <p className="text-2xl font-bold text-gray-900">{fmt(unpaidSummary.totalOutstanding)}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Filters */}
                    <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-3 items-center">
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                value={search}
                                onChange={e => { setSearch(e.target.value); setPage(1); }}
                                placeholder="Search memos, manufacturer, pharmacy..."
                                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            />
                        </div>
                        <select
                            value={destination}
                            onChange={e => { setDestination(e.target.value); setPage(1); }}
                            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                        >
                            <option value="">All Destinations</option>
                            <option value="Inmar">Inmar</option>
                            <option value="PharmaLink">PharmaLink</option>
                            <option value="Cardinal">Cardinal</option>
                            <option value="Direct">Direct</option>
                        </select>
                    </div>

                    {/* Table */}
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-20">
                                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                            </div>
                        ) : unpaidMemos.length === 0 ? (
                            <div className="text-center py-20 text-gray-500">
                                <DollarSign className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                <p className="font-medium">No unpaid memos found</p>
                                <p className="text-sm mt-1">All debit memos have been paid.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            <th className="text-left px-4 py-3 font-medium text-gray-600">Memo #</th>
                                            <th className="text-left px-4 py-3 font-medium text-gray-600">Manufacturer</th>
                                            <th className="text-left px-4 py-3 font-medium text-gray-600">Pharmacy</th>
                                            <th className="text-left px-4 py-3 font-medium text-gray-600">Destination</th>
                                            <th className="text-right px-4 py-3 font-medium text-gray-600">Asked</th>
                                            <th className="text-right px-4 py-3 font-medium text-gray-600">Received</th>
                                            <th className="text-right px-4 py-3 font-medium text-gray-600">Outstanding</th>
                                            <th className="text-center px-4 py-3 font-medium text-gray-600">Days</th>
                                            <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
                                            <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {unpaidMemos.map(memo => {
                                            const outstanding = (memo as any).outstandingAmount ?? (memo.amountRequested - memo.amountReceived);
                                            const days = (memo as any).daysOutstanding ?? 0;
                                            return (
                                                <tr key={memo.id} className="hover:bg-gray-50">
                                                    <td className="px-4 py-3 font-medium text-gray-900">{memo.memoNumber}</td>
                                                    <td className="px-4 py-3 text-gray-600">{memo.labelerName || '—'}</td>
                                                    <td className="px-4 py-3 text-gray-600">{(memo as any).pharmacyName || '—'}</td>
                                                    <td className="px-4 py-3 text-gray-600">{memo.destination || '—'}</td>
                                                    <td className="px-4 py-3 text-right font-medium">{fmt(memo.amountRequested)}</td>
                                                    <td className="px-4 py-3 text-right">{fmt(memo.amountReceived)}</td>
                                                    <td className="px-4 py-3 text-right font-semibold text-red-600">{fmt(outstanding)}</td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className={`inline-flex items-center gap-1 ${days > 30 ? 'text-red-600 font-semibold' : days > 14 ? 'text-orange-500' : 'text-gray-600'}`}>
                                                            <Clock className="w-3.5 h-3.5" />
                                                            {days}d
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <Badge variant={getPaymentBadge(memo.paymentStatus).variant}>
                                                            {memo.paymentStatus}
                                                        </Badge>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <Button
                                                                variant="primary"
                                                                size="sm"
                                                                onClick={() => openPaymentModal(memo)}
                                                            >
                                                                <CreditCard className="w-3.5 h-3.5 mr-1" />
                                                                Pay
                                                            </Button>
                                                            <Button
                                                                variant="warning"
                                                                size="sm"
                                                                onClick={() => setReminderMemo(memo)}
                                                            >
                                                                <Send className="w-3.5 h-3.5 mr-1" />
                                                                Remind
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Pagination */}
                        {unpaidPagination && unpaidPagination.totalPages > 1 && (
                            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
                                <span className="text-sm text-gray-500">
                                    Page {unpaidPagination.page} of {unpaidPagination.totalPages} ({unpaidPagination.total} memos)
                                </span>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                                        <ChevronLeft className="w-4 h-4" />
                                    </Button>
                                    <Button variant="outline" size="sm" disabled={page >= unpaidPagination.totalPages} onClick={() => setPage(p => p + 1)}>
                                        <ChevronRight className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ─── TAB 2: Ask vs Received ──────────────────────── */}
            {activeTab === 'askVsReceived' && (
                <div className="space-y-4">
                    {/* Totals cards */}
                    {askVsReceivedTotals && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-white rounded-xl border border-gray-200 p-5">
                                <p className="text-sm text-gray-500">Total Memos</p>
                                <p className="text-xl font-bold text-gray-900 mt-1">{askVsReceivedTotals.totalMemos ?? 0}</p>
                            </div>
                            <div className="bg-white rounded-xl border border-gray-200 p-5">
                                <p className="text-sm text-gray-500">Total Ask</p>
                                <p className="text-xl font-bold text-gray-900 mt-1">{fmt(askVsReceivedTotals.totalAskValue)}</p>
                            </div>
                            <div className="bg-white rounded-xl border border-gray-200 p-5">
                                <p className="text-sm text-gray-500">Total Received</p>
                                <p className="text-xl font-bold text-green-600 mt-1">{fmt(askVsReceivedTotals.totalReceived)}</p>
                            </div>
                            <div className="bg-white rounded-xl border border-gray-200 p-5">
                                <p className="text-sm text-gray-500">Overall Pay %</p>
                                <p className="text-xl font-bold text-gray-900 mt-1 flex items-center gap-2">
                                    {pct(askVsReceivedTotals.overallPayPercent)}
                                    {askVsReceivedTotals.overallPayPercent >= 80 ? (
                                        <TrendingUp className="w-5 h-5 text-green-500" />
                                    ) : (
                                        <TrendingDown className="w-5 h-5 text-red-500" />
                                    )}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Group toggle */}
                    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
                        <span className="text-sm text-gray-600 font-medium">Group by:</span>
                        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                            <button
                                onClick={() => setAnalyticsGroupBy('manufacturer')}
                                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                                    analyticsGroupBy === 'manufacturer' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                Manufacturer
                            </button>
                            <button
                                onClick={() => setAnalyticsGroupBy('period')}
                                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                                    analyticsGroupBy === 'period' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                Monthly
                            </button>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-20">
                                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                            </div>
                        ) : askVsReceived.length === 0 ? (
                            <div className="text-center py-20 text-gray-500">
                                <BarChart3 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                <p className="font-medium">No data available</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            <th className="text-left px-4 py-3 font-medium text-gray-600">
                                                {analyticsGroupBy === 'manufacturer' ? 'Manufacturer' : 'Period'}
                                            </th>
                                            <th className="text-center px-4 py-3 font-medium text-gray-600">Memos</th>
                                            <th className="text-right px-4 py-3 font-medium text-gray-600">Total Ask</th>
                                            <th className="text-right px-4 py-3 font-medium text-gray-600">Total Received</th>
                                            <th className="text-right px-4 py-3 font-medium text-gray-600">Difference</th>
                                            <th className="text-center px-4 py-3 font-medium text-gray-600">Pay %</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {askVsReceived.map((row: AskVsReceivedRow, i: number) => (
                                            <tr key={i} className="hover:bg-gray-50">
                                                <td className="px-4 py-3 font-medium text-gray-900">
                                                    {analyticsGroupBy === 'manufacturer' ? (row.labelerName || row.labelerId || '—') : (row.period || '—')}
                                                </td>
                                                <td className="px-4 py-3 text-center">{row.memoCount}</td>
                                                <td className="px-4 py-3 text-right">{fmt(row.totalAskValue)}</td>
                                                <td className="px-4 py-3 text-right text-green-600 font-medium">{fmt(row.totalReceived)}</td>
                                                <td className="px-4 py-3 text-right text-red-600">{fmt(row.difference)}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`font-semibold ${row.payPercent >= 80 ? 'text-green-600' : row.payPercent >= 50 ? 'text-orange-500' : 'text-red-600'}`}>
                                                        {pct(row.payPercent)}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ─── TAB 3: Manufacturer Summary ─────────────────── */}
            {activeTab === 'manufacturers' && (
                <div className="space-y-4">
                    {/* Search */}
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <div className="relative max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                value={mfgSearch}
                                onChange={e => { setMfgSearch(e.target.value); setMfgPage(1); }}
                                placeholder="Search manufacturer..."
                                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            />
                        </div>
                    </div>

                    {/* Table */}
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-20">
                                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                            </div>
                        ) : manufacturerSummary.length === 0 ? (
                            <div className="text-center py-20 text-gray-500">
                                <TrendingUp className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                <p className="font-medium">No manufacturers found</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            <th className="text-left px-4 py-3 font-medium text-gray-600">Manufacturer</th>
                                            <th className="text-center px-4 py-3 font-medium text-gray-600">Total</th>
                                            <th className="text-center px-4 py-3 font-medium text-gray-600">Unpaid</th>
                                            <th className="text-center px-4 py-3 font-medium text-gray-600">Paid</th>
                                            <th className="text-right px-4 py-3 font-medium text-gray-600">Ask Value</th>
                                            <th className="text-right px-4 py-3 font-medium text-gray-600">Paid Amt</th>
                                            <th className="text-right px-4 py-3 font-medium text-gray-600">Outstanding</th>
                                            <th className="text-center px-4 py-3 font-medium text-gray-600">Avg Pay %</th>
                                            <th className="text-center px-4 py-3 font-medium text-gray-600">Avg Days</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {manufacturerSummary.map((row: ManufacturerPaymentSummary, i: number) => (
                                            <tr key={i} className="hover:bg-gray-50">
                                                <td className="px-4 py-3">
                                                    <p className="font-medium text-gray-900">{row.labelerName || '—'}</p>
                                                    {row.labelerId && <p className="text-xs text-gray-400">{row.labelerId}</p>}
                                                </td>
                                                <td className="px-4 py-3 text-center">{row.totalMemos}</td>
                                                <td className="px-4 py-3 text-center">
                                                    {row.unpaidMemos > 0
                                                        ? <span className="text-red-600 font-semibold">{row.unpaidMemos}</span>
                                                        : <span className="text-gray-400">0</span>}
                                                </td>
                                                <td className="px-4 py-3 text-center text-green-600">{row.paidMemos}</td>
                                                <td className="px-4 py-3 text-right">{fmt(row.totalAskValue)}</td>
                                                <td className="px-4 py-3 text-right text-green-600">{fmt(row.totalPaidAmount)}</td>
                                                <td className="px-4 py-3 text-right font-semibold text-red-600">{fmt(row.outstandingAmount)}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <div>
                                                        <span className={`font-semibold ${row.averagePayPercent >= 80 ? 'text-green-600' : row.averagePayPercent >= 50 ? 'text-orange-500' : 'text-red-600'}`}>
                                                            {pct(row.averagePayPercent)}
                                                        </span>
                                                        {row.policyAvgPayPercent != null && (
                                                            <p className="text-xs text-gray-400">Policy: {pct(row.policyAvgPayPercent)}</p>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <div>
                                                        <span className="font-medium">{row.averageDaysToPay}d</span>
                                                        {row.policyAvgDaysToPay != null && (
                                                            <p className="text-xs text-gray-400">Policy: {row.policyAvgDaysToPay}d</p>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Pagination */}
                        {manufacturerPagination && manufacturerPagination.totalPages > 1 && (
                            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
                                <span className="text-sm text-gray-500">
                                    Page {manufacturerPagination.page} of {manufacturerPagination.totalPages}
                                </span>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" disabled={mfgPage <= 1} onClick={() => setMfgPage(p => p - 1)}>
                                        <ChevronLeft className="w-4 h-4" />
                                    </Button>
                                    <Button variant="outline" size="sm" disabled={mfgPage >= manufacturerPagination.totalPages} onClick={() => setMfgPage(p => p + 1)}>
                                        <ChevronRight className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ─── Record Payment Modal ────────────────────────── */}
            {paymentMemo && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
                        <div className="flex items-center justify-between p-5 border-b border-gray-200">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">Record Payment</h3>
                                <p className="text-sm text-gray-500 mt-0.5">
                                    {paymentMemo.memoNumber} — {paymentMemo.labelerName || 'Unknown'}
                                </p>
                            </div>
                            <button onClick={() => setPaymentMemo(null)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-5 space-y-4">
                            {/* Summary row */}
                            <div className="grid grid-cols-3 gap-3 p-3 bg-gray-50 rounded-lg text-center text-sm">
                                <div>
                                    <p className="text-gray-500">Asked</p>
                                    <p className="font-semibold">{fmt(paymentMemo.amountRequested)}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500">Received So Far</p>
                                    <p className="font-semibold text-green-600">{fmt(paymentMemo.amountReceived)}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500">Outstanding</p>
                                    <p className="font-semibold text-red-600">{fmt(paymentMemo.amountRequested - paymentMemo.amountReceived)}</p>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Amount Received *</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={paymentAmount}
                                        onChange={e => setPaymentAmount(e.target.value)}
                                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date</label>
                                <input
                                    type="date"
                                    value={paymentDate}
                                    onChange={e => setPaymentDate(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Reference # (check/wire)</label>
                                <input
                                    value={paymentRef}
                                    onChange={e => setPaymentRef(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                    placeholder="e.g. CHK-12345"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                                <textarea
                                    value={paymentNotes}
                                    onChange={e => setPaymentNotes(e.target.value)}
                                    rows={2}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                                    placeholder="Optional notes..."
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 p-5 border-t border-gray-200">
                            <Button variant="outline" onClick={() => setPaymentMemo(null)}>Cancel</Button>
                            <Button variant="success" onClick={handleRecordPayment} disabled={isActionLoading}>
                                {isActionLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CreditCard className="w-4 h-4 mr-2" />}
                                Record Payment
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Send Reminder Modal ─────────────────────────── */}
            {reminderMemo && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
                        <div className="flex items-center justify-between p-5 border-b border-gray-200">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">Send Payment Reminder</h3>
                                <p className="text-sm text-gray-500 mt-0.5">
                                    {reminderMemo.memoNumber} — Outstanding: {fmt(reminderMemo.amountRequested - reminderMemo.amountReceived)}
                                </p>
                            </div>
                            <button onClick={() => { setReminderMemo(null); setReminderEmail(''); }} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-5 space-y-4">
                            <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                                A payment reminder will be sent to the manufacturer's contact email.
                                You can override the destination below.
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email Override (optional)</label>
                                <input
                                    type="email"
                                    value={reminderEmail}
                                    onChange={e => setReminderEmail(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                    placeholder="Override email..."
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 p-5 border-t border-gray-200">
                            <Button variant="outline" onClick={() => { setReminderMemo(null); setReminderEmail(''); }}>Cancel</Button>
                            <Button variant="warning" onClick={handleSendReminder} disabled={isActionLoading}>
                                {isActionLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                                Send Reminder
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
