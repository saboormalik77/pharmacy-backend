'use client';

import { PermissionGate } from '@/components/auth/PermissionGate';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    Shield, Search, Plus, Loader2, AlertCircle, X, Trash2, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ToastContainer, Toast } from '@/components/ui/Toast';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import {
    fetchPolicies,
    createPolicy,
    deletePolicy,
    addReturnPolicy,
    addNote,
    FetchPoliciesParams,
} from '@/lib/store/policiesSlice';
import { ManufacturerPolicyCreatePayload, ManufacturerPolicy, ReturnPolicyCreatePayload, PolicyNotePayload } from '@/lib/types';

interface ReverseDistributorOption {
    id: string;
    name: string;
    email: string;
}

const US_STATES = [
    'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
    'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
    'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC'
];

const INITIAL_RETURN_POLICY = {
    destination: '', autoRaEmail: '', policyNumber: undefined as number | undefined,
    policyDescription: '', discountRate: undefined as number | undefined,
    partialsAccepted: false, reimbursementType: 'batch' as 'batch' | 'per_item',
    returnableWithinPolicyPeriod: true,
};

const INITIAL_PARTIAL_POLICY = {
    policyNumber: undefined as number | undefined,
    policyDescription: '',
    returnableWithinPolicyPeriod: true,
};

// ── Page ───────────────────────────────────────────────────────

