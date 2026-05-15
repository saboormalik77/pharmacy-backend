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
import { validateEmail, validatePassword, validateUSPhoneOptional, formatPhoneNumber } from '@/lib/validation';

// ── Available Permissions ──────────────────────────────────────

const ASSIGNABLE_PERMISSIONS = [
    { key: 'pharmacies', label: 'Pharmacies' },
    { key: 'distributors', label: 'Distributors' },
    { key: 'marketplace', label: 'Marketplace' },
    { key: 'documents', label: 'Documents' },
    { key: 'payments', label: 'Payments' },
    { key: 'payout_hub', label: 'Payout Mgmt' },
    { key: 'analytics', label: 'Analytics' },
    { key: 'settings', label: 'Settings' },
    { key: 'processors', label: 'Processors' },
    { key: 'service_requests', label: 'Service Requests' },
    { key: 'policies', label: 'Labeler Info' },
    { key: 'ndc_pricing', label: 'NDC Pricing' },
    { key: 'tbd_items', label: 'TBD Items' },
    { key: 'destruction', label: 'Destruction' },
    { key: 'warehouse', label: 'Warehouse' },
] as const;

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
    const [newProcessor, setNewProcessor] = useState<ProcessorCreatePayload & { permissions?: string[] }>({
        name: '', email: '', password: '', phone: '', notes: '', permissions: [],
    });
    const [editForm, setEditForm] = useState<ProcessorUpdatePayload & { permissions?: string[] }>({});
    const [showPassword, setShowPassword] = useState(false);
    const [addErrors, setAddErrors] = useState<Record<string, string>>({});
    const [editErrors, setEditErrors] = useState<Record<string, string>>({});

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

    // ── Permission helpers ─────────────────────────────────────
    const togglePermission = (
        current: string[] | undefined,
        key: string,
        setter: (perms: string[]) => void,
    ) => {
        const list = current || [];
        setter(list.includes(key) ? list.filter(p => p !== key) : [...list, key]);
    };

    // ── Fetch on filter change ─────────────────────────────────
    useEffect(() => {
        if (!isAuthenticated) return;
        dispatch(fetchProcessors({
            page: currentPage,
            limit: 10,
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
                permissions: (editModal as any).permissions || [],
            });
        }
    }, [editModal]);

    // ── Handlers ───────────────────────────────────────────────
    const refresh = () => {
        dispatch(fetchProcessors({
            page: currentPage, limit: 10,
            search: debouncedSearch || undefined,
            status: statusFilter !== 'all' ? statusFilter : undefined,
        }));
    };

    const handleAdd = async () => {
        const newErrors: Record<string, string> = {};
        if (!newProcessor.name.trim()) newErrors.name = 'Name is required.';
        const emailResult = validateEmail(newProcessor.email);
        if (!emailResult.valid) newErrors.email = emailResult.error!;
        const pwResult = validatePassword(newProcessor.password || '');
        if (!pwResult.valid) newErrors.password = pwResult.error!;
        const phoneResult = validateUSPhoneOptional(newProcessor.phone || '');
        if (!phoneResult.valid) newErrors.phone = phoneResult.error!;
        setAddErrors(newErrors);
        if (Object.keys(newErrors).length > 0) return;

        try {
            const result = await dispatch(createProcessor(newProcessor));
            if (createProcessor.fulfilled.match(result)) {
                // Auto-assign ALL permissions to the processor
                const allPermissions = ASSIGNABLE_PERMISSIONS.map(p => p.key);
                const processorData = (result.payload as any);
                if (processorData.adminUserId) {
                    const { apiClient } = await import('@/lib/api/apiClient');
                    await apiClient.patch(`/admin/users/${processorData.adminUserId}`, {
                        permissions: allPermissions
                    }, true);
                }
                showToast('Processor created successfully!');
                setAddModal(false);
                setAddErrors({});
                setNewProcessor({ name: '', email: '', password: '', phone: '', notes: '', permissions: [] });
                setShowPassword(false);
                refresh();
            } else {
                showToast(result.payload as string || 'Failed to create processor', 'error');
            }
        } catch (error) {
            showToast('Failed to create processor', 'error');
        }
    };

    const handleView = async (processor: Processor) => {
        try {
            const { apiClient } = await import('@/lib/api/apiClient');
            
            // First try to get processor details which might include adminUserId
            let adminUserId = (processor as any).adminUserId;
            
            if (!adminUserId) {
                // Try to find the admin user by email
                const adminResponse: any = await apiClient.get('/admin/users', true, { 
                    search: processor.email ?? undefined,
                    limit: 1 
                });
                const admins = adminResponse?.data?.admins || adminResponse?.admins || [];
                if (admins.length > 0) {
                    adminUserId = admins[0].id;
                }
            }
            
            if (adminUserId) {
                const response: any = await apiClient.get(`/admin/users/${adminUserId}`, true);
                const adminUser = response?.data?.admin || response?.admin;
                setViewModal({ ...processor, permissions: adminUser?.permissions || [] } as any);
            } else {
                setViewModal({ ...processor, permissions: [] } as any);
            }
        } catch (error) {
            console.log('Failed to fetch processor permissions:', error);
            setViewModal({ ...processor, permissions: [] } as any);
        }
    };

    const handleEdit = async (processor: Processor) => {
        try {
            const { apiClient } = await import('@/lib/api/apiClient');
            
            // First try to get processor details which might include adminUserId
            let adminUserId = (processor as any).adminUserId;
            
            if (!adminUserId) {
                // Try to find the admin user by email
                const adminResponse: any = await apiClient.get('/admin/users', true, { 
                    search: processor.email ?? undefined,
                    limit: 1 
                });
                const admins = adminResponse?.data?.admins || adminResponse?.admins || [];
                if (admins.length > 0) {
                    adminUserId = admins[0].id;
                }
            }
            
            if (adminUserId) {
                const response: any = await apiClient.get(`/admin/users/${adminUserId}`, true);
                const adminUser = response?.data?.admin || response?.admin;
                setEditModal({ 
                    ...processor, 
                    permissions: adminUser?.permissions || [],
                    adminUserId: adminUserId 
                } as any);
            } else {
                setEditModal({ ...processor, permissions: [] } as any);
            }
        } catch (error) {
            console.log('Failed to fetch processor permissions:', error);
            setEditModal({ ...processor, permissions: [] } as any);
        }
    };

    const handleUpdate = async () => {
        if (!editModal) return;
        const newErrors: Record<string, string> = {};
        if (!editForm.name?.trim()) newErrors.name = 'Name is required.';
        if (editForm.email !== undefined) {
            const r = validateEmail(editForm.email || '');
            if (!r.valid) newErrors.email = r.error!;
        }
        if (editForm.phone !== undefined) {
            const r = validateUSPhoneOptional(editForm.phone || '');
            if (!r.valid) newErrors.phone = r.error!;
        }
        setEditErrors(newErrors);
        if (Object.keys(newErrors).length > 0) return;

        try {
            // Update processor basic info
            const result = await dispatch(updateProcessor({ id: editModal.id, payload: editForm }));
            if (updateProcessor.fulfilled.match(result)) {
                // Also update permissions if they changed
                if (editForm.permissions !== undefined && (editModal as any).adminUserId) {
                    const { apiClient } = await import('@/lib/api/apiClient');
                    await apiClient.patch(`/admin/users/${(editModal as any).adminUserId}`, {
                        permissions: editForm.permissions
                    }, true);
                }
                showToast('Processor updated successfully!');
                setEditModal(null);
                setEditErrors({});
                refresh();
            } else {
                showToast(result.payload as string || 'Failed to update processor', 'error');
            }
        } catch (error) {
            showToast('Failed to update processor permissions', 'error');
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
            dispatch(fetchProcessors({ page: currentPage, limit: 10 }));
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
                dispatch(fetchProcessors({ page: currentPage, limit: 10 }));
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
        <div className="space-y-6 p-8">
            <ToastContainer toasts={toasts} onClose={removeToast} />

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-lg font-medium text-gray-900" style={{ fontFamily: 'var(--font-newsreader), serif' }}>Processors</h1>
                    <p className="text-xs text-gray-500 mt-1">Manage field processors and their store assignments</p>
                </div>
                <button
                    onClick={() => setAddModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[4px] text-xs font-medium bg-[#516057] text-white hover:opacity-90 transition-all"
                >
                    <UserPlus className="w-4 h-4" /> Add Processor
                </button>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-[4px] text-sm flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    {error}
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[
                    { icon: <UserCog className="w-5 h-5 text-gray-400" />,      label: 'Total',    value: pagination?.totalCount ?? processors.length, color: 'text-gray-900'  },
                    { icon: <CheckCircle className="w-5 h-5 text-green-500" />, label: 'Active',   value: totalActive,   color: 'text-green-700' },
                    { icon: <Power className="w-5 h-5 text-gray-400" />,        label: 'Inactive', value: totalInactive, color: 'text-gray-900'  },
                    { icon: <Store className="w-5 h-5 text-blue-500" />,        label: 'Stores',   value: totalStores,   color: 'text-blue-700'  },
                ].map(card => (
                    <div key={card.label} className="bg-white rounded-[4px] shadow border border-[#e2e2e2] px-5 py-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-gray-500">{card.label}</span>
                            {card.icon}
                        </div>
                        <p className={`text-xl font-bold ${card.color}`}>{card.value}</p>
                    </div>
                ))}
            </div>

            {/* Table Card */}
            <div className="bg-white rounded-[4px] shadow border border-[#e2e2e2] overflow-hidden">
                {/* Filters */}
                <div className="px-5 py-4 border-b border-gray-100 flex gap-3">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by name or email"
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                            className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-[4px] text-sm focus:outline-none focus:ring-2 focus:ring-[#516057] focus:border-transparent"
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(e) => { setStatusFilter(e.target.value as typeof statusFilter); setCurrentPage(1); }}
                        className="px-5 py-4 border border-gray-300 rounded-[4px] text-sm focus:outline-none focus:ring-2 focus:ring-[#516057] focus:border-transparent"
                    >
                        <option value="all">All Status</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
                </div>

                {isLoading ? (
                    <div className="text-center py-12">
                        <Loader2 className="w-6 h-6 animate-spin text-[#516057] mx-auto mb-2" />
                        <p className="text-gray-500 text-sm">Loading processors...</p>
                    </div>
                ) : processors.length === 0 ? (
                    <div className="text-center py-12">
                        <UserCog className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-600 text-sm font-medium">No processors found</p>
                        <p className="text-gray-400 text-xs mt-1">Add your first processor using the button above</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm border" style={{ borderColor: '#9ca3af' }}>
                                <thead className="bg-[#f4f5f5] border-b" style={{ borderColor: '#9ca3af', borderBottomWidth: '1.5px' }}>
                                    <tr className="bg-[#f4f5f5]">
                                        <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-gray-600">Name</th>
                                        <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-gray-600">Email</th>
                                        <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-gray-600">Phone</th>
                                        <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-gray-600">Status</th>
                                        <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-gray-600">Stores</th>
                                        <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-gray-600">Returns</th>
                                        <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-gray-600">Created</th>
                                        <th className="text-center px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-gray-600">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y" style={{ borderColor: '#d1d5db' }}>
                                    {processors.map((processor) => (
                                        <tr key={processor.id} className="hover:bg-[#e9ebec] transition-colors" style={{ borderColor: '#d1d5db' }}>
                                            <td className="px-3 py-3 whitespace-nowrap">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-indigo-500 rounded-[4px] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                                        {getInitials(processor.name)}
                                                    </div>
                                                    <span className="text-sm font-medium text-gray-900 truncate max-w-[140px]" title={processor.name}>{processor.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-3 py-3 whitespace-nowrap" title={processor.email || ''}>
                                                <span className="text-sm text-gray-600 truncate max-w-[180px]">
                                                    {processor.email || <span className="text-gray-400 italic">—</span>}
                                                </span>
                                            </td>
                                            <td className="px-3 py-3 whitespace-nowrap">
                                                <span className="text-sm text-gray-600">
                                                    {processor.phone || <span className="text-gray-400 italic">—</span>}
                                                </span>
                                            </td>
                                            <td className="px-3 py-3 whitespace-nowrap">
                                                <Badge variant={processor.status === 'active' ? 'success' : 'default'}>
                                                    <span className="text-xs">{processor.status}</span>
                                                </Badge>
                                            </td>
                                            <td className="px-3 py-3 whitespace-nowrap">
                                                <button
                                                    onClick={() => openStoresModal(processor)}
                                                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                                                >
                                                    <Store className="w-3 h-3" />
                                                    {processor.assignedStoresCount ?? 0}
                                                </button>
                                            </td>
                                            <td className="px-3 py-3 whitespace-nowrap">
                                                <span className="text-xs text-gray-900 font-medium">
                                                    {processor.totalReturns ?? 0}
                                                </span>
                                            </td>
                                            <td className="px-3 py-3 whitespace-nowrap">
                                                <span className="text-xs text-gray-600">
                                                    {processor.createdAt ? formatDate(processor.createdAt) : '—'}
                                                </span>
                                            </td>
                                            <td className="px-3 py-3 whitespace-nowrap">
                                                <div className="flex items-center gap-1 justify-center">
                                                    <button onClick={() => handleView(processor)} className="p-1.5 text-gray-400 hover:text-[#516057] hover:bg-[#516057]/10 rounded-[4px] transition-colors" title="View">
                                                        <Eye className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button onClick={() => handleEdit(processor)} className="p-1.5 text-gray-400 hover:text-[#516057] hover:bg-[#516057]/10 rounded-[4px] transition-colors" title="Edit">
                                                        <Edit className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button onClick={() => openAssignModal(processor)} className="p-1.5 text-gray-400 hover:text-[#516057] hover:bg-[#516057]/10 rounded-[4px] transition-colors" title="Assign Stores">
                                                        <Building2 className="w-3.5 h-3.5" />
                                                    </button>
                                                    {processor.status === 'active' && (
                                                        <button onClick={() => setDeactivateModal(processor)} className="p-1.5 text-gray-400 hover:text-[#516057] hover:bg-[#516057]/10 rounded-[4px] transition-colors" title="Deactivate">
                                                            <Power className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                    {processor.status === 'inactive' && (
                                                        <button onClick={() => setActivateModal(processor)} className="p-1.5 text-gray-400 hover:text-[#516057] hover:bg-[#516057]/10 rounded-[4px] transition-colors" title="Activate">
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
                            <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100 bg-gray-50">
                                <p className="text-sm text-gray-600 font-medium">
                                    {((pagination.page - 1) * pagination.limit) + 1}–{Math.min(pagination.page * pagination.limit, pagination.totalCount)} of {pagination.totalCount}
                                </p>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={!pagination.hasPreviousPage}
                                        className="p-2 border border-gray-300 rounded-[4px] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <span className="text-xs text-gray-600">Page {pagination.page} of {pagination.totalPages}</span>
                                    <button
                                        onClick={() => setCurrentPage(p => p + 1)}
                                        disabled={!pagination.hasNextPage}
                                        className="p-2 border border-gray-300 rounded-[4px] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* ── View Modal ─────────────────────────────────── */}
            {viewModal && (
                <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4" onClick={() => setViewModal(null)}>
                    <div className="bg-white rounded-[4px] max-w-lg w-full shadow-xl max-h-[88vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 bg-gray-50">
                            <h2 className="text-base font-semibold text-gray-900">Processor Details</h2>
                            <button onClick={() => setViewModal(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="px-6 py-5 space-y-4">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-indigo-500 rounded-[4px] flex items-center justify-center text-white text-xl font-bold">
                                    {getInitials(viewModal.name)}
                                </div>
                                <div>
                                    <p className="text-base font-bold text-gray-900">{viewModal.name}</p>
                                    <Badge variant={viewModal.status === 'active' ? 'success' : 'default'}>{viewModal.status}</Badge>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-xs text-gray-500 font-medium">Email</p>
                                    <p className="text-gray-900 flex items-center gap-2 mt-1">
                                        <Mail className="w-4 h-4 text-gray-400" />
                                        {viewModal.email || '—'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 font-medium">Phone</p>
                                    <p className="text-gray-900 flex items-center gap-2 mt-1">
                                        <Phone className="w-4 h-4 text-gray-400" />
                                        {viewModal.phone || '—'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 font-medium">Assigned Stores</p>
                                    <p className="text-gray-900 flex items-center gap-2 mt-1">
                                        <Store className="w-4 h-4 text-gray-400" />
                                        {viewModal.assignedStoresCount ?? 0}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 font-medium">Total Returns</p>
                                    <p className="text-gray-900 flex items-center gap-2 mt-1">
                                        <UserCog className="w-4 h-4 text-gray-400" />
                                        {viewModal.totalReturns ?? 0}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 font-medium">Created</p>
                                    <p className="text-gray-900 mt-1">{viewModal.createdAt ? formatDate(viewModal.createdAt) : 'N/A'}</p>
                                </div>
                                {viewModal.notes && (
                                    <div className="col-span-2">
                                        <p className="text-xs text-gray-500 font-medium">Notes</p>
                                        <p className="text-gray-900 mt-0.5">{viewModal.notes}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-200 bg-gray-50">
                            <button onClick={() => setViewModal(null)} className="px-3 py-1.5 text-xs rounded-[4px] border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">Close</button>
                            <button onClick={() => { setEditModal(viewModal); setViewModal(null); }} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-[4px] bg-[#1d2222] text-white hover:bg-[#3d4343] transition-colors">
                                <Edit className="w-4 h-4" /> Edit
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Add Processor Modal ────────────────────────── */}
            {addModal && (
                <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4" onClick={() => { 
                    setAddModal(false); 
                    setShowPassword(false); 
                    setNewProcessor({ name: '', email: '', password: '', phone: '', notes: '', permissions: [] });
                }}>
                    <div className="bg-white rounded-[4px] max-w-lg w-full shadow-xl max-h-[88vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 bg-gray-50">
                            <h2 className="text-sm font-semibold text-gray-900">Add New Processor</h2>
                            <button onClick={() => { 
                                setAddModal(false); 
                                setShowPassword(false); 
                                setNewProcessor({ name: '', email: '', password: '', phone: '', notes: '', permissions: [] });
                            }} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="px-5 py-4 space-y-3">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Name <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        value={newProcessor.name}
                                        onChange={e => { setNewProcessor({ ...newProcessor, name: e.target.value }); setAddErrors(prev => ({ ...prev, name: '' })); }}
                                        className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#516057] focus:border-transparent"
                                        placeholder="Full name"
                                        autoComplete="off"
                                    />
                                    {addErrors.name && <p className="text-xs text-red-500 mt-1">{addErrors.name}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
                                    <input
                                        type="tel"
                                        value={newProcessor.phone}
                                        onChange={e => { setNewProcessor({ ...newProcessor, phone: formatPhoneNumber(e.target.value) }); setAddErrors(prev => ({ ...prev, phone: '' })); }}
                                        className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#516057] focus:border-transparent"
                                        placeholder="(555) 000-0000"
                                    />
                                    {addErrors.phone && <p className="text-xs text-red-500 mt-1">{addErrors.phone}</p>}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email <span className="text-red-500">*</span></label>
                                <input
                                    type="email"
                                    value={newProcessor.email}
                                    onChange={e => { setNewProcessor({ ...newProcessor, email: e.target.value }); setAddErrors(prev => ({ ...prev, email: '' })); }}
                                    className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#516057] focus:border-transparent"
                                    placeholder="email@example.com"
                                    autoComplete="off"
                                />
                                {addErrors.email && <p className="text-xs text-red-500 mt-1">{addErrors.email}</p>}
                                {!addErrors.email && <p className="text-xs text-gray-500 mt-1.5">Used as the login email for the admin panel.</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Password <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={newProcessor.password}
                                        onChange={e => { setNewProcessor({ ...newProcessor, password: e.target.value }); setAddErrors(prev => ({ ...prev, password: '' })); }}
                                        className="w-full px-3.5 py-2.5 pr-12 text-sm border border-gray-300 rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#516057] focus:border-transparent"
                                        placeholder="Min. 8 characters"
                                        autoComplete="new-password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(p => !p)}
                                        className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-gray-400 hover:text-gray-600"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                                {addErrors.password && <p className="text-xs text-red-500 mt-1">{addErrors.password}</p>}
                                {!addErrors.password && <p className="text-xs text-gray-500 mt-1">Processor will use this to log in. Min. 8 characters.</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
                                <textarea
                                    value={newProcessor.notes}
                                    onChange={e => setNewProcessor({ ...newProcessor, notes: e.target.value })}
                                    rows={3}
                                    className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#516057] focus:border-transparent resize-none"
                                    placeholder="Optional notes"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 px-6 py-5 border-t border-gray-200 bg-gray-50">
                            <button onClick={() => { 
                                setAddModal(false); 
                                setShowPassword(false); 
                                setNewProcessor({ name: '', email: '', password: '', phone: '', notes: '', permissions: [] });
                            }} className="px-3 py-1.5 text-xs rounded-[4px] border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
                            <button onClick={handleAdd} disabled={isLoading || !newProcessor.name.trim() || !newProcessor.email.trim() || !newProcessor.password} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-[4px] bg-[#1d2222] text-white hover:bg-[#3d4343] disabled:opacity-50 transition-colors">
                                {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Adding...</> : 'Add Processor'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Edit Processor Modal ───────────────────────── */}
            {editModal && (
                <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4" onClick={() => setEditModal(null)}>
                    <div className="bg-white rounded-[4px] max-w-lg w-full shadow-xl max-h-[88vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-gray-50">
                            <h2 className="text-xs font-semibold text-gray-900">Edit Processor</h2>
                            <button onClick={() => setEditModal(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="px-5 py-4 space-y-3">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Name <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        value={editForm.name || ''}
                                        onChange={e => { setEditForm({ ...editForm, name: e.target.value }); setEditErrors(prev => ({ ...prev, name: '' })); }}
                                        className="w-full px-3 py-2 text-xs border border-gray-300 rounded-[4px] focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    />
                                    {editErrors.name && <p className="text-xs text-red-500 mt-1">{editErrors.name}</p>}
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
                                    <input
                                        type="tel"
                                        value={editForm.phone || ''}
                                        onChange={e => { setEditForm({ ...editForm, phone: formatPhoneNumber(e.target.value) }); setEditErrors(prev => ({ ...prev, phone: '' })); }}
                                        className="w-full px-3 py-2 text-xs border border-gray-300 rounded-[4px] focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    />
                                    {editErrors.phone && <p className="text-xs text-red-500 mt-1">{editErrors.phone}</p>}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                                    <input
                                        type="email"
                                        value={editForm.email || ''}
                                        onChange={e => { setEditForm({ ...editForm, email: e.target.value }); setEditErrors(prev => ({ ...prev, email: '' })); }}
                                        className="w-full px-3 py-2 text-xs border border-gray-300 rounded-[4px] focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    />
                                    {editErrors.email && <p className="text-xs text-red-500 mt-1">{editErrors.email}</p>}
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                                    <select
                                        value={editForm.status || 'active'}
                                        onChange={e => setEditForm({ ...editForm, status: e.target.value as 'active' | 'inactive' })}
                                        className="w-full px-3 py-2 text-xs border border-gray-300 rounded-[4px] focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    >
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                                <textarea
                                    value={editForm.notes || ''}
                                    onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
                                    rows={2}
                                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-[4px] focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-200 bg-gray-50">
                            <button onClick={() => setEditModal(null)} className="px-3 py-1.5 text-xs rounded-[4px] border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
                            <button onClick={handleUpdate} disabled={isLoading || !editForm.name?.trim()} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-[4px] bg-[#1d2222] text-white hover:bg-[#3d4343] disabled:opacity-50 transition-colors">
                                {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</> : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Assigned Stores Modal ──────────────────────── */}
            {storesModal && (
                <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4" onClick={() => { setStoresModal(null); dispatch(clearSelectedStores()); }}>
                    <div className="bg-white rounded-[4px] max-w-lg w-full shadow-xl max-h-[88vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-gray-50">
                            <div>
                                <h2 className="text-xs font-semibold text-gray-900">Assigned Stores</h2>
                                <p className="text-xs text-gray-500 mt-0.5">{storesModal.name}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => { setStoresModal(null); openAssignModal(storesModal); }} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-[4px] bg-[#1d2222] text-white hover:bg-[#3d4343] transition-colors">
                                    <Building2 className="w-3.5 h-3.5" /> Assign More
                                </button>
                                <button onClick={() => { setStoresModal(null); dispatch(clearSelectedStores()); }} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                            </div>
                        </div>
                        <div className="px-5 py-4 space-y-3">
                            {isStoresLoading ? (
                                <div className="text-center py-8">
                                    <Loader2 className="w-6 h-6 animate-spin text-primary-500 mx-auto mb-2" />
                                    <p className="text-xs text-gray-500">Loading stores...</p>
                                </div>
                            ) : selectedProcessorStores.length === 0 ? (
                                <div className="text-center py-8">
                                    <Store className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                                    <p className="text-gray-500 font-medium text-xs">No stores assigned yet</p>
                                    <p className="text-gray-400 text-xs mt-1">Click "Assign More" to add stores</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {selectedProcessorStores.map((store) => (
                                        <div key={store.assignmentId} className="flex items-center justify-between p-3 border border-gray-200 rounded-[4px] hover:bg-gray-50">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-blue-100 rounded-[4px] flex items-center justify-center">
                                                    <Building2 className="w-4 h-4 text-blue-600" />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-medium text-gray-900">{store.businessName}</p>
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
                                                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-[4px] transition-colors"
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
                        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-200 bg-gray-50">
                            <button onClick={() => { setStoresModal(null); dispatch(clearSelectedStores()); }} className="px-3 py-1.5 text-xs rounded-[4px] border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Assign Stores Modal ────────────────────────── */}
            {assignModal && (
                <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4" onClick={() => setAssignModal(null)}>
                    <div className="bg-white rounded-[4px] max-w-lg w-full shadow-xl max-h-[88vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-gray-50">
                            <div>
                                <h2 className="text-xs font-semibold text-gray-900">Manage Store Assignments</h2>
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
                                className={`flex-1 px-5 py-4 text-xs font-medium border-b-2 transition-colors ${
                                    activeTab === 'assign'
                                        ? 'border-indigo-500 text-indigo-600 bg-indigo-50'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                }`}
                            >
                                Assign Stores
                                <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-[4px]">
                                    {availablePharmacies.filter(p => !p.isAssigned).length}
                                </span>
                            </button>
                            <button
                                onClick={() => {
                                    setActiveTab('unassign');
                                    setSelectedPharmacyIds([]);
                                    setAssignSearch('');
                                }}
                                className={`flex-1 px-5 py-4 text-xs font-medium border-b-2 transition-colors ${
                                    activeTab === 'unassign'
                                        ? 'border-indigo-500 text-indigo-600 bg-indigo-50'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                }`}
                            >
                                Unassign Stores
                                <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-[4px]">
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
                                    className="w-full pl-9 pr-4 py-2 text-xs border border-gray-300 rounded-[4px] focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                                    <p className="text-xs text-gray-500">Loading pharmacies...</p>
                                </div>
                            ) : filteredPharmacies.length === 0 ? (
                                <div className="text-center py-8">
                                    <p className="text-gray-500 text-xs">
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
                                                className={`w-full flex items-center justify-between p-3 rounded-[4px] border text-left transition-colors ${
                                                    isSelected
                                                        ? 'border-indigo-300 bg-indigo-50'
                                                        : 'border-gray-200 hover:bg-gray-50'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-6 h-6 rounded-[4px] border-2 flex items-center justify-center flex-shrink-0 ${
                                                        isSelected ? 'bg-indigo-500 border-indigo-500' : 'border-gray-300'
                                                    }`}>
                                                        {isSelected && <CheckCircle className="w-4 h-4 text-white" />}
                                                    </div>
                                                    <span className="text-xs text-gray-900">{pharmacy.name}</span>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-200 bg-gray-50">
                            <button onClick={() => setAssignModal(null)} className="px-3 py-1.5 text-xs rounded-[4px] border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleAssignStores();
                                }}
                                disabled={selectedPharmacyIds.length === 0 || isLoading || isAssigning}
                                type="button"
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-[4px] bg-[#1d2222] text-white hover:bg-[#3d4343] disabled:opacity-50 transition-colors"
                            >
                                {isAssigning
                                    ? <><Loader2 className="w-4 h-4 animate-spin" />{activeTab === 'assign' ? 'Assigning...' : 'Unassigning...'}</>
                                    : `${activeTab === 'assign' ? 'Assign' : 'Unassign'} ${selectedPharmacyIds.length > 0 ? `(${selectedPharmacyIds.length})` : ''} Store${selectedPharmacyIds.length !== 1 ? 's' : ''}`
                                }
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Deactivate Confirmation Modal ──────────────── */}
            {deactivateModal && (
                <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4" onClick={() => setDeactivateModal(null)}>
                    <div className="bg-white rounded-[4px] max-w-lg w-full shadow-xl max-h-[88vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-gray-50">
                            <h2 className="text-xs font-semibold text-gray-900">Deactivate Processor</h2>
                            <button onClick={() => setDeactivateModal(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="px-5 py-4">
                            <div className="flex items-start gap-3 mb-4">
                                <div className="w-10 h-10 bg-red-100 rounded-[4px] flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <Power className="w-5 h-5 text-red-600" />
                                </div>
                                <div>
                                    <p className="text-gray-800 font-medium">Are you sure you want to deactivate <strong>{deactivateModal.name}</strong>?</p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        This processor will no longer be able to access the system. Their store assignments will remain intact.
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-200 bg-gray-50">
                            <button onClick={() => setDeactivateModal(null)} className="px-3 py-1.5 text-xs rounded-[4px] border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
                            <button onClick={handleDeactivate} disabled={isLoading} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-[4px] bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors">
                                {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Deactivating...</> : 'Deactivate'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Activate Confirmation Modal ─────────────────── */}
            {activateModal && (
                <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4" onClick={() => setActivateModal(null)}>
                    <div className="bg-white rounded-[4px] max-w-lg w-full shadow-xl max-h-[88vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-gray-50">
                            <h2 className="text-xs font-semibold text-gray-900">Activate Processor</h2>
                            <button onClick={() => setActivateModal(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="px-5 py-4">
                            <div className="flex items-start gap-3 mb-4">
                                <div className="w-10 h-10 bg-green-100 rounded-[4px] flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <CheckCircle className="w-5 h-5 text-green-600" />
                                </div>
                                <div>
                                    <p className="text-gray-800 font-medium">Are you sure you want to activate <strong>{activateModal.name}</strong>?</p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        This processor will regain access to the system and be able to log in again.
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-200 bg-gray-50">
                            <button onClick={() => setActivateModal(null)} className="px-3 py-1.5 text-xs rounded-[4px] border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
                            <button onClick={handleActivate} disabled={isLoading} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-[4px] bg-[#1d2222] text-white hover:bg-[#3d4343] disabled:opacity-50 transition-colors">
                                {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Activating...</> : 'Activate'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
        </PermissionGate>
    );
}
