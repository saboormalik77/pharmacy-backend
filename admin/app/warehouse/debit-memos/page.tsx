'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
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
        <div className="space-y-6">
            <ToastContainer toasts={toasts} onClose={id => setToasts(t => t.filter(x => x.id !== id))} />

            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Debit Memos</h1>
                <p className="text-gray-500 mt-1">View and manage debit memos generated from closed batches</p>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-4">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by memo #, pharmacy, labeler..."
                            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            value={search}
                            onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
                        />
                    </div>
                    <select
                        className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                        value={destination}
                        onChange={e => { setDestination(e.target.value); setCurrentPage(1); }}
                    >
                        {DESTINATION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <select
                        className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                        value={paymentStatus}
                        onChange={e => { setPaymentStatus(e.target.value); setCurrentPage(1); }}
                    >
                        {PAYMENT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
                    </div>
                ) : debitMemos.length === 0 ? (
                    <div className="text-center py-20 text-gray-500">
                        <Receipt className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p className="text-lg font-medium">No debit memos found</p>
                        <p className="text-sm mt-1">Debit memos are generated when a batch is closed.</p>
                    </div>
                ) : (
                    <div>
                        {debitMemos.map(memo => {
                            const isExpanded = expandedMemoId === memo.id;
                            const pb = getPaymentBadge(memo.paymentStatus);

                            return (
                                <div key={memo.id} className={`border-b border-gray-200 last:border-b-0 ${highlightId === memo.id ? 'bg-yellow-50' : ''}`}>
                                    {/* Row */}
                                    <button
                                        onClick={() => toggleExpand(memo.id)}
                                        className="w-full flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors text-left"
                                    >
                                        <div className="flex-1 grid grid-cols-2 md:grid-cols-7 gap-3 text-sm">
                                            <div>
                                                <p className="text-xs text-gray-400 uppercase">Memo #</p>
                                                <p className="font-medium text-primary-600">{memo.memoNumber}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-400 uppercase">Pharmacy</p>
                                                <p className="font-medium text-gray-900 truncate">{memo.pharmacyName}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-400 uppercase">Destination</p>
                                                <p className="text-gray-700">{memo.destination || '—'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-400 uppercase">Items</p>
                                                <p className="text-gray-700">{memo.totalItems}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-400 uppercase">Ask Value</p>
                                                <p className="font-medium">{formatCurrency(memo.totalAskValue)}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-400 uppercase">RA Status</p>
                                                <p>{memo.raNumber ? <Badge variant="success">Received</Badge> : memo.raRequestedAt ? <Badge variant="info">Requested</Badge> : <Badge variant="default">Pending</Badge>}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-400 uppercase">Payment</p>
                                                <Badge variant={pb.variant}>{memo.paymentStatus}</Badge>
                                            </div>
                                        </div>
                                        {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />}
                                    </button>

                                    {/* Expanded Detail */}
                                    {isExpanded && (
                                        <div className="border-t border-gray-200 bg-gray-50 px-6 py-5">
                                            {!currentMemo || currentMemo.id !== memo.id ? (
                                                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary-500" /></div>
                                            ) : (
                                                <div className="space-y-6">
                                                    {/* Actions */}
                                                    <div className="flex justify-end">
                                                        {!editing ? (
                                                            <Button variant="outline" size="sm" onClick={() => startEditing(currentMemo)}>
                                                                <Edit className="w-4 h-4 mr-1" /> Edit
                                                            </Button>
                                                        ) : (
                                                            <div className="flex gap-2">
                                                                <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
                                                                <Button variant="primary" size="sm" onClick={handleSave} disabled={isActionLoading}>
                                                                    {isActionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
                                                                    Save
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Detail Cards */}
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                        {/* RA Info */}
                                                        <div className="bg-white rounded-lg shadow-sm p-4">
                                                            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1"><FileText className="w-4 h-4" /> RA Info</h4>
                                                            {editing ? (
                                                                <div className="space-y-3">
                                                                    <div>
                                                                        <label className="block text-xs text-gray-500 mb-1">RA Number</label>
                                                                        <input type="text" className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm" value={editForm.raNumber} onChange={e => setEditForm(f => ({ ...f, raNumber: e.target.value }))} />
                                                                    </div>
                                                                    <div>
                                                                        <label className="block text-xs text-gray-500 mb-1">Requested At</label>
                                                                        <input type="date" className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm" value={editForm.raRequestedAt} onChange={e => setEditForm(f => ({ ...f, raRequestedAt: e.target.value }))} />
                                                                    </div>
                                                                    <div>
                                                                        <label className="block text-xs text-gray-500 mb-1">Received At</label>
                                                                        <input type="date" className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm" value={editForm.raReceivedAt} onChange={e => setEditForm(f => ({ ...f, raReceivedAt: e.target.value }))} />
                                                                    </div>
                                                                    <div>
                                                                        <label className="block text-xs text-gray-500 mb-1">Tickler Date</label>
                                                                        <input type="date" className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm" value={editForm.ticklerDate} onChange={e => setEditForm(f => ({ ...f, ticklerDate: e.target.value }))} />
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="space-y-2 text-sm">
                                                                    <div className="flex justify-between"><span className="text-gray-500">RA Number</span><span className="font-medium">{currentMemo.raNumber || '—'}</span></div>
                                                                    <div className="flex justify-between"><span className="text-gray-500">Requested</span><span>{currentMemo.raRequestedAt ? formatDate(currentMemo.raRequestedAt) : '—'}</span></div>
                                                                    <div className="flex justify-between"><span className="text-gray-500">Received</span><span>{currentMemo.raReceivedAt ? formatDate(currentMemo.raReceivedAt) : '—'}</span></div>
                                                                    <div className="flex justify-between"><span className="text-gray-500">Tickler</span><span>{currentMemo.ticklerDate ? formatDate(currentMemo.ticklerDate) : '—'}</span></div>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Shipping */}
                                                        <div className="bg-white rounded-lg shadow-sm p-4">
                                                            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1"><Truck className="w-4 h-4" /> Shipping</h4>
                                                            {editing ? (
                                                                <div className="space-y-3">
                                                                    <div>
                                                                        <label className="block text-xs text-gray-500 mb-1">Baggie Manifest</label>
                                                                        <input type="text" className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm" value={editForm.baggieManifest} onChange={e => setEditForm(f => ({ ...f, baggieManifest: e.target.value }))} />
                                                                    </div>
                                                                    <div>
                                                                        <label className="block text-xs text-gray-500 mb-1">Outbound Tracking</label>
                                                                        <input type="text" className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm" value={editForm.outboundTracking} onChange={e => setEditForm(f => ({ ...f, outboundTracking: e.target.value }))} />
                                                                    </div>
                                                                    <div>
                                                                        <label className="block text-xs text-gray-500 mb-1">Shipped At</label>
                                                                        <input type="date" className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm" value={editForm.shippedAt} onChange={e => setEditForm(f => ({ ...f, shippedAt: e.target.value }))} />
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="space-y-2 text-sm">
                                                                    <div className="flex justify-between"><span className="text-gray-500">Baggie Manifest</span><span className="font-medium">{currentMemo.baggieManifest || '—'}</span></div>
                                                                    <div className="flex justify-between"><span className="text-gray-500">Tracking</span><span>{currentMemo.outboundTracking || '—'}</span></div>
                                                                    <div className="flex justify-between"><span className="text-gray-500">Shipped</span><span>{currentMemo.shippedAt ? formatDate(currentMemo.shippedAt) : '—'}</span></div>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Payment */}
                                                        <div className="bg-white rounded-lg shadow-sm p-4">
                                                            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1"><DollarSign className="w-4 h-4" /> Payment</h4>
                                                            {editing ? (
                                                                <div className="space-y-3">
                                                                    <div>
                                                                        <label className="block text-xs text-gray-500 mb-1">Status</label>
                                                                        <select className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm" value={editForm.paymentStatus} onChange={e => setEditForm(f => ({ ...f, paymentStatus: e.target.value }))}>
                                                                            <option value="pending">Pending</option>
                                                                            <option value="partial">Partial</option>
                                                                            <option value="paid">Paid</option>
                                                                            <option value="disputed">Disputed</option>
                                                                        </select>
                                                                    </div>
                                                                    <div>
                                                                        <label className="block text-xs text-gray-500 mb-1">Amount Requested</label>
                                                                        <input type="number" step="0.01" className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm" value={editForm.amountRequested} onChange={e => setEditForm(f => ({ ...f, amountRequested: e.target.value }))} />
                                                                    </div>
                                                                    <div>
                                                                        <label className="block text-xs text-gray-500 mb-1">Amount Received</label>
                                                                        <input type="number" step="0.01" className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm" value={editForm.amountReceived} onChange={e => setEditForm(f => ({ ...f, amountReceived: e.target.value }))} />
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="space-y-2 text-sm">
                                                                    <div className="flex justify-between"><span className="text-gray-500">Status</span><Badge variant={pb.variant}>{currentMemo.paymentStatus}</Badge></div>
                                                                    <div className="flex justify-between"><span className="text-gray-500">Requested</span><span className="font-medium">{formatCurrency(currentMemo.amountRequested)}</span></div>
                                                                    <div className="flex justify-between"><span className="text-gray-500">Received</span><span className="font-medium">{formatCurrency(currentMemo.amountReceived)}</span></div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Labeler + Destination Info */}
                                                    <div className="bg-white rounded-lg shadow-sm p-4">
                                                        <h4 className="text-sm font-semibold text-gray-700 mb-3">Memo Details</h4>
                                                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                                                            <div><p className="text-gray-500">Labeler ID</p><p className="font-medium">{currentMemo.labelerId || '—'}</p></div>
                                                            <div><p className="text-gray-500">Labeler</p><p className="font-medium">{currentMemo.labelerName || '—'}</p></div>
                                                            <div><p className="text-gray-500">Destination</p><p className="font-medium">{currentMemo.destination || '—'}</p></div>
                                                            <div><p className="text-gray-500">Total Ask</p><p className="font-medium text-green-700">{formatCurrency(currentMemo.totalAskValue)}</p></div>
                                                            <div><p className="text-gray-500">Total Received</p><p className="font-medium text-blue-700">{formatCurrency(currentMemo.totalReceivedValue)}</p></div>
                                                        </div>
                                                    </div>

                                                    {/* Line Items */}
                                                    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                                                        <div className="px-4 py-3 border-b border-gray-200">
                                                            <h4 className="text-sm font-semibold text-gray-700">Line Items ({memoItems.length})</h4>
                                                        </div>
                                                        {memoItems.length === 0 ? (
                                                            <p className="text-center py-6 text-gray-500 text-sm">No line items.</p>
                                                        ) : (
                                                            <div className="overflow-x-auto">
                                                                <table className="min-w-full divide-y divide-gray-200">
                                                                    <thead className="bg-gray-50">
                                                                        <tr>
                                                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">NDC</th>
                                                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                                                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Lot #</th>
                                                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Expires</th>
                                                                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                                                                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Ask Price</th>
                                                                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Received</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-gray-200">
                                                                        {memoItems.map((item: DebitMemoItem) => (
                                                                            <tr key={item.id} className="hover:bg-gray-50">
                                                                                <td className="px-4 py-2 text-sm font-mono text-gray-900">{item.ndc || '—'}</td>
                                                                                <td className="px-4 py-2 text-sm text-gray-700">{item.productName || '—'}</td>
                                                                                <td className="px-4 py-2 text-sm text-gray-700">{item.lotNumber || '—'}</td>
                                                                                <td className="px-4 py-2 text-sm text-gray-500">{item.expirationDate ? formatDate(item.expirationDate) : '—'}</td>
                                                                                <td className="px-4 py-2 text-sm text-right text-gray-700">{item.quantity}</td>
                                                                                <td className="px-4 py-2 text-sm text-right font-medium">{item.askPrice != null ? formatCurrency(item.askPrice) : '—'}</td>
                                                                                <td className="px-4 py-2 text-sm text-right font-medium">{item.receivedPrice != null ? formatCurrency(item.receivedPrice) : '—'}</td>
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
                    <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200">
                        <p className="text-sm text-gray-500">
                            Page {currentPage} of {totalPages}{memoPagination?.total != null && ` · ${memoPagination.total} memos`}
                        </p>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)}>
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
