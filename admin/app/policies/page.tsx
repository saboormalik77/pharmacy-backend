'use client';

import { useState, useEffect } from 'react';
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
    FetchPoliciesParams,
} from '@/lib/store/policiesSlice';
import { ManufacturerPolicyCreatePayload, ManufacturerPolicy } from '@/lib/types';

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
        if (!newPolicy.labelerId.trim() || !newPolicy.manufacturerName.trim()) {
            showToast('Labeler ID and Manufacturer Name are required.', 'error');
            return;
        }
        const result = await dispatch(createPolicy(newPolicy));
        if (createPolicy.fulfilled.match(result)) {
            showToast(`Policy for ${newPolicy.manufacturerName} created!`);
            setAddModal(false);
            setNewPolicy({ labelerId: '', manufacturerName: '', labelerType: 'generic' });
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
        <div className="space-y-6">
            <ToastContainer toasts={toasts} removeToast={removeToast} />

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Shield className="w-6 h-6 text-primary-600" /> Manufacturer Policies
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Manage return policies, exceptions, and timing rules</p>
                </div>
                <Button variant="primary" onClick={() => setAddModal(true)}>
                    <Plus className="w-4 h-4 mr-1" /> Add Policy
                </Button>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow-md p-4">
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search by manufacturer name, labeler ID, or email..."
                            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                    </div>
                    <select value={labelerType} onChange={e => setLabelerType(e.target.value)} className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
                        <option value="all">All Types</option>
                        <option value="generic">Generic</option>
                        <option value="brand">Brand</option>
                    </select>
                    <select value={destination} onChange={e => setDestination(e.target.value)} className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
                        <option value="all">All Destinations</option>
                        <option value="inmar">Inmar</option>
                        <option value="qualanex">Qualanex</option>
                        <option value="pharmalink">PharmaLink</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                {isLoading ? (
                    <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary-600" /></div>
                ) : error ? (
                    <div className="text-center py-16">
                        <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
                        <p className="text-red-600 text-sm">{error}</p>
                    </div>
                ) : policies.length === 0 ? (
                    <div className="text-center py-16">
                        <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 font-medium">No policies found</p>
                        <p className="text-gray-400 text-sm mt-1">Add your first manufacturer policy to get started.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="text-left px-4 py-3 font-medium text-gray-500 uppercase text-xs tracking-wider">Labeler ID</th>
                                    <th className="text-left px-4 py-3 font-medium text-gray-500 uppercase text-xs tracking-wider">Manufacturer</th>
                                    <th className="text-left px-4 py-3 font-medium text-gray-500 uppercase text-xs tracking-wider">Type</th>
                                    <th className="text-left px-4 py-3 font-medium text-gray-500 uppercase text-xs tracking-wider">Destinations</th>
                                    <th className="text-center px-4 py-3 font-medium text-gray-500 uppercase text-xs tracking-wider">Partials</th>
                                    <th className="text-right px-4 py-3 font-medium text-gray-500 uppercase text-xs tracking-wider">Avg Pay %</th>
                                    <th className="text-right px-4 py-3 font-medium text-gray-500 uppercase text-xs tracking-wider">Avg Days</th>
                                    <th className="text-right px-4 py-3 font-medium text-gray-500 uppercase text-xs tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {policies.map(p => {
                                    const dests = getDestinations(p);
                                    const hasPartials = (p.returnPolicies || []).some(rp => rp.partialsAccepted);
                                    return (
                                        <tr
                                            key={p.id}
                                            onClick={() => router.push(`/policies/${p.id}`)}
                                            className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                                        >
                                            <td className="px-4 py-3 font-mono text-gray-900 font-medium">{p.labelerId}</td>
                                            <td className="px-4 py-3 text-gray-900 max-w-[200px] truncate" title={p.manufacturerName}>{p.manufacturerName}</td>
                                            <td className="px-4 py-3">
                                                <Badge variant={p.labelerType === 'brand' ? 'info' : 'default'}>
                                                    {p.labelerType === 'brand' ? 'Brand' : 'Generic'}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-wrap gap-1">
                                                    {dests.length > 0 ? dests.map(d => (
                                                        <Badge key={d} variant={getDestBadgeVariant(d)}>{d}</Badge>
                                                    )) : <span className="text-gray-400 text-xs">—</span>}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {hasPartials ? <Badge variant="success">Yes</Badge> : <span className="text-gray-400 text-xs">No</span>}
                                            </td>
                                            <td className="px-4 py-3 text-right text-gray-700">
                                                {p.averagePayPercent != null ? `${p.averagePayPercent}%` : '—'}
                                            </td>
                                            <td className="px-4 py-3 text-right text-gray-700">
                                                {p.averageDaysToPay != null ? p.averageDaysToPay : '—'}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <button
                                                    onClick={e => { e.stopPropagation(); setDeleteModal(p); }}
                                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4" />
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
                    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
                        <span className="text-xs text-gray-500">
                            Showing {((pagination.page - 1) * pagination.limit) + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                        </span>
                        <div className="flex gap-1">
                            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-40">
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="px-3 py-1 text-xs text-gray-700 font-medium">Page {page}</span>
                            <button disabled={page >= (pagination.totalPages)} onClick={() => setPage(p => p + 1)} className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-40">
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Add Policy Modal ─────────────────────────── */}
            {addModal && (
                <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={() => setAddModal(false)}>
                    <div className="bg-white rounded-lg max-w-lg w-full shadow-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-gray-50 sticky top-0">
                            <h2 className="text-lg font-semibold text-gray-900">Add Manufacturer Policy</h2>
                            <button onClick={() => setAddModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-5 space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Labeler ID <span className="text-red-500">*</span></label>
                                    <input type="text" value={newPolicy.labelerId} onChange={e => setNewPolicy({ ...newPolicy, labelerId: e.target.value })} placeholder="e.g. 43547" className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                                    <select value={newPolicy.labelerType || 'generic'} onChange={e => setNewPolicy({ ...newPolicy, labelerType: e.target.value as 'generic' | 'brand' })} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500">
                                        <option value="generic">Generic</option>
                                        <option value="brand">Brand</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Manufacturer Name <span className="text-red-500">*</span></label>
                                <input type="text" value={newPolicy.manufacturerName} onChange={e => setNewPolicy({ ...newPolicy, manufacturerName: e.target.value })} placeholder="Full manufacturer name" className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Main Contact</label>
                                    <input type="text" value={newPolicy.mainContact || ''} onChange={e => setNewPolicy({ ...newPolicy, mainContact: e.target.value })} placeholder="Contact name" className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Main Phone</label>
                                    <input type="text" value={newPolicy.mainPhone || ''} onChange={e => setNewPolicy({ ...newPolicy, mainPhone: e.target.value })} placeholder="Phone" className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Credit Request Email</label>
                                <input type="email" value={newPolicy.creditRequestEmail || ''} onChange={e => setNewPolicy({ ...newPolicy, creditRequestEmail: e.target.value })} placeholder="returns@manufacturer.com" className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Avg Pay %</label>
                                    <input type="number" step="0.1" value={newPolicy.averagePayPercent ?? ''} onChange={e => setNewPolicy({ ...newPolicy, averagePayPercent: e.target.value ? parseFloat(e.target.value) : undefined })} placeholder="e.g. 73.2" className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Avg Days to Pay</label>
                                    <input type="number" value={newPolicy.averageDaysToPay ?? ''} onChange={e => setNewPolicy({ ...newPolicy, averageDaysToPay: e.target.value ? parseInt(e.target.value) : undefined })} placeholder="e.g. 297" className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500" />
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 p-5 border-t border-gray-200 bg-gray-50 sticky bottom-0">
                            <Button variant="outline" onClick={() => setAddModal(false)}>Cancel</Button>
                            <Button variant="primary" onClick={handleAdd} disabled={isActionLoading}>
                                {isActionLoading ? <><Loader2 className="w-4 h-4 animate-spin mr-1" />Creating...</> : 'Create Policy'}
                            </Button>
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
    );
}
