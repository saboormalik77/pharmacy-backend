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
                return (
                    <Badge
                        className="border text-[10px]"
                        style={{
                            backgroundColor: 'var(--tertiary-fixed)',
                            color: 'var(--on-tertiary-container)',
                            borderColor: 'var(--outline-variant)',
                        }}
                    >
                        In Progress
                    </Badge>
                );
            case 'completed':
                return (
                    <Badge
                        className="border text-[10px]"
                        style={{
                            backgroundColor: 'var(--secondary-container)',
                            color: 'var(--on-secondary-container)',
                            borderColor: 'var(--outline-variant)',
                        }}
                    >
                        Completed
                    </Badge>
                );
            default:
                return (
                    <Badge
                        className="border text-[10px]"
                        style={{
                            backgroundColor: 'var(--surface-container-low)',
                            color: 'var(--on-surface-variant)',
                            borderColor: 'var(--outline-variant)',
                        }}
                    >
                        Not Started
                    </Badge>
                );
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
                    <Link href="/warehouse" className="inline-flex items-center gap-1 text-[11px] text-[var(--outline)] hover:text-primary-600 mb-1.5 transition-colors">
                        <ChevronLeft className="w-3 h-3" /> Back to Warehouse
                    </Link>
                    <h1 className="font-heading text-headline flex items-center gap-2" style={{ color: 'var(--foreground)' }}>
                        <ClipboardCheck className="w-5 h-5 text-primary-600" />
                        Warehouse Verification
                    </h1>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--on-surface-variant)' }}>
                        Pick a return to open the session: first enter the physical box count, then verify each line item.
                        Receiving → Verify also opens this flow.
                    </p>
                </div>

                {/* Search */}
                <div className="rounded-[4px] shadow p-3 flex gap-2 border" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}>
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2" style={{ color: 'var(--outline)' }} />
                        <input
                            type="text"
                            placeholder="Search by license plate or pharmacy name..."
                            className="w-full pl-8 pr-3 py-1.5 text-xs border rounded-[4px] focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                            style={{ backgroundColor: 'var(--surface-container-low)', borderColor: 'var(--outline-variant)', color: 'var(--on-surface)' }}
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    {(search || filter) && (
                        <button
                            onClick={() => { setSearch(''); setFilter(''); }}
                            className="px-2.5 py-1.5 text-[10px] font-medium border rounded-[4px] transition-colors hover:bg-primary-50/40"
                            style={{ color: 'var(--on-surface-variant)', borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-lowest)' }}
                        >
                            Clear
                        </button>
                    )}
                </div>

                {/* Tabs */}
                <div className="flex gap-1 rounded-[4px] p-1 border" style={{ backgroundColor: 'var(--surface-container-low)', borderColor: 'var(--outline-variant)' }}>
                    {([
                        { label: 'All', value: '' as VerificationFilter },
                        { label: 'Not Started', value: 'not_started' as VerificationFilter },
                        { label: 'In Progress', value: 'in_progress' as VerificationFilter },
                        { label: 'Completed', value: 'completed' as VerificationFilter },
                    ]).map(tab => (
                        <button
                            key={tab.label}
                            onClick={() => setFilter(tab.value)}
                            className={`px-3 py-1.5 text-[11px] font-medium rounded-[4px] transition-all ${filter === tab.value ? 'shadow-sm' : ''}`}
                            style={filter === tab.value ? { backgroundColor: 'var(--surface-container-lowest)', color: 'var(--primary)' } : { color: 'var(--on-surface-variant)' }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Table */}
                <div className="rounded-[4px] shadow overflow-hidden border" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}>
                    {isLoading ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'var(--primary)' }} />
                            <span className="ml-2 text-xs" style={{ color: 'var(--on-surface-variant)' }}>Loading...</span>
                        </div>
                    ) : receivedReturns.length === 0 ? (
                        <div className="text-center py-16">
                            <Package className="h-8 w-8 mx-auto mb-2" style={{ color: 'var(--outline-variant)' }} />
                            <p className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>No received returns found</p>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full border" style={{ borderColor: 'var(--outline)' }}>
                                    <thead className="bg-[var(--surface-container-low)] border-b" style={{ borderColor: 'var(--outline)', borderBottomWidth: '1.5px' }}>
                                        <tr className="bg-[var(--surface-container-low)]">
                                            <th className="text-left text-xs font-semibold uppercase tracking-wider text-[var(--on-surface-variant)] whitespace-nowrap px-3 py-3">License Plate</th>
                                            <th className="text-left text-xs font-semibold uppercase tracking-wider text-[var(--on-surface-variant)] whitespace-nowrap px-3 py-3">Pharmacy</th>
                                            <th className="text-left text-xs font-semibold uppercase tracking-wider text-[var(--on-surface-variant)] whitespace-nowrap px-3 py-3">Items</th>
                                            <th className="text-left text-xs font-semibold uppercase tracking-wider text-[var(--on-surface-variant)] whitespace-nowrap px-3 py-3">Received</th>
                                            <th className="text-left text-xs font-semibold uppercase tracking-wider text-[var(--on-surface-variant)] whitespace-nowrap px-3 py-3">Verification</th>
                                            <th className="text-left text-xs font-semibold uppercase tracking-wider text-[var(--on-surface-variant)] whitespace-nowrap px-3 py-3">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y" style={{ borderColor: 'var(--outline-variant)' }}>
                                        {receivedReturns.map(r => {
                                            const phase = deriveWarehouseVerificationUiStatus(r);
                                            return (
                                            <tr key={r.id} className="hover:bg-[var(--surface-container)]" style={{ borderColor: 'var(--outline-variant)' }}>
                                                <td className="px-3 py-3 text-sm font-semibold" style={{ color: 'var(--primary)' }}>{r.licensePlate}</td>
                                                <td className="px-3 py-3 text-sm" style={{ color: 'var(--on-surface)' }}>{r.pharmacyName || '—'}</td>
                                                <td className="px-3 py-3">
                                                    <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ backgroundColor: 'var(--tertiary-fixed)', color: 'var(--on-tertiary-container)' }}>
                                                        {r.totalItems ?? '—'}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-3 text-sm" style={{ color: 'var(--on-surface-variant)' }}>
                                                    {formatDate(r.receivedInWarehouseDate || r.createdAt)}
                                                </td>
                                                <td className="px-3 py-3">
                                                    {getStatusBadge(phase)}
                                                </td>
                                                <td className="px-3 py-3">
                                                    <Link href={`/warehouse/verification/${r.id}`}>
                                                        <button className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-[4px] transition">
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
                                <div className="flex items-center justify-between px-3 py-2 border-t text-[10px]" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)', color: 'var(--on-surface-variant)' }}>
                                    <span>Page {page} of {totalPages} ({receivedPagination?.total ?? 0} total)</span>
                                    <div className="flex gap-1">
                                        <button
                                            disabled={page <= 1}
                                            onClick={() => setPage(p => p - 1)}
                                            className="p-1 rounded border disabled:opacity-40 hover:bg-primary-50 transition-colors"
                                            style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-lowest)' }}
                                        >
                                            <ChevronLeft className="w-3 h-3" style={{ color: 'var(--on-surface-variant)' }} />
                                        </button>
                                        <button
                                            disabled={page >= totalPages}
                                            onClick={() => setPage(p => p + 1)}
                                            className="p-1 rounded border disabled:opacity-40 hover:bg-primary-50 transition-colors"
                                            style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-lowest)' }}
                                        >
                                            <ChevronRight className="w-3 h-3" style={{ color: 'var(--on-surface-variant)' }} />
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
