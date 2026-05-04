'use client';

import { PermissionGate } from '@/components/auth/PermissionGate';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
    Archive, Search, Loader2, X, Edit, CheckCircle, RefreshCw,
    Calendar, MapPin, Package, BarChart3, Clock, ChevronLeft,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ToastContainer, Toast } from '@/components/ui/Toast';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { formatDate } from '@/lib/utils';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import {
    fetchWineCellarItems,
    fetchWineCellarStats,
    updateWineCellarItem,
    checkAndSurfaceReady,
    FetchWineCellarParams,
} from '@/lib/store/wineCellarSlice';
import { WineCellarItem } from '@/lib/types';

function formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

function getStatusBadge(status: string): { variant: 'success' | 'warning' | 'danger' | 'info' | 'default'; label: string } {
    switch (status) {
        case 'shelved': return { variant: 'info', label: 'Shelved' };
        case 'ready_to_return': return { variant: 'warning', label: 'Ready to Return' };
        case 'returned': return { variant: 'success', label: 'Returned' };
        case 'destroyed': return { variant: 'danger', label: 'Destroyed' };
        default: return { variant: 'default', label: status };
    }
}

export default function WineCellarPage() {
    const dispatch = useAppDispatch();
    const { items, stats, summary, pagination, isLoading, isStatsLoading, isActionLoading } = useAppSelector(
        (state) => state.wineCellar
    );

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [expectedMonth, setExpectedMonth] = useState('');
    const [page, setPage] = useState(1);
    const debouncedSearch = useDebounce(search, 400);
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [editModal, setEditModal] = useState<WineCellarItem | null>(null);
    const [editForm, setEditForm] = useState({
        physicalLocation: '',
        baggieBarcode: '',
        notes: '',
        quantity: '',
        standardPrice: '',
        expectedReturnableDate: '',
    });

    const showToast = (msg: string, type: Toast['type'] = 'success') => {
        setToasts(prev => [...prev, { id: Date.now().toString(), message: msg, type }]);
    };
    const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

    const buildParams = useCallback((): FetchWineCellarParams => ({
        search: debouncedSearch || undefined,
        status: statusFilter || undefined,
        expectedMonth: expectedMonth || undefined,
        page,
        limit: 50,
    }), [debouncedSearch, statusFilter, expectedMonth, page]);

    // Fetch items and stats
    useEffect(() => {
        dispatch(fetchWineCellarItems(buildParams()));
    }, [dispatch, buildParams]);

    useEffect(() => {
        dispatch(fetchWineCellarStats());
    }, [dispatch]);

    // Reset page when filters change
    useEffect(() => {
        setPage(1);
    }, [debouncedSearch, statusFilter, expectedMonth]);

    const refresh = () => {
        dispatch(fetchWineCellarItems(buildParams()));
        dispatch(fetchWineCellarStats());
    };

    // Edit modal
    useEffect(() => {
        if (editModal) {
            setEditForm({
                physicalLocation: editModal.physicalLocation || '',
                baggieBarcode: editModal.baggieBarcode || '',
                notes: editModal.notes || '',
                quantity: String(editModal.quantity),
                standardPrice: editModal.standardPrice != null ? String(editModal.standardPrice) : '',
                expectedReturnableDate: editModal.expectedReturnableDate || '',
            });
        }
    }, [editModal]);

    const handleUpdate = async () => {
        if (!editModal) return;
        const payload: Record<string, any> = {};
        if (editForm.physicalLocation !== (editModal.physicalLocation || ''))
            payload.physicalLocation = editForm.physicalLocation;
        if (editForm.baggieBarcode !== (editModal.baggieBarcode || ''))
            payload.baggieBarcode = editForm.baggieBarcode;
        if (editForm.notes !== (editModal.notes || ''))
            payload.notes = editForm.notes;
        if (editForm.quantity && editForm.quantity !== String(editModal.quantity))
            payload.quantity = parseInt(editForm.quantity);
        if (editForm.standardPrice !== (editModal.standardPrice != null ? String(editModal.standardPrice) : ''))
            payload.standardPrice = editForm.standardPrice ? parseFloat(editForm.standardPrice) : null;
        if (editForm.expectedReturnableDate !== (editModal.expectedReturnableDate || ''))
            payload.expectedReturnableDate = editForm.expectedReturnableDate || null;

        const result = await dispatch(updateWineCellarItem({ id: editModal.id, payload }));
        if (updateWineCellarItem.fulfilled.match(result)) {
            showToast('Item updated successfully!');
            setEditModal(null);
            refresh();
        } else {
            showToast(result.payload as string || 'Failed to update item', 'error');
        }
    };

    const handleCheckReady = async () => {
        const result = await dispatch(checkAndSurfaceReady());
        if (checkAndSurfaceReady.fulfilled.match(result)) {
            const count = result.payload.surfacedCount;
            showToast(count > 0 ? `${count} item(s) surfaced as ready to return!` : 'No new items ready to surface.');
            if (count > 0) refresh();
        } else {
            showToast(result.payload as string || 'Failed to check ready items', 'error');
        }
    };

    const handleDueThisMonth = () => {
        const now = new Date();
        const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        setStatusFilter('ready_to_return');
        setExpectedMonth(month);
    };

    return (
        <PermissionGate permission="warehouse">
        <div className="space-y-6">
            <ToastContainer toasts={toasts} onClose={removeToast} />

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                    <Link href="/warehouse" className="inline-flex items-center gap-1 text-[11px] text-gray-400 hover:text-primary-600 mb-1.5 transition-colors">
                        <ChevronLeft className="w-3 h-3" /> Back to Warehouse
                    </Link>
                    <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <Archive className="w-6 h-6 text-purple-600" /> Wine Cellar
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Products stored for future return processing</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={handleDueThisMonth}>
                        <Calendar className="w-4 h-4 mr-1" /> Due This Month
                    </Button>
                    <Button variant="warning" size="sm" onClick={handleCheckReady} disabled={isActionLoading}>
                        {isActionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <RefreshCw className="w-4 h-4 mr-1" />}
                        Check Ready Items
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    <div className="bg-white rounded-lg shadow px-4 py-3 border border-gray-100">
                        <p className="text-xs font-medium text-gray-500 mb-1">Total Items</p>
                        <p className="text-lg font-bold text-gray-900">{stats.totalItems}</p>
                    </div>
                    <div className="bg-white rounded-lg shadow px-4 py-3 border border-gray-100">
                        <p className="text-xs font-medium text-blue-600 mb-1">Shelved</p>
                        <p className="text-lg font-bold text-blue-700">{stats.shelved}</p>
                    </div>
                    <div className="bg-white rounded-lg shadow px-4 py-3 border border-gray-100">
                        <p className="text-xs font-medium text-yellow-600 mb-1">Ready to Return</p>
                        <p className="text-lg font-bold text-yellow-700">{stats.readyToReturn}</p>
                    </div>
                    <div className="bg-white rounded-lg shadow px-4 py-3 border border-gray-100">
                        <p className="text-xs font-medium text-green-600 mb-1">Returned</p>
                        <p className="text-lg font-bold text-green-700">{stats.returned}</p>
                    </div>
                    <div className="bg-white rounded-lg shadow px-4 py-3 border border-gray-100">
                        <p className="text-xs font-medium text-red-600 mb-1">Destroyed</p>
                        <p className="text-lg font-bold text-red-700">{stats.destroyed}</p>
                    </div>
                    <div className="bg-white rounded-lg shadow px-4 py-3 border border-gray-100">
                        <p className="text-xs font-medium text-purple-600 mb-1">Total Value</p>
                        <p className="text-lg font-bold text-purple-700">{formatCurrency(stats.totalValue)}</p>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="bg-white rounded-lg shadow-md p-4">
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search by NDC, product name, manufacturer, lot, barcode..."
                            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                        <option value="">All Statuses</option>
                        <option value="shelved">Shelved</option>
                        <option value="ready_to_return">Ready to Return</option>
                        <option value="returned">Returned</option>
                        <option value="destroyed">Destroyed</option>
                    </select>
                    <input
                        type="month"
                        value={expectedMonth}
                        onChange={e => setExpectedMonth(e.target.value)}
                        className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        title="Filter by expected return month"
                    />
                    {(statusFilter || expectedMonth || search) && (
                        <Button variant="outline" size="sm" onClick={() => { setSearch(''); setStatusFilter(''); setExpectedMonth(''); }}>
                            <X className="w-4 h-4 mr-1" /> Clear
                        </Button>
                    )}
                </div>
            </div>

            {/* Items Table */}
            <div className="bg-white rounded-lg shadow-md">
                {isLoading ? (
                    <div className="flex justify-center py-16">
                        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
                    </div>
                ) : items.length === 0 ? (
                    <div className="text-center py-16">
                        <Archive className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Wine Cellar Items</h3>
                        <p className="text-gray-500 text-sm">
                            {search || statusFilter || expectedMonth
                                ? 'No items match your filters. Try adjusting your search criteria.'
                                : 'Items will appear here when products are shelved for future returns.'}
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Summary Bar */}
                        {summary && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 border-b border-gray-200">
                                <div className="bg-gray-50 rounded-lg p-2.5 text-center">
                                    <p className="text-xs text-gray-500">Showing</p>
                                    <p className="text-sm font-bold text-gray-900">{summary.totalItems}</p>
                                </div>
                                <div className="bg-blue-50 rounded-lg p-2.5 text-center">
                                    <p className="text-xs text-blue-600">Shelved</p>
                                    <p className="text-sm font-bold text-blue-800">{summary.totalShelved}</p>
                                </div>
                                <div className="bg-yellow-50 rounded-lg p-2.5 text-center">
                                    <p className="text-xs text-yellow-600">Ready</p>
                                    <p className="text-sm font-bold text-yellow-800">{summary.totalReady}</p>
                                </div>
                                <div className="bg-purple-50 rounded-lg p-2.5 text-center">
                                    <p className="text-xs text-purple-600">Value</p>
                                    <p className="text-sm font-bold text-purple-800">{formatCurrency(summary.totalValue)}</p>
                                </div>
                            </div>
                        )}

                        <div className="overflow-x-auto">
                            <table className="w-full table-auto text-xs">
                                <thead>
                                    <tr className="bg-gradient-to-r from-indigo-500 to-indigo-400">
                                        <th className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-white whitespace-nowrap">NDC</th>
                                        <th className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-white whitespace-nowrap">Product</th>
                                        <th className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-white whitespace-nowrap">Pharmacy</th>
                                        <th className="text-center px-4 py-3.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-white whitespace-nowrap">QTY</th>
                                        <th className="text-right px-4 py-3.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-white whitespace-nowrap">Price</th>
                                        <th className="text-right px-4 py-3.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-white whitespace-nowrap">Est. Store Price</th>
                                        <th className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-white whitespace-nowrap">Shelved</th>
                                        <th className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-white whitespace-nowrap">Expected Return</th>
                                        <th className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-white whitespace-nowrap">Location</th>
                                        <th className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-white whitespace-nowrap">Status</th>
                                        <th className="text-right px-4 py-3.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-white whitespace-nowrap">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item) => {
                                        const sBadge = getStatusBadge(item.status);
                                        return (
                                            <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                                                <td className="px-4 py-3 text-sm font-mono text-gray-900">{item.ndc || '—'}</td>
                                                <td className="px-4 py-3 text-sm text-gray-900 max-w-[160px] truncate" title={item.productName || ''}>
                                                    <div>
                                                        <p className="truncate">{item.productName || '—'}</p>
                                                        {item.manufacturer && (
                                                            <p className="text-gray-400 truncate text-[10px]">{item.manufacturer}</p>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-600 max-w-[120px] truncate" title={item.pharmacyName || ''}>
                                                    {item.pharmacyName || '—'}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-center text-gray-900">
                                                    {item.quantity}{item.isPartial && <span className="text-yellow-600 ml-0.5">P</span>}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-right text-gray-900">
                                                    {item.standardPrice != null ? formatCurrency(item.standardPrice) : '—'}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-right text-gray-900">
                                                    {item.estimatedStorePrice != null ? formatCurrency(item.estimatedStorePrice) : '—'}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-600">{formatDate(item.dateShelved)}</td>
                                                <td className="px-4 py-3 text-sm text-gray-600">
                                                    {item.expectedReturnableDate ? formatDate(item.expectedReturnableDate) : '—'}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-600">
                                                    {item.physicalLocation || '—'}
                                                    {item.baggieBarcode && (
                                                        <p className="text-[10px] text-gray-400 font-mono">{item.baggieBarcode}</p>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-sm">
                                                    <Badge variant={sBadge.variant}>{sBadge.label}</Badge>
                                                </td>
                                                <td className="px-4 py-3 text-sm">
                                                    <div className="flex items-center justify-end gap-1">
                                                        {(item.status === 'shelved' || item.status === 'ready_to_return') && (
                                                            <button
                                                                onClick={() => setEditModal(item)}
                                                                className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                                                                title="Edit item"
                                                            >
                                                                <Edit className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {pagination && pagination.totalPages > 1 && (
                            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
                                <p className="text-xs text-gray-500">
                                    Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
                                </p>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={pagination.page <= 1}
                                    >
                                        Previous
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setPage(p => p + 1)}
                                        disabled={pagination.page >= pagination.totalPages}
                                    >
                                        Next
                                    </Button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* ── Edit Modal ───────────────────────────────── */}
            {editModal && (
                <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={() => setEditModal(null)}>
                    <div className="bg-white rounded-lg max-w-lg w-full shadow-xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-gray-50">
                            <h2 className="text-lg font-semibold text-gray-900">Edit Wine Cellar Item</h2>
                            <button onClick={() => setEditModal(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-5 space-y-4">
                            {/* Item info */}
                            <div className="bg-gray-50 rounded-lg p-3 text-xs space-y-1">
                                <p className="font-medium text-gray-900">{editModal.productName || editModal.ndc || 'Unknown item'}</p>
                                <p className="text-gray-500">
                                    NDC: <span className="font-mono">{editModal.ndc || '—'}</span> | Lot: {editModal.lotNumber || '—'} | Exp: {editModal.expirationDate ? formatDate(editModal.expirationDate) : '—'}
                                </p>
                                <p className="text-gray-500">Pharmacy: {editModal.pharmacyName || '—'} | Shelved: {formatDate(editModal.dateShelved)}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Quantity</label>
                                    <input type="number" min="1" value={editForm.quantity} onChange={e => setEditForm({ ...editForm, quantity: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Price ($)</label>
                                    <input type="number" step="0.01" min="0" value={editForm.standardPrice} onChange={e => setEditForm({ ...editForm, standardPrice: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Physical Location</label>
                                <input type="text" value={editForm.physicalLocation} onChange={e => setEditForm({ ...editForm, physicalLocation: e.target.value })} placeholder="e.g. Shelf A3, Bin 12" className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500" />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Baggie Barcode</label>
                                <input type="text" value={editForm.baggieBarcode} onChange={e => setEditForm({ ...editForm, baggieBarcode: e.target.value })} placeholder="Scan or enter barcode" className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500" />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Expected Returnable Date</label>
                                <input type="date" value={editForm.expectedReturnableDate} onChange={e => setEditForm({ ...editForm, expectedReturnableDate: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500" />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                                <textarea value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} rows={2} placeholder="Optional notes" className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 p-5 border-t border-gray-200 bg-gray-50">
                            <Button variant="outline" onClick={() => setEditModal(null)}>Cancel</Button>
                            <Button variant="primary" onClick={handleUpdate} disabled={isActionLoading}>
                                {isActionLoading ? <><Loader2 className="w-4 h-4 animate-spin mr-1" />Saving...</> : 'Save Changes'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
        </PermissionGate>
    );
}