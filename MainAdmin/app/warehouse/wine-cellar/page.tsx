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
        limit: 10,
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
                    <Link
                        href="/warehouse"
                        className="inline-flex items-center gap-1 text-[11px] mb-1.5 transition-colors hover:underline"
                        style={{ color: 'var(--outline)' }}
                    >
                        <ChevronLeft className="w-3 h-3" /> Back to Warehouse
                    </Link>
                    <h1 className="font-heading text-headline flex items-center gap-2" style={{ color: 'var(--foreground)' }}>
                        <Archive className="w-6 h-6" style={{ color: 'var(--tertiary)' }} /> Wine Cellar
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--on-surface-variant)' }}>Products stored for future return processing</p>
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
                    <div className="rounded-[4px] shadow px-4 py-3 border" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}>
                        <p className="text-xs font-medium mb-1" style={{ color: 'var(--on-surface-variant)' }}>Total Items</p>
                        <p className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>{stats.totalItems}</p>
                    </div>
                    <div className="rounded-[4px] shadow px-4 py-3 border" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}>
                        <p className="text-xs font-medium mb-1" style={{ color: 'var(--primary)' }}>Shelved</p>
                        <p className="text-lg font-bold" style={{ color: 'var(--primary)' }}>{stats.shelved}</p>
                    </div>
                    <div className="rounded-[4px] shadow px-4 py-3 border" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}>
                        <p className="text-xs font-medium mb-1" style={{ color: 'var(--tertiary)' }}>Ready to Return</p>
                        <p className="text-lg font-bold" style={{ color: 'var(--tertiary)' }}>{stats.readyToReturn}</p>
                    </div>
                    <div className="rounded-[4px] shadow px-4 py-3 border" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}>
                        <p className="text-xs font-medium mb-1" style={{ color: 'var(--secondary)' }}>Returned</p>
                        <p className="text-lg font-bold" style={{ color: 'var(--secondary)' }}>{stats.returned}</p>
                    </div>
                    <div className="rounded-[4px] shadow px-4 py-3 border" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}>
                        <p className="text-xs font-medium mb-1" style={{ color: 'var(--error)' }}>Destroyed</p>
                        <p className="text-lg font-bold" style={{ color: 'var(--error)' }}>{stats.destroyed}</p>
                    </div>
                    <div className="rounded-[4px] shadow px-4 py-3 border" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}>
                        <p className="text-xs font-medium mb-1" style={{ color: 'var(--secondary)' }}>Total Value</p>
                        <p className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>{formatCurrency(stats.totalValue)}</p>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="rounded-[4px] shadow-md p-4 border" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}>
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--outline)' }} />
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search by NDC, product name, manufacturer, lot, barcode..."
                            className="w-full pl-10 pr-4 py-2 text-sm border rounded-[4px] focus:outline-none focus:ring-2 focus:ring-primary-500"
                            style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)', color: 'var(--foreground)' }}
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        className="px-3 py-2 text-sm border rounded-[4px] focus:outline-none focus:ring-2 focus:ring-primary-500"
                        style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)', color: 'var(--foreground)' }}
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
                        className="px-3 py-2 text-sm border rounded-[4px] focus:outline-none focus:ring-2 focus:ring-primary-500"
                        style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)', color: 'var(--foreground)' }}
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
            <div className="rounded-[4px] shadow-md border" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}>
                {isLoading ? (
                    <div className="flex justify-center py-16">
                        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
                    </div>
                ) : items.length === 0 ? (
                    <div className="text-center py-16">
                        <Archive className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--outline-variant)' }} />
                        <h3 className="font-heading text-body font-semibold mb-2" style={{ color: 'var(--foreground)' }}>No Wine Cellar Items</h3>
                        <p className="text-sm" style={{ color: 'var(--on-surface-variant)' }}>
                            {search || statusFilter || expectedMonth
                                ? 'No items match your filters. Try adjusting your search criteria.'
                                : 'Items will appear here when products are shelved for future returns.'}
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Summary Bar */}
                        {summary && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 border-b" style={{ borderColor: 'var(--outline-variant)' }}>
                                <div className="rounded-[4px] p-2.5 text-center border" style={{ backgroundColor: 'var(--surface-container-low)', borderColor: 'var(--outline-variant)' }}>
                                    <p className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>Showing</p>
                                    <p className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>{summary.totalItems}</p>
                                </div>
                                <div className="rounded-[4px] p-2.5 text-center border" style={{ backgroundColor: 'var(--primary-fixed)', borderColor: 'var(--outline-variant)' }}>
                                    <p className="text-xs" style={{ color: 'var(--primary)' }}>Shelved</p>
                                    <p className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>{summary.totalShelved}</p>
                                </div>
                                <div className="rounded-[4px] p-2.5 text-center border" style={{ backgroundColor: 'var(--tertiary-fixed)', borderColor: 'var(--outline-variant)' }}>
                                    <p className="text-xs" style={{ color: 'var(--tertiary)' }}>Ready</p>
                                    <p className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>{summary.totalReady}</p>
                                </div>
                                <div className="rounded-[4px] p-2.5 text-center border" style={{ backgroundColor: 'var(--secondary-container)', borderColor: 'var(--outline-variant)' }}>
                                    <p className="text-xs" style={{ color: 'var(--on-secondary-container)' }}>Value</p>
                                    <p className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>{formatCurrency(summary.totalValue)}</p>
                                </div>
                            </div>
                        )}

                        <div className="overflow-x-auto">
                            <table className="w-full table-auto text-xs border" style={{ borderColor: 'var(--outline)' }}>
                                <thead className="bg-[var(--surface-container-low)] border-b" style={{ borderColor: 'var(--outline)', borderBottomWidth: '1.5px' }}>
                                    <tr className="bg-[var(--surface-container-low)]">
                                        <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-[var(--on-surface-variant)] whitespace-nowrap">NDC</th>
                                        <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-[var(--on-surface-variant)] whitespace-nowrap">Product</th>
                                        <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-[var(--on-surface-variant)] whitespace-nowrap">Pharmacy</th>
                                        <th className="text-center px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-[var(--on-surface-variant)] whitespace-nowrap">QTY</th>
                                        <th className="text-right px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-[var(--on-surface-variant)] whitespace-nowrap">Price</th>
                                        <th className="text-right px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-[var(--on-surface-variant)] whitespace-nowrap">Est. Store Price</th>
                                        <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-[var(--on-surface-variant)] whitespace-nowrap">Shelved</th>
                                        <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-[var(--on-surface-variant)] whitespace-nowrap">Expected Return</th>
                                        <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-[var(--on-surface-variant)] whitespace-nowrap">Location</th>
                                        <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-[var(--on-surface-variant)] whitespace-nowrap">Status</th>
                                        <th className="text-right px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-[var(--on-surface-variant)] whitespace-nowrap">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y" style={{ borderColor: 'var(--outline-variant)' }}>
                                    {items.map((item) => {
                                        const sBadge = getStatusBadge(item.status);
                                        return (
                                            <tr key={item.id} className="hover:bg-[var(--surface-container)] transition-colors" style={{ borderColor: 'var(--outline-variant)' }}>
                                                <td className="px-3 py-3 text-sm font-mono" style={{ color: 'var(--foreground)' }}>{item.ndc || '—'}</td>
                                                <td className="px-3 py-3 text-sm max-w-[160px] truncate" style={{ color: 'var(--foreground)' }} title={item.productName || ''}>
                                                    <div>
                                                        <p className="truncate">{item.productName || '—'}</p>
                                                        {item.manufacturer && (
                                                            <p className="truncate text-[10px]" style={{ color: 'var(--on-surface-variant)' }}>{item.manufacturer}</p>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-3 py-3 text-sm max-w-[120px] truncate" style={{ color: 'var(--on-surface-variant)' }} title={item.pharmacyName || ''}>
                                                    {item.pharmacyName || '—'}
                                                </td>
                                                <td className="px-3 py-3 text-sm text-center" style={{ color: 'var(--foreground)' }}>
                                                    {item.quantity}{item.isPartial && <span className="ml-0.5" style={{ color: 'var(--tertiary)' }}>P</span>}
                                                </td>
                                                <td className="px-3 py-3 text-sm text-right" style={{ color: 'var(--foreground)' }}>
                                                    {item.standardPrice != null ? formatCurrency(item.standardPrice) : '—'}
                                                </td>
                                                <td className="px-3 py-3 text-sm text-right" style={{ color: 'var(--foreground)' }}>
                                                    {item.estimatedStorePrice != null ? formatCurrency(item.estimatedStorePrice) : '—'}
                                                </td>
                                                <td className="px-3 py-3 text-sm" style={{ color: 'var(--on-surface-variant)' }}>{formatDate(item.dateShelved)}</td>
                                                <td className="px-3 py-3 text-sm" style={{ color: 'var(--on-surface-variant)' }}>
                                                    {item.expectedReturnableDate ? formatDate(item.expectedReturnableDate) : '—'}
                                                </td>
                                                <td className="px-3 py-3 text-sm" style={{ color: 'var(--on-surface-variant)' }}>
                                                    {item.physicalLocation || '—'}
                                                    {item.baggieBarcode && (
                                                        <p className="text-[10px] font-mono" style={{ color: 'var(--on-surface-variant)' }}>{item.baggieBarcode}</p>
                                                    )}
                                                </td>
                                                <td className="px-3 py-3 text-sm">
                                                    <Badge variant={sBadge.variant}>{sBadge.label}</Badge>
                                                </td>
                                                <td className="px-3 py-3 text-sm">
                                                    <div className="flex items-center justify-end gap-1">
                                                        {(item.status === 'shelved' || item.status === 'ready_to_return') && (
                                                            <button
                                                                onClick={() => setEditModal(item)}
                                                                className="p-1 rounded border hover:bg-primary-50/40"
                                                                style={{ borderColor: 'var(--outline-variant)', color: 'var(--on-surface-variant)' }}
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
                            <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}>
                                <p className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>
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
                <div className="fixed inset-0 backdrop-blur-md flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'color-mix(in srgb, var(--inverse-surface) 55%, transparent)' }} onClick={() => setEditModal(null)}>
                    <div className="rounded-[4px] max-w-lg w-full shadow-xl border" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }} onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}>
                            <h2 className="font-heading text-body font-semibold" style={{ color: 'var(--foreground)' }}>Edit Wine Cellar Item</h2>
                            <button onClick={() => setEditModal(null)} style={{ color: 'var(--outline)' }}><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-5 space-y-4">
                            {/* Item info */}
                            <div className="rounded-[4px] p-3 text-xs space-y-1 border" style={{ backgroundColor: 'var(--surface-container-low)', borderColor: 'var(--outline-variant)' }}>
                                <p className="font-medium" style={{ color: 'var(--foreground)' }}>{editModal.productName || editModal.ndc || 'Unknown item'}</p>
                                <p style={{ color: 'var(--on-surface-variant)' }}>
                                    NDC: <span className="font-mono">{editModal.ndc || '—'}</span> | Lot: {editModal.lotNumber || '—'} | Exp: {editModal.expirationDate ? formatDate(editModal.expirationDate) : '—'}
                                </p>
                                <p style={{ color: 'var(--on-surface-variant)' }}>Pharmacy: {editModal.pharmacyName || '—'} | Shelved: {formatDate(editModal.dateShelved)}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--on-surface)' }}>Quantity</label>
                                    <input type="number" min="1" value={editForm.quantity} onChange={e => setEditForm({ ...editForm, quantity: e.target.value })} className="w-full px-3 py-2 text-sm border rounded-[4px] focus:outline-none focus:ring-2 focus:ring-primary-500" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)', color: 'var(--foreground)' }} />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--on-surface)' }}>Price ($)</label>
                                    <input type="number" step="0.01" min="0" value={editForm.standardPrice} onChange={e => setEditForm({ ...editForm, standardPrice: e.target.value })} className="w-full px-3 py-2 text-sm border rounded-[4px] focus:outline-none focus:ring-2 focus:ring-primary-500" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)', color: 'var(--foreground)' }} />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--on-surface)' }}>Physical Location</label>
                                <input type="text" value={editForm.physicalLocation} onChange={e => setEditForm({ ...editForm, physicalLocation: e.target.value })} placeholder="e.g. Shelf A3, Bin 12" className="w-full px-3 py-2 text-sm border rounded-[4px] focus:outline-none focus:ring-2 focus:ring-primary-500" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)', color: 'var(--foreground)' }} />
                            </div>

                            <div>
                                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--on-surface)' }}>Baggie Barcode</label>
                                <input type="text" value={editForm.baggieBarcode} onChange={e => setEditForm({ ...editForm, baggieBarcode: e.target.value })} placeholder="Scan or enter barcode" className="w-full px-3 py-2 text-sm border rounded-[4px] focus:outline-none focus:ring-2 focus:ring-primary-500" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)', color: 'var(--foreground)' }} />
                            </div>

                            <div>
                                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--on-surface)' }}>Expected Returnable Date</label>
                                <input type="date" value={editForm.expectedReturnableDate} onChange={e => setEditForm({ ...editForm, expectedReturnableDate: e.target.value })} className="w-full px-3 py-2 text-sm border rounded-[4px] focus:outline-none focus:ring-2 focus:ring-primary-500" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)', color: 'var(--foreground)' }} />
                            </div>

                            <div>
                                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--on-surface)' }}>Notes</label>
                                <textarea value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} rows={2} placeholder="Optional notes" className="w-full px-3 py-2 text-sm border rounded-[4px] focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)', color: 'var(--foreground)' }} />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 p-5 border-t" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}>
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