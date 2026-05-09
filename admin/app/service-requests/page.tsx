'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    Truck, Loader2, Search, CheckCircle2, Clock, CalendarClock, XCircle, AlertCircle,
    ChevronLeft, ChevronRight, X, Calendar, User, Mail, Phone, MapPin, FileText,
    RotateCcw, Play, CheckSquare, Ban,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import { Badge } from '@/components/ui/Badge';
import { ToastContainer, Toast } from '@/components/ui/Toast';
import {
    fetchServiceRequests,
    processorScheduleServiceRequest,
    processorCompleteServiceRequest,
    processorCancelServiceRequest,
    processorReleaseServiceRequest,
    adminReassignServiceRequest,
    setPage,
    setStatusFilter,
    setSearch,
    ServiceRequest,
    ServiceRequestStatus,
    PURPOSE_LABELS,
} from '@/lib/store/serviceRequestsSlice';
import { formatDate } from '@/lib/utils';
import { useDebounce } from '@/lib/hooks/useDebounce';

const STATUS_FILTERS: Array<{ value: string; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
];

function getStatusBadge(status: ServiceRequestStatus) {
    switch (status) {
        case 'pending':
            return <Badge variant="secondary" className="bg-amber-100 text-amber-800 text-[11px]"><Clock className="w-3 h-3 mr-1 inline" />Pending</Badge>;
        case 'scheduled':
            return <Badge className="bg-blue-100 text-blue-800 text-[11px]"><CalendarClock className="w-3 h-3 mr-1 inline" />Scheduled</Badge>;
        case 'completed':
            return <Badge className="bg-green-100 text-green-800 text-[11px]"><CheckCircle2 className="w-3 h-3 mr-1 inline" />Completed</Badge>;
        case 'cancelled':
            return <Badge variant="danger" className="text-[11px]"><XCircle className="w-3 h-3 mr-1 inline" />Cancelled</Badge>;
        default:
            return <Badge variant="secondary" className="text-[11px]">{status}</Badge>;
    }
}

