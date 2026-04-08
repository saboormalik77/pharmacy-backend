'use client';

import { PermissionGate } from '@/components/auth/PermissionGate';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    ClipboardCheck, Loader2, Search, Package, ArrowRight,
    ChevronLeft, ChevronRight,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { ToastContainer, Toast } from '@/components/ui/Toast';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { formatDate } from '@/lib/utils';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import { fetchReceivedReturns } from '@/lib/store/warehouseSlice';
import type { ReturnTransaction } from '@/lib/types';

type VerificationFilter = '' | 'not_started' | 'in_progress' | 'completed';

type UiVerificationPhase = 'not_started' | 'in_progress' | 'completed';

/** Matches DB logic in fcr_49 / fcr_48 when API omits verificationStatus (older _rt_to_json). */
function deriveWarehouseVerificationUiStatus(r: ReturnTransaction): UiVerificationPhase {
    const vs = r.verificationStatus;
    if (vs === 'completed' || vs === 'in_progress' || vs === 'not_started') return vs;
    if (r.verificationCompletedAt) return 'completed';
    const st = r.status;
    if (st === 'verified' || st === 'closed' || st === 'closed_out') return 'completed';
    if (st === 'received' && r.verifiedIntegrity === true) return 'completed';
    if (st === 'received' && r.verifiedAt) return 'in_progress';
    if (st === 'received') return 'not_started';
    return 'completed';
}

export default function WarehouseVerificationListPage() {
    const dispatch = useAppDispatch();
    const { receivedReturns, receivedPagination, isLoading } = useAppSelector(s => s.warehouse);

    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<VerificationFilter>('');
    const [page, setPage] = useState(1);
    const [toasts, setToasts] = useState<Toast[]>([]);
    const debouncedSearch = useDebounce(search, 400);

    const showToast = (msg: string, type: Toast['type'] = 'success') => {
        setToasts(prev => [...prev, { id: Date.now().toString(), message: msg, type }]);
    };
    const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

    useEffect(() => {
        dispatch(fetchReceivedReturns({
            search: debouncedSearch || undefined,
            verificationStatus: filter || undefined,
            page,
            limit: 20,
        }));
    }, [debouncedSearch, filter, page, dispatch]);

    useEffect(() => { setPage(1); }, [debouncedSearch, filter]);

    const totalPages = receivedPagination?.totalPages ?? 1;

    const getStatusBadge = (status: string | null | undefined) => {
        switch (status) {
            case 'in_progress':
                return <Badge className="bg-amber-100 text-amber-700 border border-amber-200 text-[10px]">In Progress</Badge>;
            case 'completed':
                return <Badge className="bg-green-100 text-green-700 border border-green-200 text-[10px]">Completed</Badge>;
            default:
                return <Badge className="bg-gray-100 text-gray-500 border border-gray-200 text-[10px]">Not Started</Badge>;
        }
    };

    const getActionLabel = (status: string | null | undefined) => {
        if (status === 'in_progress') return 'Continue';
        if (status === 'completed') return 'View';
        return 'Start';
    };

    return (
        <PermissionGate permission="warehouse">
            <ToastContainer toasts={toasts} onClose={removeToast} />
            <div className="space-y-3">
                {/* Header */}
                <div>
                    <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <ClipboardCheck className="w-5 h-5 text-primary-600" />
                        Warehouse Verification
                    </h1>
                    <p className="text-xs text-gray-500 mt-0.5">
                        Pick a return to open the session: first enter the physical box count, then verify each line item.
                        Receiving → Verify also opens this flow.
                    </p>
                </div>

                {/* Search */}
                <div className="bg-white rounded-lg shadow p-3 flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by license plate or pharmacy name..."
                            className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    {(search || filter) && (
                        <button
                            onClick={() => { setSearch(''); setFilter(''); }}
                            className="px-2.5 py-1.5 text-[10px] font-medium text-gray-500 border border-gray-200 rounded-md hover:bg-gray-50"
                        >
                            Clear
                        </button>
                    )}
                </div>

                {/* Tabs */}
                <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                    {([
                        { label: 'All', value: '' as VerificationFilter },
                        { label: 'Not Started', value: 'not_started' as VerificationFilter },
                        { label: 'In Progress', value: 'in_progress' as VerificationFilter },
                        { label: 'Completed', value: 'completed' as VerificationFilter },
                    ]).map(tab => (
                        <button
                            key={tab.label}
                            onClick={() => setFilter(tab.value)}
                            className={`px-3 py-1.5 text-[11px] font-medium rounded-md transition-all ${
                                filter === tab.value
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
                    ) : receivedReturns.length === 0 ? (
                        <div className="text-center py-16">
                            <Package className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                            <p className="text-xs text-gray-400">No received returns found</p>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-gray-200">
                                            <th className="text-left text-[10px] font-semibold text-gray-500 uppercase px-3 py-1.5">License Plate</th>
                                            <th className="text-left text-[10px] font-semibold text-gray-500 uppercase px-3 py-1.5">Pharmacy</th>
                                            <th className="text-left text-[10px] font-semibold text-gray-500 uppercase px-3 py-1.5">Items</th>
                                            <th className="text-left text-[10px] font-semibold text-gray-500 uppercase px-3 py-1.5">Received</th>
                                            <th className="text-left text-[10px] font-semibold text-gray-500 uppercase px-3 py-1.5">Verification</th>
                                            <th className="text-left text-[10px] font-semibold text-gray-500 uppercase px-3 py-1.5">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {receivedReturns.map(r => {
                                            const phase = deriveWarehouseVerificationUiStatus(r);
                                            return (
                                            <tr key={r.id} className="hover:bg-gray-50">
                                                <td className="px-3 py-2 text-xs font-semibold text-primary-700">{r.licensePlate}</td>
                                                <td className="px-3 py-2 text-xs text-gray-700">{r.pharmacyName || '—'}</td>
                                                <td className="px-3 py-2">
                                                    <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-50 text-purple-700">
                                                        {r.totalItems ?? '—'}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2 text-[11px] text-gray-500">
                                                    {formatDate(r.receivedInWarehouseDate || r.createdAt)}
                                                </td>
                                                <td className="px-3 py-2">
                                                    {getStatusBadge(phase)}
                                                </td>
                                                <td className="px-3 py-2">
                                                    <Link href={`/warehouse/verification/${r.id}`}>
                                                        <button className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md transition">
                                                            {getActionLabel(phase)}
                                                            <ArrowRight className="w-3 h-3" />
                                                        </button>
                                                    </Link>
                                                </td>
                                            </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {totalPages > 1 && (
                                <div className="flex items-center justify-between px-3 py-2 border-t bg-gray-50 text-[10px] text-gray-500">
                                    <span>Page {page} of {totalPages} ({receivedPagination?.total ?? 0} total)</span>
                                    <div className="flex gap-1">
                                        <button
                                            disabled={page <= 1}
                                            onClick={() => setPage(p => p - 1)}
                                            className="p-1 rounded border border-gray-200 hover:bg-white disabled:opacity-40"
                                        >
                                            <ChevronLeft className="w-3 h-3" />
                                        </button>
                                        <button
                                            disabled={page >= totalPages}
                                            onClick={() => setPage(p => p + 1)}
                                            className="p-1 rounded border border-gray-200 hover:bg-white disabled:opacity-40"
                                        >
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
