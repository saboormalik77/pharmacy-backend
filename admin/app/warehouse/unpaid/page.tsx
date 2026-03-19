'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
    Search, Loader2, ChevronLeft, ChevronRight, X,
    DollarSign, Clock, AlertCircle, Send, CreditCard,
    TrendingUp, TrendingDown, BarChart3,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
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
        { key: 'unpaid', label: 'Unpaid Memos', icon: <DollarSign className="w-3.5 h-3.5" /> },
        { key: 'askVsReceived', label: 'Ask vs Received', icon: <BarChart3 className="w-3.5 h-3.5" /> },
        { key: 'manufacturers', label: 'Manufacturer Summary', icon: <TrendingUp className="w-3.5 h-3.5" /> },
    ];

    // ── Render ───────────────────────────────────────────────

    return (
        <div className="space-y-3">
            <ToastContainer toasts={toasts} onClose={removeToast} />

            {/* Header */}
            <div>
                <Link href="/payout-hub" className="inline-flex items-center gap-1 text-[11px] text-gray-400 hover:text-primary-600 mb-1.5 transition-colors">
                    <ChevronLeft className="w-3 h-3" /> Back to Payout Management
                </Link>
                <h1 className="text-lg font-bold text-gray-900">Payment Tracking</h1>
                <p className="text-xs text-gray-500">Track manufacturer payments, record receipts, and view ask-vs-received analytics.</p>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="flex gap-4">
                    {tabs.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex items-center gap-1.5 pb-2 text-xs font-medium border-b-2 transition-colors ${
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
                <div className="space-y-2">
                    {/* Summary cards */}
                    {unpaidSummary && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div className="bg-white rounded-lg border border-gray-200 px-4 py-2.5 flex items-center gap-3">
                                <div className="p-2 bg-red-50 rounded-lg flex-shrink-0">
                                    <AlertCircle className="w-4 h-4 text-red-500" />
                                </div>
                                <div>
                                    <p className="text-[10px] text-gray-500">Unpaid Memos</p>
                                    <p className="text-lg font-bold text-gray-900">{unpaidSummary.totalUnpaid}</p>
                                </div>
                            </div>
                            <div className="bg-white rounded-lg border border-gray-200 px-4 py-2.5 flex items-center gap-3">
                                <div className="p-2 bg-orange-50 rounded-lg flex-shrink-0">
                                    <DollarSign className="w-4 h-4 text-orange-500" />
                                </div>
                                <div>
                                    <p className="text-[10px] text-gray-500">Total Outstanding</p>
                                    <p className="text-lg font-bold text-gray-900">{fmt(unpaidSummary.totalOutstanding)}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Filters */}
                    <div className="bg-white rounded-lg border border-gray-200 px-3 py-2 flex flex-wrap gap-2 items-center">
                        <div className="relative flex-1 min-w-[180px]">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                            <input
                                value={search}
                                onChange={e => { setSearch(e.target.value); setPage(1); }}
                                placeholder="Search memos, manufacturer, pharmacy..."
                                className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                            />
                        </div>
                        <select
                            value={destination}
                            onChange={e => { setDestination(e.target.value); setPage(1); }}
                            className="border border-gray-300 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-primary-500"
                        >
                            <option value="">All Destinations</option>
                            <option value="Inmar">Inmar</option>
                            <option value="PharmaLink">PharmaLink</option>
                            <option value="Cardinal">Cardinal</option>
                            <option value="Direct">Direct</option>
                        </select>
                    </div>

                    {/* Table */}
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-14">
                                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                            </div>
                        ) : unpaidMemos.length === 0 ? (
                            <div className="text-center py-14 text-gray-500">
                                <DollarSign className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                                <p className="text-sm font-medium">No unpaid memos found</p>
                                <p className="text-xs mt-0.5">All debit memos have been paid.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            <th className="text-left px-3 py-1.5 text-[10px] font-semibold text-gray-500 uppercase">Memo #</th>
                                            <th className="text-left px-3 py-1.5 text-[10px] font-semibold text-gray-500 uppercase">Manufacturer</th>
                                            <th className="text-left px-3 py-1.5 text-[10px] font-semibold text-gray-500 uppercase">Pharmacy</th>
                                            <th className="text-left px-3 py-1.5 text-[10px] font-semibold text-gray-500 uppercase">Destination</th>
                                            <th className="text-right px-3 py-1.5 text-[10px] font-semibold text-gray-500 uppercase">Asked</th>
                                            <th className="text-right px-3 py-1.5 text-[10px] font-semibold text-gray-500 uppercase">Received</th>
                                            <th className="text-right px-3 py-1.5 text-[10px] font-semibold text-gray-500 uppercase">Outstanding</th>
                                            <th className="text-center px-3 py-1.5 text-[10px] font-semibold text-gray-500 uppercase">Days</th>
                                            <th className="text-center px-3 py-1.5 text-[10px] font-semibold text-gray-500 uppercase">Status</th>
                                            <th className="text-right px-3 py-1.5 text-[10px] font-semibold text-gray-500 uppercase">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {unpaidMemos.map(memo => {
                                            const outstanding = (memo as any).outstandingAmount ?? (memo.amountRequested - memo.amountReceived);
                                            const days = (memo as any).daysOutstanding ?? 0;
                                            return (
                                                <tr key={memo.id} className="hover:bg-gray-50">
                                                    <td className="px-3 py-1.5 text-xs font-medium text-gray-900">{memo.memoNumber}</td>
                                                    <td className="px-3 py-1.5 text-xs text-gray-600">{memo.labelerName || '—'}</td>
                                                    <td className="px-3 py-1.5 text-xs text-gray-600">{(memo as any).pharmacyName || '—'}</td>
                                                    <td className="px-3 py-1.5 text-xs text-gray-600">{memo.destination || '—'}</td>
                                                    <td className="px-3 py-1.5 text-xs text-right font-medium">{fmt(memo.amountRequested)}</td>
                                                    <td className="px-3 py-1.5 text-xs text-right">{fmt(memo.amountReceived)}</td>
                                                    <td className="px-3 py-1.5 text-xs text-right font-semibold text-red-600">{fmt(outstanding)}</td>
                                                    <td className="px-3 py-1.5 text-center">
                                                        <span className={`inline-flex items-center gap-0.5 text-xs ${days > 30 ? 'text-red-600 font-semibold' : days > 14 ? 'text-orange-500' : 'text-gray-600'}`}>
                                                            <Clock className="w-3 h-3" />{days}d
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-1.5 text-center">
                                                        <Badge variant={getPaymentBadge(memo.paymentStatus).variant}>
                                                            <span className="text-[10px]">{memo.paymentStatus}</span>
                                                        </Badge>
                                                    </td>
                                                    <td className="px-3 py-1.5">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <button onClick={() => openPaymentModal(memo)} className="inline-flex items-center gap-0.5 px-2 py-1 rounded text-[11px] font-medium bg-primary-600 text-white hover:bg-primary-700 transition-colors whitespace-nowrap">
                                                                <CreditCard className="w-3 h-3" /> Pay
                                                            </button>
                                                            <button onClick={() => setReminderMemo(memo)} className="inline-flex items-center gap-0.5 px-2 py-1 rounded text-[11px] font-medium bg-yellow-100 text-yellow-800 border border-yellow-300 hover:bg-yellow-200 transition-colors whitespace-nowrap">
                                                                <Send className="w-3 h-3" /> Remind
                                                            </button>
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
                            <div className="flex items-center justify-between px-3 py-2 border-t border-gray-200 bg-gray-50">
                                <span className="text-[10px] text-gray-500">
                                    Page {unpaidPagination.page} of {unpaidPagination.totalPages} ({unpaidPagination.total} memos)
                                </span>
                                <div className="flex gap-1.5">
                                    <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-1 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50">
                                        <ChevronLeft className="w-3.5 h-3.5 text-gray-600" />
                                    </button>
                                    <button disabled={page >= unpaidPagination.totalPages} onClick={() => setPage(p => p + 1)} className="p-1 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50">
                                        <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ─── TAB 2: Ask vs Received ──────────────────────── */}
            {activeTab === 'askVsReceived' && (
                <div className="space-y-2">
                    {/* Totals cards */}
                    {askVsReceivedTotals && (
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                            {[
                                { label: 'Total Memos', value: askVsReceivedTotals.totalMemos ?? 0, color: '' },
                                { label: 'Total Ask', value: fmt(askVsReceivedTotals.totalAskValue), color: '' },
                                { label: 'Total Received', value: fmt(askVsReceivedTotals.totalReceived), color: 'text-green-600' },
                                { label: 'Overall Pay %', value: pct(askVsReceivedTotals.overallPayPercent), color: '', extra: askVsReceivedTotals.overallPayPercent >= 80 ? <TrendingUp className="w-3.5 h-3.5 text-green-500 inline ml-1" /> : <TrendingDown className="w-3.5 h-3.5 text-red-500 inline ml-1" /> },
                            ].map(({ label, value, color, extra }) => (
                                <div key={label} className="bg-white rounded-lg border border-gray-200 px-3 py-2">
                                    <p className="text-[10px] text-gray-500">{label}</p>
                                    <p className={`text-base font-bold text-gray-900 mt-0.5 ${color}`}>{value}{extra}</p>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Group toggle */}
                    <div className="bg-white rounded-lg border border-gray-200 px-3 py-2 flex items-center gap-2">
                        <span className="text-xs text-gray-600 font-medium">Group by:</span>
                        <div className="flex gap-0.5 bg-gray-100 rounded p-0.5">
                            <button onClick={() => setAnalyticsGroupBy('manufacturer')} className={`px-3 py-1 rounded text-xs font-medium transition-colors ${analyticsGroupBy === 'manufacturer' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Manufacturer</button>
                            <button onClick={() => setAnalyticsGroupBy('period')} className={`px-3 py-1 rounded text-xs font-medium transition-colors ${analyticsGroupBy === 'period' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Monthly</button>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-14"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
                        ) : askVsReceived.length === 0 ? (
                            <div className="text-center py-14 text-gray-500">
                                <BarChart3 className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                                <p className="text-sm font-medium">No data available</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            <th className="text-left px-3 py-1.5 text-[10px] font-semibold text-gray-500 uppercase">{analyticsGroupBy === 'manufacturer' ? 'Manufacturer' : 'Period'}</th>
                                            <th className="text-center px-3 py-1.5 text-[10px] font-semibold text-gray-500 uppercase">Memos</th>
                                            <th className="text-right px-3 py-1.5 text-[10px] font-semibold text-gray-500 uppercase">Total Ask</th>
                                            <th className="text-right px-3 py-1.5 text-[10px] font-semibold text-gray-500 uppercase">Total Received</th>
                                            <th className="text-right px-3 py-1.5 text-[10px] font-semibold text-gray-500 uppercase">Difference</th>
                                            <th className="text-center px-3 py-1.5 text-[10px] font-semibold text-gray-500 uppercase">Pay %</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {askVsReceived.map((row: AskVsReceivedRow, i: number) => (
                                            <tr key={i} className="hover:bg-gray-50">
                                                <td className="px-3 py-1.5 text-xs font-medium text-gray-900">{analyticsGroupBy === 'manufacturer' ? (row.labelerName || row.labelerId || '—') : (row.period || '—')}</td>
                                                <td className="px-3 py-1.5 text-xs text-center">{row.memoCount}</td>
                                                <td className="px-3 py-1.5 text-xs text-right">{fmt(row.totalAskValue)}</td>
                                                <td className="px-3 py-1.5 text-xs text-right text-green-600 font-medium">{fmt(row.totalReceived)}</td>
                                                <td className="px-3 py-1.5 text-xs text-right text-red-600">{fmt(row.difference)}</td>
                                                <td className="px-3 py-1.5 text-xs text-center">
                                                    <span className={`font-semibold ${row.payPercent >= 80 ? 'text-green-600' : row.payPercent >= 50 ? 'text-orange-500' : 'text-red-600'}`}>{pct(row.payPercent)}</span>
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
                <div className="space-y-2">
                    {/* Search */}
                    <div className="bg-white rounded-lg border border-gray-200 px-3 py-2">
                        <div className="relative max-w-md">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                            <input
                                value={mfgSearch}
                                onChange={e => { setMfgSearch(e.target.value); setMfgPage(1); }}
                                placeholder="Search manufacturer..."
                                className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                            />
                        </div>
                    </div>

                    {/* Table */}
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-14"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
                        ) : manufacturerSummary.length === 0 ? (
                            <div className="text-center py-14 text-gray-500">
                                <TrendingUp className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                                <p className="text-sm font-medium">No manufacturers found</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            <th className="text-left px-3 py-1.5 text-[10px] font-semibold text-gray-500 uppercase">Manufacturer</th>
                                            <th className="text-center px-3 py-1.5 text-[10px] font-semibold text-gray-500 uppercase">Total</th>
                                            <th className="text-center px-3 py-1.5 text-[10px] font-semibold text-gray-500 uppercase">Unpaid</th>
                                            <th className="text-center px-3 py-1.5 text-[10px] font-semibold text-gray-500 uppercase">Paid</th>
                                            <th className="text-right px-3 py-1.5 text-[10px] font-semibold text-gray-500 uppercase">Ask Value</th>
                                            <th className="text-right px-3 py-1.5 text-[10px] font-semibold text-gray-500 uppercase">Paid Amt</th>
                                            <th className="text-right px-3 py-1.5 text-[10px] font-semibold text-gray-500 uppercase">Outstanding</th>
                                            <th className="text-center px-3 py-1.5 text-[10px] font-semibold text-gray-500 uppercase">Avg Pay %</th>
                                            <th className="text-center px-3 py-1.5 text-[10px] font-semibold text-gray-500 uppercase">Avg Days</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {manufacturerSummary.map((row: ManufacturerPaymentSummary, i: number) => (
                                            <tr key={i} className="hover:bg-gray-50">
                                                <td className="px-3 py-1.5">
                                                    <p className="text-xs font-medium text-gray-900">{row.labelerName || '—'}</p>
                                                    {row.labelerId && <p className="text-[10px] text-gray-400">{row.labelerId}</p>}
                                                </td>
                                                <td className="px-3 py-1.5 text-xs text-center">{row.totalMemos}</td>
                                                <td className="px-3 py-1.5 text-xs text-center">{row.unpaidMemos > 0 ? <span className="text-red-600 font-semibold">{row.unpaidMemos}</span> : <span className="text-gray-400">0</span>}</td>
                                                <td className="px-3 py-1.5 text-xs text-center text-green-600">{row.paidMemos}</td>
                                                <td className="px-3 py-1.5 text-xs text-right">{fmt(row.totalAskValue)}</td>
                                                <td className="px-3 py-1.5 text-xs text-right text-green-600">{fmt(row.totalPaidAmount)}</td>
                                                <td className="px-3 py-1.5 text-xs text-right font-semibold text-red-600">{fmt(row.outstandingAmount)}</td>
                                                <td className="px-3 py-1.5 text-xs text-center">
                                                    <span className={`font-semibold ${row.averagePayPercent >= 80 ? 'text-green-600' : row.averagePayPercent >= 50 ? 'text-orange-500' : 'text-red-600'}`}>{pct(row.averagePayPercent)}</span>
                                                    {row.policyAvgPayPercent != null && <p className="text-[10px] text-gray-400">P: {pct(row.policyAvgPayPercent)}</p>}
                                                </td>
                                                <td className="px-3 py-1.5 text-xs text-center">
                                                    <span className="font-medium">{row.averageDaysToPay}d</span>
                                                    {row.policyAvgDaysToPay != null && <p className="text-[10px] text-gray-400">P: {row.policyAvgDaysToPay}d</p>}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Pagination */}
                        {manufacturerPagination && manufacturerPagination.totalPages > 1 && (
                            <div className="flex items-center justify-between px-3 py-2 border-t border-gray-200 bg-gray-50">
                                <span className="text-[10px] text-gray-500">Page {manufacturerPagination.page} of {manufacturerPagination.totalPages}</span>
                                <div className="flex gap-1.5">
                                    <button disabled={mfgPage <= 1} onClick={() => setMfgPage(p => p - 1)} className="p-1 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50">
                                        <ChevronLeft className="w-3.5 h-3.5 text-gray-600" />
                                    </button>
                                    <button disabled={mfgPage >= manufacturerPagination.totalPages} onClick={() => setMfgPage(p => p + 1)} className="p-1 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50">
                                        <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ─── Record Payment Modal ────────────────────────── */}
            {paymentMemo && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-2xl w-full max-w-md">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                            <div>
                                <h3 className="text-sm font-semibold text-gray-900">Record Payment</h3>
                                <p className="text-xs text-gray-500">{paymentMemo.memoNumber} — {paymentMemo.labelerName || 'Unknown'}</p>
                            </div>
                            <button onClick={() => setPaymentMemo(null)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                        </div>

                        <div className="px-4 py-3 space-y-3">
                            <div className="grid grid-cols-3 gap-2 p-2.5 bg-gray-50 rounded text-center">
                                <div><p className="text-[10px] text-gray-500">Asked</p><p className="text-xs font-semibold">{fmt(paymentMemo.amountRequested)}</p></div>
                                <div><p className="text-[10px] text-gray-500">Received So Far</p><p className="text-xs font-semibold text-green-600">{fmt(paymentMemo.amountReceived)}</p></div>
                                <div><p className="text-[10px] text-gray-500">Outstanding</p><p className="text-xs font-semibold text-red-600">{fmt(paymentMemo.amountRequested - paymentMemo.amountReceived)}</p></div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-0.5">Amount Received <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                    <input type="number" step="0.01" min="0" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-primary-500 focus:border-primary-500" placeholder="0.00" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-0.5">Payment Date</label>
                                <input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-primary-500 focus:border-primary-500" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-0.5">Reference # (check/wire)</label>
                                <input value={paymentRef} onChange={e => setPaymentRef(e.target.value)} className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-primary-500 focus:border-primary-500" placeholder="e.g. CHK-12345" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-0.5">Notes</label>
                                <textarea value={paymentNotes} onChange={e => setPaymentNotes(e.target.value)} rows={2} className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-primary-500 focus:border-primary-500 resize-none" placeholder="Optional notes..." />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200">
                            <button onClick={() => setPaymentMemo(null)} className="px-3 py-1.5 text-xs rounded border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
                            <button onClick={handleRecordPayment} disabled={isActionLoading} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors">
                                {isActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CreditCard className="w-3.5 h-3.5" />}
                                Record Payment
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Send Reminder Modal ─────────────────────────── */}
            {reminderMemo && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-2xl w-full max-w-sm">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                            <div>
                                <h3 className="text-sm font-semibold text-gray-900">Send Payment Reminder</h3>
                                <p className="text-xs text-gray-500">{reminderMemo.memoNumber} — Outstanding: {fmt(reminderMemo.amountRequested - reminderMemo.amountReceived)}</p>
                            </div>
                            <button onClick={() => { setReminderMemo(null); setReminderEmail(''); }} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                        </div>

                        <div className="px-4 py-3 space-y-3">
                            <div className="p-2.5 bg-blue-50 rounded text-xs text-blue-700">
                                A payment reminder will be sent to the manufacturer's contact email. You can override the destination below.
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-0.5">Email Override (optional)</label>
                                <input type="email" value={reminderEmail} onChange={e => setReminderEmail(e.target.value)} className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-primary-500 focus:border-primary-500" placeholder="Override email..." />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200">
                            <button onClick={() => { setReminderMemo(null); setReminderEmail(''); }} className="px-3 py-1.5 text-xs rounded border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
                            <button onClick={handleSendReminder} disabled={isActionLoading} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-yellow-500 text-white hover:bg-yellow-600 disabled:opacity-50 transition-colors">
                                {isActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                                Send Reminder
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
