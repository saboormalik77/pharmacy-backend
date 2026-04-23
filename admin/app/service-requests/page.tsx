'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Truck, Loader2, Search, CheckCircle2, Clock, CalendarClock, XCircle, AlertCircle,
    ChevronLeft, ChevronRight, X, Calendar, User, Mail, Phone, MapPin, FileText,
    RotateCcw, Play, CheckSquare, Ban,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import { Button } from '@/components/ui/Button';
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
    const [scheduleModal, setScheduleModal] = useState<ServiceRequest | null>(null);
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

    const handleSchedule = async (req: ServiceRequest, scheduledDate: string, notes: string) => {
        try {
            await dispatch(processorScheduleServiceRequest({ id: req.id, scheduledDate, notes })).unwrap();
            pushToast('Request scheduled', 'success');
            setScheduleModal(null);
            setActive(null);
            reload();
        } catch (e: any) {
            pushToast(e || 'Failed to schedule', 'error');
        }
    };

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
                        <Truck className="w-5 h-5 text-teal-600" />
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
            <div className="bg-white rounded-lg shadow px-4 py-3 flex flex-wrap gap-3 items-center">
                <div className="flex gap-1 flex-wrap">
                    {STATUS_FILTERS.map((s) => (
                        <button
                            key={s.value}
                            onClick={() => dispatch(setStatusFilter(s.value))}
                            className={`px-3 py-1 text-xs rounded border transition-colors ${
                                statusFilter === s.value
                                    ? 'bg-teal-600 text-white border-teal-600'
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
                            className="pl-8 pr-3 py-1.5 text-xs rounded border border-gray-200 w-56 focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                    </div>
                )}
                <div className="text-[11px] text-gray-500 ml-auto sm:ml-0">
                    {isLoading ? 'Loading...' : `${total} request${total === 1 ? '' : 's'}`}
                </div>
            </div>

            {/* List */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
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
                        <table className="w-full text-xs">
                            <thead className="bg-gray-50 text-gray-600">
                                <tr>
                                    <th className="py-2 px-3 text-left font-medium">Pharmacy</th>
                                    <th className="py-2 px-3 text-left font-medium">Purpose</th>
                                    <th className="py-2 px-3 text-left font-medium">Requested</th>
                                    <th className="py-2 px-3 text-left font-medium">Scheduled</th>
                                    <th className="py-2 px-3 text-left font-medium">Status</th>
                                    {!isProcessor && <th className="py-2 px-3 text-left font-medium">Rep</th>}
                                    <th className="py-2 px-3 text-right font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((r) => (
                                    <tr
                                        key={r.id}
                                        className="border-t hover:bg-gray-50 cursor-pointer"
                                        onClick={() => setActive(r)}
                                    >
                                        <td className="py-2.5 px-3">
                                            <div className="font-medium text-gray-900">
                                                {r.pharmacy_business_name || r.pharmacy_name || '—'}
                                            </div>
                                            {(r.branch_business_name || r.branch_name) && (
                                                <div className="text-[11px] text-gray-500">
                                                    Branch: {r.branch_business_name || r.branch_name}
                                                </div>
                                            )}
                                        </td>
                                        <td className="py-2.5 px-3">{PURPOSE_LABELS[r.purpose]}</td>
                                        <td className="py-2.5 px-3">{formatDate(r.requested_date)}</td>
                                        <td className="py-2.5 px-3">
                                            {r.scheduled_date ? formatDate(r.scheduled_date) : <span className="text-gray-400">—</span>}
                                        </td>
                                        <td className="py-2.5 px-3">{getStatusBadge(r.status)}</td>
                                        {!isProcessor && (
                                            <td className="py-2.5 px-3">
                                                {r.claimed_processor_name || <span className="text-gray-400">Unclaimed</span>}
                                            </td>
                                        )}
                                        <td className="py-2.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                                            <ActionButtons
                                                r={r}
                                                isProcessor={isProcessor}
                                                onSchedule={() => setScheduleModal(r)}
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
                    onSchedule={() => setScheduleModal(active)}
                    onComplete={() => setCompleteModal(active)}
                    onCancel={() => handleCancel(active)}
                    onRelease={() => handleRelease(active)}
                    onReassign={() => handleAdminReassign(active)}
                />
            )}

            {/* Schedule modal */}
            {scheduleModal && (
                <ScheduleModal
                    request={scheduleModal}
                    isActing={isActing}
                    onClose={() => setScheduleModal(null)}
                    onSubmit={(date, notes) => handleSchedule(scheduleModal, date, notes)}
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
    r, isProcessor, onSchedule, onComplete, onCancel, onRelease, onReassign,
}: {
    r: ServiceRequest;
    isProcessor: boolean;
    onSchedule: () => void;
    onComplete: () => void;
    onCancel: () => void;
    onRelease: () => void;
    onReassign: () => void;
}) {
    if (isProcessor) {
        if (r.status === 'pending') {
            return (
                <Button size="sm" variant="outline" onClick={onSchedule} className="h-7 text-[11px]">
                    <Play className="w-3 h-3 mr-1" /> Schedule
                </Button>
            );
        }
        if (r.status === 'scheduled' && r.is_claimed_by_me) {
            return (
                <div className="flex justify-end gap-1">
                    <Button size="sm" variant="outline" onClick={onSchedule} className="h-7 text-[11px]">
                        <Calendar className="w-3 h-3 mr-1" /> Reschedule
                    </Button>
                    <Button size="sm" onClick={onComplete} className="h-7 text-[11px] bg-green-600 hover:bg-green-700 text-white">
                        <CheckSquare className="w-3 h-3 mr-1" /> Complete
                    </Button>
                    <Button size="sm" variant="outline" onClick={onRelease} className="h-7 text-[11px]" title="Release back to queue">
                        <RotateCcw className="w-3 h-3" />
                    </Button>
                </div>
            );
        }
        return null;
    }
    // Admin
    if (r.status === 'pending' || r.status === 'scheduled') {
        return (
            <Button size="sm" variant="outline" onClick={onReassign} className="h-7 text-[11px]">
                <User className="w-3 h-3 mr-1" /> Reassign
            </Button>
        );
    }
    return null;
}

// =====================================================================
// Detail modal
// =====================================================================

function DetailModal({
    r, isProcessor, isActing, onClose,
    onSchedule, onComplete, onCancel, onRelease, onReassign,
}: {
    r: ServiceRequest;
    isProcessor: boolean;
    isActing: boolean;
    onClose: () => void;
    onSchedule: () => void;
    onComplete: () => void;
    onCancel: () => void;
    onRelease: () => void;
    onReassign: () => void;
}) {
    return (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between px-5 py-3 border-b sticky top-0 bg-white z-10">
                    <div>
                        <h2 className="text-sm font-semibold">Service Request</h2>
                        <div className="text-[11px] text-gray-500 mt-0.5">
                            {r.id.slice(0, 8)}… · Created {formatDate(r.created_at)}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {getStatusBadge(r.status)}
                        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="p-5 space-y-4 text-xs">
                    <Section title="Pharmacy">
                        <Row label="Name" icon={<User className="w-3.5 h-3.5" />}>
                            {r.pharmacy_business_name || r.pharmacy_name || '—'}
                        </Row>
                        {r.pharmacy_email && (
                            <Row label="Email" icon={<Mail className="w-3.5 h-3.5" />}>
                                <a href={`mailto:${r.pharmacy_email}`} className="text-teal-700 hover:underline">
                                    {r.pharmacy_email}
                                </a>
                            </Row>
                        )}
                        {r.pharmacy_phone && (
                            <Row label="Phone" icon={<Phone className="w-3.5 h-3.5" />}>
                                <a href={`tel:${r.pharmacy_phone}`} className="text-teal-700 hover:underline">
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
                        <Row label="Purpose" icon={<Calendar className="w-3.5 h-3.5" />}>
                            {PURPOSE_LABELS[r.purpose]}
                        </Row>
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

                <div className="flex items-center justify-end gap-2 px-5 py-3 border-t bg-gray-50 sticky bottom-0">
                    {isProcessor ? (
                        <>
                            {r.status === 'pending' && (
                                <Button size="sm" onClick={onSchedule} disabled={isActing}
                                        className="bg-teal-600 hover:bg-teal-700 text-white">
                                    <Play className="w-3.5 h-3.5 mr-1" /> Claim & Schedule
                                </Button>
                            )}
                            {r.status === 'scheduled' && r.is_claimed_by_me && (
                                <>
                                    <Button size="sm" variant="outline" onClick={onRelease} disabled={isActing}>
                                        <RotateCcw className="w-3.5 h-3.5 mr-1" /> Release
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={onSchedule} disabled={isActing}>
                                        <Calendar className="w-3.5 h-3.5 mr-1" /> Reschedule
                                    </Button>
                                    <Button size="sm" onClick={onComplete} disabled={isActing}
                                            className="bg-green-600 hover:bg-green-700 text-white">
                                        <CheckSquare className="w-3.5 h-3.5 mr-1" /> Complete
                                    </Button>
                                </>
                            )}
                            {!['completed', 'cancelled'].includes(r.status) && (r.is_claimed_by_me || r.status === 'pending') && (
                                <Button size="sm" variant="outline" onClick={onCancel} disabled={isActing}
                                        className="text-red-600 border-red-200 hover:bg-red-50">
                                    <Ban className="w-3.5 h-3.5 mr-1" /> Cancel
                                </Button>
                            )}
                        </>
                    ) : (
                        !['completed', 'cancelled'].includes(r.status) && (
                            <Button size="sm" variant="outline" onClick={onReassign} disabled={isActing}>
                                <User className="w-3.5 h-3.5 mr-1" /> Reassign
                            </Button>
                        )
                    )}
                    <Button size="sm" variant="outline" onClick={onClose}>Close</Button>
                </div>
            </div>
        </div>
    );
}

// =====================================================================
// Schedule modal
// =====================================================================

function ScheduleModal({ request, isActing, onClose, onSubmit }: {
    request: ServiceRequest;
    isActing: boolean;
    onClose: () => void;
    onSubmit: (scheduledDate: string, notes: string) => void;
}) {
    const today = new Date().toISOString().slice(0, 10);
    const [date, setDate] = useState<string>(
        request.scheduled_date ? String(request.scheduled_date).slice(0, 10) : String(request.requested_date).slice(0, 10)
    );
    const [notes, setNotes] = useState<string>(request.scheduler_notes || '');
    const [err, setErr] = useState<string | null>(null);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        setErr(null);
        if (!date) { setErr('Please pick a date'); return; }
        if (date < today) { setErr('Date cannot be in the past'); return; }
        onSubmit(date, notes);
    };

    return (
        <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
                <div className="flex items-center justify-between px-5 py-3 border-b">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                        <CalendarClock className="w-4 h-4 text-teal-600" />
                        {request.status === 'scheduled' ? 'Reschedule' : 'Schedule Visit'}
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <form onSubmit={submit} className="p-5 space-y-3 text-xs">
                    <div>
                        <label className="block text-gray-600 mb-1">Visit Date</label>
                        <input
                            type="date"
                            min={today}
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full h-9 rounded border border-gray-200 px-2 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                        <div className="text-[11px] text-gray-500 mt-1">
                            Pharmacy requested: {formatDate(request.requested_date)}
                        </div>
                    </div>
                    <div>
                        <label className="block text-gray-600 mb-1">Notes to pharmacy (optional)</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={4}
                            maxLength={1000}
                            className="w-full rounded border border-gray-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                            placeholder="Anything the pharmacy should know..."
                        />
                    </div>
                    {err && (
                        <div className="flex items-center gap-1.5 p-2 rounded bg-red-50 border border-red-200 text-red-700 text-[11px]">
                            <AlertCircle className="w-3 h-3" /> {err}
                        </div>
                    )}
                    <div className="flex items-center justify-end gap-2 pt-1">
                        <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isActing}>
                            Cancel
                        </Button>
                        <Button type="submit" size="sm" disabled={isActing}
                                className="bg-teal-600 hover:bg-teal-700 text-white">
                            {isActing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

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
        <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
                <div className="flex items-center justify-between px-5 py-3 border-b">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                        <CheckSquare className="w-4 h-4 text-green-600" />
                        Complete Visit
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <form
                    onSubmit={(e) => { e.preventDefault(); onSubmit(notes); }}
                    className="p-5 space-y-3 text-xs"
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
                            className="w-full rounded border border-gray-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                            placeholder="What was accomplished, follow-ups needed, etc."
                        />
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-1">
                        <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isActing}>
                            Cancel
                        </Button>
                        <Button type="submit" size="sm" disabled={isActing}
                                className="bg-green-600 hover:bg-green-700 text-white">
                            {isActing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Mark Complete'}
                        </Button>
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
