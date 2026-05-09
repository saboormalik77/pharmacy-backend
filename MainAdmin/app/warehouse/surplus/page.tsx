'use client';

import { PermissionGate } from '@/components/auth/PermissionGate';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    Warehouse, Loader2, Search, Package, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { ToastContainer, Toast } from '@/components/ui/Toast';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { formatDate } from '@/lib/utils';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import { fetchAllSurplus } from '@/lib/store/warehouseSlice';

type StatusFilter = '' | 'stored' | 'assigned_to_return' | 'disposed';

export default function WarehouseSurplusPage() {
    const dispatch = useAppDispatch();
    const { allSurplus, allSurplusPagination, isLoading } = useAppSelector(s => s.warehouse);

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
    const [page, setPage] = useState(1);
    const [toasts, setToasts] = useState<Toast[]>([]);
    const debouncedSearch = useDebounce(search, 400);
    const limit = 20;

    const showToast = (msg: string, type: Toast['type'] = 'success') => {
        setToasts(prev => [...prev, { id: Date.now().toString(), message: msg, type }]);
    };
    const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

    useEffect(() => {
        dispatch(fetchAllSurplus({
            search: debouncedSearch || undefined,
            status: statusFilter || undefined,
            page,
            limit,
        }));
    }, [debouncedSearch, statusFilter, page, dispatch]);

    useEffect(() => { setPage(1); }, [debouncedSearch, statusFilter]);

    const totalPages = allSurplusPagination?.totalPages ?? 1;

    const conditionBadge = (condition: string) => {
        switch (condition) {
            case 'good': return 'bg-green-100 text-green-700';
            case 'damaged': return 'bg-red-100 text-red-700';
            default: return 'bg-[var(--surface-container)] text-[var(--on-primary-container)]';
        }
    };

    const statusBadge = (status: string) => {
        switch (status) {
            case 'stored': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'assigned_to_return': return 'bg-purple-100 text-purple-700 border-purple-200';
            case 'disposed': return 'bg-[var(--surface-container-high)] text-[var(--on-primary-container)] border-[var(--outline-variant)]';
            default: return 'bg-[var(--surface-container)] text-[var(--on-primary-container)] border-[var(--outline-variant)]';
        }
    };

    return (
        <PermissionGate permission="warehouse">
            <ToastContainer toasts={toasts} onClose={removeToast} />
            <div className="space-y-3">
                {/* Header */}
                <div>
                    <Link href="/warehouse" className="inline-flex items-center gap-1 text-[11px] text-[var(--outline)] hover:text-primary-600 mb-1.5 transition-colors">
                        <ChevronLeft className="w-3 h-3" /> Back to Warehouse
                    </Link>
                    <h1 className="font-heading text-headline text-[var(--on-surface)] flex items-center gap-2">
                        <Warehouse className="w-5 h-5 text-blue-600" />
                        Surplus Inventory
                    </h1>
                    <p className="text-xs text-[var(--on-surface-variant)] mt-0.5">
                        All surplus items across all verified returns
                    </p>
                </div>

                {/* Search */}
                <div className="bg-white rounded-[4px] shadow p-3 flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--outline)]" />
                        <input
                            type="text"
                            placeholder="Search by NDC, product name, or location..."
                            className="w-full pl-8 pr-3 py-1.5 text-xs border border-[var(--outline-variant)] rounded-[4px] focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    {(search || statusFilter) && (
                        <button
                            onClick={() => { setSearch(''); setStatusFilter(''); }}
                            className="px-2.5 py-1.5 text-[10px] font-medium text-[var(--on-surface-variant)] border border-[var(--outline-variant)] rounded-[4px] hover:bg-[var(--surface-container-low)]"
                        >
                            Clear
                        </button>
                    )}
                </div>

                {/* Tabs */}
                <div className="flex gap-1 bg-[var(--surface-container)] rounded-[4px] p-1">
                    {([
                        { label: 'All', value: '' as StatusFilter },
                        { label: 'Stored', value: 'stored' as StatusFilter },
                        { label: 'Assigned to Return', value: 'assigned_to_return' as StatusFilter },
                        { label: 'Disposed', value: 'disposed' as StatusFilter },
                    ]).map(tab => (
                        <button
                            key={tab.label}
                            onClick={() => setStatusFilter(tab.value)}
                            className={`px-3 py-1.5 text-[11px] font-medium rounded-[4px] transition-all ${
                                statusFilter === tab.value
                                    ? 'bg-white text-primary-700 shadow-sm'
                                    : 'text-[var(--on-surface-variant)] hover:text-[var(--on-surface)]'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Table */}
                <div className="bg-white rounded-[4px] shadow overflow-hidden">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 className="h-5 w-5 animate-spin text-[var(--outline)]" />
                            <span className="ml-2 text-xs text-[var(--outline)]">Loading...</span>
                        </div>
                    ) : allSurplus.length === 0 ? (
                        <div className="text-center py-16">
                            <Package className="h-8 w-8 mx-auto text-[var(--outline-variant)] mb-2" />
                            <p className="text-xs text-[var(--outline)]">No surplus items found</p>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full border" style={{ borderColor: 'var(--outline)' }}>
                                    <thead className="bg-[var(--surface-container-low)] border-b" style={{ borderColor: 'var(--outline)', borderBottomWidth: '1.5px' }}>
                                        <tr className="bg-[var(--surface-container-low)]">
                                            <th className="text-left text-xs font-semibold uppercase tracking-wider text-[var(--on-surface-variant)] whitespace-nowrap px-3 py-3">Product</th>
                                            <th className="text-left text-xs font-semibold uppercase tracking-wider text-[var(--on-surface-variant)] whitespace-nowrap px-3 py-3">NDC</th>
                                            <th className="text-left text-xs font-semibold uppercase tracking-wider text-[var(--on-surface-variant)] whitespace-nowrap px-3 py-3">Lot</th>
                                            <th className="text-left text-xs font-semibold uppercase tracking-wider text-[var(--on-surface-variant)] whitespace-nowrap px-3 py-3">Qty</th>
                                            <th className="text-left text-xs font-semibold uppercase tracking-wider text-[var(--on-surface-variant)] whitespace-nowrap px-3 py-3">Location</th>
                                            <th className="text-left text-xs font-semibold uppercase tracking-wider text-[var(--on-surface-variant)] whitespace-nowrap px-3 py-3">Condition</th>
                                            <th className="text-left text-xs font-semibold uppercase tracking-wider text-[var(--on-surface-variant)] whitespace-nowrap px-3 py-3">Status</th>
                                            <th className="text-left text-xs font-semibold uppercase tracking-wider text-[var(--on-surface-variant)] whitespace-nowrap px-3 py-3">From Return</th>
                                            <th className="text-left text-xs font-semibold uppercase tracking-wider text-[var(--on-surface-variant)] whitespace-nowrap px-3 py-3">Added</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y" style={{ borderColor: 'var(--outline-variant)' }}>
                                        {allSurplus.map(item => (
                                            <tr key={item.id} className="hover:bg-[var(--surface-container)]" style={{ borderColor: 'var(--outline-variant)' }}>
                                                <td className="px-3 py-3 text-sm font-medium text-[var(--on-surface)]">{item.productName || '—'}</td>
                                                <td className="px-3 py-3 text-sm font-mono text-[var(--on-primary-container)]">{item.ndc || '—'}</td>
                                                <td className="px-3 py-3 text-sm text-[var(--on-primary-container)]">{item.lotNumber || '—'}</td>
                                                <td className="px-3 py-3 text-sm font-medium">{item.quantity}</td>
                                                <td className="px-3 py-3 text-sm text-[var(--on-primary-container)]">{item.warehouseLocation}</td>
                                                <td className="px-3 py-3">
                                                    <Badge className={`text-[10px] ${conditionBadge(item.condition)}`}>{item.condition}</Badge>
                                                </td>
                                                <td className="px-3 py-3">
                                                    <Badge className={`text-[10px] border ${statusBadge(item.status)}`}>{item.status?.replace(/_/g, ' ')}</Badge>
                                                </td>
                                                <td className="px-3 py-3">
                                                    <div className="text-sm text-[var(--on-surface)]">{item.licensePlate || '—'}</div>
                                                    {item.pharmacyName && <div className="text-[10px] text-[var(--outline)]">{item.pharmacyName}</div>}
                                                </td>
                                                <td className="px-3 py-3 text-sm text-[var(--on-surface-variant)]">{item.createdAt ? formatDate(item.createdAt) : '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {totalPages > 1 && (
                                <div className="flex items-center justify-between px-3 py-2 border-t bg-[var(--surface-container-low)] text-[10px] text-[var(--on-surface-variant)]">
                                    <span>Page {page} of {totalPages} ({allSurplusPagination?.total ?? 0} total)</span>
                                    <div className="flex gap-1">
                                        <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                                            className="p-1 rounded border border-[var(--outline-variant)] hover:bg-white disabled:opacity-40">
                                            <ChevronLeft className="w-3 h-3" />
                                        </button>
                                        <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                                            className="p-1 rounded border border-[var(--outline-variant)] hover:bg-white disabled:opacity-40">
                                            <ChevronRight className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </PermissionGate>
    );
}