export default function PoliciesPage() {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const { policies, pagination, isLoading, isActionLoading, error } = useAppSelector(s => s.policies);

    const [search, setSearch] = useState('');
    const [labelerType, setLabelerType] = useState('all');
    const [destination, setDestination] = useState('all');
    const [page, setPage] = useState(1);
    const debouncedSearch = useDebounce(search, 400);

    const [addModal, setAddModal] = useState(false);
    const [deleteModal, setDeleteModal] = useState<ManufacturerPolicy | null>(null);
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [newPolicy, setNewPolicy] = useState<ManufacturerPolicyCreatePayload>({
        labelerId: '', manufacturerName: '', labelerType: 'generic',
    });
    const [newReturnPolicy, setNewReturnPolicy] = useState({ ...INITIAL_RETURN_POLICY });
    const [partialPolicy, setPartialPolicy] = useState({ ...INITIAL_PARTIAL_POLICY });
    const [newNote, setNewNote] = useState('');

    // Reverse distributors for the Destination dropdown
    const [reverseDistributors, setReverseDistributors] = useState<ReverseDistributorOption[]>([]);
    const [loadingDistributors, setLoadingDistributors] = useState(false);

    const fetchReverseDistributors = useCallback(async () => {
        if (reverseDistributors.length > 0) return; // already loaded
        setLoadingDistributors(true);
        try {
            const { apiClient } = await import('@/lib/api/apiClient');
            const res = await apiClient.get<{ status: string; data: ReverseDistributorOption[] }>(
                '/admin/reverse-distributors', true
            );
            setReverseDistributors(res.data || []);
        } catch {
            // silently fall back — the field stays usable but without options
        } finally {
            setLoadingDistributors(false);
        }
    }, [reverseDistributors.length]);

    const showToast = (message: string, type: Toast['type'] = 'success') => {
        setToasts(prev => [...prev, { id: Date.now().toString(), message, type }]);
    };
    const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

    useEffect(() => {
        const params: FetchPoliciesParams = { page, limit: 20 };
        if (debouncedSearch) params.search = debouncedSearch;
        if (labelerType !== 'all') params.labelerType = labelerType;
        if (destination !== 'all') params.destination = destination;
        dispatch(fetchPolicies(params));
    }, [dispatch, page, debouncedSearch, labelerType, destination]);

    useEffect(() => { setPage(1); }, [debouncedSearch, labelerType, destination]);

    const handleAdd = async () => {
        if (!newPolicy.labelerId.trim()) {
            showToast('Labeler ID is required.', 'error');
            return;
        }
        if (newPolicy.labelerId.trim().length > 10) {
            showToast('Labeler ID must be 10 characters or fewer (e.g. 00032).', 'error');
            return;
        }
        if (!newPolicy.manufacturerName.trim()) {
            showToast('Manufacturer Name is required.', 'error');
            return;
        }
        // If any return-policy field is filled, destination is required
        const returnFieldsFilled =
            newReturnPolicy.autoRaEmail ||
            newReturnPolicy.policyNumber ||
            newReturnPolicy.policyDescription ||
            newReturnPolicy.discountRate != null;
        if (returnFieldsFilled && !newReturnPolicy.destination) {
            showToast('Please select a Destination in the Labeler Return Information section.', 'error');
            return;
        }
        // Discount rate must be a fraction between 0 and 1
        if (newReturnPolicy.discountRate != null && (newReturnPolicy.discountRate < 0 || newReturnPolicy.discountRate > 1)) {
            showToast('Discount Rate must be between 0 and 1 (e.g. 0.30 for 30%).', 'error');
            return;
        }

        const result = await dispatch(createPolicy(newPolicy));
        if (createPolicy.fulfilled.match(result)) {
            const createdId = result.payload?.id;

            if (createdId && newReturnPolicy.destination) {
                const rpPayload: ReturnPolicyCreatePayload = {
                    destination: newReturnPolicy.destination,
                    autoRaEmail: newReturnPolicy.autoRaEmail || undefined,
                    policyNumber: newReturnPolicy.policyNumber,
                    policyDescription: newReturnPolicy.policyDescription || undefined,
                    discountRate: newReturnPolicy.discountRate,
                    partialsAccepted: false,
                    reimbursementType: newReturnPolicy.reimbursementType,
                    returnableWithinPolicyPeriod: newReturnPolicy.returnableWithinPolicyPeriod,
                };
                const rpResult = await dispatch(addReturnPolicy({ policyId: createdId, payload: rpPayload }));
                if (addReturnPolicy.rejected.match(rpResult)) {
                    showToast((rpResult.payload as string) || 'Policy created but failed to save return info.', 'error');
                }

                if (newReturnPolicy.partialsAccepted) {
                    const partialPayload: ReturnPolicyCreatePayload = {
                        destination: newReturnPolicy.destination,
                        autoRaEmail: newReturnPolicy.autoRaEmail || undefined,
                        policyNumber: partialPolicy.policyNumber,
                        policyDescription: partialPolicy.policyDescription || undefined,
                        discountRate: newReturnPolicy.discountRate,
                        partialsAccepted: true,
                        reimbursementType: newReturnPolicy.reimbursementType,
                        returnableWithinPolicyPeriod: partialPolicy.returnableWithinPolicyPeriod,
                    };
                    const partialResult = await dispatch(addReturnPolicy({ policyId: createdId, payload: partialPayload }));
                    if (addReturnPolicy.rejected.match(partialResult)) {
                        showToast((partialResult.payload as string) || 'Main policy saved but partial policy failed.', 'error');
                    }
                }
            }

            if (createdId && newNote.trim()) {
                const notePayload: PolicyNotePayload = { noteText: newNote.trim() };
                await dispatch(addNote({ policyId: createdId, payload: notePayload }));
            }

            showToast(`Policy for ${newPolicy.manufacturerName} created!`);
            setAddModal(false);
            setNewPolicy({ labelerId: '', manufacturerName: '', labelerType: 'generic' });
            setNewReturnPolicy({ ...INITIAL_RETURN_POLICY });
            setPartialPolicy({ ...INITIAL_PARTIAL_POLICY });
            setNewNote('');
            dispatch(fetchPolicies({ page, limit: 20 }));
        } else {
            showToast(result.payload as string || 'Failed to create policy', 'error');
        }
    };

    const handleDelete = async () => {
        if (!deleteModal) return;
        const result = await dispatch(deletePolicy(deleteModal.id));
        if (deletePolicy.fulfilled.match(result)) {
            showToast(`Policy for ${deleteModal.manufacturerName} deleted.`);
            setDeleteModal(null);
        } else {
            showToast(result.payload as string || 'Failed to delete', 'error');
            setDeleteModal(null);
        }
    };

    const getDestinations = (p: ManufacturerPolicy) => {
        const dests = p.destinations || (p.returnPolicies || []).map(rp => rp.destination);
        return [...new Set(dests)];
    };

    const getDestBadgeVariant = (d: string): 'success' | 'info' | 'warning' | 'default' => {
        if (d === 'inmar') return 'success';
        if (d === 'qualanex') return 'info';
        if (d === 'pharmalink') return 'warning';
        return 'default';
    };

    return (
        <PermissionGate permission="policies">
        <div className="space-y-3">
            <ToastContainer toasts={toasts} onClose={removeToast} />

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-lg font-bold text-gray-900 flex items-center gap-1.5">
                        <Shield className="w-4 h-4 text-primary-600" /> Labeler Info
                    </h1>
                    <p className="text-xs text-gray-500">Manage return policies, exceptions, and timing rules</p>
                </div>
                <button
                    onClick={() => { setAddModal(true); fetchReverseDistributors(); }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary-600 text-white text-xs font-medium hover:bg-primary-700 transition-colors whitespace-nowrap"
                >
                    <Plus className="w-3.5 h-3.5" /> Add Labeler
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow px-3 py-2">
                <div className="flex flex-wrap gap-2">
                    <div className="relative flex-1 min-w-[160px]">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search manufacturer, labeler ID, email..."
                            className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                        />
                    </div>
                    <select value={labelerType} onChange={e => setLabelerType(e.target.value)} className="px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500">
                        <option value="all">All Types</option>
                        <option value="generic">Generic</option>
                        <option value="brand">Brand</option>
                    </select>
                    <select value={destination} onChange={e => setDestination(e.target.value)} className="px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500">
                        <option value="all">All Destinations</option>
                        <option value="inmar">Inmar</option>
                        <option value="qualanex">Qualanex</option>
                        <option value="pharmalink">PharmaLink</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                {isLoading ? (
                    <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary-600" /></div>
                ) : error ? (
                    <div className="text-center py-12">
                        <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                        <p className="text-red-600 text-xs">{error}</p>
                    </div>
                ) : policies.length === 0 ? (
                    <div className="text-center py-12">
                        <Shield className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-500 text-sm font-medium">No policies found</p>
                        <p className="text-gray-400 text-xs mt-1">Add your first manufacturer policy to get started.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gradient-to-r from-indigo-500 to-indigo-400">
                                    <th className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-white whitespace-nowrap">Labeler ID</th>
                                    <th className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-white whitespace-nowrap">Manufacturer</th>
                                    <th className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-white whitespace-nowrap">Type</th>
                                    <th className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-white whitespace-nowrap">Destinations</th>
                                    <th className="text-center px-4 py-3.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-white whitespace-nowrap">Partials</th>
                                    <th className="text-right px-4 py-3.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-white whitespace-nowrap">Avg Pay %</th>
                                    <th className="text-right px-4 py-3.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-white whitespace-nowrap">Avg Days</th>
                                    <th className="text-right px-4 py-3.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-white whitespace-nowrap">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {policies.map(p => {
                                    const dests = getDestinations(p);
                                    const hasPartials = (p.returnPolicies || []).some(rp => rp.partialsAccepted);
                                    return (
                                        <tr
                                            key={p.id}
                                            onClick={() => router.push(`/policies/${p.id}`)}
                                            className="hover:bg-gray-50 cursor-pointer transition-colors"
                                        >
                                            <td className="px-4 py-3 text-sm font-mono text-gray-900 font-semibold whitespace-nowrap">{p.labelerId}</td>
                                            <td className="px-4 py-3 text-sm text-gray-800 max-w-[180px] truncate" title={p.manufacturerName}>{p.manufacturerName}</td>
                                            <td className="px-4 py-3">
                                                <Badge variant={p.labelerType === 'brand' ? 'info' : 'default'}>
                                                    <span className="text-[10px]">{p.labelerType === 'brand' ? 'Brand' : 'Generic'}</span>
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-wrap gap-1">
                                                    {dests.length > 0 ? dests.map(d => (
                                                        <Badge key={d} variant={getDestBadgeVariant(d)}><span className="text-[10px]">{d}</span></Badge>
                                                    )) : <span className="text-gray-400 text-sm">—</span>}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {hasPartials
                                                    ? <Badge variant="success"><span className="text-[10px]">Yes</span></Badge>
                                                    : <span className="text-gray-400 text-sm">No</span>}
                                            </td>
                                            <td className="px-4 py-3 text-right text-sm text-gray-700 whitespace-nowrap">
                                                {p.averagePayPercent != null ? `${p.averagePayPercent}%` : '—'}
                                            </td>
                                            <td className="px-4 py-3 text-right text-sm text-gray-700 whitespace-nowrap">
                                                {p.averageDaysToPay != null ? p.averageDaysToPay : '—'}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <button
                                                    onClick={e => { e.stopPropagation(); setDeleteModal(p); }}
                                                    className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {pagination && pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between px-3 py-2 border-t border-gray-100">
                        <span className="text-xs text-gray-500">
                            {((pagination.page - 1) * pagination.limit) + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                        </span>
                        <div className="flex items-center gap-1">
                            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40">
                                <ChevronLeft className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-xs text-gray-600 px-1">Page {page} of {pagination.totalPages}</span>
                            <button disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40">
                                <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Add Policy Modal ─────────────────────────── */}
            {addModal && (
                <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={() => setAddModal(false)}>
                    <div className="bg-white rounded-xl max-w-3xl w-full shadow-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 rounded-t-xl px-5 py-3 flex-shrink-0">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 bg-white/20 rounded-lg">
                                        <Shield className="w-4 h-4 text-white" />
                                    </div>
                                    <h2 className="text-sm font-bold text-white">Master Labeler Information</h2>
                                </div>
                                <button 
                                    onClick={() => setAddModal(false)} 
                                    className="text-white/80 hover:text-white transition-colors cursor-pointer"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                        <div className="px-5 py-4 overflow-y-auto flex-1 space-y-4">

                            {/* Row 1: Labeler ID, Type, Avg Pay %, Avg Days */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                        Labeler ID <span className="text-red-500">*</span>
                                        <span className="ml-1 text-[10px] text-gray-400 font-normal">max 10 chars</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={newPolicy.labelerId}
                                        onChange={e => setNewPolicy({ ...newPolicy, labelerId: e.target.value })}
                                        placeholder="e.g. 00032"
                                        maxLength={10}
                                        className={`w-full px-2.5 py-1.5 text-xs border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                                            newPolicy.labelerId.length > 10
                                                ? 'border-red-400 focus:ring-red-400'
                                                : 'border-gray-300'
                                        }`}
                                    />
                                    {newPolicy.labelerId.length > 0 && (
                                        <p className="text-[10px] text-gray-400 mt-0.5">{newPolicy.labelerId.length}/10</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Labeler Type</label>
                                    <select value={newPolicy.labelerType || 'generic'} onChange={e => setNewPolicy({ ...newPolicy, labelerType: e.target.value as 'generic' | 'brand' })} className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500">
                                        <option value="generic">Generic</option>
                                        <option value="brand">Brand</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Average Pay Percent</label>
                                    <div className="flex items-center gap-1">
                                        <input type="number" step="0.1" value={newPolicy.averagePayPercent ?? ''} onChange={e => setNewPolicy({ ...newPolicy, averagePayPercent: e.target.value ? parseFloat(e.target.value) : undefined })} placeholder="%" className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500" />
                                        <span className="text-xs text-gray-500">%</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Average Days to Pay</label>
                                    <input type="number" value={newPolicy.averageDaysToPay ?? ''} onChange={e => setNewPolicy({ ...newPolicy, averageDaysToPay: e.target.value ? parseInt(e.target.value) : undefined })} placeholder="e.g. 297" className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500" />
                                </div>
                            </div>

                            {/* Labeler Name */}
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Labeler Name <span className="text-red-500">*</span></label>
                                <input type="text" value={newPolicy.manufacturerName} onChange={e => setNewPolicy({ ...newPolicy, manufacturerName: e.target.value })} placeholder="e.g. AbbVie Inc." className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500" />
                            </div>

                            {/* Address */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Address 1</label>
                                    <input type="text" value={newPolicy.address1 || ''} onChange={e => setNewPolicy({ ...newPolicy, address1: e.target.value })} className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Address 2</label>
                                    <input type="text" value={newPolicy.address2 || ''} onChange={e => setNewPolicy({ ...newPolicy, address2: e.target.value })} className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500" />
                                </div>
                            </div>

                            {/* City, State, Zip */}
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">City</label>
                                    <input type="text" value={newPolicy.city || ''} onChange={e => setNewPolicy({ ...newPolicy, city: e.target.value })} className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">State</label>
                                    <select value={newPolicy.state || ''} onChange={e => setNewPolicy({ ...newPolicy, state: e.target.value })} className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500">
                                        <option value="">Select</option>
                                        {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Zip</label>
                                    <input type="text" value={newPolicy.zip || ''} onChange={e => setNewPolicy({ ...newPolicy, zip: e.target.value })} maxLength={10} className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500" />
                                </div>
                            </div>

                            {/* Main Contact, Main Phone, Fax */}
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Main Contact</label>
                                    <input type="text" value={newPolicy.mainContact || ''} onChange={e => setNewPolicy({ ...newPolicy, mainContact: e.target.value })} className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Main Phone</label>
                                    <input type="text" value={newPolicy.mainPhone || ''} onChange={e => setNewPolicy({ ...newPolicy, mainPhone: e.target.value })} className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Fax</label>
                                    <input type="text" value={newPolicy.fax || ''} onChange={e => setNewPolicy({ ...newPolicy, fax: e.target.value })} className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500" />
                                </div>
                            </div>

                            {/* Credit Request Email */}
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Credit Request E-Mail</label>
                                <input type="email" value={newPolicy.creditRequestEmail || ''} onChange={e => setNewPolicy({ ...newPolicy, creditRequestEmail: e.target.value })} placeholder="e.g. holli.rein@abbvie.com" className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500" />
                            </div>

                            {/* Contact 2, Phone 2, E-Mail 2 */}
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Contact 2</label>
                                    <input type="text" value={newPolicy.contact2Name || ''} onChange={e => setNewPolicy({ ...newPolicy, contact2Name: e.target.value })} className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Phone 2</label>
                                    <input type="text" value={newPolicy.contact2Phone || ''} onChange={e => setNewPolicy({ ...newPolicy, contact2Phone: e.target.value })} className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">E-Mail 2</label>
                                    <input type="email" value={newPolicy.contact2Email || ''} onChange={e => setNewPolicy({ ...newPolicy, contact2Email: e.target.value })} placeholder="e.g. gpopharm@abbvie.com" className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500" />
                                </div>
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                                <textarea rows={3} value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="e.g. 1/18/2022 - SB - norvir tricor humira creon depakote kaletra no credit per policy 1% synthroid credit if mfg s/dated" className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" />
                            </div>

                            {/* ── Labeler Return Information ── */}
                            <div className="border-2 border-blue-200 rounded-lg p-4 space-y-3 bg-blue-50/30">
                                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Labeler Return Information</h3>

                                {/* Destination, Auto RA Email */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Destination</label>
                                        <div className="relative">
                                            <select
                                                value={newReturnPolicy.destination}
                                                onChange={e => {
                                                    const selected = reverseDistributors.find(d => d.name === e.target.value);
                                                    setNewReturnPolicy({
                                                        ...newReturnPolicy,
                                                        destination: e.target.value,
                                                        autoRaEmail: selected?.email || '',
                                                    });
                                                }}
                                                className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                                            >
                                                <option value="">
                                                    {loadingDistributors ? 'Loading...' : 'Select'}
                                                </option>
                                                {reverseDistributors.map(d => (
                                                    <option key={d.id} value={d.name}>{d.name}</option>
                                                ))}
                                            </select>
                                            {loadingDistributors && (
                                                <Loader2 className="w-3 h-3 animate-spin absolute right-7 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                            Auto RA E-Mail
                                            {newReturnPolicy.autoRaEmail && (
                                                <span className="ml-1 text-[10px] text-blue-500 font-normal">(auto-filled)</span>
                                            )}
                                        </label>
                                        <input
                                            type="email"
                                            value={newReturnPolicy.autoRaEmail}
                                            readOnly
                                            placeholder="Auto-filled from selected destination"
                                            className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-md bg-gray-50 text-gray-600 cursor-not-allowed"
                                        />
                                    </div>
                                </div>

                                {/* Policy #, Policy Description */}
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Policy #</label>
                                        <input type="number" value={newReturnPolicy.policyNumber ?? ''} onChange={e => setNewReturnPolicy({ ...newReturnPolicy, policyNumber: e.target.value ? parseInt(e.target.value) : undefined })} placeholder="e.g. 1" className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500" />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Policy Description</label>
                                        <input type="text" value={newReturnPolicy.policyDescription} onChange={e => setNewReturnPolicy({ ...newReturnPolicy, policyDescription: e.target.value })} placeholder="e.g. 6 Months Prior to 12 Months Post Drug Expiration" className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500" />
                                    </div>
                                </div>

                                {/* Discount Rate, Partials?, Reimbursement */}
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                            Discount Rate
                                            <span className="ml-1 text-[10px] text-gray-400 font-normal">0–1 fraction</span>
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            max="1"
                                            value={newReturnPolicy.discountRate ?? ''}
                                            onChange={e => setNewReturnPolicy({ ...newReturnPolicy, discountRate: e.target.value ? parseFloat(e.target.value) : undefined })}
                                            placeholder="e.g. 0.30"
                                            className={`w-full px-2.5 py-1.5 text-xs border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                                                newReturnPolicy.discountRate != null && (newReturnPolicy.discountRate < 0 || newReturnPolicy.discountRate > 1)
                                                    ? 'border-red-400 focus:ring-red-400'
                                                    : 'border-gray-300'
                                            }`}
                                        />
                                        <p className="text-[10px] text-gray-400 mt-0.5">
                                            {newReturnPolicy.discountRate != null && newReturnPolicy.discountRate >= 0 && newReturnPolicy.discountRate <= 1
                                                ? `= ${(newReturnPolicy.discountRate * 100).toFixed(0)}%`
                                                : newReturnPolicy.discountRate != null
                                                    ? <span className="text-red-500">Must be 0–1 (e.g. 0.30 for 30%)</span>
                                                    : 'e.g. 0.30 = 30%'}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Partials?</label>
                                        <select value={newReturnPolicy.partialsAccepted ? 'yes' : 'no'} onChange={e => setNewReturnPolicy({ ...newReturnPolicy, partialsAccepted: e.target.value === 'yes' })} className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white">
                                            <option value="yes">YES</option>
                                            <option value="no">NO</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Reimbursement</label>
                                        <select value={newReturnPolicy.reimbursementType} onChange={e => setNewReturnPolicy({ ...newReturnPolicy, reimbursementType: e.target.value as 'batch' | 'per_item' })} className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white">
                                            <option value="batch">BATCH</option>
                                            <option value="per_item">PER ITEM</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Return window mode</label>
                                    <p className="text-[10px] text-gray-500 mb-1">Standard: returnable inside the months-before/after window (too early → Wine Cellar). Inverted: returnable outside that window; inside → Wine Cellar until the day after the window ends.</p>
                                    <select
                                        value={newReturnPolicy.returnableWithinPolicyPeriod ? 'yes' : 'no'}
                                        onChange={e => setNewReturnPolicy({ ...newReturnPolicy, returnableWithinPolicyPeriod: e.target.value === 'yes' })}
                                        className="w-full max-w-xs px-2.5 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                                    >
                                        <option value="yes">Standard — returnable in window</option>
                                        <option value="no">Inverted — Wine Cellar in window</option>
                                    </select>
                                </div>

                                {/* Partial Policy Section — only when Partials = YES */}
                                {newReturnPolicy.partialsAccepted && (
                                    <div className="border-2 border-purple-200 rounded-lg p-3 space-y-3 bg-purple-50/40">
                                        <h4 className="text-xs font-bold text-purple-800 uppercase tracking-wider">Partial Return Policy</h4>
                                        <p className="text-[10px] text-purple-600">Configure separate policy details for partial returns</p>

                                        <div className="grid grid-cols-3 gap-3">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Policy #</label>
                                                <input type="number" value={partialPolicy.policyNumber ?? ''} onChange={e => setPartialPolicy({ ...partialPolicy, policyNumber: e.target.value ? parseInt(e.target.value) : undefined })} placeholder="e.g. 2" className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500" />
                                            </div>
                                            <div className="col-span-2">
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Policy Description</label>
                                                <input type="text" value={partialPolicy.policyDescription} onChange={e => setPartialPolicy({ ...partialPolicy, policyDescription: e.target.value })} placeholder="e.g. Partial returns accepted for tablets only" className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500" />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Return window mode</label>
                                            <select
                                                value={partialPolicy.returnableWithinPolicyPeriod ? 'yes' : 'no'}
                                                onChange={e => setPartialPolicy({ ...partialPolicy, returnableWithinPolicyPeriod: e.target.value === 'yes' })}
                                                className="w-full max-w-xs px-2.5 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                                            >
                                                <option value="yes">Standard — returnable in window</option>
                                                <option value="no">Inverted — Wine Cellar in window</option>
                                            </select>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-200 bg-gray-50 flex-shrink-0">
                            <button onClick={() => setAddModal(false)} className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">Cancel</button>
                            <button onClick={handleAdd} disabled={isActionLoading} className="px-3 py-1.5 text-xs font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-50 transition-colors inline-flex items-center">
                                {isActionLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />Creating...</> : 'Save Contact Info'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Delete Modal ──────────────────────────────── */}
            {deleteModal && (
                <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={() => setDeleteModal(null)}>
                    <div className="bg-white rounded-lg max-w-md w-full shadow-xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-gray-50">
                            <h2 className="text-lg font-semibold text-gray-900">Delete Policy</h2>
                            <button onClick={() => setDeleteModal(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6">
                            <p className="text-gray-700">Delete policy for <strong>{deleteModal.manufacturerName}</strong> (Labeler: {deleteModal.labelerId})? This will also remove all related return policies, exceptions, and notes.</p>
                        </div>
                        <div className="flex justify-end gap-2 p-5 border-t border-gray-200 bg-gray-50">
                            <Button variant="outline" onClick={() => setDeleteModal(null)}>Cancel</Button>
                            <Button variant="danger" onClick={handleDelete} disabled={isActionLoading}>
                                {isActionLoading ? <><Loader2 className="w-4 h-4 animate-spin mr-1" />Deleting...</> : 'Delete'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
        </PermissionGate>
    );
}
