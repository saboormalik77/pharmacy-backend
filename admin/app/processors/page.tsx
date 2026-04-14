'use client';

import { PermissionGate } from '@/components/auth/PermissionGate';
import { useState, useEffect } from 'react';
import {
    Search, Eye, EyeOff, UserPlus, X, ChevronLeft, ChevronRight,
    Edit, Loader2, UserCog, Building2, CheckCircle, AlertCircle,
    Phone, Mail, Store, MapPin, Power,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ToastContainer, Toast } from '@/components/ui/Toast';
import { formatDate } from '@/lib/utils';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import {
    fetchProcessors,
    createProcessor,
    updateProcessor,
    deactivateProcessor,
    activateProcessor,
    fetchProcessorStores,
    assignStoresToProcessor,
    unassignStoreFromProcessor,
    clearSelectedStores,
} from '@/lib/store/processorsSlice';
import { Processor, ProcessorCreatePayload, ProcessorUpdatePayload, AssignedStore } from '@/lib/types';
import { useDebounce } from '@/lib/hooks/useDebounce';

// ── Helpers ────────────────────────────────────────────────────

function getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
}

// ── Page ───────────────────────────────────────────────────────

export default function ProcessorsPage() {
    const dispatch = useAppDispatch();
    const { processors, pagination, isLoading, isStoresLoading, selectedProcessorStores, error } =
        useAppSelector((state) => state.processors);
    const { isAuthenticated } = useAppSelector((state) => state.auth);

    // ── Local state ────────────────────────────────────────────
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [toasts, setToasts] = useState<Toast[]>([]);

    // Modals
    const [viewModal, setViewModal] = useState<Processor | null>(null);
    const [addModal, setAddModal] = useState(false);
    const [editModal, setEditModal] = useState<Processor | null>(null);
    const [storesModal, setStoresModal] = useState<Processor | null>(null);
    const [deactivateModal, setDeactivateModal] = useState<Processor | null>(null);
    const [activateModal, setActivateModal] = useState<Processor | null>(null);
    const [assignModal, setAssignModal] = useState<Processor | null>(null);

    // Forms
    const [newProcessor, setNewProcessor] = useState<ProcessorCreatePayload>({
        name: '', email: '', password: '', phone: '', notes: '',
    });
    const [editForm, setEditForm] = useState<ProcessorUpdatePayload>({});
    const [showPassword, setShowPassword] = useState(false);

    // Pharmacies for assignment
    const [availablePharmacies, setAvailablePharmacies] = useState<{ id: string; name: string; isAssigned?: boolean }[]>([]);
    const [selectedPharmacyIds, setSelectedPharmacyIds] = useState<string[]>([]);
    const [loadingPharmacies, setLoadingPharmacies] = useState(false);
    const [assignSearch, setAssignSearch] = useState('');
    const [isAssigning, setIsAssigning] = useState(false);
    const [activeTab, setActiveTab] = useState<'assign' | 'unassign'>('assign');

    const debouncedSearch = useDebounce(searchTerm, 500);

    // ── Toast helpers ──────────────────────────────────────────
    const showToast = (message: string, type: Toast['type'] = 'success') => {
        setToasts(prev => {
            if (prev.some(t => t.message === message && t.type === type)) {
                return prev;
            }
            const id = Math.random().toString(36).substring(7);
            return [...prev, { id, message, type }];
        });
    };
    const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

    // ── Fetch on filter change ─────────────────────────────────
    useEffect(() => {
        if (!isAuthenticated) return;
        dispatch(fetchProcessors({
            page: currentPage,
            limit: 15,
            search: debouncedSearch || undefined,
            status: statusFilter !== 'all' ? statusFilter : undefined,
        }));
    }, [dispatch, currentPage, debouncedSearch, statusFilter, isAuthenticated]);

    // Populate edit form
    useEffect(() => {
        if (editModal) {
            setEditForm({
                name: editModal.name,
                email: editModal.email || '',
                phone: editModal.phone || '',
                status: editModal.status,
                notes: editModal.notes || '',
            });
        }
    }, [editModal]);

    // ── Handlers ───────────────────────────────────────────────
    const refresh = () => {
        dispatch(fetchProcessors({
            page: currentPage, limit: 15,
            search: debouncedSearch || undefined,
            status: statusFilter !== 'all' ? statusFilter : undefined,
        }));
    };

    const handleAdd = async () => {
        if (!newProcessor.name.trim()) { showToast('Name is required', 'error'); return; }
        if (!newProcessor.email.trim()) { showToast('Email is required', 'error'); return; }
        if (!newProcessor.password || newProcessor.password.length < 8) {
            showToast('Password must be at least 8 characters', 'error'); return;
        }
        const result = await dispatch(createProcessor(newProcessor));
        if (createProcessor.fulfilled.match(result)) {
            showToast('Processor created successfully!');
            setAddModal(false);
            setNewProcessor({ name: '', email: '', password: '', phone: '', notes: '' });
            setShowPassword(false);
            refresh();
        } else {
            showToast(result.payload as string || 'Failed to create processor', 'error');
        }
    };

    const handleUpdate = async () => {
        if (!editModal) return;
        if (!editForm.name?.trim()) { showToast('Name is required', 'error'); return; }
        const result = await dispatch(updateProcessor({ id: editModal.id, payload: editForm }));
        if (updateProcessor.fulfilled.match(result)) {
            showToast('Processor updated successfully!');
            setEditModal(null);
        } else {
            showToast(result.payload as string || 'Failed to update processor', 'error');
        }
    };

    const handleDeactivate = async () => {
        if (!deactivateModal) return;
        const result = await dispatch(deactivateProcessor(deactivateModal.id));
        if (deactivateProcessor.fulfilled.match(result)) {
            showToast('Processor deactivated successfully!');
            setDeactivateModal(null);
            refresh();
        } else {
            showToast(result.payload as string || 'Failed to deactivate processor', 'error');
        }
    };

    const handleActivate = async () => {
        if (!activateModal) return;
        const result = await dispatch(activateProcessor(activateModal.id));
        if (activateProcessor.fulfilled.match(result)) {
            showToast('Processor activated successfully!');
            setActivateModal(null);
            refresh();
        } else {
            showToast(result.payload as string || 'Failed to activate processor', 'error');
        }
    };

    const openStoresModal = async (processor: Processor) => {
        setStoresModal(processor);
        dispatch(clearSelectedStores());
        await dispatch(fetchProcessorStores(processor.id));
    };

    const handleUnassignStore = async (processor: Processor, pharmacyId: string) => {
        const result = await dispatch(unassignStoreFromProcessor({ processorId: processor.id, pharmacyId }));
        if (unassignStoreFromProcessor.fulfilled.match(result)) {
            showToast('Store unassigned successfully!');
            dispatch(fetchProcessors({ page: currentPage, limit: 15 }));
        } else {
            showToast(result.payload as string || 'Failed to unassign store', 'error');
        }
    };

    const openAssignModal = async (processor: Processor) => {
        setAssignModal(processor);
        setSelectedPharmacyIds([]);
        setAssignSearch('');
        setActiveTab('assign');
        setLoadingPharmacies(true);
        try {
            const { apiClient } = await import('@/lib/api/apiClient');
            
            const [pharmaciesRes, assignedRes] = await Promise.all([
                apiClient.get<any>('/admin/pharmacies', true, { limit: 200, status: 'active' }),
                apiClient.get<any>(`/admin/processors/${processor.id}/stores`, true),
            ]);
            
            const list = pharmaciesRes?.data?.pharmacies || pharmaciesRes?.pharmacies || [];
            const assigned = assignedRes?.data?.stores || assignedRes?.stores || [];
            const assignedIds = new Set(assigned.map((s: any) => s.pharmacyId));
            
            // Show all pharmacies with assignment status
            setAvailablePharmacies(
                list.map((p: any) => ({ 
                    id: p.id, 
                    name: p.businessName || p.pharmacy_name || p.name || 'Unknown',
                    isAssigned: assignedIds.has(p.id)
                }))
            );
        } catch {
            showToast('Failed to load pharmacies', 'error');
        } finally {
            setLoadingPharmacies(false);
        }
    };

    const handleAssignStores = async () => {
        if (!assignModal || selectedPharmacyIds.length === 0 || isLoading || isAssigning) return;
        
        setIsAssigning(true);
        try {
            let successCount = 0;
            let errorCount = 0;
            
            if (activeTab === 'assign') {
                // Handle assignments
                const result = await dispatch(assignStoresToProcessor({ processorId: assignModal.id, pharmacyIds: selectedPharmacyIds }));
                if (assignStoresToProcessor.fulfilled.match(result)) {
                    successCount = selectedPharmacyIds.length;
                    showToast(`${successCount} store(s) assigned successfully!`);
                } else {
                    errorCount = selectedPharmacyIds.length;
                    showToast(result.payload as string || 'Failed to assign stores', 'error');
                }
            } else {
                // Handle unassignments
                for (const pharmacyId of selectedPharmacyIds) {
                    const result = await dispatch(unassignStoreFromProcessor({ processorId: assignModal.id, pharmacyId }));
                    if (unassignStoreFromProcessor.fulfilled.match(result)) {
                        successCount++;
                    } else {
                        errorCount++;
                    }
                }
                
                if (successCount > 0 && errorCount === 0) {
                    showToast(`${successCount} store(s) unassigned successfully!`);
                } else if (successCount > 0 && errorCount > 0) {
                    showToast(`${successCount} store(s) unassigned successfully, ${errorCount} failed`, 'warning');
                } else {
                    showToast('Failed to unassign stores', 'error');
                }
            }
            
            if (successCount > 0) {
                setAssignModal(null);
                setSelectedPharmacyIds([]);
                dispatch(fetchProcessors({ page: currentPage, limit: 15 }));
            }
        } finally {
            setIsAssigning(false);
        }
    };

    const togglePharmacySelect = (id: string) => {
        setSelectedPharmacyIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const filteredPharmacies = availablePharmacies.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(assignSearch.toLowerCase());
        const matchesTab = activeTab === 'assign' ? !p.isAssigned : p.isAssigned;
        return matchesSearch && matchesTab;
    });

    // ── Stats ──────────────────────────────────────────────────
    const totalActive = processors.filter(p => p.status === 'active').length;
    const totalInactive = processors.filter(p => p.status === 'inactive').length;
    const totalStores = processors.reduce((sum, p) => sum + (p.assignedStoresCount || 0), 0);

    // ── Render ─────────────────────────────────────────────────
    return (
        <PermissionGate permission="processors">
        <div className="space-y-3">
            <ToastContainer toasts={toasts} onClose={removeToast} />

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-lg font-bold text-gray-900">Processors</h1>
                    <p className="text-xs text-gray-500">Manage field processors and their store assignments</p>
                </div>
                <button
                    onClick={() => setAddModal(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary-600 text-white text-xs font-medium hover:bg-primary-700 transition-colors whitespace-nowrap"
                >
                    <UserPlus className="w-3.5 h-3.5" /> Add Processor
                </button>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-xs flex items-center gap-2">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    {error}
                </div>
            )}

            {/* Stats — compact strip */}
            <div className="grid grid-cols-4 gap-2">
                {[
                    { icon: <UserCog className="w-3.5 h-3.5 text-gray-500" />,  label: 'Total',    value: pagination?.totalCount ?? processors.length, color: 'text-gray-700',  bg: 'bg-gray-50'  },
                    { icon: <CheckCircle className="w-3.5 h-3.5 text-green-500" />, label: 'Active', value: totalActive,   color: 'text-green-700', bg: 'bg-green-50' },
                    { icon: <Power className="w-3.5 h-3.5 text-gray-400" />,    label: 'Inactive', value: totalInactive, color: 'text-gray-600',  bg: 'bg-gray-50'  },
                    { icon: <Store className="w-3.5 h-3.5 text-blue-500" />,    label: 'Stores',   value: totalStores,  color: 'text-blue-700',  bg: 'bg-blue-50'  },
                ].map(card => (
                    <div key={card.label} className={`${card.bg} rounded-lg border border-gray-100 px-3 py-2 flex items-center gap-2`}>
                        {card.icon}
                        <div>
                            <p className="text-[10px] text-gray-500 leading-none">{card.label}</p>
                            <p className={`text-base font-bold leading-tight ${card.color}`}>{card.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Table Card */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                {/* Filters */}
                <div className="px-3 py-2 border-b border-gray-100 flex gap-2">
                    <div className="flex-1 relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by name or email"
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                            className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-primary-500"
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(e) => { setStatusFilter(e.target.value as typeof statusFilter); setCurrentPage(1); }}
                        className="px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-primary-500"
                    >
                        <option value="all">All Status</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
                </div>

                {isLoading ? (
                    <div className="text-center py-10">
                        <Loader2 className="w-5 h-5 animate-spin text-primary-500 mx-auto mb-1" />
                        <p className="text-gray-400 text-xs">Loading processors...</p>
                    </div>
                ) : processors.length === 0 ? (
                    <div className="text-center py-10">
                        <UserCog className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-500 text-sm font-medium">No processors found</p>
                        <p className="text-gray-400 text-xs mt-1">Add your first processor using the button above</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full table-auto">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                                        <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                                        <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Phone</th>
                                        <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                        <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Stores</th>
                                        <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Returns</th>
                                        <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Created</th>
                                        <th className="px-3 py-2 text-center text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {processors.map((processor) => (
                                        <tr key={processor.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-3 py-1.5 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                                                        {getInitials(processor.name)}
                                                    </div>
                                                    <span className="text-xs font-medium text-gray-900 truncate max-w-[120px]" title={processor.name}>{processor.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-3 py-1.5 text-xs text-gray-600 truncate max-w-[160px] whitespace-nowrap" title={processor.email || ''}>
                                                {processor.email || <span className="text-gray-400 italic">—</span>}
                                            </td>
                                            <td className="px-3 py-1.5 text-xs text-gray-600 whitespace-nowrap">
                                                {processor.phone || <span className="text-gray-400 italic">—</span>}
                                            </td>
                                            <td className="px-3 py-1.5 whitespace-nowrap">
                                                <Badge variant={processor.status === 'active' ? 'success' : 'default'}>
                                                    <span className="text-[10px]">{processor.status}</span>
                                                </Badge>
                                            </td>
                                            <td className="px-3 py-1.5 whitespace-nowrap">
                                                <button
                                                    onClick={() => openStoresModal(processor)}
                                                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                                                >
                                                    <Store className="w-3 h-3" />
                                                    {processor.assignedStoresCount ?? 0}
                                                </button>
                                            </td>
                                            <td className="px-3 py-1.5 whitespace-nowrap">
                                                <span className="text-xs text-gray-700 font-medium">
                                                    {processor.totalReturns ?? 0}
                                                </span>
                                            </td>
                                            <td className="px-3 py-1.5 text-xs text-gray-500 whitespace-nowrap">
                                                {processor.createdAt ? formatDate(processor.createdAt) : '—'}
                                            </td>
                                            <td className="px-3 py-1.5 whitespace-nowrap">
                                                <div className="flex items-center gap-1 justify-center">
                                                    <button onClick={() => setViewModal(processor)} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="View">
                                                        <Eye className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button onClick={() => setEditModal(processor)} className="p-1 text-green-600 hover:bg-green-50 rounded" title="Edit">
                                                        <Edit className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button onClick={() => openAssignModal(processor)} className="p-1 text-indigo-600 hover:bg-indigo-50 rounded" title="Assign Stores">
                                                        <Building2 className="w-3.5 h-3.5" />
                                                    </button>
                                                    {processor.status === 'active' && (
                                                        <button onClick={() => setDeactivateModal(processor)} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Deactivate">
                                                            <Power className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                    {processor.status === 'inactive' && (
                                                        <button onClick={() => setActivateModal(processor)} className="p-1 text-green-600 hover:bg-green-50 rounded" title="Activate">
                                                            <CheckCircle className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {pagination && pagination.totalPages > 1 && (
                            <div className="flex items-center justify-between px-3 py-2 border-t border-gray-100">
                                <p className="text-xs text-gray-500">
                                    {((pagination.page - 1) * pagination.limit) + 1}–{Math.min(pagination.page * pagination.limit, pagination.totalCount)} of {pagination.totalCount}
                                </p>
                                <div className="flex items-center gap-1.5">
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={!pagination.hasPreviousPage}
                                        className="p-1.5 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                                    >
                                        <ChevronLeft className="w-3.5 h-3.5" />
                                    </button>
                                    <span className="text-xs text-gray-600">Page {pagination.page} of {pagination.totalPages}</span>
                                    <button
                                        onClick={() => setCurrentPage(p => p + 1)}
                                        disabled={!pagination.hasNextPage}
                                        className="p-1.5 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                                    >
                                        <ChevronRight className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* ── View Modal ─────────────────────────────────── */}
            {viewModal && (
                <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={() => setViewModal(null)}>
                    <div className="bg-white rounded-lg max-w-lg w-full shadow-xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                            <h2 className="text-lg font-semibold text-gray-900">Processor Details</h2>
                            <button onClick={() => setViewModal(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-indigo-500 rounded-full flex items-center justify-center text-white text-lg font-bold">
                                    {getInitials(viewModal.name)}
                                </div>
                                <div>
                                    <p className="font-bold text-gray-900">{viewModal.name}</p>
                                    <Badge variant={viewModal.status === 'active' ? 'success' : 'default'}>{viewModal.status}</Badge>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                    <p className="text-xs text-gray-500 font-medium">Email</p>
                                    <p className="text-gray-900 flex items-center gap-1 mt-0.5">
                                        <Mail className="w-3.5 h-3.5 text-gray-400" />
                                        {viewModal.email || '—'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 font-medium">Phone</p>
                                    <p className="text-gray-900 flex items-center gap-1 mt-0.5">
                                        <Phone className="w-3.5 h-3.5 text-gray-400" />
                                        {viewModal.phone || '—'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 font-medium">Assigned Stores</p>
                                    <p className="text-gray-900 flex items-center gap-1 mt-0.5">
                                        <Store className="w-3.5 h-3.5 text-gray-400" />
                                        {viewModal.assignedStoresCount ?? 0}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 font-medium">Total Returns</p>
                                    <p className="text-gray-900 flex items-center gap-1 mt-0.5">
                                        <UserCog className="w-3.5 h-3.5 text-gray-400" />
                                        {viewModal.totalReturns ?? 0}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 font-medium">Created</p>
                                    <p className="text-gray-900 mt-0.5">{viewModal.createdAt ? formatDate(viewModal.createdAt) : 'N/A'}</p>
                                </div>
                                {viewModal.notes && (
                                    <div className="col-span-2">
                                        <p className="text-xs text-gray-500 font-medium">Notes</p>
                                        <p className="text-gray-900 mt-0.5">{viewModal.notes}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-200">
                            <Button variant="outline" onClick={() => setViewModal(null)}>Close</Button>
                            <Button variant="primary" onClick={() => { setEditModal(viewModal); setViewModal(null); }}>
                                <Edit className="w-4 h-4 mr-1" /> Edit
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Add Processor Modal ────────────────────────── */}
            {addModal && (
                <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={() => { setAddModal(false); setShowPassword(false); }}>
                    <div className="bg-white rounded-lg max-w-lg w-full shadow-xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-gray-50">
                            <h2 className="text-lg font-semibold text-gray-900">Add New Processor</h2>
                            <button onClick={() => { setAddModal(false); setShowPassword(false); }} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6 space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Name <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    value={newProcessor.name}
                                    onChange={e => setNewProcessor({ ...newProcessor, name: e.target.value })}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    placeholder="Full name"
                                    autoComplete="off"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
                                <input
                                    type="email"
                                    value={newProcessor.email}
                                    onChange={e => setNewProcessor({ ...newProcessor, email: e.target.value })}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    placeholder="email@example.com"
                                    autoComplete="off"
                                />
                                <p className="text-xs text-gray-500 mt-1">Used as the login email for the admin panel.</p>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Password <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={newProcessor.password}
                                        onChange={e => setNewProcessor({ ...newProcessor, password: e.target.value })}
                                        className="w-full px-3 py-2 pr-10 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        placeholder="Min. 8 characters"
                                        autoComplete="new-password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(p => !p)}
                                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Processor will use this to log in. Min. 8 characters.</p>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
                                <input
                                    type="tel"
                                    value={newProcessor.phone}
                                    onChange={e => setNewProcessor({ ...newProcessor, phone: e.target.value })}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    placeholder="(555) 000-0000"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                                <textarea
                                    value={newProcessor.notes}
                                    onChange={e => setNewProcessor({ ...newProcessor, notes: e.target.value })}
                                    rows={2}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                                    placeholder="Optional notes"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 p-5 border-t border-gray-200 bg-gray-50">
                            <Button variant="outline" onClick={() => { setAddModal(false); setShowPassword(false); }}>Cancel</Button>
                            <Button variant="primary" onClick={handleAdd} disabled={isLoading || !newProcessor.name.trim() || !newProcessor.email.trim() || !newProcessor.password}>
                                {isLoading ? <><Loader2 className="w-4 h-4 animate-spin mr-1" />Adding...</> : 'Add Processor'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Edit Processor Modal ───────────────────────── */}
            {editModal && (
                <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={() => setEditModal(null)}>
                    <div className="bg-white rounded-lg max-w-lg w-full shadow-xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-gray-50">
                            <h2 className="text-lg font-semibold text-gray-900">Edit Processor</h2>
                            <button onClick={() => setEditModal(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6 space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Name <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    value={editForm.name || ''}
                                    onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                                <input
                                    type="email"
                                    value={editForm.email || ''}
                                    onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
                                <input
                                    type="tel"
                                    value={editForm.phone || ''}
                                    onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                                <select
                                    value={editForm.status || 'active'}
                                    onChange={e => setEditForm({ ...editForm, status: e.target.value as 'active' | 'inactive' })}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                >
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                                <textarea
                                    value={editForm.notes || ''}
                                    onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
                                    rows={3}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 p-5 border-t border-gray-200 bg-gray-50">
                            <Button variant="outline" onClick={() => setEditModal(null)}>Cancel</Button>
                            <Button variant="primary" onClick={handleUpdate} disabled={isLoading || !editForm.name?.trim()}>
                                {isLoading ? <><Loader2 className="w-4 h-4 animate-spin mr-1" />Saving...</> : 'Save Changes'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Assigned Stores Modal ──────────────────────── */}
            {storesModal && (
                <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={() => { setStoresModal(null); dispatch(clearSelectedStores()); }}>
                    <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col shadow-xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">Assigned Stores</h2>
                                <p className="text-xs text-gray-500 mt-0.5">{storesModal.name}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="primary" size="sm" onClick={() => { setStoresModal(null); openAssignModal(storesModal); }}>
                                    <Building2 className="w-3.5 h-3.5 mr-1" /> Assign More
                                </Button>
                                <button onClick={() => { setStoresModal(null); dispatch(clearSelectedStores()); }} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                            </div>
                        </div>
                        <div className="p-5 overflow-y-auto flex-1">
                            {isStoresLoading ? (
                                <div className="text-center py-8">
                                    <Loader2 className="w-6 h-6 animate-spin text-primary-500 mx-auto mb-2" />
                                    <p className="text-sm text-gray-500">Loading stores...</p>
                                </div>
                            ) : selectedProcessorStores.length === 0 ? (
                                <div className="text-center py-8">
                                    <Store className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                                    <p className="text-gray-500 font-medium text-sm">No stores assigned yet</p>
                                    <p className="text-gray-400 text-xs mt-1">Click "Assign More" to add stores</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {selectedProcessorStores.map((store) => (
                                        <div key={store.assignmentId} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                                    <Building2 className="w-4 h-4 text-blue-600" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900">{store.businessName}</p>
                                                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                                        <MapPin className="w-3 h-3" />
                                                        {[store.city, store.state].filter(Boolean).join(', ') || 'Location N/A'}
                                                        {store.storeNumber && <span className="ml-1 text-gray-400">#{store.storeNumber}</span>}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {store.serviceType && (
                                                    <Badge variant="info" className="text-xs capitalize">{store.serviceType.replace('_', ' ')}</Badge>
                                                )}
                                                <button
                                                    onClick={() => handleUnassignStore(storesModal, store.pharmacyId)}
                                                    className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                                                    title="Unassign store"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="flex justify-end px-5 py-4 border-t border-gray-200">
                            <Button variant="outline" onClick={() => { setStoresModal(null); dispatch(clearSelectedStores()); }}>Close</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Assign Stores Modal ────────────────────────── */}
            {assignModal && (
                <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={() => setAssignModal(null)}>
                    <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col shadow-xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">Manage Store Assignments</h2>
                                <p className="text-xs text-gray-500 mt-0.5">Manage pharmacy assignments for {assignModal.name}</p>
                            </div>
                            <button onClick={() => setAssignModal(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                        </div>
                        
                        {/* Tabs */}
                        <div className="flex border-b border-gray-200">
                            <button
                                onClick={() => {
                                    setActiveTab('assign');
                                    setSelectedPharmacyIds([]);
                                    setAssignSearch('');
                                }}
                                className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                                    activeTab === 'assign'
                                        ? 'border-indigo-500 text-indigo-600 bg-indigo-50'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                }`}
                            >
                                Assign Stores
                                <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                    {availablePharmacies.filter(p => !p.isAssigned).length}
                                </span>
                            </button>
                            <button
                                onClick={() => {
                                    setActiveTab('unassign');
                                    setSelectedPharmacyIds([]);
                                    setAssignSearch('');
                                }}
                                className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                                    activeTab === 'unassign'
                                        ? 'border-indigo-500 text-indigo-600 bg-indigo-50'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                }`}
                            >
                                Unassign Stores
                                <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                    {availablePharmacies.filter(p => p.isAssigned).length}
                                </span>
                            </button>
                        </div>
                        <div className="p-4 border-b border-gray-100">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder={activeTab === 'assign' ? 'Search unassigned pharmacies...' : 'Search assigned pharmacies...'}
                                    value={assignSearch}
                                    onChange={e => setAssignSearch(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                />
                            </div>
                            {selectedPharmacyIds.length > 0 && (
                                <p className="text-xs text-indigo-600 font-medium mt-2">
                                    <CheckCircle className="w-3.5 h-3.5 inline mr-1" />
                                    {selectedPharmacyIds.length} pharmacy(s) selected
                                </p>
                            )}
                        </div>
                        <div className="overflow-y-auto flex-1 p-4">
                            {loadingPharmacies ? (
                                <div className="text-center py-8">
                                    <Loader2 className="w-6 h-6 animate-spin text-primary-500 mx-auto mb-2" />
                                    <p className="text-sm text-gray-500">Loading pharmacies...</p>
                                </div>
                            ) : filteredPharmacies.length === 0 ? (
                                <div className="text-center py-8">
                                    <p className="text-gray-500 text-sm">
                                        {activeTab === 'assign' 
                                            ? 'No unassigned pharmacies found' 
                                            : 'No assigned pharmacies found'
                                        }
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-1.5">
                                    {filteredPharmacies.map(pharmacy => {
                                        const isSelected = selectedPharmacyIds.includes(pharmacy.id);
                                        const isAssigned = pharmacy.isAssigned;
                                        return (
                                            <button
                                                key={pharmacy.id}
                                                onClick={() => togglePharmacySelect(pharmacy.id)}
                                                className={`w-full flex items-center justify-between p-3 rounded-lg border text-left transition-colors ${
                                                    isSelected
                                                        ? 'border-indigo-300 bg-indigo-50'
                                                        : 'border-gray-200 hover:bg-gray-50'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-6 h-6 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                                                        isSelected ? 'bg-indigo-500 border-indigo-500' : 'border-gray-300'
                                                    }`}>
                                                        {isSelected && <CheckCircle className="w-4 h-4 text-white" />}
                                                    </div>
                                                    <span className="text-sm text-gray-900">{pharmacy.name}</span>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-200 bg-gray-50">
                            <Button variant="outline" onClick={() => setAssignModal(null)}>Cancel</Button>
                            <Button
                                variant="primary"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleAssignStores();
                                }}
                                disabled={selectedPharmacyIds.length === 0 || isLoading || isAssigning}
                                type="button"
                            >
                                {isAssigning
                                    ? <><Loader2 className="w-4 h-4 animate-spin mr-1" />{activeTab === 'assign' ? 'Assigning...' : 'Unassigning...'}</>
                                    : `${activeTab === 'assign' ? 'Assign' : 'Unassign'} ${selectedPharmacyIds.length > 0 ? `(${selectedPharmacyIds.length})` : ''} Store${selectedPharmacyIds.length !== 1 ? 's' : ''}`
                                }
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Deactivate Confirmation Modal ──────────────── */}
            {deactivateModal && (
                <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={() => setDeactivateModal(null)}>
                    <div className="bg-white rounded-lg max-w-md w-full shadow-xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-5 border-b border-gray-200">
                            <h2 className="text-lg font-semibold text-gray-900">Deactivate Processor</h2>
                            <button onClick={() => setDeactivateModal(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-5">
                            <div className="flex items-start gap-3 mb-4">
                                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <Power className="w-5 h-5 text-red-600" />
                                </div>
                                <div>
                                    <p className="text-gray-800 font-medium">Are you sure you want to deactivate <strong>{deactivateModal.name}</strong>?</p>
                                    <p className="text-sm text-gray-500 mt-1">
                                        This processor will no longer be able to access the system. Their store assignments will remain intact.
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 p-5 border-t border-gray-200">
                            <Button variant="outline" onClick={() => setDeactivateModal(null)}>Cancel</Button>
                            <Button variant="danger" onClick={handleDeactivate} disabled={isLoading}>
                                {isLoading ? <><Loader2 className="w-4 h-4 animate-spin mr-1" />Deactivating...</> : 'Deactivate'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Activate Confirmation Modal ─────────────────── */}
            {activateModal && (
                <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={() => setActivateModal(null)}>
                    <div className="bg-white rounded-lg max-w-md w-full shadow-xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-5 border-b border-gray-200">
                            <h2 className="text-lg font-semibold text-gray-900">Activate Processor</h2>
                            <button onClick={() => setActivateModal(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-5">
                            <div className="flex items-start gap-3 mb-4">
                                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <CheckCircle className="w-5 h-5 text-green-600" />
                                </div>
                                <div>
                                    <p className="text-gray-800 font-medium">Are you sure you want to activate <strong>{activateModal.name}</strong>?</p>
                                    <p className="text-sm text-gray-500 mt-1">
                                        This processor will regain access to the system and be able to log in again.
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 p-5 border-t border-gray-200">
                            <Button variant="outline" onClick={() => setActivateModal(null)}>Cancel</Button>
                            <Button variant="primary" onClick={handleActivate} disabled={isLoading}>
                                {isLoading ? <><Loader2 className="w-4 h-4 animate-spin mr-1" />Activating...</> : 'Activate'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
        </PermissionGate>
    );
}
