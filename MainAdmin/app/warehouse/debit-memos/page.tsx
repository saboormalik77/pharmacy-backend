'use client';

import { PermissionGate } from '@/components/auth/PermissionGate';
import { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
    Search, Loader2, ChevronLeft, ChevronRight, X, Edit,
    Receipt, FileText, DollarSign, Truck, AlertCircle,
    ChevronDown, ChevronUp, Save, Download, Package,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ToastContainer, Toast } from '@/components/ui/Toast';
import { formatDate } from '@/lib/utils';
import { cookieUtils } from '@/lib/utils/cookies';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import { useDebounce } from '@/lib/hooks/useDebounce';
import {
    fetchDebitMemosGroupedByReturn, fetchDebitMemoDetail, updateDebitMemo,
    clearError, clearCurrentMemo,
} from '@/lib/store/batchSlice';
import { DebitMemo, DebitMemoItem, ReturnWithMemos } from '@/lib/types';

const PAYMENT_OPTIONS = [
    { value: '', label: 'All Payments' },
    { value: 'pending', label: 'Pending' },
    { value: 'partial', label: 'Partial' },
    { value: 'paid', label: 'Paid' },
    { value: 'disputed', label: 'Disputed' },
];

const DESTINATION_OPTIONS = [
    { value: '', label: 'All Destinations' },
    { value: 'Inmar', label: 'Inmar' },
    { value: 'PharmaLink', label: 'PharmaLink' },
    { value: 'Cardinal', label: 'Cardinal' },
    { value: 'Direct', label: 'Direct' },
];

function formatCurrency(v: number) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);
}


function getPaymentBadge(s: string): { variant: 'success' | 'warning' | 'danger' | 'default' } {
    switch ((s || '').toLowerCase()) {
        case 'paid':
        case 'partial':
            return { variant: 'success' };
        case 'disputed':
            return { variant: 'danger' };
        default:
            return { variant: 'default' };
    }
}

/** Table / read-only UI only: partial + paid → "Paid", pending → "Pending"; other values unchanged */
function formatDebitMemoPaymentLabel(raw: string): string {
    const v = (raw || '').toLowerCase();
    if (v === 'partial' || v === 'paid') return 'Paid';
    if (v === 'pending') return 'Pending';
    return raw || '';
}

function pillStyle(kind: 'success' | 'warning' | 'danger' | 'info' | 'default') {
    const base: React.CSSProperties = {
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: 9999,
        fontSize: 10,
        lineHeight: '14px',
        fontWeight: 600,
        border: '1px solid var(--outline-variant)',
        backgroundColor: 'var(--surface-container-low)',
        color: 'var(--on-surface)',
        whiteSpace: 'nowrap',
        textTransform: 'capitalize',
    };

    switch (kind) {
        case 'success':
            return { ...base, backgroundColor: 'var(--secondary-container)', color: 'var(--on-secondary-container)' };
        case 'warning':
            return { ...base, backgroundColor: 'var(--tertiary-fixed)', color: 'var(--on-tertiary-container)' };
        case 'danger':
            return { ...base, backgroundColor: 'var(--error-container)', color: '#000000' };
        case 'info':
            return { ...base, backgroundColor: 'var(--primary-fixed)', color: 'var(--on-primary-container)' };
        default:
            return base;
    }
}

