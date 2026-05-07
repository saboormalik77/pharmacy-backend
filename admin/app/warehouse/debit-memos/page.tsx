'use client';

import { PermissionGate } from '@/components/auth/PermissionGate';
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
    Search, Loader2, ChevronLeft, ChevronRight, X, Edit,
    Receipt, FileText, DollarSign, Truck, AlertCircle,
    ChevronDown, ChevronUp, Save,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ToastContainer, Toast } from '@/components/ui/Toast';
import { formatDate } from '@/lib/utils';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import { useDebounce } from '@/lib/hooks/useDebounce';
import {
    fetchDebitMemos, fetchDebitMemoDetail, updateDebitMemo,
    clearError, clearCurrentMemo,
} from '@/lib/store/batchSlice';
import { DebitMemo, DebitMemoItem } from '@/lib/types';

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
    switch (s) {
        case 'paid': return { variant: 'success' };
        case 'partial': return { variant: 'warning' };
        case 'disputed': return { variant: 'danger' };
        default: return { variant: 'default' };
    }
}

export default function DebitMemosPage() {
    const dispatch = useAppDispatch();
    const searchParams = useSearchParams();
    const highlightId = searchParams.get('highlight');

    const { debitMemos, memoPagination, currentMemo, memoItems, isLoading, isActionLoading, error } =
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

    const addToast = useCallback((msg: string, type: Toast['type']) => {
        setToasts(prev => [...prev, { id: Date.now().toString(), message: msg, type }]);
    }, []);

    const loadMemos = useCallback(() => {
        dispatch(fetchDebitMemos({
            search: debouncedSearch || undefined,
            destination: destination || undefined,
            paymentStatus: paymentStatus || undefined,
            page: currentPage,
            limit: 20,
        }));
    }, [dispatch, debouncedSearch, destination, paymentStatus, currentPage]);

    useEffect(() => { loadMemos(); }, [loadMemos]);
    useEffect(() => { if (error) { addToast(error, 'error'); dispatch(clearError()); } }, [error, addToast, dispatch]);

    useEffect(() => {
        if (highlightId && debitMemos.length > 0) {
            setExpandedMemoId(highlightId);
            dispatch(fetchDebitMemoDetail(highlightId));
        }
    }, [highlightId, debitMemos, dispatch]);

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

    const totalPages = memoPagination?.totalPages || 1;

    return (
        <PermissionGate permission="warehouse">
        <div className="space-y-3">
            <ToastContainer toasts={toasts} onClose={id => setToasts(t => t.filter(x => x.id !== id))} />

            {/* Header */}
            <div>
                <Link href="/warehouse" className="inline-flex items-center gap-1 text-[11px] text-gray-400 hover:text-primary-600 mb-1.5 transition-colors">
                    <ChevronLeft className="w-3 h-3" /> Back to Warehouse
                </Link>
                <h1 className="text-lg font-bold text-gray-900">Debit Memos</h1>
                <p className="text-xs text-gray-500">View and manage debit memos generated from closed batches</p>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-[4px] shadow px-3 py-2">
                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative flex-1 min-w-[180px]">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by memo #, pharmacy, labeler..."
                            className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-primary-500 focus:border-transparent"
                            value={search}
                            onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
                        />
                    </div>
                    <select
                        className="border border-gray-300 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-primary-500"
                        value={destination}
                        onChange={e => { setDestination(e.target.value); setCurrentPage(1); }}
                    >
                        {DESTINATION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <select
                        className="border border-gray-300 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-primary-500"
                        value={paymentStatus}
                        onChange={e => { setPaymentStatus(e.target.value); setCurrentPage(1); }}
                    >
                        {PAYMENT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-[4px] shadow overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center py-14">
                        <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
                    </div>
                ) : debitMemos.length === 0 ? (
                    <div className="text-center py-14 text-gray-500">
                        <Receipt className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                        <p className="text-sm font-medium">No debit memos found</p>
                        <p className="text-xs mt-0.5">Debit memos are generated when a batch is closed.</p>
                    </div>
                ) : (
                    <div>
                        {debitMemos.map(memo => {
                            const isExpanded = expandedMemoId === memo.id;
                            const pb = getPaymentBadge(memo.paymentStatus);

                            return (
                                <div key={memo.id} className={`border-b border-gray-200 last:border-b-0 ${isExpanded ? 'ring-1 ring-inset ring-blue-200' : highlightId === memo.id ? 'bg-yellow-50' : ''}`}>
                                    {/* Collapsed Row */}
                                    <button
                                        onClick={() => toggleExpand(memo.id)}
                                        className={`w-full flex items-center gap-3 px-4 py-2 transition-colors text-left ${isExpanded ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-gray-50'}`}
                                    >
                                        <div className="flex-1 grid grid-cols-2 md:grid-cols-7 gap-2">
                                            <div>
                                                <p className="text-[10px] text-gray-400 uppercase">Memo #</p>
                                                <p className="text-xs font-medium text-primary-600">{memo.memoNumber}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-gray-400 uppercase">Pharmacy</p>
                                                <p className="text-xs font-medium text-gray-900 truncate">{memo.pharmacyName}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-gray-400 uppercase">Destination</p>
                                                <p className="text-xs text-gray-700">{memo.destination || '—'}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-gray-400 uppercase">Items</p>
                                                <p className="text-xs text-gray-700">{memo.totalItems}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-gray-400 uppercase">Ask Value</p>
                                                <p className="text-xs font-medium">{formatCurrency(memo.totalAskValue)}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-gray-400 uppercase">RA Status</p>
                                                <p>{memo.raNumber ? <Badge variant="success"><span className="text-[10px]">Received</span></Badge> : memo.raRequestedAt ? <Badge variant="info"><span className="text-[10px]">Requested</span></Badge> : <Badge variant="default"><span className="text-[10px]">Pending</span></Badge>}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-gray-400 uppercase">Payment</p>
                                                <Badge variant={pb.variant}><span className="text-[10px]">{memo.paymentStatus}</span></Badge>
                                            </div>
                                        </div>
                                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />}
                                    </button>

                                    {/* Expanded Detail */}
                                    {isExpanded && (
                                        <div className="border-t border-blue-200 bg-blue-50/60 px-4 py-3">
                                            {!currentMemo || currentMemo.id !== memo.id ? (
                                                <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-primary-500" /></div>
                                            ) : (
                                                <div className="space-y-3">
                                                    {/* Actions */}
                                                    <div className="flex justify-end">
                                                        {!editing ? (
                                                            <button onClick={() => startEditing(currentMemo)} className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors">
                                                                <Edit className="w-3 h-3" /> Edit
                                                            </button>
                                                        ) : (
                                                            <div className="flex gap-1.5">
                                                                <button onClick={() => setEditing(false)} className="px-2.5 py-1 rounded text-xs border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
                                                                <button onClick={handleSave} disabled={isActionLoading} className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 transition-colors">
                                                                    {isActionLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                                                    Save
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Detail Cards */}
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                                        {/* RA Info */}
                                                        <div className="bg-white rounded-[4px] shadow-sm px-3 py-2">
                                                            <h4 className="text-[11px] font-semibold text-gray-700 mb-2 flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> RA Info</h4>
                                                            {editing ? (
                                                                <div className="space-y-2">
                                                                    {[
                                                                        { label: 'RA Number', key: 'raNumber', type: 'text' },
                                                                        { label: 'Requested At', key: 'raRequestedAt', type: 'date' },
                                                                        { label: 'Received At', key: 'raReceivedAt', type: 'date' },
                                                                        { label: 'Tickler Date', key: 'ticklerDate', type: 'date' },
                                                                    ].map(({ label, key, type }) => (
                                                                        <div key={key}>
                                                                            <label className="block text-[10px] text-gray-500 mb-0.5">{label}</label>
                                                                            <input type={type} className="w-full border border-gray-300 rounded px-2 py-1 text-xs" value={editForm[key]} onChange={e => setEditForm(f => ({ ...f, [key]: e.target.value }))} />
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
                                                                            <span className="text-[11px] text-gray-500">{label}</span>
                                                                            <span className="text-[11px] font-medium">{value}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Shipping */}
                                                        <div className="bg-white rounded-[4px] shadow-sm px-3 py-2">
                                                            <h4 className="text-[11px] font-semibold text-gray-700 mb-2 flex items-center gap-1"><Truck className="w-3.5 h-3.5" /> Shipping</h4>
                                                            {editing ? (
                                                                <div className="space-y-2">
                                                                    {[
                                                                        { label: 'Baggie Manifest', key: 'baggieManifest', type: 'text' },
                                                                        { label: 'Outbound Tracking', key: 'outboundTracking', type: 'text' },
                                                                        { label: 'Shipped At', key: 'shippedAt', type: 'date' },
                                                                    ].map(({ label, key, type }) => (
                                                                        <div key={key}>
                                                                            <label className="block text-[10px] text-gray-500 mb-0.5">{label}</label>
                                                                            <input type={type} className="w-full border border-gray-300 rounded px-2 py-1 text-xs" value={editForm[key]} onChange={e => setEditForm(f => ({ ...f, [key]: e.target.value }))} />
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
                                                                            <span className="text-[11px] text-gray-500">{label}</span>
                                                                            <span className="text-[11px] font-medium">{value}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Payment */}
                                                        <div className="bg-white rounded-[4px] shadow-sm px-3 py-2">
                                                            <h4 className="text-[11px] font-semibold text-gray-700 mb-2 flex items-center gap-1"><DollarSign className="w-3.5 h-3.5" /> Payment</h4>
                                                            {editing ? (
                                                                <div className="space-y-2">
                                                                    <div>
                                                                        <label className="block text-[10px] text-gray-500 mb-0.5">Status</label>
                                                                        <select className="w-full border border-gray-300 rounded px-2 py-1 text-xs" value={editForm.paymentStatus} onChange={e => setEditForm(f => ({ ...f, paymentStatus: e.target.value }))}>
                                                                            <option value="pending">Pending</option>
                                                                            <option value="partial">Partial</option>
                                                                            <option value="paid">Paid</option>
                                                                            <option value="disputed">Disputed</option>
                                                                        </select>
                                                                    </div>
                                                                    <div>
                                                                        <label className="block text-[10px] text-gray-500 mb-0.5">Amount Requested</label>
                                                                        <input type="number" step="0.01" className="w-full border border-gray-300 rounded px-2 py-1 text-xs" value={editForm.amountRequested} onChange={e => setEditForm(f => ({ ...f, amountRequested: e.target.value }))} />
                                                                    </div>
                                                                    <div>
                                                                        <label className="block text-[10px] text-gray-500 mb-0.5">Amount Received</label>
                                                                        <input type="number" step="0.01" className="w-full border border-gray-300 rounded px-2 py-1 text-xs" value={editForm.amountReceived} onChange={e => setEditForm(f => ({ ...f, amountReceived: e.target.value }))} />
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="space-y-1.5">
                                                                    <div className="flex justify-between"><span className="text-[11px] text-gray-500">Status</span><Badge variant={pb.variant}><span className="text-[10px]">{currentMemo.paymentStatus}</span></Badge></div>
                                                                    <div className="flex justify-between"><span className="text-[11px] text-gray-500">Requested</span><span className="text-[11px] font-medium">{formatCurrency(currentMemo.amountRequested)}</span></div>
                                                                    <div className="flex justify-between"><span className="text-[11px] text-gray-500">Received</span><span className="text-[11px] font-medium">{formatCurrency(currentMemo.amountReceived)}</span></div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Labeler + Destination Info */}
                                                    <div className="bg-white rounded-[4px] shadow-sm px-3 py-2">
                                                        <h4 className="text-[11px] font-semibold text-gray-700 mb-2">Memo Details</h4>
                                                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                                            {[
                                                                { label: 'Labeler ID', value: currentMemo.labelerId || '—', color: '' },
                                                                { label: 'Labeler', value: currentMemo.labelerName || '—', color: '' },
                                                                { label: 'Destination', value: currentMemo.destination || '—', color: '' },
                                                                { label: 'Total Ask', value: formatCurrency(currentMemo.totalAskValue), color: 'text-green-700' },
                                                                { label: 'Total Received', value: formatCurrency(currentMemo.totalReceivedValue), color: 'text-blue-700' },
                                                            ].map(({ label, value, color }) => (
                                                                <div key={label}>
                                                                    <p className="text-[10px] text-gray-500">{label}</p>
                                                                    <p className={`text-xs font-medium ${color}`}>{value}</p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* Line Items */}
                                                    <div className="bg-white rounded-[4px] shadow-sm overflow-hidden">
                                                        <div className="px-3 py-2 border-b border-gray-200">
                                                            <h4 className="text-[11px] font-semibold text-gray-700">Line Items ({memoItems.length})</h4>
                                                        </div>
                                                        {memoItems.length === 0 ? (
                                                            <p className="text-center py-4 text-gray-500 text-xs">No line items.</p>
                                                        ) : (
                                                            <div className="overflow-x-auto">
                                                                <table className="min-w-full">
                                                                    <thead className="bg-gray-50 border-b border-gray-200">
                                                                        <tr>
                                                                            <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-gray-500 uppercase">NDC</th>
                                                                            <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-gray-500 uppercase">Product</th>
                                                                            <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-gray-500 uppercase">Lot #</th>
                                                                            <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-gray-500 uppercase">Expires</th>
                                                                            <th className="px-3 py-1.5 text-right text-[10px] font-semibold text-gray-500 uppercase">Qty</th>
                                                                            <th className="px-3 py-1.5 text-right text-[10px] font-semibold text-gray-500 uppercase">Ask Price</th>
                                                                            <th className="px-3 py-1.5 text-right text-[10px] font-semibold text-gray-500 uppercase">Received</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-gray-100">
                                                                        {memoItems.map((item: DebitMemoItem) => (
                                                                            <tr key={item.id} className="hover:bg-gray-50">
                                                                                <td className="px-3 py-1.5 text-[11px] font-mono text-gray-900">{item.ndc || '—'}</td>
                                                                                <td className="px-3 py-1.5 text-[11px] text-gray-700">{item.productName || '—'}</td>
                                                                                <td className="px-3 py-1.5 text-[11px] text-gray-700">{item.lotNumber || '—'}</td>
                                                                                <td className="px-3 py-1.5 text-[11px] text-gray-500">{item.expirationDate ? formatDate(item.expirationDate) : '—'}</td>
                                                                                <td className="px-3 py-1.5 text-[11px] text-right text-gray-700">{item.quantity}</td>
                                                                                <td className="px-3 py-1.5 text-[11px] text-right font-medium">{item.askPrice != null ? formatCurrency(item.askPrice) : '—'}</td>
                                                                                <td className="px-3 py-1.5 text-[11px] text-right font-medium">{item.receivedPrice != null ? formatCurrency(item.receivedPrice) : '—'}</td>
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
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-3 py-2 border-t border-gray-200">
                        <p className="text-[10px] text-gray-500">
                            Page {currentPage} of {totalPages}{memoPagination?.total != null && ` · ${memoPagination.total} memos`}
                        </p>
                        <div className="flex items-center gap-1.5">
                            <button disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)} className="p-1 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50">
                                <ChevronLeft className="w-3.5 h-3.5 text-gray-600" />
                            </button>
                            <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)} className="p-1 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50">
                                <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
        </PermissionGate>
    );
}
