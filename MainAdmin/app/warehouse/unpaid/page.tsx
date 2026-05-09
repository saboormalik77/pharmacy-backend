'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
    Search, Loader2, ChevronLeft, ChevronRight, X,
    DollarSign, Clock, AlertCircle, Send, CreditCard,
    TrendingUp, TrendingDown, BarChart3, CheckCircle, FileText, Upload,
    Sparkles, AlertTriangle, Info,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { ToastContainer, Toast } from '@/components/ui/Toast';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import { useDebounce } from '@/lib/hooks/useDebounce';
import {
    fetchUnpaidMemos, recordPayment, updatePayment, sendPaymentReminder,
    fetchAskVsReceived, fetchManufacturerSummary, fetchPaidMemos, clearError, clearAiAnalysis,
} from '@/lib/store/paymentTrackingSlice';
import { DebitMemo, AskVsReceivedRow, ManufacturerPaymentSummary } from '@/lib/types';
import { apiClient } from '@/lib/api/apiClient';

type TabKey = 'unpaid' | 'paid' | 'askVsReceived' | 'manufacturers';

function fmt(v: number | null | undefined) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v ?? 0);
}

function pct(v: number | null | undefined) {
    return `${(v ?? 0).toFixed(1)}%`;
}

/** Matches backend: shipped when tracking or shipped_at exists, not only ra_status. */
function isDebitMemoShipped(memo: DebitMemo): boolean {
    if (memo.raStatus === 'shipped') return true;
    if (memo.shippedAt != null && String(memo.shippedAt).trim() !== '') return true;
    const tr = (memo.outboundTracking || '').trim();
    return tr.length > 0;
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
        paidMemos, paidPagination,
        askVsReceived, askVsReceivedTotals,
        manufacturerSummary, manufacturerPagination,
        isLoading, isActionLoading, error,
        lastAiAnalysis,
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

    // Paid memos tab state
    const [paidSearch, setPaidSearch] = useState('');
    const [paidDestination, setPaidDestination] = useState('');
    const [paidPage, setPaidPage] = useState(1);
    const debouncedPaidSearch = useDebounce(paidSearch, 400);

    // Payment modal
    const [paymentMemo, setPaymentMemo] = useState<(DebitMemo & { daysOutstanding?: number; outstandingAmount?: number }) | null>(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [paymentRef, setPaymentRef] = useState('');
    const [paymentNotes, setPaymentNotes] = useState('');
    const [creditMemoFile, setCreditMemoFile] = useState<File | null>(null);
    const [existingCreditMemoUrl, setExistingCreditMemoUrl] = useState<string | null>(null);
    const [isAnalyzingCreditMemo, setIsAnalyzingCreditMemo] = useState(false);
    const [isAmountAutoCalculated, setIsAmountAutoCalculated] = useState(false);

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

    // Fetch paid memos
    useEffect(() => {
        if (activeTab === 'paid') {
            dispatch(fetchPaidMemos({
                search: debouncedPaidSearch || undefined,
                destination: paidDestination || undefined,
                page: paidPage,
            }));
        }
    }, [dispatch, activeTab, debouncedPaidSearch, paidDestination, paidPage]);

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
        setIsEditMode(false);
        setPaymentAmount('0'); // Start with 0, will be auto-populated from credit memo
        setPaymentDate(new Date().toISOString().split('T')[0]);
        setPaymentRef('');
        setPaymentNotes('');
        setCreditMemoFile(null);
        setExistingCreditMemoUrl(null);
        setIsAnalyzingCreditMemo(false);
        setIsAmountAutoCalculated(false);
    };

    const openEditModal = (memo: DebitMemo) => {
        setPaymentMemo(memo);
        setIsEditMode(true);
        setPaymentAmount(String(memo.amountReceived));
        setPaymentDate(memo.paymentReceivedAt ? new Date(memo.paymentReceivedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
        setPaymentRef(memo.paymentReference || '');
        setPaymentNotes(memo.paymentNotes || '');
        setCreditMemoFile(null);
        setExistingCreditMemoUrl(memo.creditMemoUrl || null);
        setIsAnalyzingCreditMemo(false);
        setIsAmountAutoCalculated(false);
    };

    // Analyze credit memo when file is uploaded (for new payments only)
    useEffect(() => {
        if (!creditMemoFile || isEditMode || !paymentMemo) return;

        const analyzeCreditMemo = async () => {
            setIsAnalyzingCreditMemo(true);
            setIsAmountAutoCalculated(false);

            try {
                const formData = new FormData();
                formData.append('creditMemo', creditMemoFile);

                const result = await apiClient.postFormData<{
                    status: string;
                    data: {
                        totalAmount: number | null;
                        confidence: number;
                        analysisStatus: string;
                        manufacturerName: string | null;
                        lineItemsCount: number;
                        errorMessage?: string | null;
                    };
                }>(`/admin/debit-memos/${paymentMemo.id}/analyze-credit-memo`, formData);
                
                if (result.data.totalAmount != null && result.data.totalAmount > 0) {
                    setPaymentAmount(result.data.totalAmount.toFixed(2));
                    setIsAmountAutoCalculated(true);
                    addToast(`Amount auto-calculated: ${fmt(result.data.totalAmount)} (${result.data.lineItemsCount} NDCs matched)`, 'success');
                } else {
                    setPaymentAmount('0'); // Reset to 0 if no amount calculated
                    addToast(`Credit memo uploaded successfully. No NDC matches were found automatically — please enter the payment amount manually.`, 'warning');
                    setIsAmountAutoCalculated(false);
                }
            } catch (error: any) {
                console.error('Credit memo analysis failed:', error);
                setPaymentAmount('0'); // Reset to 0 on error
                addToast(error.message || 'Failed to analyze credit memo. Please enter amount manually.', 'error');
                setIsAmountAutoCalculated(false);
            } finally {
                setIsAnalyzingCreditMemo(false);
            }
        };

        analyzeCreditMemo();
    }, [creditMemoFile, isEditMode, paymentMemo, addToast]);

    const handleRecordPayment = async () => {
        if (!paymentMemo) return;
        const amt = parseFloat(paymentAmount);
        if (isNaN(amt) || amt <= 0) { 
            addToast('Please enter a valid amount received (greater than 0)', 'error'); 
            return; 
        }
        
        if (isEditMode) {
            const result = await dispatch(updatePayment({
                memoId: paymentMemo.id,
                amountReceived: amt,
                paymentDate: paymentDate,
                reference: paymentRef,
                notes: paymentNotes,
                creditMemoFile: creditMemoFile || undefined,
            }));
            if (updatePayment.fulfilled.match(result)) {
                addToast(`Payment updated for ${paymentMemo.memoNumber}`, 'success');
                setPaymentMemo(null);
                setCreditMemoFile(null);
                setExistingCreditMemoUrl(null);
                dispatch(fetchPaidMemos({ search: debouncedPaidSearch || undefined, destination: paidDestination || undefined, page: paidPage }));
            }
        } else {
            if (!creditMemoFile) { addToast('Credit memo PDF is required', 'error'); return; }
            const result = await dispatch(recordPayment({
                memoId: paymentMemo.id,
                amountReceived: amt,
                paymentDate: paymentDate,
                reference: paymentRef,
                notes: paymentNotes,
                creditMemoFile,
            }));
            if (recordPayment.fulfilled.match(result)) {
                addToast(`Payment of ${fmt(amt)} recorded for ${paymentMemo.memoNumber}`, 'success');
                setPaymentMemo(null);
                setCreditMemoFile(null);
                dispatch(fetchUnpaidMemos({ search: debouncedSearch || undefined, destination: destination || undefined, page }));
                dispatch(fetchPaidMemos({ search: debouncedPaidSearch || undefined, destination: paidDestination || undefined, page: paidPage }));
            }
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
        { key: 'paid', label: 'Paid Memos', icon: <CheckCircle className="w-3.5 h-3.5" /> },
        { key: 'askVsReceived', label: 'Ask vs Received', icon: <BarChart3 className="w-3.5 h-3.5" /> },
        { key: 'manufacturers', label: 'Manufacturer Summary', icon: <TrendingUp className="w-3.5 h-3.5" /> },
    ];

    // ── Render ───────────────────────────────────────────────

    return (
        <div className="space-y-3">
            <ToastContainer toasts={toasts} onClose={removeToast} />

            {/* FCR-56: AI Credit Memo Analysis Banner */}
            {lastAiAnalysis && (
                <div
                    className="rounded-[4px] border px-4 py-3 flex items-start gap-3"
                    style={{
                        backgroundColor:
                            lastAiAnalysis.status === 'completed'
                                ? 'var(--secondary-container)'
                                : lastAiAnalysis.status === 'manual_review'
                                    ? 'var(--tertiary-fixed)'
                                    : 'var(--error-container)',
                        borderColor: 'var(--outline-variant)',
                    }}
                >
                    <div className="p-1.5 rounded flex-shrink-0" style={{ backgroundColor: 'var(--surface-container-lowest)' }}>
                        {lastAiAnalysis.status === 'completed' ? (
                            <Sparkles className="w-4 h-4" style={{ color: 'var(--secondary)' }} />
                        ) : lastAiAnalysis.status === 'manual_review' ? (
                            <AlertTriangle className="w-4 h-4" style={{ color: 'var(--tertiary)' }} />
                        ) : (
                            <AlertCircle className="w-4 h-4" style={{ color: 'var(--error)' }} />
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-xs font-semibold" style={{ color: 'var(--foreground)' }}>
                                {lastAiAnalysis.status === 'completed'
                                    ? 'AI extracted ask/received pairs from credit memo'
                                    : lastAiAnalysis.status === 'manual_review'
                                        ? 'AI parsed the memo but found no usable NDC pairs'
                                        : 'AI extraction failed (payment was still recorded)'}
                            </p>
                            {lastAiAnalysis.confidence > 0 && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--surface-container-lowest)', color: 'var(--on-surface-variant)' }}>
                                    {lastAiAnalysis.confidence.toFixed(0)}% confidence
                                </span>
                            )}
                        </div>
                        {lastAiAnalysis.status === 'completed' && (
                            <p className="text-[11px] mt-1" style={{ color: 'var(--on-surface-variant)' }}>
                                Inserted <strong>{lastAiAnalysis.itemsInserted}</strong> payment record{lastAiAnalysis.itemsInserted === 1 ? '' : 's'} across{' '}
                                <strong>{lastAiAnalysis.distinctNdcs.length}</strong> NDC{lastAiAnalysis.distinctNdcs.length === 1 ? '' : 's'}
                                {lastAiAnalysis.itemsSkipped > 0 ? ` (skipped ${lastAiAnalysis.itemsSkipped} incomplete row${lastAiAnalysis.itemsSkipped === 1 ? '' : 's'})` : ''}
                                {lastAiAnalysis.manufacturerName ? ` — manufacturer: ${lastAiAnalysis.manufacturerName}` : ''}
                                {lastAiAnalysis.totalAmount != null ? ` — total: ${fmt(lastAiAnalysis.totalAmount)}` : ''}.
                                Pricing intelligence has been refreshed.
                            </p>
                        )}
                        {lastAiAnalysis.errorMessage && (
                            <p className="text-[11px] mt-1" style={{ color: 'var(--on-surface-variant)' }}>
                                {lastAiAnalysis.errorMessage}
                            </p>
                        )}
                    </div>
                    <button
                        onClick={() => dispatch(clearAiAnalysis())}
                        className="p-1 rounded hover:bg-black/10"
                        title="Dismiss"
                        style={{ color: 'var(--on-surface-variant)' }}
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            {/* Header */}
            <div>
                <Link href="/payout-hub" className="inline-flex items-center gap-1 text-[11px] text-gray-400 hover:text-primary-600 mb-1.5 transition-colors">
                    <ChevronLeft className="w-3 h-3" /> Back to Payout Management
                </Link>
                <h1 className="font-heading text-headline" style={{ color: 'var(--foreground)' }}>Payment Tracking</h1>
                <p className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>Track manufacturer payments, record receipts, and view ask-vs-received analytics.</p>
            </div>

            {/* Tabs */}
            <div className="border-b" style={{ borderColor: 'var(--outline-variant)' }}>
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
                            style={activeTab === tab.key ? undefined : { color: 'var(--on-surface-variant)' }}
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
                            <div className="rounded-[4px] border px-4 py-2.5 flex items-center gap-3" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}>
                                <div className="p-2 rounded-[4px] flex-shrink-0" style={{ backgroundColor: 'var(--error-container)' }}>
                                    <AlertCircle className="w-4 h-4" style={{ color: 'var(--error)' }} />
                                </div>
                                <div>
                                    <p className="text-[10px]" style={{ color: 'var(--on-surface-variant)' }}>Unpaid Memos</p>
                                    <p className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>{unpaidSummary.totalUnpaid}</p>
                                </div>
                            </div>
                            <div className="rounded-[4px] border px-4 py-2.5 flex items-center gap-3" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}>
                                <div className="p-2 rounded-[4px] flex-shrink-0" style={{ backgroundColor: 'var(--tertiary-fixed)' }}>
                                    <DollarSign className="w-4 h-4" style={{ color: 'var(--tertiary)' }} />
                                </div>
                                <div>
                                    <p className="text-[10px]" style={{ color: 'var(--on-surface-variant)' }}>Total Outstanding</p>
                                    <p className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>{fmt(unpaidSummary.totalOutstanding)}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Filters */}
                    <div className="rounded-[4px] border px-3 py-2 flex flex-wrap gap-2 items-center" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}>
                        <div className="relative flex-1 min-w-[180px]">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                            <input
                                value={search}
                                onChange={e => { setSearch(e.target.value); setPage(1); }}
                                placeholder="Search memos, manufacturer, pharmacy..."
                                className="w-full pl-8 pr-3 py-1.5 border rounded text-xs focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                                style={{ backgroundColor: 'var(--surface-container-low)', borderColor: 'var(--outline-variant)' }}
                            />
                        </div>
                        <select
                            value={destination}
                            onChange={e => { setDestination(e.target.value); setPage(1); }}
                            className="border rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-primary-500"
                            style={{ backgroundColor: 'var(--surface-container-low)', borderColor: 'var(--outline-variant)' }}
                        >
                            <option value="">All Destinations</option>
                            <option value="Inmar">Inmar</option>
                            <option value="PharmaLink">PharmaLink</option>
                            <option value="Cardinal">Cardinal</option>
                            <option value="Direct">Direct</option>
                        </select>
                    </div>

                    {/* Table */}
                    <div className="rounded-[4px] border overflow-hidden" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}>
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
                                <table className="w-full border" style={{ borderColor: 'var(--outline)' }}>
                                    <thead className="bg-[var(--surface-container-low)] border-b" style={{ borderColor: 'var(--outline)', borderBottomWidth: '1.5px' }}>
                                        <tr className="bg-[var(--surface-container-low)]">
                                            <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-[var(--on-surface-variant)] whitespace-nowrap">Memo #</th>
                                            <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-[var(--on-surface-variant)] whitespace-nowrap">Manufacturer</th>
                                            <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-[var(--on-surface-variant)] whitespace-nowrap">Pharmacy</th>
                                            <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-[var(--on-surface-variant)] whitespace-nowrap">Destination</th>
                                            <th className="text-right px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-[var(--on-surface-variant)] whitespace-nowrap">Asked</th>
                                            <th className="text-right px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-[var(--on-surface-variant)] whitespace-nowrap">Received</th>
                                            <th className="text-right px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-[var(--on-surface-variant)] whitespace-nowrap">Outstanding</th>
                                            <th className="text-center px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-[var(--on-surface-variant)] whitespace-nowrap">Days</th>
                                            <th className="text-center px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-[var(--on-surface-variant)] whitespace-nowrap">Status</th>
                                            <th className="text-right px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-[var(--on-surface-variant)] whitespace-nowrap">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y" style={{ borderColor: 'var(--outline-variant)' }}>
                                        {unpaidMemos.map(memo => {
                                            const outstanding = (memo as any).outstandingAmount ?? (memo.amountRequested - memo.amountReceived);
                                            const days = (memo as any).daysOutstanding ?? 0;
                                            return (
                                                <tr key={memo.id} className="hover:bg-[var(--surface-container)]" style={{ borderColor: 'var(--outline-variant)' }}>
                                                    <td className="px-3 py-3 text-sm font-medium" style={{ color: 'var(--foreground)' }}>{memo.memoNumber}</td>
                                                    <td className="px-3 py-3 text-sm" style={{ color: 'var(--on-surface-variant)' }}>{memo.labelerName || '—'}</td>
                                                    <td className="px-3 py-3 text-sm" style={{ color: 'var(--on-surface-variant)' }}>{(memo as any).pharmacyName || '—'}</td>
                                                    <td className="px-3 py-3 text-sm" style={{ color: 'var(--on-surface-variant)' }}>{memo.destination || '—'}</td>
                                                    <td className="px-3 py-3 text-sm text-right font-medium">{fmt(memo.amountRequested)}</td>
                                                    <td className="px-3 py-3 text-sm text-right">{fmt(memo.amountReceived)}</td>
                                                    <td className="px-3 py-3 text-sm text-right font-semibold" style={{ color: 'var(--error)' }}>{fmt(outstanding)}</td>
                                                    <td className="px-3 py-3 text-center">
                                                        <span
                                                            className="inline-flex items-center gap-0.5 text-sm"
                                                            style={{
                                                                color: days > 30 ? 'var(--error)' : days > 14 ? 'var(--tertiary)' : 'var(--on-surface-variant)',
                                                                fontWeight: days > 30 ? 600 : undefined,
                                                            }}
                                                        >
                                                            <Clock className="w-3 h-3" />{days}d
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-3 text-center">
                                                        <Badge variant={getPaymentBadge(memo.paymentStatus).variant}>
                                                            <span className="text-[10px]">{memo.paymentStatus}</span>
                                                        </Badge>
                                                    </td>
                                                    <td className="px-3 py-3">
                                                        <div className="flex items-center justify-end gap-1">
                                                            {isDebitMemoShipped(memo) ? (
                                                                <>
                                                                    <button onClick={() => openPaymentModal(memo)} className="inline-flex items-center gap-0.5 px-2 py-1 rounded text-[11px] font-medium bg-primary-600 text-white hover:bg-primary-700 transition-colors whitespace-nowrap">
                                                                        <CreditCard className="w-3 h-3" /> Pay
                                                                    </button>
                                                                    <button
                                                                        onClick={() => setReminderMemo(memo)}
                                                                        className="inline-flex items-center gap-0.5 px-2 py-1 rounded text-[11px] font-medium border transition-colors whitespace-nowrap hover:bg-primary-50/40"
                                                                        style={{ backgroundColor: 'var(--tertiary-fixed)', color: 'var(--on-tertiary-container)', borderColor: 'var(--outline-variant)' }}
                                                                    >
                                                                        <Send className="w-3 h-3" /> Remind
                                                                    </button>
                                                                </>
                                                            ) : (
                                                                <span className="text-[10px] whitespace-nowrap" style={{ color: 'var(--on-surface-variant)' }} title="Record outbound shipment in RA Tracking before payment actions">
                                                                    Ship first
                                                                </span>
                                                            )}
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
                            <div className="flex items-center justify-between px-3 py-2 border-t" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}>
                                <span className="text-[10px]" style={{ color: 'var(--on-surface-variant)' }}>
                                    Page {unpaidPagination.page} of {unpaidPagination.totalPages} ({unpaidPagination.total} memos)
                                </span>
                                <div className="flex gap-1.5">
                                    <button
                                        disabled={page <= 1}
                                        onClick={() => setPage(p => p - 1)}
                                        className="p-1 rounded border disabled:opacity-40 hover:bg-primary-50 transition-colors"
                                        style={{ borderColor: 'var(--outline-variant)' }}
                                    >
                                        <ChevronLeft className="w-3.5 h-3.5" style={{ color: 'var(--on-surface-variant)' }} />
                                    </button>
                                    <button
                                        disabled={page >= unpaidPagination.totalPages}
                                        onClick={() => setPage(p => p + 1)}
                                        className="p-1 rounded border disabled:opacity-40 hover:bg-primary-50 transition-colors"
                                        style={{ borderColor: 'var(--outline-variant)' }}
                                    >
                                        <ChevronRight className="w-3.5 h-3.5" style={{ color: 'var(--on-surface-variant)' }} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ─── TAB 2: Paid Memos ───────────────────────────── */}
            {activeTab === 'paid' && (
                <div className="space-y-2">
                    {/* Summary card */}
                    {paidPagination && (
                        <div className="rounded-[4px] border px-4 py-2.5 flex items-center gap-3 max-w-xs" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}>
                            <div className="p-2 rounded-[4px] flex-shrink-0" style={{ backgroundColor: 'var(--secondary-container)' }}>
                                <CheckCircle className="w-4 h-4" style={{ color: 'var(--secondary)' }} />
                            </div>
                            <div>
                                <p className="text-[10px]" style={{ color: 'var(--on-surface-variant)' }}>Total Paid Memos</p>
                                <p className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>{paidPagination.total}</p>
                            </div>
                        </div>
                    )}

                    {/* Filters */}
                    <div className="rounded-[4px] border px-3 py-2 flex flex-wrap gap-2 items-center" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}>
                        <div className="relative flex-1 min-w-[180px]">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                            <input
                                value={paidSearch}
                                onChange={e => { setPaidSearch(e.target.value); setPaidPage(1); }}
                                placeholder="Search memos, manufacturer, pharmacy..."
                                className="w-full pl-8 pr-3 py-1.5 border rounded text-xs focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                                style={{ backgroundColor: 'var(--surface-container-low)', borderColor: 'var(--outline-variant)' }}
                            />
                        </div>
                        <select
                            value={paidDestination}
                            onChange={e => { setPaidDestination(e.target.value); setPaidPage(1); }}
                            className="border rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-primary-500"
                            style={{ backgroundColor: 'var(--surface-container-low)', borderColor: 'var(--outline-variant)' }}
                        >
                            <option value="">All Destinations</option>
                            <option value="Inmar">Inmar</option>
                            <option value="PharmaLink">PharmaLink</option>
                            <option value="Cardinal">Cardinal</option>
                            <option value="Direct">Direct</option>
                        </select>
                    </div>

                    {/* Table */}
                    <div className="rounded-[4px] border overflow-hidden" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}>
                        {isLoading ? (
                            <div className="flex items-center justify-center py-14">
                                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                            </div>
                        ) : (paidMemos ?? []).length === 0 ? (
                            <div className="text-center py-14 text-gray-500">
                                <CheckCircle className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                                <p className="text-sm font-medium">No paid memos found</p>
                                <p className="text-xs mt-0.5">No debit memos have been marked as paid yet.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full border" style={{ borderColor: 'var(--outline)' }}>
                                    <thead className="bg-[var(--surface-container-low)] border-b" style={{ borderColor: 'var(--outline)', borderBottomWidth: '1.5px' }}>
                                        <tr className="bg-[var(--surface-container-low)]">
                                            <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-[var(--on-surface-variant)] whitespace-nowrap">Memo #</th>
                                            <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-[var(--on-surface-variant)] whitespace-nowrap">Manufacturer</th>
                                            <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-[var(--on-surface-variant)] whitespace-nowrap">Pharmacy</th>
                                            <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-[var(--on-surface-variant)] whitespace-nowrap">Destination</th>
                                            <th className="text-right px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-[var(--on-surface-variant)] whitespace-nowrap">Asked</th>
                                            <th className="text-right px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-[var(--on-surface-variant)] whitespace-nowrap">Received</th>
                                            <th className="text-center px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-[var(--on-surface-variant)] whitespace-nowrap">Status</th>
                                            <th className="text-right px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-[var(--on-surface-variant)] whitespace-nowrap">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y" style={{ borderColor: 'var(--outline-variant)' }}>
                                        {(paidMemos ?? []).map(memo => (
                                            <tr key={memo.id} className="hover:bg-[var(--surface-container)]" style={{ borderColor: 'var(--outline-variant)' }}>
                                                <td className="px-3 py-3 text-sm font-medium" style={{ color: 'var(--foreground)' }}>{memo.memoNumber}</td>
                                                <td className="px-3 py-3 text-sm" style={{ color: 'var(--on-surface-variant)' }}>{memo.labelerName || '—'}</td>
                                                <td className="px-3 py-3 text-sm" style={{ color: 'var(--on-surface-variant)' }}>{memo.pharmacyName || '—'}</td>
                                                <td className="px-3 py-3 text-sm" style={{ color: 'var(--on-surface-variant)' }}>{memo.destination || '—'}</td>
                                                <td className="px-3 py-3 text-sm text-right font-medium">{fmt(memo.amountRequested)}</td>
                                                <td className="px-3 py-3 text-sm text-right font-semibold" style={{ color: 'var(--secondary)' }}>{fmt(memo.amountReceived)}</td>
                                                <td className="px-3 py-3 text-center">
                                                    <Badge variant="success">
                                                        <span className="text-[10px]">paid</span>
                                                    </Badge>
                                                </td>
                                                <td className="px-3 py-3">
                                                    <div className="flex items-center justify-end">
                                                        <button
                                                            type="button"
                                                            onClick={() => openEditModal(memo)}
                                                            className="inline-flex items-center gap-0.5 px-2 py-1 rounded text-[11px] font-medium border transition-colors whitespace-nowrap hover:bg-primary-50/40"
                                                            style={{ backgroundColor: 'var(--primary-container)', color: 'white', borderColor: 'var(--outline-variant)' }}
                                                        >
                                                            <FileText className="w-3 h-3" /> Edit
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Pagination */}
                        {paidPagination && paidPagination.totalPages > 1 && (
                            <div className="flex items-center justify-between px-3 py-2 border-t" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}>
                                <span className="text-[10px]" style={{ color: 'var(--on-surface-variant)' }}>
                                    Page {paidPagination.page} of {paidPagination.totalPages} ({paidPagination.total} memos)
                                </span>
                                <div className="flex gap-1.5">
                                    <button
                                        disabled={paidPage <= 1}
                                        onClick={() => setPaidPage(p => p - 1)}
                                        className="p-1 rounded border disabled:opacity-40 hover:bg-primary-50 transition-colors"
                                        style={{ borderColor: 'var(--outline-variant)' }}
                                    >
                                        <ChevronLeft className="w-3.5 h-3.5" style={{ color: 'var(--on-surface-variant)' }} />
                                    </button>
                                    <button
                                        disabled={paidPage >= paidPagination.totalPages}
                                        onClick={() => setPaidPage(p => p + 1)}
                                        className="p-1 rounded border disabled:opacity-40 hover:bg-primary-50 transition-colors"
                                        style={{ borderColor: 'var(--outline-variant)' }}
                                    >
                                        <ChevronRight className="w-3.5 h-3.5" style={{ color: 'var(--on-surface-variant)' }} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ─── TAB 3: Ask vs Received ──────────────────────── */}
            {activeTab === 'askVsReceived' && (
                <div className="space-y-2">
                    {/* Totals cards */}
                    {askVsReceivedTotals && (
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                            {[
                                { label: 'Total Memos', value: askVsReceivedTotals.totalMemos ?? 0, color: '' },
                                { label: 'Total Ask', value: fmt(askVsReceivedTotals.totalAskValue), color: '' },
                                { label: 'Total Received', value: fmt(askVsReceivedTotals.totalReceived), color: '', style: { color: 'var(--secondary)' } as React.CSSProperties },
                                { label: 'Overall Pay %', value: pct(askVsReceivedTotals.overallPayPercent), color: '', extra: askVsReceivedTotals.overallPayPercent >= 80 ? <TrendingUp className="w-3.5 h-3.5 inline ml-1" style={{ color: 'var(--secondary)' }} /> : <TrendingDown className="w-3.5 h-3.5 inline ml-1" style={{ color: 'var(--error)' }} /> },
                            ].map(({ label, value, color, extra }) => (
                                <div key={label} className="rounded-[4px] border px-3 py-2" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}>
                                    <p className="text-[10px]" style={{ color: 'var(--on-surface-variant)' }}>{label}</p>
                                    <p className={`text-base font-bold mt-0.5 ${color}`} style={{ color: 'var(--foreground)' }}>{value}{extra}</p>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Group toggle */}
                    <div className="rounded-[4px] border px-3 py-2 flex items-center gap-2" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}>
                        <span className="text-xs font-medium" style={{ color: 'var(--on-surface-variant)' }}>Group by:</span>
                        <div className="flex gap-0.5 rounded p-0.5" style={{ backgroundColor: 'var(--surface-container-low)' }}>
                            <button
                                onClick={() => setAnalyticsGroupBy('manufacturer')}
                                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${analyticsGroupBy === 'manufacturer' ? 'shadow-sm' : ''}`}
                                style={{
                                    backgroundColor: analyticsGroupBy === 'manufacturer' ? 'var(--surface-container-lowest)' : 'transparent',
                                    color: analyticsGroupBy === 'manufacturer' ? 'var(--foreground)' : 'var(--on-surface-variant)',
                                }}
                            >
                                Manufacturer
                            </button>
                            <button
                                onClick={() => setAnalyticsGroupBy('period')}
                                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${analyticsGroupBy === 'period' ? 'shadow-sm' : ''}`}
                                style={{
                                    backgroundColor: analyticsGroupBy === 'period' ? 'var(--surface-container-lowest)' : 'transparent',
                                    color: analyticsGroupBy === 'period' ? 'var(--foreground)' : 'var(--on-surface-variant)',
                                }}
                            >
                                Monthly
                            </button>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="rounded-[4px] border overflow-hidden" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}>
                        {isLoading ? (
                            <div className="flex items-center justify-center py-14"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
                        ) : askVsReceived.length === 0 ? (
                            <div className="text-center py-14 text-gray-500">
                                <BarChart3 className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                                <p className="text-sm font-medium">No data available</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full border" style={{ borderColor: 'var(--outline)' }}>
                                    <thead className="bg-[var(--surface-container-low)] border-b" style={{ borderColor: 'var(--outline)', borderBottomWidth: '1.5px' }}>
                                        <tr className="bg-[var(--surface-container-low)]">
                                            <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-[var(--on-surface-variant)] whitespace-nowrap">{analyticsGroupBy === 'manufacturer' ? 'Manufacturer' : 'Period'}</th>
                                            <th className="text-center px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-[var(--on-surface-variant)] whitespace-nowrap">Memos</th>
                                            <th className="text-right px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-[var(--on-surface-variant)] whitespace-nowrap">Total Ask</th>
                                            <th className="text-right px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-[var(--on-surface-variant)] whitespace-nowrap">Total Received</th>
                                            <th className="text-right px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-[var(--on-surface-variant)] whitespace-nowrap">Difference</th>
                                            <th className="text-center px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-[var(--on-surface-variant)] whitespace-nowrap">Pay %</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y" style={{ borderColor: 'var(--outline-variant)' }}>
                                        {askVsReceived.map((row: AskVsReceivedRow, i: number) => (
                                            <tr key={i} className="hover:bg-[var(--surface-container)]" style={{ borderColor: 'var(--outline-variant)' }}>
                                                <td className="px-3 py-3 text-sm font-medium" style={{ color: 'var(--foreground)' }}>{analyticsGroupBy === 'manufacturer' ? (row.labelerName || row.labelerId || '—') : (row.period || '—')}</td>
                                                <td className="px-3 py-3 text-sm text-center">{row.memoCount ?? '—'}</td>
                                                <td className="px-3 py-3 text-sm text-right">{fmt(row.totalAskValue ?? row.totalAsk ?? 0)}</td>
                                                <td className="px-3 py-3 text-sm text-right font-medium" style={{ color: 'var(--secondary)' }}>{fmt(row.totalReceived)}</td>
                                                <td className="px-3 py-3 text-sm text-right" style={{ color: 'var(--error)' }}>{fmt(row.difference)}</td>
                                                <td className="px-3 py-3 text-sm text-center">
                                                    <span
                                                        className="font-semibold"
                                                        style={{
                                                            color:
                                                                row.payPercent >= 80
                                                                    ? 'var(--secondary)'
                                                                    : row.payPercent >= 50
                                                                        ? 'var(--tertiary)'
                                                                        : 'var(--error)',
                                                        }}
                                                    >
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
                <div className="space-y-2">
                    {/* Search */}
                    <div className="rounded-[4px] border px-3 py-2" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}>
                        <div className="relative max-w-md">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                            <input
                                value={mfgSearch}
                                onChange={e => { setMfgSearch(e.target.value); setMfgPage(1); }}
                                placeholder="Search manufacturer..."
                                className="w-full pl-8 pr-3 py-1.5 border rounded text-xs focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                                style={{ backgroundColor: 'var(--surface-container-low)', borderColor: 'var(--outline-variant)' }}
                            />
                        </div>
                    </div>

                    {/* Table */}
                    <div className="rounded-[4px] border overflow-hidden" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}>
                        {isLoading ? (
                            <div className="flex items-center justify-center py-14"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
                        ) : manufacturerSummary.length === 0 ? (
                            <div className="text-center py-14 text-gray-500">
                                <TrendingUp className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                                <p className="text-sm font-medium">No manufacturers found</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full border" style={{ borderColor: 'var(--outline)' }}>
                                    <thead className="bg-[var(--surface-container-low)] border-b" style={{ borderColor: 'var(--outline)', borderBottomWidth: '1.5px' }}>
                                        <tr className="bg-[var(--surface-container-low)]">
                                            <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-[var(--on-surface-variant)] whitespace-nowrap">Manufacturer</th>
                                            <th className="text-center px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-[var(--on-surface-variant)] whitespace-nowrap">Total</th>
                                            <th className="text-center px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-[var(--on-surface-variant)] whitespace-nowrap">Unpaid</th>
                                            <th className="text-center px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-[var(--on-surface-variant)] whitespace-nowrap">Paid</th>
                                            <th className="text-right px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-[var(--on-surface-variant)] whitespace-nowrap">Ask Value</th>
                                            <th className="text-right px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-[var(--on-surface-variant)] whitespace-nowrap">Paid Amt</th>
                                            <th className="text-right px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-[var(--on-surface-variant)] whitespace-nowrap">Outstanding</th>
                                            <th className="text-center px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-[var(--on-surface-variant)] whitespace-nowrap">Avg Pay %</th>
                                            <th className="text-center px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-[var(--on-surface-variant)] whitespace-nowrap">Avg Days</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y" style={{ borderColor: 'var(--outline-variant)' }}>
                                        {manufacturerSummary.map((row: ManufacturerPaymentSummary, i: number) => (
                                            <tr key={i} className="hover:bg-[var(--surface-container)]" style={{ borderColor: 'var(--outline-variant)' }}>
                                                <td className="px-3 py-3">
                                                    <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{row.labelerName || '—'}</p>
                                                    {row.labelerId && <p className="text-[10px]" style={{ color: 'var(--on-surface-variant)' }}>{row.labelerId}</p>}
                                                </td>
                                                <td className="px-3 py-3 text-sm text-center">{row.totalMemos}</td>
                                                <td className="px-3 py-3 text-sm text-center">{row.unpaidMemos > 0 ? <span className="font-semibold" style={{ color: 'var(--error)' }}>{row.unpaidMemos}</span> : <span style={{ color: 'var(--on-surface-variant)' }}>0</span>}</td>
                                                <td className="px-3 py-3 text-sm text-center" style={{ color: 'var(--secondary)' }}>{row.paidMemos}</td>
                                                <td className="px-3 py-3 text-sm text-right">{fmt(row.totalAskValue)}</td>
                                                <td className="px-3 py-3 text-sm text-right" style={{ color: 'var(--secondary)' }}>{fmt(row.totalPaidAmount)}</td>
                                                <td className="px-3 py-3 text-sm text-right font-semibold" style={{ color: 'var(--error)' }}>{fmt(row.outstandingAmount)}</td>
                                                <td className="px-3 py-3 text-sm text-center">
                                                    <span
                                                        className="font-semibold"
                                                        style={{
                                                            color:
                                                                row.averagePayPercent >= 80
                                                                    ? 'var(--secondary)'
                                                                    : row.averagePayPercent >= 50
                                                                        ? 'var(--tertiary)'
                                                                        : 'var(--error)',
                                                        }}
                                                    >
                                                        {pct(row.averagePayPercent)}
                                                    </span>
                                                    {row.policyAvgPayPercent != null && <p className="text-[10px]" style={{ color: 'var(--on-surface-variant)' }}>P: {pct(row.policyAvgPayPercent)}</p>}
                                                </td>
                                                <td className="px-3 py-3 text-sm text-center">
                                                    <span className="font-medium">{row.averageDaysToPay}d</span>
                                                    {row.policyAvgDaysToPay != null && <p className="text-[10px]" style={{ color: 'var(--on-surface-variant)' }}>P: {row.policyAvgDaysToPay}d</p>}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Pagination */}
                        {manufacturerPagination && manufacturerPagination.totalPages > 1 && (
                            <div className="flex items-center justify-between px-3 py-2 border-t" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}>
                                <span className="text-[10px]" style={{ color: 'var(--on-surface-variant)' }}>Page {manufacturerPagination.page} of {manufacturerPagination.totalPages}</span>
                                <div className="flex gap-1.5">
                                    <button
                                        disabled={mfgPage <= 1}
                                        onClick={() => setMfgPage(p => p - 1)}
                                        className="p-1 rounded border disabled:opacity-40 hover:bg-primary-50 transition-colors"
                                        style={{ borderColor: 'var(--outline-variant)' }}
                                    >
                                        <ChevronLeft className="w-3.5 h-3.5" style={{ color: 'var(--on-surface-variant)' }} />
                                    </button>
                                    <button
                                        disabled={mfgPage >= manufacturerPagination.totalPages}
                                        onClick={() => setMfgPage(p => p + 1)}
                                        className="p-1 rounded border disabled:opacity-40 hover:bg-primary-50 transition-colors"
                                        style={{ borderColor: 'var(--outline-variant)' }}
                                    >
                                        <ChevronRight className="w-3.5 h-3.5" style={{ color: 'var(--on-surface-variant)' }} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ─── Record Payment Modal ────────────────────────── */}
            {paymentMemo && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm" style={{ backgroundColor: 'color-mix(in srgb, var(--inverse-surface) 55%, transparent)' }}>
                    <div className="rounded-[4px] shadow-2xl w-full max-w-md border" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}>
                        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--outline-variant)' }}>
                            <div>
                                <h3 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{isEditMode ? 'Update Payment' : 'Record Payment'}</h3>
                                <p className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>{paymentMemo.memoNumber} — {paymentMemo.labelerName || 'Unknown'}</p>
                            </div>
                            <button onClick={() => { setPaymentMemo(null); setExistingCreditMemoUrl(null); }} style={{ color: 'var(--outline)' }}><X className="w-4 h-4" /></button>
                        </div>

                        <div className="px-4 py-3 space-y-3">
                            {!isEditMode ? (
                                <div className="grid grid-cols-3 gap-2 p-2.5 rounded text-center border" style={{ backgroundColor: 'var(--surface-container-low)', borderColor: 'var(--outline-variant)' }}>
                                    <div><p className="text-[10px]" style={{ color: 'var(--on-surface-variant)' }}>Asked</p><p className="text-xs font-semibold">{fmt(paymentMemo.amountRequested)}</p></div>
                                    <div><p className="text-[10px]" style={{ color: 'var(--on-surface-variant)' }}>Received So Far</p><p className="text-xs font-semibold" style={{ color: 'var(--secondary)' }}>{fmt(paymentMemo.amountReceived)}</p></div>
                                    <div><p className="text-[10px]" style={{ color: 'var(--on-surface-variant)' }}>Outstanding</p><p className="text-xs font-semibold" style={{ color: 'var(--error)' }}>{fmt(paymentMemo.amountRequested - paymentMemo.amountReceived)}</p></div>
                                </div>
                            ) : (
                                <div className="p-2.5 border rounded" style={{ backgroundColor: 'var(--surface-container-low)', borderColor: 'var(--outline-variant)' }}>
                                    <p className="text-xs mb-1.5" style={{ color: 'var(--on-surface)' }}><strong>Editing payment record</strong></p>
                                    <div className="grid grid-cols-2 gap-2 text-center">
                                        <div><p className="text-[10px]" style={{ color: 'var(--on-surface-variant)' }}>Asked</p><p className="text-xs font-semibold" style={{ color: 'var(--on-surface)' }}>{fmt(paymentMemo.amountRequested)}</p></div>
                                        <div><p className="text-[10px]" style={{ color: 'var(--on-surface-variant)' }}>Currently Recorded</p><p className="text-xs font-semibold" style={{ color: 'var(--on-surface)' }}>{fmt(paymentMemo.amountReceived)}</p></div>
                                    </div>
                                </div>
                            )}
                            <div>
                                <label className="block text-xs font-medium mb-0.5 flex items-center gap-1.5" style={{ color: 'var(--on-surface)' }}>
                                    Amount Received <span style={{ color: 'var(--error)' }}>*</span>
                                    {isAnalyzingCreditMemo && <Loader2 className="w-3 h-3 animate-spin" style={{ color: 'var(--secondary)' }} />}
                                    {!isEditMode && (
                                        <div className="relative group">
                                            <Info className="w-3 h-3 cursor-help" style={{ color: 'var(--outline)' }} />
                                            <div className="absolute left-0 bottom-full mb-1 hidden group-hover:block z-50 w-64 px-2 py-1.5 text-[10px] rounded shadow-lg border" style={{ backgroundColor: 'var(--inverse-surface)', color: 'var(--inverse-on-surface)', borderColor: 'var(--outline-variant)' }}>
                                                First upload your credit memo file to see amount received
                                            </div>
                                        </div>
                                    )}
                                    {isAmountAutoCalculated && !isEditMode && <Sparkles className="w-3 h-3" style={{ color: 'var(--secondary)' }} />}
                                </label>
                                <div className="relative">
                                    <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                    <input 
                                        type="number" 
                                        step="0.01" 
                                        min="0" 
                                        value={paymentAmount} 
                                        onChange={e => {
                                            setPaymentAmount(e.target.value);
                                            setIsAmountAutoCalculated(false);
                                        }} 
                                        disabled={isAnalyzingCreditMemo}
                                        className="w-full pl-8 pr-3 py-1.5 border rounded text-xs focus:ring-1 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-60 disabled:cursor-not-allowed" 
                                        style={{ 
                                            backgroundColor: isAmountAutoCalculated ? 'var(--secondary-container)' : 'var(--surface-container-low)', 
                                            borderColor: isAmountAutoCalculated ? 'var(--secondary)' : 'var(--outline-variant)',
                                            color: isAmountAutoCalculated ? 'var(--on-secondary-container)' : 'var(--on-surface)',
                                            fontWeight: isAmountAutoCalculated ? '600' : 'normal',
                                        }} 
                                        placeholder={isAnalyzingCreditMemo ? 'Analyzing...' : '0.00'} 
                                    />
                                </div>
                                {isAmountAutoCalculated && !isEditMode && (
                                    <p className="text-[10px] mt-1 flex items-center gap-1" style={{ color: 'var(--secondary)' }}>
                                        <Sparkles className="w-2.5 h-2.5" />
                                        Auto-calculated from credit memo NDC matching
                                    </p>
                                )}
                                {!isEditMode && !creditMemoFile && !isAmountAutoCalculated && (
                                    <p className="text-[10px] mt-1 flex items-center gap-1" style={{ color: 'var(--outline)' }}>
                                        <Info className="w-2.5 h-2.5" />
                                        Upload credit memo — amount will be auto-calculated or you can enter it manually
                                    </p>
                                )}
                                {!isEditMode && creditMemoFile && !isAmountAutoCalculated && !isAnalyzingCreditMemo && (
                                    <p className="text-[10px] mt-1 flex items-center gap-1" style={{ color: 'var(--tertiary)' }}>
                                        <Info className="w-2.5 h-2.5" />
                                        AI could not auto-calculate — please enter the amount manually above
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className="block text-xs font-medium mb-0.5" style={{ color: 'var(--on-surface)' }}>Payment Date</label>
                                <input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className="w-full px-2.5 py-1.5 border rounded text-xs focus:ring-1 focus:ring-primary-500 focus:border-primary-500" style={{ backgroundColor: 'var(--surface-container-low)', borderColor: 'var(--outline-variant)' }} />
                            </div>
                            <div>
                                <label className="block text-xs font-medium mb-0.5" style={{ color: 'var(--on-surface)' }}>Reference # (check/wire)</label>
                                <input value={paymentRef} onChange={e => setPaymentRef(e.target.value)} className="w-full px-2.5 py-1.5 border rounded text-xs focus:ring-1 focus:ring-primary-500 focus:border-primary-500" style={{ backgroundColor: 'var(--surface-container-low)', borderColor: 'var(--outline-variant)' }} placeholder="e.g. CHK-12345" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium mb-0.5" style={{ color: 'var(--on-surface)' }}>Notes</label>
                                <textarea value={paymentNotes} onChange={e => setPaymentNotes(e.target.value)} rows={2} className="w-full px-2.5 py-1.5 border rounded text-xs focus:ring-1 focus:ring-primary-500 focus:border-primary-500 resize-none" style={{ backgroundColor: 'var(--surface-container-low)', borderColor: 'var(--outline-variant)' }} placeholder="Optional notes..." />
                            </div>

                            {/* Credit Memo Upload (required for new, optional for edit) */}
                            <div>
                                <label className="block text-xs font-medium mb-0.5" style={{ color: 'var(--on-surface)' }}>
                                    Credit Memo {!isEditMode && <span style={{ color: 'var(--error)' }}>*</span>}
                                    <span className="ml-1 text-[10px] font-normal" style={{ color: 'var(--on-surface-variant)' }}>(PDF only)</span>
                                </label>
                                {isEditMode && existingCreditMemoUrl && !creditMemoFile && (
                                    <div className="mb-2 p-2 border rounded flex items-center gap-2" style={{ backgroundColor: 'var(--surface-container-low)', borderColor: 'var(--outline-variant)' }}>
                                        <FileText className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--on-surface-variant)' }} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs" style={{ color: 'var(--on-surface)' }}>Current credit memo on file</p>
                                            <a href={existingCreditMemoUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] hover:underline truncate block" style={{ color: 'var(--secondary)' }}>
                                                View existing PDF
                                            </a>
                                        </div>
                                    </div>
                                )}
                                <label
                                    className="flex items-center gap-3 w-full px-3 py-2.5 border-2 border-dashed rounded cursor-pointer transition-colors"
                                    style={{
                                        borderColor: creditMemoFile ? 'var(--secondary)' : 'var(--outline-variant)',
                                        backgroundColor: creditMemoFile ? 'var(--secondary-container)' : 'var(--surface-container-low)',
                                    }}
                                >
                                    <input
                                        type="file"
                                        accept="application/pdf"
                                        className="hidden"
                                        onChange={e => {
                                            const f = e.target.files?.[0] || null;
                                            if (f && f.type !== 'application/pdf') {
                                                addToast('Only PDF files are allowed', 'error');
                                                return;
                                            }
                                            setCreditMemoFile(f);
                                            // Reset auto-calculation state when a new file is selected
                                            setIsAmountAutoCalculated(false);
                                        }}
                                    />
                                    {creditMemoFile ? (
                                        <>
                                            <FileText className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--secondary)' }} />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-medium truncate" style={{ color: 'var(--on-secondary-container)' }}>{creditMemoFile.name}</p>
                                                <p className="text-[10px]" style={{ color: 'var(--on-secondary-container)' }}>{(creditMemoFile.size / 1024).toFixed(1)} KB — Click to change</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={e => { 
                                                    e.preventDefault(); 
                                                    setCreditMemoFile(null);
                                                    setIsAmountAutoCalculated(false);
                                                    setPaymentAmount('0'); // Reset amount when file is removed
                                                }}
                                                className="flex-shrink-0 transition-colors"
                                                style={{ color: 'var(--outline)' }}
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--outline)' }} />
                                            <div>
                                                <p className="text-xs font-medium" style={{ color: 'var(--on-surface)' }}>{isEditMode ? 'Click to upload new credit memo (optional)' : 'Click to upload credit memo'}</p>
                                                <p className="text-[10px]" style={{ color: 'var(--on-surface-variant)' }}>PDF up to 10MB</p>
                                            </div>
                                        </>
                                    )}
                                </label>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 px-4 py-3 border-t" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}>
                            <button
                                onClick={() => { setPaymentMemo(null); setCreditMemoFile(null); setExistingCreditMemoUrl(null); }}
                                className="px-3 py-1.5 text-xs rounded border transition-colors hover:bg-primary-50/40"
                                style={{ borderColor: 'var(--outline-variant)', color: 'var(--on-surface)', backgroundColor: 'var(--surface-container-lowest)' }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRecordPayment}
                                disabled={isActionLoading || isAnalyzingCreditMemo || (!isEditMode && (!creditMemoFile || parseFloat(paymentAmount) <= 0))}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded text-white disabled:opacity-50 transition-colors"
                                style={{ backgroundColor: 'var(--secondary)' }}
                            >
                                {isActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CreditCard className="w-3.5 h-3.5" />}
                                {isEditMode ? 'Update Payment' : (isAnalyzingCreditMemo ? 'Analyzing...' : 'Record Payment')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Send Reminder Modal ─────────────────────────── */}
            {reminderMemo && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm" style={{ backgroundColor: 'color-mix(in srgb, var(--inverse-surface) 55%, transparent)' }}>
                    <div className="rounded-[4px] shadow-2xl w-full max-w-sm border" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}>
                        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--outline-variant)' }}>
                            <div>
                                <h3 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Send Payment Reminder</h3>
                                <p className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>{reminderMemo.memoNumber} — Outstanding: {fmt(reminderMemo.amountRequested - reminderMemo.amountReceived)}</p>
                            </div>
                            <button onClick={() => { setReminderMemo(null); setReminderEmail(''); }} style={{ color: 'var(--outline)' }}><X className="w-4 h-4" /></button>
                        </div>

                        <div className="px-4 py-3 space-y-3">
                            <div className="p-2.5 rounded text-xs border" style={{ backgroundColor: 'var(--primary-container)', borderColor: 'var(--outline-variant)', color: 'var(--on-primary-container)' }}>
                                Sent to the <strong>reverse distributor</strong> contact email for this destination — same address as RA request emails (from Distributors). Use override below only if you need a different recipient.
                            </div>
                            <div>
                                <label className="block text-xs font-medium mb-0.5" style={{ color: 'var(--on-surface)' }}>Email Override (optional)</label>
                                <input type="email" value={reminderEmail} onChange={e => setReminderEmail(e.target.value)} className="w-full px-2.5 py-1.5 border rounded text-xs focus:ring-1 focus:ring-primary-500 focus:border-primary-500" style={{ backgroundColor: 'var(--surface-container-low)', borderColor: 'var(--outline-variant)' }} placeholder="Override email..." />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 px-4 py-3 border-t" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}>
                            <button
                                onClick={() => { setReminderMemo(null); setReminderEmail(''); }}
                                className="px-3 py-1.5 text-xs rounded border transition-colors hover:bg-primary-50/40"
                                style={{ borderColor: 'var(--outline-variant)', color: 'var(--on-surface)', backgroundColor: 'var(--surface-container-lowest)' }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSendReminder}
                                disabled={isActionLoading}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded text-white disabled:opacity-50 transition-colors"
                                style={{ backgroundColor: 'var(--tertiary)' }}
                            >
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