export default function DebitMemosPage() {
    const dispatch = useAppDispatch();
    const searchParams = useSearchParams();
    const highlightId = searchParams.get('highlight');

    const { groupedReturns, groupedPagination, currentMemo, memoItems, isLoading, isActionLoading, error } =
        useAppSelector(s => s.batch);

    const [search, setSearch] = useState('');
    const debouncedSearch = useDebounce(search, 400);
    const [destination, setDestination] = useState('');
    const [paymentStatus, setPaymentStatus] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [toasts, setToasts] = useState<Toast[]>([]);

    const [expandedMemoId, setExpandedMemoId] = useState<string | null>(null);
    const [editing, setEditing] = useState(false);
    const [editForm, setEditForm] = useState<Record<string, any>>({});
    const [downloadingMemoId, setDownloadingMemoId] = useState<string | null>(null);
    const expandedRowRef = useRef<HTMLDivElement | null>(null);

    const addToast = useCallback((msg: string, type: Toast['type']) => {
        setToasts(prev => [...prev, { id: Date.now().toString(), message: msg, type }]);
    }, []);

    const loadMemos = useCallback(() => {
        dispatch(fetchDebitMemosGroupedByReturn({
            search: debouncedSearch || undefined,
            destination: destination || undefined,
            paymentStatus: paymentStatus || undefined,
            page: currentPage,
            limit: 10,
        }));
    }, [dispatch, debouncedSearch, destination, paymentStatus, currentPage]);

    useEffect(() => { loadMemos(); }, [loadMemos]);
    useEffect(() => { if (error) { addToast(error, 'error'); dispatch(clearError()); } }, [error, addToast, dispatch]);

    useEffect(() => {
        if (highlightId && groupedReturns.length > 0) {
            setExpandedMemoId(highlightId);
            dispatch(fetchDebitMemoDetail(highlightId));
        }
    }, [highlightId, groupedReturns, dispatch]);

    /** Keep the opened row in view when expanding and again after detail loads (taller panel). */
    useLayoutEffect(() => {
        if (!expandedMemoId) return;
        const el = expandedRowRef.current;
        if (!el) return;
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }, [expandedMemoId, currentMemo?.id]);

    const toggleExpand = (memoId: string) => {
        if (expandedMemoId === memoId) {
            setExpandedMemoId(null);
            setEditing(false);
            dispatch(clearCurrentMemo());
        } else {
            setExpandedMemoId(memoId);
            setEditing(false);
            dispatch(fetchDebitMemoDetail(memoId));
        }
    };

    const startEditing = (memo: DebitMemo) => {
        setEditing(true);
        setEditForm({
            raNumber: memo.raNumber || '',
            raRequestedAt: memo.raRequestedAt?.split('T')[0] || '',
            raReceivedAt: memo.raReceivedAt?.split('T')[0] || '',
            ticklerDate: memo.ticklerDate?.split('T')[0] || '',
            baggieManifest: memo.baggieManifest || '',
            outboundTracking: memo.outboundTracking || '',
            shippedAt: memo.shippedAt?.split('T')[0] || '',
            paymentStatus: memo.paymentStatus || 'pending',
            amountRequested: memo.amountRequested || 0,
            amountReceived: memo.amountReceived || 0,
        });
    };

    const handleSave = async () => {
        if (!currentMemo) return;
        const updates: Record<string, any> = {};
        if (editForm.raNumber) updates.raNumber = editForm.raNumber;
        if (editForm.raRequestedAt) updates.raRequestedAt = editForm.raRequestedAt;
        if (editForm.raReceivedAt) updates.raReceivedAt = editForm.raReceivedAt;
        if (editForm.ticklerDate) updates.ticklerDate = editForm.ticklerDate;
        if (editForm.baggieManifest) updates.baggieManifest = editForm.baggieManifest;
        if (editForm.outboundTracking) updates.outboundTracking = editForm.outboundTracking;
        if (editForm.shippedAt) updates.shippedAt = editForm.shippedAt;
        updates.paymentStatus = editForm.paymentStatus;
        updates.amountRequested = Number(editForm.amountRequested) || 0;
        updates.amountReceived = Number(editForm.amountReceived) || 0;

        const result = await dispatch(updateDebitMemo({ memoId: currentMemo.id, updates }));
        if (updateDebitMemo.fulfilled.match(result)) {
            addToast('Debit memo updated', 'success');
            setEditing(false);
            dispatch(fetchDebitMemoDetail(currentMemo.id));
            loadMemos();
        }
    };

    const handleDownload = async (memoId: string) => {
        setDownloadingMemoId(memoId);
        try {
            const token = cookieUtils.getAuthToken();
            if (!token) {
                addToast('Not authenticated', 'error');
                setDownloadingMemoId(null);
                return;
            }

            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
            const response = await fetch(`${apiUrl}/admin/debit-memos/${memoId}/download`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to download debit memo');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Debit_Memo_${memoId.substring(0, 8)}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            addToast('Debit memo downloaded', 'success');
        } catch (error) {
            console.error('Download error:', error);
            addToast('Failed to download debit memo', 'error');
        } finally {
            setDownloadingMemoId(null);
        }
    };

    const totalPages = groupedPagination?.totalPages || 1;

    return (
        <PermissionGate permission="warehouse">
        <div className="space-y-3">
            <ToastContainer toasts={toasts} onClose={id => setToasts(t => t.filter(x => x.id !== id))} />

            {/* Header */}
            <div>
                <Link
                    href="/warehouse"
                    className="inline-flex items-center gap-1 text-[11px] mb-1.5 transition-colors hover:underline"
                    style={{ color: 'var(--outline)' }}
                >
                    <ChevronLeft className="w-3 h-3" /> Back to Warehouse
                </Link>
                <h1 className="font-heading text-headline" style={{ color: 'var(--foreground)' }}>Debit Memos</h1>
                <p className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>View and manage debit memos generated from closed batches</p>
            </div>

            {/* Filters */}
            <div className="rounded-[4px] shadow px-3 py-2 border" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}>
                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative flex-1 min-w-[180px]">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--outline)' }} />
                        <input
                            type="text"
                            placeholder="Search by memo #, pharmacy, labeler..."
                            className="w-full pl-8 pr-3 py-1.5 border rounded text-xs focus:ring-1 focus:ring-primary-500 focus:border-transparent"
                            style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)', color: 'var(--foreground)' }}
                            value={search}
                            onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
                        />
                    </div>
                    <select
                        className="border rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-primary-500"
                        style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)', color: 'var(--foreground)' }}
                        value={destination}
                        onChange={e => { setDestination(e.target.value); setCurrentPage(1); }}
                    >
                        {DESTINATION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <select
                        className="border rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-primary-500"
                        style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)', color: 'var(--foreground)' }}
                        value={paymentStatus}
                        onChange={e => { setPaymentStatus(e.target.value); setCurrentPage(1); }}
                    >
                        {PAYMENT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="rounded-[4px] shadow overflow-hidden border" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}>
                {isLoading ? (
                    <div className="flex items-center justify-center py-14">
                        <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
                    </div>
                ) : groupedReturns.length === 0 ? (
                    <div className="text-center py-14" style={{ color: 'var(--on-surface-variant)' }}>
                        <Receipt className="w-10 h-10 mx-auto mb-2" style={{ color: 'var(--outline-variant)' }} />
                        <p className="text-sm font-medium">No debit memos found</p>
                        <p className="text-xs mt-0.5">Debit memos are generated when a batch is closed.</p>
                    </div>
                ) : (
                    <div>
                        {groupedReturns.map((returnGroup) => (
                            <div
                                key={returnGroup.returnId}
                                className="border-b last:border-b-0"
                                style={{ borderColor: 'var(--outline-variant)' }}
                            >
                                {/* Return group header */}
                                <div
                                    className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 border-b"
                                    style={{
                                        backgroundColor: 'var(--surface-container-low)',
                                        borderColor: 'var(--outline-variant)',
                                    }}
                                >
                                    <div className="flex items-center gap-1.5 min-w-0">
                                        <Package className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--primary)' }} />
                                        <span className="text-[10px] uppercase tracking-wide font-semibold" style={{ color: 'var(--on-surface-variant)' }}>
                                            Return
                                        </span>
                                        <span className="text-xs font-semibold truncate" style={{ color: 'var(--primary)' }}>
                                            {returnGroup.licensePlate}
                                        </span>
                                        <span className="text-[11px]" style={{ color: 'var(--on-surface-variant)' }}>
                                            · {returnGroup.pharmacyName}
                                        </span>
                                        <span className="text-[10px]" style={{ color: 'var(--outline)' }}>
                                            · {formatDate(returnGroup.returnCreatedAt)}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 ml-auto text-[11px]" style={{ color: 'var(--on-surface-variant)' }}>
                                        <span>
                                            {returnGroup.totalMemos} memo{returnGroup.totalMemos === 1 ? '' : 's'}
                                        </span>
                                        <span>·</span>
                                        <span>{returnGroup.totalItems} items</span>
                                        <span>·</span>
                                        <span className="font-medium" style={{ color: 'var(--foreground)' }}>
                                            {formatCurrency(returnGroup.totalAskValue)} ask
                                        </span>
                                    </div>
                                </div>

                                {returnGroup.memos.map(memo => {
                            const isExpanded = expandedMemoId === memo.id;
                            const pb = getPaymentBadge(memo.paymentStatus);

                            return (
                                <div
                                    key={memo.id}
                                    ref={isExpanded ? expandedRowRef : undefined}
                                    className="border-b last:border-b-0"
                                    style={{
                                        borderColor: 'var(--outline-variant)',
                                        boxShadow: isExpanded ? 'inset 0 0 0 2px color-mix(in srgb, var(--secondary) 35%, transparent)' : undefined,
                                        backgroundColor: !isExpanded && highlightId === memo.id ? 'var(--tertiary-fixed)' : undefined,
                                    }}
                                >
                                    {/* Collapsed Row */}
                                    <button
                                        onClick={() => toggleExpand(memo.id)}
                                        className="w-full flex items-center gap-3 px-4 py-2 transition-colors text-left hover:bg-primary-50/40"
                                        style={{ backgroundColor: isExpanded ? 'var(--secondary-container)' : 'transparent' }}
                                    >
                                        <div className="flex-1 grid grid-cols-2 md:grid-cols-7 gap-2">
                                            <div>
                                                <p className="text-[10px] uppercase" style={{ color: 'var(--on-surface-variant)' }}>Memo #</p>
                                                <p className="text-xs font-medium" style={{ color: 'var(--primary)' }}>{memo.memoNumber}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] uppercase" style={{ color: 'var(--on-surface-variant)' }}>Pharmacy</p>
                                                <p className="text-xs font-medium truncate" style={{ color: 'var(--foreground)' }}>{memo.pharmacyName}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] uppercase" style={{ color: 'var(--on-surface-variant)' }}>Destination</p>
                                                <p className="text-xs" style={{ color: 'var(--on-surface)' }}>{memo.destination || '—'}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] uppercase" style={{ color: 'var(--on-surface-variant)' }}>Items</p>
                                                <p className="text-xs" style={{ color: 'var(--on-surface)' }}>{memo.totalItems}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] uppercase" style={{ color: 'var(--on-surface-variant)' }}>Ask Value</p>
                                                <p className="text-xs font-medium" style={{ color: 'var(--foreground)' }}>{formatCurrency(memo.totalAskValue)}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] uppercase" style={{ color: 'var(--on-surface-variant)' }}>RA Status</p>
                                                <p>
                                                    {memo.raNumber
                                                        ? <span style={pillStyle('success')}>Received</span>
                                                        : memo.raRequestedAt
                                                            ? <span style={pillStyle('info')}>Requested</span>
                                                            : <span style={pillStyle('default')}>Pending</span>
                                                    }
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] uppercase" style={{ color: 'var(--on-surface-variant)' }}>Payment</p>
                                                <span style={pillStyle(pb.variant)}>{formatDebitMemoPaymentLabel(memo.paymentStatus)}</span>
                                            </div>
                                        </div>
                                        {isExpanded
                                            ? <ChevronUp className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--secondary)' }} />
                                            : <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--outline)' }} />
                                        }
                                    </button>

                                    {/* Expanded Detail */}
                                    {isExpanded && (
                                        <div className="border-t px-4 py-3" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'color-mix(in srgb, var(--secondary-container) 45%, transparent)' }}>
                                            {!currentMemo || currentMemo.id !== memo.id ? (
                                                <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-primary-500" /></div>
                                            ) : (
                                                <div className="space-y-3">
                                                    {/* Actions */}
                                                    <div className="flex justify-end">
                                                        {!editing ? (
                                                            <div className="flex gap-1.5">
                                                                <button 
                                                                    onClick={() => handleDownload(currentMemo.id)} 
                                                                    disabled={downloadingMemoId === currentMemo.id}
                                                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium border transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-50/40"
                                                                    style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-lowest)', color: 'var(--on-surface)' }}
                                                                >
                                                                    {downloadingMemoId === currentMemo.id ? (
                                                                        <><Loader2 className="w-3 h-3 animate-spin" /> Downloading...</>
                                                                    ) : (
                                                                        <><Download className="w-3 h-3" /> Download</>
                                                                    )}
                                                                </button>
                                                                <button
                                                                    onClick={() => startEditing(currentMemo)}
                                                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium border transition-colors cursor-pointer hover:bg-primary-50/40"
                                                                    style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-lowest)', color: 'var(--on-surface)' }}
                                                                >
                                                                    <Edit className="w-3 h-3" /> Edit
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div className="flex gap-1.5">
                                                                <button
                                                                    onClick={() => setEditing(false)}
                                                                    className="px-2.5 py-1 rounded text-xs border transition-colors cursor-pointer hover:bg-primary-50/40"
                                                                    style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-lowest)', color: 'var(--on-surface)' }}
                                                                >
                                                                    Cancel
                                                                </button>
                                                                <button onClick={handleSave} disabled={isActionLoading} className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 transition-colors cursor-pointer">
                                                                    {isActionLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                                                    Save
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Detail Cards */}
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                                        {/* RA Info */}
                                                        <div className="rounded-[4px] shadow-sm px-3 py-2 border" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}>
                                                            <h4 className="text-[11px] font-semibold mb-2 flex items-center gap-1" style={{ color: 'var(--on-surface)' }}><FileText className="w-3.5 h-3.5" /> RA Info</h4>
                                                            {editing ? (
                                                                <div className="space-y-2">
                                                                    {[
                                                                        { label: 'RA Number', key: 'raNumber', type: 'text' },
                                                                        { label: 'Requested At', key: 'raRequestedAt', type: 'date' },
                                                                        { label: 'Received At', key: 'raReceivedAt', type: 'date' },
                                                                        { label: 'Tickler Date', key: 'ticklerDate', type: 'date' },
                                                                    ].map(({ label, key, type }) => (
                                                                        <div key={key}>
                                                                            <label className="block text-[10px] mb-0.5" style={{ color: 'var(--on-surface-variant)' }}>{label}</label>
                                                                            <input
                                                                                type={type}
                                                                                className="w-full border rounded px-2 py-1 text-xs focus:ring-1 focus:ring-primary-500"
                                                                                style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)', color: 'var(--foreground)' }}
                                                                                value={editForm[key]}
                                                                                onChange={e => setEditForm(f => ({ ...f, [key]: e.target.value }))}
                                                                            />
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <div className="space-y-1.5">
                                                                    {[
                                                                        { label: 'RA Number', value: currentMemo.raNumber || '—' },
                                                                        { label: 'Requested', value: currentMemo.raRequestedAt ? formatDate(currentMemo.raRequestedAt) : '—' },
                                                                        { label: 'Received', value: currentMemo.raReceivedAt ? formatDate(currentMemo.raReceivedAt) : '—' },
                                                                        { label: 'Tickler', value: currentMemo.ticklerDate ? formatDate(currentMemo.ticklerDate) : '—' },
                                                                    ].map(({ label, value }) => (
                                                                        <div key={label} className="flex justify-between">
                                                                            <span className="text-[11px]" style={{ color: 'var(--on-surface-variant)' }}>{label}</span>
                                                                            <span className="text-[11px] font-medium" style={{ color: 'var(--foreground)' }}>{value}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Shipping */}
                                                        <div className="rounded-[4px] shadow-sm px-3 py-2 border" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}>
                                                            <h4 className="text-[11px] font-semibold mb-2 flex items-center gap-1" style={{ color: 'var(--on-surface)' }}><Truck className="w-3.5 h-3.5" /> Shipping</h4>
                                                            {editing ? (
                                                                <div className="space-y-2">
                                                                    {[
                                                                        { label: 'Baggie Manifest', key: 'baggieManifest', type: 'text' },
                                                                        { label: 'Outbound Tracking', key: 'outboundTracking', type: 'text' },
                                                                        { label: 'Shipped At', key: 'shippedAt', type: 'date' },
                                                                    ].map(({ label, key, type }) => (
                                                                        <div key={key}>
                                                                            <label className="block text-[10px] mb-0.5" style={{ color: 'var(--on-surface-variant)' }}>{label}</label>
                                                                            <input
                                                                                type={type}
                                                                                className="w-full border rounded px-2 py-1 text-xs focus:ring-1 focus:ring-primary-500"
                                                                                style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)', color: 'var(--foreground)' }}
                                                                                value={editForm[key]}
                                                                                onChange={e => setEditForm(f => ({ ...f, [key]: e.target.value }))}
                                                                            />
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <div className="space-y-1.5">
                                                                    {[
                                                                        { label: 'Baggie Manifest', value: currentMemo.baggieManifest || '—' },
                                                                        { label: 'Tracking', value: currentMemo.outboundTracking || '—' },
                                                                        { label: 'Shipped', value: currentMemo.shippedAt ? formatDate(currentMemo.shippedAt) : '—' },
                                                                    ].map(({ label, value }) => (
                                                                        <div key={label} className="flex justify-between">
                                                                            <span className="text-[11px]" style={{ color: 'var(--on-surface-variant)' }}>{label}</span>
                                                                            <span className="text-[11px] font-medium" style={{ color: 'var(--foreground)' }}>{value}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Payment */}
                                                        <div className="rounded-[4px] shadow-sm px-3 py-2 border" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}>
                                                            <h4 className="text-[11px] font-semibold mb-2 flex items-center gap-1" style={{ color: 'var(--on-surface)' }}><DollarSign className="w-3.5 h-3.5" /> Payment</h4>
                                                            {editing ? (
                                                                <div className="space-y-2">
                                                                    <div>
                                                                        <label className="block text-[10px] mb-0.5" style={{ color: 'var(--on-surface-variant)' }}>Status</label>
                                                                        <select
                                                                            className="w-full border rounded px-2 py-1 text-xs focus:ring-1 focus:ring-primary-500"
                                                                            style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)', color: 'var(--foreground)' }}
                                                                            value={editForm.paymentStatus}
                                                                            onChange={e => setEditForm(f => ({ ...f, paymentStatus: e.target.value }))}
                                                                        >
                                                                            <option value="pending">Pending</option>
                                                                            <option value="partial">Partial</option>
                                                                            <option value="paid">Paid</option>
                                                                            <option value="disputed">Disputed</option>
                                                                        </select>
                                                                    </div>
                                                                    <div>
                                                                        <label className="block text-[10px] mb-0.5" style={{ color: 'var(--on-surface-variant)' }}>Amount Requested</label>
                                                                        <input
                                                                            type="number"
                                                                            step="0.01"
                                                                            className="w-full border rounded px-2 py-1 text-xs focus:ring-1 focus:ring-primary-500"
                                                                            style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)', color: 'var(--foreground)' }}
                                                                            value={editForm.amountRequested}
                                                                            onChange={e => setEditForm(f => ({ ...f, amountRequested: e.target.value }))}
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <label className="block text-[10px] mb-0.5" style={{ color: 'var(--on-surface-variant)' }}>Amount Received</label>
                                                                        <input
                                                                            type="number"
                                                                            step="0.01"
                                                                            className="w-full border rounded px-2 py-1 text-xs focus:ring-1 focus:ring-primary-500"
                                                                            style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)', color: 'var(--foreground)' }}
                                                                            value={editForm.amountReceived}
                                                                            onChange={e => setEditForm(f => ({ ...f, amountReceived: e.target.value }))}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="space-y-1.5">
                                                                    <div className="flex justify-between">
                                                                        <span className="text-[11px]" style={{ color: 'var(--on-surface-variant)' }}>Status</span>
                                                                        <span style={pillStyle(pb.variant)}>{formatDebitMemoPaymentLabel(currentMemo.paymentStatus)}</span>
                                                                    </div>
                                                                    <div className="flex justify-between"><span className="text-[11px]" style={{ color: 'var(--on-surface-variant)' }}>Requested</span><span className="text-[11px] font-medium" style={{ color: 'var(--foreground)' }}>{formatCurrency(currentMemo.amountRequested)}</span></div>
                                                                    <div className="flex justify-between"><span className="text-[11px]" style={{ color: 'var(--on-surface-variant)' }}>Received</span><span className="text-[11px] font-medium" style={{ color: 'var(--foreground)' }}>{formatCurrency(currentMemo.amountReceived)}</span></div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Labeler + Destination Info */}
                                                    <div className="rounded-[4px] shadow-sm px-3 py-2 border" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}>
                                                        <h4 className="text-[11px] font-semibold mb-2" style={{ color: 'var(--on-surface)' }}>Memo Details</h4>
                                                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                                            {[
                                                                { label: 'Labeler ID', value: currentMemo.labelerId || '—', color: '' },
                                                                { label: 'Labeler', value: currentMemo.labelerName || '—', color: '' },
                                                                { label: 'Destination', value: currentMemo.destination || '—', color: '' },
                                                                { label: 'Total Ask', value: formatCurrency(currentMemo.totalAskValue), color: '' },
                                                                { label: 'Total Received', value: formatCurrency(currentMemo.totalReceivedValue), color: '' },
                                                            ].map(({ label, value, color }) => (
                                                                <div key={label}>
                                                                    <p className="text-[10px]" style={{ color: 'var(--on-surface-variant)' }}>{label}</p>
                                                                    <p
                                                                        className={`text-xs font-medium ${color}`}
                                                                        style={{
                                                                            color: label === 'Total Ask'
                                                                                ? 'var(--secondary)'
                                                                                : label === 'Total Received'
                                                                                    ? 'var(--primary)'
                                                                                    : 'var(--foreground)',
                                                                        }}
                                                                    >
                                                                        {value}
                                                                    </p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* Line Items */}
                                                    <div className="rounded-[4px] shadow-sm overflow-hidden border" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}>
                                                        <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--outline-variant)' }}>
                                                            <h4 className="text-[11px] font-semibold" style={{ color: 'var(--on-surface)' }}>Line Items ({memoItems.length})</h4>
                                                        </div>
                                                        {memoItems.length === 0 ? (
                                                            <p className="text-center py-4 text-xs" style={{ color: 'var(--on-surface-variant)' }}>No line items.</p>
                                                        ) : (
                                                            <div className="overflow-x-auto">
                                                                <table className="min-w-full text-sm border" style={{ borderColor: 'var(--outline)' }}>
                                                                    <thead className="bg-[var(--surface-container-low)] border-b" style={{ borderColor: 'var(--outline)', borderBottomWidth: '1.5px' }}>
                                                                        <tr className="bg-[var(--surface-container-low)]">
                                                                            <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--on-surface-variant)] whitespace-nowrap">NDC</th>
                                                                            <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--on-surface-variant)] whitespace-nowrap">Product</th>
                                                                            <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--on-surface-variant)] whitespace-nowrap">Lot #</th>
                                                                            <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--on-surface-variant)] whitespace-nowrap">Expires</th>
                                                                            <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--on-surface-variant)] whitespace-nowrap">Qty</th>
                                                                            <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--on-surface-variant)] whitespace-nowrap">Ask Price</th>
                                                                            <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--on-surface-variant)] whitespace-nowrap">Received</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y" style={{ borderColor: 'var(--outline-variant)' }}>
                                                                        {memoItems.map((item: DebitMemoItem) => (
                                                                            <tr key={item.id} className="hover:bg-[var(--surface-container)]" style={{ borderColor: 'var(--outline-variant)' }}>
                                                                                <td className="px-3 py-3 text-sm font-mono" style={{ color: 'var(--foreground)' }}>{item.ndc || '—'}</td>
                                                                                <td className="px-3 py-3 text-sm" style={{ color: 'var(--on-surface)' }}>{item.productName || '—'}</td>
                                                                                <td className="px-3 py-3 text-sm" style={{ color: 'var(--on-surface)' }}>{item.lotNumber || '—'}</td>
                                                                                <td className="px-3 py-3 text-sm" style={{ color: 'var(--on-surface-variant)' }}>{item.expirationDate ? formatDate(item.expirationDate) : '—'}</td>
                                                                                <td className="px-3 py-3 text-sm text-right" style={{ color: 'var(--on-surface)' }}>{item.quantity}</td>
                                                                                <td className="px-3 py-3 text-sm text-right font-medium">{item.askPrice != null ? formatCurrency(item.askPrice) : '—'}</td>
                                                                                <td className="px-3 py-3 text-sm text-right font-medium">{item.receivedPrice != null ? formatCurrency(item.receivedPrice) : '—'}</td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                                })}
                            </div>
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-3 py-2 border-t" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}>
                        <p className="text-[10px]" style={{ color: 'var(--on-surface-variant)' }}>
                            Page {currentPage} of {totalPages}{groupedPagination?.total != null && ` · ${groupedPagination.total} returns`}
                        </p>
                        <div className="flex items-center gap-1.5">
                            <button
                                disabled={currentPage <= 1}
                                onClick={() => setCurrentPage(p => p - 1)}
                                className="p-1 rounded border disabled:opacity-40 hover:bg-primary-50/40"
                                style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-lowest)' }}
                            >
                                <ChevronLeft className="w-3.5 h-3.5" style={{ color: 'var(--on-surface-variant)' }} />
                            </button>
                            <button
                                disabled={currentPage >= totalPages}
                                onClick={() => setCurrentPage(p => p + 1)}
                                className="p-1 rounded border disabled:opacity-40 hover:bg-primary-50/40"
                                style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-lowest)' }}
                            >
                                <ChevronRight className="w-3.5 h-3.5" style={{ color: 'var(--on-surface-variant)' }} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
        </PermissionGate>
    );
}