export default function ServiceRequestsPage() {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const { user } = useAppSelector((s) => s.auth);
    const { items, total, page, limit, statusFilter, isLoading, isActing, error } =
        useAppSelector((s) => s.serviceRequests);

    const isProcessor = user?.role === 'processor';
    const role = isProcessor ? 'processor' : 'admin';

    const [searchInput, setSearchInput] = useState('');
    const debouncedSearch = useDebounce(searchInput, 400);

    const [toasts, setToasts] = useState<Toast[]>([]);
    const pushToast = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
        const id = Math.random().toString(36).slice(2);
        setToasts((t) => [...t, { id, message: msg, type }]);
    };
    const removeToast = (id: string) => setToasts((t) => t.filter((x) => x.id !== id));

    const [active, setActive] = useState<ServiceRequest | null>(null);
    const [completeModal, setCompleteModal] = useState<ServiceRequest | null>(null);

    const reload = useCallback(() => {
        dispatch(fetchServiceRequests({
            role,
            page,
            limit,
            status: statusFilter,
            search: role === 'admin' ? debouncedSearch : undefined,
        }));
    }, [dispatch, role, page, limit, statusFilter, debouncedSearch]);

    useEffect(() => { reload(); }, [reload]);

    useEffect(() => {
        if (error) pushToast(error, 'error');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [error]);

    useEffect(() => {
        if (role === 'admin') dispatch(setSearch(debouncedSearch));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedSearch]);

    const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);


    const handleComplete = async (req: ServiceRequest, notes: string) => {
        try {
            await dispatch(processorCompleteServiceRequest({ id: req.id, notes })).unwrap();
            pushToast('Request completed', 'success');
            setCompleteModal(null);
            setActive(null);
            reload();
        } catch (e: any) {
            pushToast(e || 'Failed to complete', 'error');
        }
    };

    const handleCancel = async (req: ServiceRequest) => {
        const reason = window.prompt('Reason for cancelling? (optional)') ?? '';
        try {
            await dispatch(processorCancelServiceRequest({ id: req.id, reason })).unwrap();
            pushToast('Request cancelled', 'success');
            setActive(null);
            reload();
        } catch (e: any) {
            pushToast(e || 'Failed to cancel', 'error');
        }
    };

    const handleRelease = async (req: ServiceRequest) => {
        if (!window.confirm('Release this request back to the pending pool so another processor can claim it?')) return;
        try {
            await dispatch(processorReleaseServiceRequest(req.id)).unwrap();
            pushToast('Released back to pool', 'success');
            setActive(null);
            reload();
        } catch (e: any) {
            pushToast(e || 'Failed to release', 'error');
        }
    };

    const handleAdminReassign = async (req: ServiceRequest) => {
        const ids = window.prompt(
            'Enter a comma-separated list of processor IDs to reassign (clears current claim):',
            (req.assigned_processors || []).map((p) => p.processor_id).join(',')
        );
        if (ids === null) return;
        const processorIds = ids.split(',').map((s) => s.trim()).filter(Boolean);
        try {
            await dispatch(adminReassignServiceRequest({ id: req.id, processorIds })).unwrap();
            pushToast('Reassigned', 'success');
            setActive(null);
            reload();
        } catch (e: any) {
            pushToast(e || 'Failed to reassign', 'error');
        }
    };

    return (
        <div className="p-4 sm:p-6 space-y-4">
            <ToastContainer toasts={toasts} onClose={removeToast} />

            {/* Header */}
            <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <Truck className="w-5 h-5 text-[#1d2222]" />
                        Service Requests
                    </h1>
                    <p className="text-xs text-gray-500 mt-0.5">
                        {isProcessor
                            ? 'On-site visit requests assigned to you. Once you schedule a request, it disappears from other reps\' queues.'
                            : 'Oversight for all on-site service requests across your pharmacies.'}
                    </p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-[4px] shadow px-4 py-3 flex flex-wrap gap-3 items-center">
                <div className="flex gap-1 flex-wrap">
                    {STATUS_FILTERS.map((s) => (
                        <button
                            key={s.value}
                            onClick={() => dispatch(setStatusFilter(s.value))}
                            className={`px-3 py-1 text-xs rounded border transition-colors ${
                                statusFilter === s.value
                                    ? 'bg-[#1d2222] text-white border-[#1d2222]'
                                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            {s.label}
                        </button>
                    ))}
                </div>
                {!isProcessor && (
                    <div className="relative ml-auto">
                        <Search className="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            placeholder="Search pharmacies..."
                            className="pl-8 pr-3 py-1.5 text-xs rounded border border-gray-200 w-56 focus:outline-none focus:ring-2 focus:ring-slate-500"
                        />
                    </div>
                )}
                <div className="text-[11px] text-gray-500 ml-auto sm:ml-0">
                    {isLoading ? 'Loading...' : `${total} request${total === 1 ? '' : 's'}`}
                </div>
            </div>

            {/* List */}
            <div className="bg-white rounded-[4px] shadow overflow-hidden">
                {isLoading ? (
                    <div className="py-16 flex justify-center text-gray-400">
                        <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                ) : items.length === 0 ? (
                    <div className="py-16 text-center text-sm text-gray-500">
                        {isProcessor ? 'No service requests in your queue.' : 'No service requests found.'}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm border" style={{ borderColor: '#9ca3af' }}>
                            <thead className="bg-[#f4f5f5] border-b" style={{ borderColor: '#9ca3af', borderBottomWidth: '1.5px' }}>
                                <tr className="bg-[#f4f5f5]">
                                    <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-gray-600">Pharmacy</th>
                                    <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-gray-600">Requested</th>
                                    <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-gray-600">Scheduled</th>
                                    <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-gray-600">Status</th>
                                    {!isProcessor && <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-gray-600">Rep</th>}
                                    <th className="text-right px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-gray-600">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y" style={{ borderColor: '#d1d5db' }}>
                                {items.map((r) => (
                                    <tr
                                        key={r.id}
                                        className="hover:bg-[#e9ebec] transition-colors cursor-pointer"
                                        style={{ borderColor: '#d1d5db' }}
                                        onClick={() => setActive(r)}
                                    >
                                        <td className="px-3 py-3">
                                            <div className="text-sm text-gray-900 font-medium">
                                                {r.pharmacy_business_name || r.pharmacy_name || '—'}
                                            </div>
                                            {(r.branch_business_name || r.branch_name) && (
                                                <div className="text-[11px] text-gray-500">
                                                    Branch: {r.branch_business_name || r.branch_name}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-3 py-3 text-sm text-gray-600">{formatDate(r.requested_date)}</td>
                                        <td className="px-3 py-3 text-sm text-gray-600">
                                            {r.scheduled_date ? formatDate(r.scheduled_date) : <span className="text-gray-400">—</span>}
                                        </td>
                                        <td className="px-3 py-3">{getStatusBadge(r.status)}</td>
                                        {!isProcessor && (
                                            <td className="px-3 py-3 text-sm text-gray-600">
                                                {r.claimed_processor_name || <span className="text-gray-400">Unclaimed</span>}
                                            </td>
                                        )}
                                        <td className="px-3 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                                            <ActionButtons
                                                r={r}
                                                isProcessor={isProcessor}
                                                router={router}
                                                onComplete={() => setCompleteModal(r)}
                                                onCancel={() => handleCancel(r)}
                                                onRelease={() => handleRelease(r)}
                                                onReassign={() => handleAdminReassign(r)}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {!isLoading && totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50 text-xs">
                        <div className="text-gray-500">Page {page} of {totalPages}</div>
                        <div className="flex gap-1">
                            <button
                                onClick={() => dispatch(setPage(Math.max(1, page - 1)))}
                                disabled={page === 1}
                                className="p-1.5 rounded border border-gray-200 disabled:opacity-40 hover:bg-white"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => dispatch(setPage(Math.min(totalPages, page + 1)))}
                                disabled={page >= totalPages}
                                className="p-1.5 rounded border border-gray-200 disabled:opacity-40 hover:bg-white"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Detail modal */}
            {active && (
                <DetailModal
                    r={active}
                    isProcessor={isProcessor}
                    isActing={isActing}
                    onClose={() => setActive(null)}
                    router={router}
                    onComplete={() => setCompleteModal(active)}
                    onCancel={() => handleCancel(active)}
                    onRelease={() => handleRelease(active)}
                    onReassign={() => handleAdminReassign(active)}
                />
            )}


            {/* Complete modal */}
            {completeModal && (
                <CompleteModal
                    request={completeModal}
                    isActing={isActing}
                    onClose={() => setCompleteModal(null)}
                    onSubmit={(notes) => handleComplete(completeModal, notes)}
                />
            )}
        </div>
    );
}

// =====================================================================
// Inline action buttons (row-level)
// =====================================================================

function ActionButtons({
    r, isProcessor, router, onComplete, onCancel, onRelease, onReassign,
}: {
    r: ServiceRequest;
    isProcessor: boolean;
    router: ReturnType<typeof useRouter>;
    onComplete: () => void;
    onCancel: () => void;
    onRelease: () => void;
    onReassign: () => void;
}) {
    if (isProcessor) {
        if (r.status === 'pending') {
            return (
                <button onClick={() => router.push(`/service-requests/${r.id}/schedule`)} className="p-1.5 text-gray-400 hover:text-[#516057] hover:bg-[#516057]/10 rounded transition-colors" title="Claim and Schedule">
                    <Play className="w-3.5 h-3.5" />
                </button>
            );
        }
        if (r.status === 'scheduled' && r.is_claimed_by_me) {
            return (
                <div className="flex justify-end gap-1">
                    <button onClick={() => router.push(`/service-requests/${r.id}/schedule`)} className="p-1.5 text-gray-400 hover:text-[#516057] hover:bg-[#516057]/10 rounded transition-colors" title="Reschedule">
                        <Calendar className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={onComplete} className="p-1.5 text-gray-400 hover:text-[#516057] hover:bg-[#516057]/10 rounded transition-colors" title="Mark as Complete">
                        <CheckSquare className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={onRelease} className="p-1.5 text-gray-400 hover:text-[#516057] hover:bg-[#516057]/10 rounded transition-colors" title="Release back to queue">
                        <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                </div>
            );
        }
        return null;
    }
    // Admin
    if (r.status === 'pending' || r.status === 'scheduled') {
        return (
            <button onClick={onReassign} className="p-1.5 text-gray-400 hover:text-[#516057] hover:bg-[#516057]/10 rounded transition-colors" title="Reassign Processor">
                <User className="w-3.5 h-3.5" />
            </button>
        );
    }
    return null;
}

// =====================================================================
// Detail modal
// =====================================================================

function DetailModal({
    r, isProcessor, isActing, onClose, router,
    onComplete, onCancel, onRelease, onReassign,
}: {
    r: ServiceRequest;
    isProcessor: boolean;
    isActing: boolean;
    onClose: () => void;
    router: ReturnType<typeof useRouter>;
    onComplete: () => void;
    onCancel: () => void;
    onRelease: () => void;
    onReassign: () => void;
}) {
    return (
        <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-[4px] max-w-lg w-full shadow-xl max-h-[88vh] overflow-y-auto">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
                    <div>
                        <h2 className="text-sm font-semibold text-gray-900">Service Request</h2>
                        <div className="text-[11px] text-gray-500 mt-0.5">
                            {r.id.slice(0, 8)}… · Created {formatDate(r.created_at)}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {getStatusBadge(r.status)}
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="px-4 py-3 space-y-3 text-xs">
                    <Section title="Pharmacy">
                        <Row label="Name" icon={<User className="w-3.5 h-3.5" />}>
                            {r.pharmacy_business_name || r.pharmacy_name || '—'}
                        </Row>
                        {r.pharmacy_email && (
                            <Row label="Email" icon={<Mail className="w-3.5 h-3.5" />}>
                                <a href={`mailto:${r.pharmacy_email}`} className="text-[#1d2222] hover:underline">
                                    {r.pharmacy_email}
                                </a>
                            </Row>
                        )}
                        {r.pharmacy_phone && (
                            <Row label="Phone" icon={<Phone className="w-3.5 h-3.5" />}>
                                <a href={`tel:${r.pharmacy_phone}`} className="text-[#1d2222] hover:underline">
                                    {r.pharmacy_phone}
                                </a>
                            </Row>
                        )}
                        {r.pharmacy_address && (
                            <Row label="Address" icon={<MapPin className="w-3.5 h-3.5" />}>
                                {r.pharmacy_address}
                            </Row>
                        )}
                        {(r.branch_business_name || r.branch_name) && (
                            <Row label="Branch" icon={<MapPin className="w-3.5 h-3.5" />}>
                                {r.branch_business_name || r.branch_name}
                                {r.branch_address ? <div className="text-gray-500 mt-0.5">{r.branch_address}</div> : null}
                            </Row>
                        )}
                    </Section>

                    <Section title="Request">
                        <Row label="Preferred Date" icon={<Calendar className="w-3.5 h-3.5" />}>
                            {formatDate(r.requested_date)}
                        </Row>
                        {r.scheduled_date && (
                            <Row label="Scheduled Date" icon={<CalendarClock className="w-3.5 h-3.5" />}>
                                <strong>{formatDate(r.scheduled_date)}</strong>
                            </Row>
                        )}
                        {r.special_instructions && (
                            <Row label="Instructions" icon={<FileText className="w-3.5 h-3.5" />}>
                                <div className="whitespace-pre-wrap">{r.special_instructions}</div>
                            </Row>
                        )}
                    </Section>

                    {r.claimed_processor_name && (
                        <Section title="Claimed By">
                            <Row label="Rep" icon={<User className="w-3.5 h-3.5" />}>
                                {r.claimed_processor_name}
                            </Row>
                            {r.claimed_processor_email && (
                                <Row label="Email" icon={<Mail className="w-3.5 h-3.5" />}>
                                    {r.claimed_processor_email}
                                </Row>
                            )}
                        </Section>
                    )}

                    {!!(r.assigned_processors && r.assigned_processors.length) && (
                        <Section title={`Eligible Processors (${r.assigned_processors.length})`}>
                            <div className="flex flex-wrap gap-2">
                                {r.assigned_processors.map((p) => (
                                    <span key={p.processor_id}
                                          className="text-[11px] bg-gray-100 text-gray-700 rounded px-2 py-1">
                                        {p.name || p.email || p.processor_id.slice(0, 6)}
                                    </span>
                                ))}
                            </div>
                        </Section>
                    )}

                    {r.scheduler_notes && r.status === 'scheduled' && (
                        <Section title="Rep Notes">
                            <div className="p-2 rounded border-l-2 border-blue-400 bg-blue-50 whitespace-pre-wrap">
                                {r.scheduler_notes}
                            </div>
                        </Section>
                    )}

                    {r.completion_notes && (
                        <Section title="Completion Notes">
                            <div className="p-2 rounded border-l-2 border-green-400 bg-green-50 whitespace-pre-wrap">
                                {r.completion_notes}
                            </div>
                            {r.completed_at && (
                                <div className="text-[11px] text-gray-500 mt-1">
                                    Completed {formatDate(r.completed_at)}
                                </div>
                            )}
                        </Section>
                    )}

                    {r.cancelled_at && (
                        <Section title="Cancellation">
                            <Row label="Cancelled By">{r.cancelled_by || '—'}</Row>
                            <Row label="When">{formatDate(r.cancelled_at)}</Row>
                            {r.cancelled_reason && (
                                <Row label="Reason">{r.cancelled_reason}</Row>
                            )}
                        </Section>
                    )}
                </div>

                <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200 bg-gray-50">
                    {isProcessor ? (
                        <>
                            {r.status === 'pending' && (
                                <button onClick={() => router.push(`/service-requests/${r.id}/schedule`)} disabled={isActing}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-[#1d2222] text-white hover:bg-[#3d4343] disabled:opacity-50 transition-colors">
                                    <Play className="w-3.5 h-3.5" /> Claim & Schedule
                                </button>
                            )}
                            {r.status === 'scheduled' && r.is_claimed_by_me && (
                                <>
                                    <button onClick={onRelease} disabled={isActing}
                                            className="px-3 py-1.5 text-xs rounded border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">
                                        <RotateCcw className="w-3.5 h-3.5 mr-1 inline" /> Release
                                    </button>
                                    <button onClick={() => router.push(`/service-requests/${r.id}/schedule`)} disabled={isActing}
                                            className="px-3 py-1.5 text-xs rounded border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">
                                        <Calendar className="w-3.5 h-3.5 mr-1 inline" /> Reschedule
                                    </button>
                                    <button onClick={onComplete} disabled={isActing}
                                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-[#1d2222] text-white hover:bg-[#3d4343] disabled:opacity-50 transition-colors">
                                        <CheckSquare className="w-3.5 h-3.5" /> Complete
                                    </button>
                                </>
                            )}
                            {!['completed', 'cancelled'].includes(r.status) && (r.is_claimed_by_me || r.status === 'pending') && (
                                <button onClick={onCancel} disabled={isActing}
                                        className="px-3 py-1.5 text-xs rounded border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">
                                    <Ban className="w-3.5 h-3.5 mr-1 inline" /> Cancel
                                </button>
                            )}
                        </>
                    ) : (
                        !['completed', 'cancelled'].includes(r.status) && (
                            <button onClick={onReassign} disabled={isActing}
                                    className="px-3 py-1.5 text-xs rounded border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">
                                <User className="w-3.5 h-3.5 mr-1 inline" /> Reassign
                            </button>
                        )
                    )}
                    <button onClick={onClose} className="px-3 py-1.5 text-xs rounded border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">Close</button>
                </div>
            </div>
        </div>
    );
}

// =====================================================================
// Schedule modal
// =====================================================================


// =====================================================================
// Complete modal
// =====================================================================

function CompleteModal({ request, isActing, onClose, onSubmit }: {
    request: ServiceRequest;
    isActing: boolean;
    onClose: () => void;
    onSubmit: (notes: string) => void;
}) {
    const [notes, setNotes] = useState<string>('');

    return (
        <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-[4px] max-w-lg w-full shadow-xl max-h-[88vh] overflow-y-auto">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
                    <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                        <CheckSquare className="w-4 h-4 text-green-600" />
                        Complete Visit
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <form
                    onSubmit={(e) => { e.preventDefault(); onSubmit(notes); }}
                    className="px-4 py-3 space-y-3 text-xs"
                >
                    <div className="text-[11px] text-gray-600">
                        Marking this on-site visit complete for{' '}
                        <strong>{request.pharmacy_business_name || request.pharmacy_name || 'this pharmacy'}</strong>.
                    </div>
                    <div>
                        <label className="block text-gray-600 mb-1">Completion notes (optional)</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={4}
                            maxLength={1000}
                            className="w-full rounded border border-gray-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-slate-500"
                            placeholder="What was accomplished, follow-ups needed, etc."
                        />
                    </div>
                    <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200 bg-gray-50 -mx-4 -mb-3">
                        <button type="button" onClick={onClose} disabled={isActing}
                                className="px-3 py-1.5 text-xs rounded border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">
                            Cancel
                        </button>
                        <button type="submit" disabled={isActing}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-[#1d2222] text-white hover:bg-[#3d4343] disabled:opacity-50 transition-colors">
                            {isActing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Mark Complete'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// =====================================================================
// Layout helpers
// =====================================================================

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div>
            <h3 className="text-[10px] uppercase font-semibold text-gray-500 mb-1.5 tracking-wider">{title}</h3>
            <div className="space-y-1">{children}</div>
        </div>
    );
}

function Row({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
    return (
        <div className="flex items-start gap-2">
            <div className="flex items-center gap-1 w-28 flex-shrink-0 text-gray-500">
                {icon}
                <span className="text-[11px]">{label}</span>
            </div>
            <div className="flex-1 min-w-0 text-gray-900">{children}</div>
        </div>
    );
}
