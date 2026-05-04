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
            default: return 'bg-gray-100 text-gray-600';
        }
    };

    const statusBadge = (status: string) => {
        switch (status) {
            case 'stored': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'assigned_to_return': return 'bg-purple-100 text-purple-700 border-purple-200';
            case 'disposed': return 'bg-gray-200 text-gray-600 border-gray-300';
            default: return 'bg-gray-100 text-gray-600 border-gray-200';
        }
    };

    return (
        <PermissionGate permission="warehouse">
            <ToastContainer toasts={toasts} onClose={removeToast} />
            <div className="space-y-3">
                {/* Header */}
                <div>
                    <Link href="/warehouse" className="inline-flex items-center gap-1 text-[11px] text-gray-400 hover:text-primary-600 mb-1.5 transition-colors">
                        <ChevronLeft className="w-3 h-3" /> Back to Warehouse
                    </Link>
                    <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <Warehouse className="w-5 h-5 text-blue-600" />
                        Surplus Inventory
                    </h1>
                    <p className="text-xs text-gray-500 mt-0.5">
                        All surplus items across all verified returns
                    </p>
                </div>

                {/* Search */}
                <div className="bg-white rounded-lg shadow p-3 flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by NDC, product name, or location..."
                            className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    {(search || statusFilter) && (
                        <button
                            onClick={() => { setSearch(''); setStatusFilter(''); }}
                            className="px-2.5 py-1.5 text-[10px] font-medium text-gray-500 border border-gray-200 rounded-md hover:bg-gray-50"
                        >
                            Clear
                        </button>
                    )}
                </div>

                {/* Tabs */}
                <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                    {([
                        { label: 'All', value: '' as StatusFilter },
                        { label: 'Stored', value: 'stored' as StatusFilter },
                        { label: 'Assigned to Return', value: 'assigned_to_return' as StatusFilter },
                        { label: 'Disposed', value: 'disposed' as StatusFilter },
                    ]).map(tab => (
                        <button
                            key={tab.label}
                            onClick={() => setStatusFilter(tab.value)}
                            className={`px-3 py-1.5 text-[11px] font-medium rounded-md transition-all ${
                                statusFilter === tab.value
                                    ? 'bg-white text-primary-700 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Table */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                            <span className="ml-2 text-xs text-gray-400">Loading...</span>
                        </div>
                    ) : allSurplus.length === 0 ? (
                        <div className="text-center py-16">
                            <Package className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                            <p className="text-xs text-gray-400">No surplus items found</p>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-gradient-to-r from-indigo-500 to-indigo-400">
                                            <th className="text-left text-xs font-semibold uppercase tracking-wider text-white whitespace-nowrap px-4 py-3.5">Product</th>
                                            <th className="text-left text-xs font-semibold uppercase tracking-wider text-white whitespace-nowrap px-4 py-3.5">NDC</th>
                                            <th className="text-left text-xs font-semibold uppercase tracking-wider text-white whitespace-nowrap px-4 py-3.5">Lot</th>
                                            <th className="text-left text-xs font-semibold uppercase tracking-wider text-white whitespace-nowrap px-4 py-3.5">Qty</th>
                                            <th className="text-left text-xs font-semibold uppercase tracking-wider text-white whitespace-nowrap px-4 py-3.5">Location</th>
                                            <th className="text-left text-xs font-semibold uppercase tracking-wider text-white whitespace-nowrap px-4 py-3.5">Condition</th>
                                            <th className="text-left text-xs font-semibold uppercase tracking-wider text-white whitespace-nowrap px-4 py-3.5">Status</th>
                                            <th className="text-left text-xs font-semibold uppercase tracking-wider text-white whitespace-nowrap px-4 py-3.5">From Return</th>
                                            <th className="text-left text-xs font-semibold uppercase tracking-wider text-white whitespace-nowrap px-4 py-3.5">Added</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {allSurplus.map(item => (
                                            <tr key={item.id} className="odd:bg-white even:bg-gray-50/40 hover:bg-gray-50">
                                                <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.productName || '—'}</td>
                                                <td className="px-4 py-3 text-sm font-mono text-gray-600">{item.ndc || '—'}</td>
                                                <td className="px-4 py-3 text-sm text-gray-600">{item.lotNumber || '—'}</td>
                                                <td className="px-4 py-3 text-sm font-medium">{item.quantity}</td>
                                                <td className="px-4 py-3 text-sm text-gray-600">{item.warehouseLocation}</td>
                                                <td className="px-4 py-3">
                                                    <Badge className={`text-[10px] ${conditionBadge(item.condition)}`}>{item.condition}</Badge>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Badge className={`text-[10px] border ${statusBadge(item.status)}`}>{item.status?.replace(/_/g, ' ')}</Badge>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="text-sm text-gray-700">{item.licensePlate || '—'}</div>
                                                    {item.pharmacyName && <div className="text-[10px] text-gray-400">{item.pharmacyName}</div>}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-500">{item.createdAt ? formatDate(item.createdAt) : '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {totalPages > 1 && (
                                <div className="flex items-center justify-between px-3 py-2 border-t bg-gray-50 text-[10px] text-gray-500">
                                    <span>Page {page} of {totalPages} ({allSurplusPagination?.total ?? 0} total)</span>
                                    <div className="flex gap-1">
                                        <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                                            className="p-1 rounded border border-gray-200 hover:bg-white disabled:opacity-40">
                                            <ChevronLeft className="w-3 h-3" />
                                        </button>
                                        <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                                            className="p-1 rounded border border-gray-200 hover:bg-white disabled:opacity-40">
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
