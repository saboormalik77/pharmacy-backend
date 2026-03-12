'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
    Search, Loader2, ChevronLeft, ChevronRight, X, Clock,
    Mail, MailCheck, CheckCircle, Truck, AlertTriangle, Send,
    Eye, RefreshCw, Package,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ToastContainer, Toast } from '@/components/ui/Toast';
import { formatDate } from '@/lib/utils';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import { useDebounce } from '@/lib/hooks/useDebounce';
import {
    fetchRATracking, sendRARequest, receiveRA, resendRA, shipMemo,
    fetchEmailPreview, clearError, clearEmailPreview,
} from '@/lib/store/raTrackingSlice';
import { DebitMemo, RAEmailTemplate } from '@/lib/types';

// ── Helpers ────────────────────────────────────────────────────

const RA_STATUS_OPTIONS = [
    { value: '', label: 'All Statuses' },
    { value: 'pending', label: 'Pending' },
    { value: 'requested', label: 'Requested' },
    { value: 'received', label: 'Received' },
    { value: 'shipped', label: 'Shipped' },
    { value: 'overdue', label: 'Overdue' },
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

function getRAStatusBadge(s: string): { label: string; variant: 'success' | 'warning' | 'info' | 'danger' | 'default' | 'secondary' } {
    switch (s) {
        case 'pending':   return { label: 'Pending', variant: 'default' };
        case 'requested': return { label: 'Requested', variant: 'info' };
        case 'received':  return { label: 'Received', variant: 'success' };
        case 'shipped':   return { label: 'Shipped', variant: 'secondary' };
        case 'overdue':   return { label: 'Overdue', variant: 'danger' };
        default:          return { label: s, variant: 'default' };
    }
}

function isOverdue(memo: DebitMemo): boolean {
    if (!memo.ticklerDate || memo.raStatus === 'received' || memo.raStatus === 'shipped') return false;
    return new Date(memo.ticklerDate) < new Date();
}

type ModalType = null | 'request' | 'receive' | 'resend' | 'ship' | 'preview';

export default function RATrackingPage() {
    const dispatch = useAppDispatch();
    const { memos, pagination, summary, emailPreview, isLoading, isActionLoading, isPreviewLoading, error } =
        useAppSelector(s => s.raTracking);

    const [search, setSearch] = useState('');
    const debouncedSearch = useDebounce(search, 400);
    const [raStatus, setRaStatus] = useState('');
    const [destination, setDestination] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [toasts, setToasts] = useState<Toast[]>([]);

    const [activeModal, setActiveModal] = useState<ModalType>(null);
    const [selectedMemo, setSelectedMemo] = useState<DebitMemo | null>(null);

    // Request modal state
    const [requestEmail, setRequestEmail] = useState('');

    // Receive modal state
    const [receiveRaNumber, setReceiveRaNumber] = useState('');
    const [receivePdfUrl, setReceivePdfUrl] = useState('');

    // Ship modal state
    const [shipTracking, setShipTracking] = useState('');

    const addToast = useCallback((msg: string, type: Toast['type']) => {
        setToasts(prev => [...prev, { id: Date.now().toString(), message: msg, type }]);
    }, []);

    const loadData = useCallback(() => {
        dispatch(fetchRATracking({
            raStatus: raStatus || undefined,
            destination: destination || undefined,
            dateFrom: dateFrom || undefined,
            dateTo: dateTo || undefined,
            search: debouncedSearch || undefined,
            page: currentPage,
            limit: 20,
        }));
    }, [dispatch, raStatus, destination, dateFrom, dateTo, debouncedSearch, currentPage]);

    useEffect(() => { loadData(); }, [loadData]);
    useEffect(() => { if (error) { addToast(error, 'error'); dispatch(clearError()); } }, [error, addToast, dispatch]);

    // ── Modal openers ──────────────────────────────────────────

    const openRequest = (memo: DebitMemo) => {
        setSelectedMemo(memo);
        setRequestEmail('');
        setActiveModal('request');
        dispatch(fetchEmailPreview({ memoId: memo.id, type: 'request' }));
    };

    const openReceive = (memo: DebitMemo) => {
        setSelectedMemo(memo);
        setReceiveRaNumber('');
        setReceivePdfUrl('');
        setActiveModal('receive');
    };

    const openResend = (memo: DebitMemo) => {
        setSelectedMemo(memo);
        setRequestEmail('');
        setActiveModal('resend');
        dispatch(fetchEmailPreview({ memoId: memo.id, type: 'reminder' }));
    };

    const openShip = (memo: DebitMemo) => {
        setSelectedMemo(memo);
        setShipTracking('');
        setActiveModal('ship');
    };

    const closeModal = () => {
        setActiveModal(null);
        setSelectedMemo(null);
        dispatch(clearEmailPreview());
    };

    // ── Actions ────────────────────────────────────────────────

    const handleSendRequest = async () => {
        if (!selectedMemo) return;
        const result = await dispatch(sendRARequest({
            memoId: selectedMemo.id,
            emailOverride: requestEmail || undefined,
        }));
        if (sendRARequest.fulfilled.match(result)) {
            addToast('RA request sent successfully', 'success');
            closeModal();
            loadData();
        }
    };

    const handleReceive = async () => {
        if (!selectedMemo) return;
        if (!receiveRaNumber.trim()) { addToast('RA number is required', 'warning'); return; }
        const result = await dispatch(receiveRA({
            memoId: selectedMemo.id,
            raNumber: receiveRaNumber.trim(),
            pdfUrl: receivePdfUrl || undefined,
        }));
        if (receiveRA.fulfilled.match(result)) {
            addToast('RA received recorded', 'success');
            closeModal();
            loadData();
        }
    };

    const handleResend = async () => {
        if (!selectedMemo) return;
        const result = await dispatch(resendRA({
            memoId: selectedMemo.id,
            emailOverride: requestEmail || undefined,
        }));
        if (resendRA.fulfilled.match(result)) {
            addToast('RA reminder sent', 'success');
            closeModal();
            loadData();
        }
    };

    const handleShip = async () => {
        if (!selectedMemo) return;
        if (!shipTracking.trim()) { addToast('Tracking number is required', 'warning'); return; }
        const result = await dispatch(shipMemo({
            memoId: selectedMemo.id,
            outboundTracking: shipTracking.trim(),
        }));
        if (shipMemo.fulfilled.match(result)) {
            addToast('Shipment recorded', 'success');
            closeModal();
            loadData();
        }
    };

    const totalPages = pagination?.totalPages || 1;

    // ── Row action buttons based on RA status ──────────────────

    const getRowActions = (memo: DebitMemo) => {
        const actions: React.ReactElement[] = [];
        const s = memo.raStatus;

        if (s === 'pending') {
            actions.push(
                <Button key="req" variant="primary" size="sm" onClick={e => { e.stopPropagation(); openRequest(memo); }}>
                    <Mail className="w-3.5 h-3.5 mr-1" /> Request RA
                </Button>
            );
        }
        if (s === 'requested' || s === 'overdue') {
            actions.push(
                <Button key="resend" variant="warning" size="sm" onClick={e => { e.stopPropagation(); openResend(memo); }}>
                    <RefreshCw className="w-3.5 h-3.5 mr-1" /> Resend
                </Button>
            );
            actions.push(
                <Button key="recv" variant="success" size="sm" onClick={e => { e.stopPropagation(); openReceive(memo); }}>
                    <CheckCircle className="w-3.5 h-3.5 mr-1" /> Record RA
                </Button>
            );
        }
        if (s === 'received') {
            actions.push(
                <Button key="ship" variant="primary" size="sm" onClick={e => { e.stopPropagation(); openShip(memo); }}>
                    <Truck className="w-3.5 h-3.5 mr-1" /> Ship
                </Button>
            );
        }
        return actions;
    };

    return (
        <div className="space-y-6">
            <ToastContainer toasts={toasts} onClose={id => setToasts(t => t.filter(x => x.id !== id))} />

            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">RA Tracking</h1>
                <p className="text-gray-500 mt-1">Track Return Authorization requests, receipts, and shipments</p>
            </div>

            {/* Summary Cards */}
            {summary && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="bg-white rounded-lg shadow p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center"><Clock className="w-5 h-5 text-gray-600" /></div>
                            <div><p className="text-sm text-gray-500">Pending</p><p className="text-xl font-bold">{summary.pending}</p></div>
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center"><Mail className="w-5 h-5 text-blue-600" /></div>
                            <div><p className="text-sm text-gray-500">Requested</p><p className="text-xl font-bold text-blue-600">{summary.requested}</p></div>
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center"><MailCheck className="w-5 h-5 text-green-600" /></div>
                            <div><p className="text-sm text-gray-500">Received</p><p className="text-xl font-bold text-green-600">{summary.received}</p></div>
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center"><Truck className="w-5 h-5 text-purple-600" /></div>
                            <div><p className="text-sm text-gray-500">Shipped</p><p className="text-xl font-bold text-purple-600">{summary.shipped}</p></div>
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-red-600" /></div>
                            <div><p className="text-sm text-gray-500">Overdue</p><p className="text-xl font-bold text-red-600">{summary.overdue}</p></div>
                        </div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-4">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text" placeholder="Search memo #, pharmacy, labeler, RA #..."
                            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
                        />
                    </div>
                    <select className="border border-gray-300 rounded-md px-3 py-2 text-sm" value={raStatus}
                        onChange={e => { setRaStatus(e.target.value); setCurrentPage(1); }}>
                        {RA_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <select className="border border-gray-300 rounded-md px-3 py-2 text-sm" value={destination}
                        onChange={e => { setDestination(e.target.value); setCurrentPage(1); }}>
                        {DESTINATION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <input type="date" className="border border-gray-300 rounded-md px-3 py-2 text-sm" value={dateFrom}
                        onChange={e => { setDateFrom(e.target.value); setCurrentPage(1); }} title="From date" />
                    <input type="date" className="border border-gray-300 rounded-md px-3 py-2 text-sm" value={dateTo}
                        onChange={e => { setDateTo(e.target.value); setCurrentPage(1); }} title="To date" />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
                    </div>
                ) : memos.length === 0 ? (
                    <div className="text-center py-20 text-gray-500">
                        <MailCheck className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p className="text-lg font-medium">No RA records found</p>
                        <p className="text-sm mt-1">RA tracking entries appear after batches are closed and debit memos generated.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Memo #</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pharmacy</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Destination</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Labeler</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ask Value</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Requested</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tickler</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">RA #</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {memos.map(memo => {
                                    const sb = getRAStatusBadge(memo.raStatus || 'pending');
                                    const overdue = isOverdue(memo);
                                    return (
                                        <tr key={memo.id} className={`hover:bg-gray-50 transition-colors ${overdue ? 'bg-red-50' : ''}`}>
                                            <td className="px-4 py-3 text-sm font-medium text-primary-600 whitespace-nowrap">{memo.memoNumber}</td>
                                            <td className="px-4 py-3 text-sm text-gray-700 max-w-[160px] truncate">{memo.pharmacyName}</td>
                                            <td className="px-4 py-3 text-sm text-gray-700">{memo.destination || '—'}</td>
                                            <td className="px-4 py-3 text-sm text-gray-700 max-w-[140px] truncate">{memo.labelerName || '—'}</td>
                                            <td className="px-4 py-3 text-sm font-medium whitespace-nowrap">{formatCurrency(memo.totalAskValue)}</td>
                                            <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                                                {memo.raRequestedAt ? formatDate(memo.raRequestedAt) : '—'}
                                            </td>
                                            <td className="px-4 py-3 text-sm whitespace-nowrap">
                                                {memo.ticklerDate ? (
                                                    <span className={overdue ? 'text-red-600 font-semibold' : 'text-gray-500'}>
                                                        {formatDate(memo.ticklerDate)}
                                                        {overdue && ' (!)'}
                                                    </span>
                                                ) : '—'}
                                            </td>
                                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{memo.raNumber || '—'}</td>
                                            <td className="px-4 py-3"><Badge variant={sb.variant}>{sb.label}</Badge></td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    {getRowActions(memo)}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200">
                        <p className="text-sm text-gray-500">
                            Page {currentPage} of {totalPages}{pagination?.total != null && ` · ${pagination.total} memos`}
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

            {/* ── Request RA Modal (Task 11.6) ──────────────────── */}
            {activeModal === 'request' && selectedMemo && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={closeModal}>
                    <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-bold text-gray-900">Send RA Request</h2>
                                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                            </div>
                        </div>
                        <div className="p-6 space-y-4">
                            {/* Memo Details */}
                            <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1">
                                <div className="flex justify-between"><span className="text-gray-500">Memo</span><span className="font-medium">{selectedMemo.memoNumber}</span></div>
                                <div className="flex justify-between"><span className="text-gray-500">Pharmacy</span><span>{selectedMemo.pharmacyName}</span></div>
                                <div className="flex justify-between"><span className="text-gray-500">Destination</span><span>{selectedMemo.destination || '—'}</span></div>
                                <div className="flex justify-between"><span className="text-gray-500">Labeler</span><span>{selectedMemo.labelerName || '—'}</span></div>
                                <div className="flex justify-between"><span className="text-gray-500">Items</span><span>{selectedMemo.totalItems}</span></div>
                                <div className="flex justify-between"><span className="text-gray-500">Ask Value</span><span className="font-medium text-green-700">{formatCurrency(selectedMemo.totalAskValue)}</span></div>
                            </div>

                            {/* Email Preview */}
                            {isPreviewLoading ? (
                                <div className="flex items-center justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-primary-500" /></div>
                            ) : emailPreview ? (
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">To</label>
                                        <p className="text-sm font-medium">{emailPreview.to || <span className="text-red-500">No email found — enter override below</span>}</p>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Subject</label>
                                        <p className="text-sm">{emailPreview.subject}</p>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Preview</label>
                                        <pre className="text-xs bg-gray-50 rounded p-3 whitespace-pre-wrap max-h-40 overflow-y-auto border border-gray-200">{emailPreview.body}</pre>
                                    </div>
                                </div>
                            ) : null}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email Override (optional)</label>
                                <input
                                    type="email"
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                                    placeholder="Override destination email..."
                                    value={requestEmail}
                                    onChange={e => setRequestEmail(e.target.value)}
                                />
                                <p className="text-xs text-gray-400 mt-1">Leave blank to use the email from manufacturer policies.</p>
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                            <Button variant="ghost" onClick={closeModal}>Cancel</Button>
                            <Button variant="primary" onClick={handleSendRequest} disabled={isActionLoading}>
                                {isActionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Send className="w-4 h-4 mr-1" />}
                                Send RA Request
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Resend RA Modal ────────────────────────────────── */}
            {activeModal === 'resend' && selectedMemo && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={closeModal}>
                    <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-bold text-gray-900">Resend RA Reminder</h2>
                                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                            </div>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                                <p>Original request sent: <strong>{selectedMemo.raRequestedAt ? formatDate(selectedMemo.raRequestedAt) : 'N/A'}</strong></p>
                                {selectedMemo.ticklerDate && (
                                    <p>Tickler date: <strong className={isOverdue(selectedMemo) ? 'text-red-600' : ''}>{formatDate(selectedMemo.ticklerDate)}</strong>
                                    {isOverdue(selectedMemo) && ' — OVERDUE'}</p>
                                )}
                            </div>

                            <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1">
                                <div className="flex justify-between"><span className="text-gray-500">Memo</span><span className="font-medium">{selectedMemo.memoNumber}</span></div>
                                <div className="flex justify-between"><span className="text-gray-500">Labeler</span><span>{selectedMemo.labelerName || '—'}</span></div>
                                <div className="flex justify-between"><span className="text-gray-500">Ask Value</span><span className="font-medium">{formatCurrency(selectedMemo.totalAskValue)}</span></div>
                            </div>

                            {isPreviewLoading ? (
                                <div className="flex items-center justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-primary-500" /></div>
                            ) : emailPreview ? (
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Reminder Preview</label>
                                    <pre className="text-xs bg-gray-50 rounded p-3 whitespace-pre-wrap max-h-32 overflow-y-auto border border-gray-200">{emailPreview.body}</pre>
                                </div>
                            ) : null}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email Override (optional)</label>
                                <input
                                    type="email"
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                                    placeholder="Override destination email..."
                                    value={requestEmail}
                                    onChange={e => setRequestEmail(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                            <Button variant="ghost" onClick={closeModal}>Cancel</Button>
                            <Button variant="warning" onClick={handleResend} disabled={isActionLoading}>
                                {isActionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <RefreshCw className="w-4 h-4 mr-1" />}
                                Resend Reminder
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Receive RA Modal (Task 11.7) ──────────────────── */}
            {activeModal === 'receive' && selectedMemo && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={closeModal}>
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-bold text-gray-900">Record RA Received</h2>
                                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                            </div>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1">
                                <div className="flex justify-between"><span className="text-gray-500">Memo</span><span className="font-medium">{selectedMemo.memoNumber}</span></div>
                                <div className="flex justify-between"><span className="text-gray-500">Labeler</span><span>{selectedMemo.labelerName || '—'}</span></div>
                                <div className="flex justify-between"><span className="text-gray-500">Destination</span><span>{selectedMemo.destination || '—'}</span></div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">RA Number *</label>
                                <input
                                    type="text"
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                                    placeholder="Enter RA number..."
                                    value={receiveRaNumber}
                                    onChange={e => setReceiveRaNumber(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">PDF URL (optional)</label>
                                <input
                                    type="url"
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                                    placeholder="https://..."
                                    value={receivePdfUrl}
                                    onChange={e => setReceivePdfUrl(e.target.value)}
                                />
                                <p className="text-xs text-gray-400 mt-1">Link to the RA authorization PDF if available.</p>
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                            <Button variant="ghost" onClick={closeModal}>Cancel</Button>
                            <Button variant="success" onClick={handleReceive} disabled={isActionLoading || !receiveRaNumber.trim()}>
                                {isActionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CheckCircle className="w-4 h-4 mr-1" />}
                                Record RA Received
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Ship Modal ─────────────────────────────────────── */}
            {activeModal === 'ship' && selectedMemo && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={closeModal}>
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-bold text-gray-900">Record Shipment</h2>
                                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                            </div>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1">
                                <div className="flex justify-between"><span className="text-gray-500">Memo</span><span className="font-medium">{selectedMemo.memoNumber}</span></div>
                                <div className="flex justify-between"><span className="text-gray-500">RA #</span><span className="font-medium text-green-700">{selectedMemo.raNumber}</span></div>
                                <div className="flex justify-between"><span className="text-gray-500">Destination</span><span>{selectedMemo.destination || '—'}</span></div>
                                <div className="flex justify-between"><span className="text-gray-500">Items</span><span>{selectedMemo.totalItems}</span></div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Outbound Tracking # *</label>
                                <input
                                    type="text"
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                                    placeholder="FedEx/UPS tracking number..."
                                    value={shipTracking}
                                    onChange={e => setShipTracking(e.target.value)}
                                    autoFocus
                                />
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                            <Button variant="ghost" onClick={closeModal}>Cancel</Button>
                            <Button variant="primary" onClick={handleShip} disabled={isActionLoading || !shipTracking.trim()}>
                                {isActionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Truck className="w-4 h-4 mr-1" />}
                                Record Shipment
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
